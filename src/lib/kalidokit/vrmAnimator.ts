/**
 * Kalidokit + VRM 통합 (T-pose 최적화)
 * MediaPipe 랜드마크를 VRM 캐릭터에 적용
 *
 * [T-pose Rest Pose 기준]
 * - VRM 모델의 rest-pose가 T-pose인 경우 최적화
 * - Kalidokit은 기본적으로 T-pose 기준으로 설계됨
 * - 별도의 오프셋 없이 바로 적용 가능
 *
 * Phase 1: Euler 기반 직접 적용 (T-pose 권장)
 * Phase 2: Quaternion SLERP + 자세 맞추기 오프셋 (A-pose 등 커스텀 필요 시)
 *
 * VRM 1.0 호환 (@pixiv/three-vrm v3.x)
 *
 * [사용자 친화적 UX 정책]
 * - "calibration" 용어는 사용자에게 절대 노출하지 않음
 * - 사용자에게는 "자세 맞추기"로만 안내
 * - A-pose/T-pose 같은 전문 용어도 UI에 노출하지 않음
 */

import * as THREE from 'three';
import * as Kalidokit from 'kalidokit';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import type { Landmark } from '@/types/pose';

// ============================================================================
// 상수 정의
// ============================================================================

// T-pose 판정 임계값 (개발자 진단용)
// VRM 모델 rest-pose가 T-pose인 경우 Kalidokit 기본값으로 잘 작동함
const TPOSE_THRESHOLD = 0.25;  // avgAbsZ < 0.25 → T-pose로 추정 (권장)
const APOSE_MIN = 0.35;        // avgAbsZ >= 0.35 → A-pose 시작
const APOSE_MAX = 1.20;        // avgAbsZ <= 1.20 → A-pose 범위

// 자세 안정화 게이트 임계값
const STABILITY_THRESHOLD = 0.05;  // quaternion 각도 변화량 임계값 (라디안)
const STABILITY_WINDOW = 5;        // 안정성 판단을 위한 프레임 수

// ============================================================================
// 타입 정의
// ============================================================================

interface EulerRotation {
  x: number;
  y: number;
  z: number;
}

interface ZStabilizationState {
  lastZ: number;
  emaZ: number;
}

/**
 * 자세 맞추기 상태 (내부적으로는 오프셋 추정)
 * UI에서는 "자세 맞추기" 상태로만 표시
 */
interface PoseAlignmentState {
  isAligning: boolean;           // 자세 맞추기 진행 중
  samples: THREE.Quaternion[];   // 수집된 샘플
  sampleCount: number;           // 현재 샘플 수
  targetQuaternion: THREE.Quaternion | null;  // 목표 자세
  offsetQuaternion: THREE.Quaternion | null;  // 계산된 오프셋
  // 자세 안정화 게이트
  stabilityHistory: number[];    // 최근 프레임의 변화량
  isStable: boolean;             // 현재 안정 상태 여부
  stableFrameCount: number;      // 연속 안정 프레임 수
}

interface BonePoseAlignmentData {
  [boneName: string]: PoseAlignmentState;
}

/**
 * 자세 맞추기 UI 상태
 * 사용자에게 노출되는 정보만 포함 (전문 용어 없음)
 */
export interface PoseAlignmentUIState {
  status: 'idle' | 'waiting' | 'aligning' | 'completed' | 'failed';
  progress: number;              // 0~100
  message: string;               // 사용자에게 보여줄 메시지
  subMessage?: string;           // 부가 안내 메시지
  isStable: boolean;             // 자세가 안정적인지
}

interface AnimatorConfig {
  // Phase 선택 (1 = Euler offset, 2 = Quaternion SLERP)
  phase: 1 | 2;

  // A-pose 오프셋 (Phase 1 전용, Phase 2에서는 무시됨)
  // 기본값 0으로 시작, diagnoseVRMRestPose() 결과 참고하여 updateConfig()로 조정
  aPoseOffset: {
    LeftUpperArm: EulerRotation;
    RightUpperArm: EulerRotation;
    LeftLowerArm: EulerRotation;
    RightLowerArm: EulerRotation;
  };

  // Z축 안정화 파라미터
  zStabilization: {
    enabled: boolean;
    emaAlpha: number;        // EMA 스무딩 계수 (0.0~1.0, 낮을수록 부드러움)
    jumpThreshold: number;   // 점프 제한 임계값 (라디안)
    clampMin: number;        // Z축 최소값
    clampMax: number;        // Z축 최대값
  };

  // X/Y축 안정화 파라미터 (UpperArm 전용, 선택적)
  xyStabilization: {
    enabled: boolean;
    emaAlpha: number;
    clampX: { min: number; max: number } | null;
    clampY: { min: number; max: number } | null;
  };

  // Quaternion SLERP 스무딩 (Phase 2 전용)
  // Phase 2에서 Euler→Quaternion 변환 후 축 혼선으로 인한 떨림 감소
  quaternionSmoothing: {
    enabled: boolean;
    slerpFactor: number;  // 0.0~1.0, 낮을수록 부드러움
  };

  // 자세 맞추기 파라미터 (내부적으로는 오프셋 추정)
  poseAlignment: {
    sampleCount: number;      // 수집할 샘플 수 (약 1초 = 30프레임)
    stabilityRequired: number; // 안정 상태 필요 프레임 수
  };

  // 기본 댐핑 (보간 속도)
  dampening: number;

  // 디버그 모드
  debug: boolean;
  debugInterval: number; // 디버그 로그 출력 간격 (프레임)
}

// ============================================================================
// VRM 본 이름 상수
// ============================================================================

const BoneNames = {
  Hips: 'hips' as VRMHumanBoneName,
  Spine: 'spine' as VRMHumanBoneName,
  Chest: 'chest' as VRMHumanBoneName,
  Neck: 'neck' as VRMHumanBoneName,
  Head: 'head' as VRMHumanBoneName,
  LeftUpperArm: 'leftUpperArm' as VRMHumanBoneName,
  LeftLowerArm: 'leftLowerArm' as VRMHumanBoneName,
  LeftHand: 'leftHand' as VRMHumanBoneName,
  RightUpperArm: 'rightUpperArm' as VRMHumanBoneName,
  RightLowerArm: 'rightLowerArm' as VRMHumanBoneName,
  RightHand: 'rightHand' as VRMHumanBoneName,
  LeftUpperLeg: 'leftUpperLeg' as VRMHumanBoneName,
  LeftLowerLeg: 'leftLowerLeg' as VRMHumanBoneName,
  LeftFoot: 'leftFoot' as VRMHumanBoneName,
  RightUpperLeg: 'rightUpperLeg' as VRMHumanBoneName,
  RightLowerLeg: 'rightLowerLeg' as VRMHumanBoneName,
  RightFoot: 'rightFoot' as VRMHumanBoneName,
};

// ============================================================================
// 전역 상태
// ============================================================================

// 기본 설정 (T-pose rest-pose 최적화)
const defaultConfig: AnimatorConfig = {
  // T-pose VRM은 Phase 1 권장 (Kalidokit 기본값과 호환)
  phase: 1,

  // T-pose에서는 오프셋 불필요 (모두 0)
  aPoseOffset: {
    LeftUpperArm: { x: 0, y: 0, z: 0 },
    RightUpperArm: { x: 0, y: 0, z: 0 },
    LeftLowerArm: { x: 0, y: 0, z: 0 },
    RightLowerArm: { x: 0, y: 0, z: 0 },
  },

  // Z축 안정화 (T-pose에 맞게 조정)
  zStabilization: {
    enabled: true,
    emaAlpha: 0.4,          // 빠른 반응 (T-pose는 오프셋 없어 안정적)
    jumpThreshold: 0.6,     // 자연스러운 움직임 허용
    clampMin: -2.0,         // T-pose 팔 범위 확장
    clampMax: 2.0,
  },

  xyStabilization: {
    enabled: false,
    emaAlpha: 0.3,
    clampX: null,
    clampY: null,
  },

  // Phase 1에서는 quaternionSmoothing 비활성화
  // Phase 2에서는 enforceStabilizationPolicy()가 강제 활성화
  quaternionSmoothing: {
    enabled: false,
    slerpFactor: 0.3,
  },

  poseAlignment: {
    sampleCount: 30,           // 약 1초 (30fps 기준)
    stabilityRequired: 10,     // 10프레임 연속 안정 필요
  },

  // T-pose는 반응성 높여도 안정적
  dampening: 0.6,
  debug: true,
  debugInterval: 60,  // 더 자주 로그 출력 (테스트용)
};

let config: AnimatorConfig = JSON.parse(JSON.stringify(defaultConfig));

// Z축 안정화 상태 (본별)
const zStabilizationState: { [boneName: string]: ZStabilizationState } = {};

// X/Y축 안정화 상태 (본별) - UpperArm 전용
const xyStabilizationState: { [boneName: string]: { emaX: number; emaY: number } } = {};

// Quaternion 스무딩 상태 (본별)
const quaternionSmoothingState: { [boneName: string]: THREE.Quaternion } = {};

// 자세 맞추기 상태 (본별) - 내부적으로는 오프셋 추정
const poseAlignmentData: BonePoseAlignmentData = {};

// 이전 프레임 rawRotation (안정성 판단용)
const previousRawRotations: { [boneName: string]: THREE.Quaternion } = {};

// 디버그 프레임 카운터
let frameCount = 0;

// ============================================================================
// Phase별 안정화 옵션 정책 강제
// ============================================================================

/**
 * Phase별 안정화 옵션 정책 강제
 * - Phase 1: zStabilization=ON, xyStabilization=OFF, quaternionSmoothing=OFF
 * - Phase 2: zStabilization=OFF, xyStabilization=OFF, quaternionSmoothing=ON (축 혼선 떨림 방지)
 */
function enforceStabilizationPolicy(): void {
  if (config.phase === 1) {
    config.zStabilization.enabled = true;
    config.xyStabilization.enabled = false;
    config.quaternionSmoothing.enabled = false;
  } else {
    // Phase 2: Euler→Quaternion 변환 시 축 혼선 떨림 방지를 위해 SLERP 스무딩 강제
    config.zStabilization.enabled = false;
    config.xyStabilization.enabled = false;
    config.quaternionSmoothing.enabled = true;
  }
}

// ============================================================================
// 설정 관리 함수
// ============================================================================

/**
 * Euler 객체 깊은 병합 헬퍼
 */
function mergeEulerRotation(
  target: EulerRotation,
  source: Partial<EulerRotation> | undefined
): EulerRotation {
  if (!source) return target;
  return {
    x: source.x ?? target.x,
    y: source.y ?? target.y,
    z: source.z ?? target.z,
  };
}

/**
 * 설정 업데이트 (부분 업데이트 지원, 깊은 병합)
 */
export function updateConfig(partialConfig: Partial<AnimatorConfig>): void {
  // aPoseOffset 깊은 병합
  if (partialConfig.aPoseOffset) {
    config.aPoseOffset = {
      LeftUpperArm: mergeEulerRotation(
        config.aPoseOffset.LeftUpperArm,
        partialConfig.aPoseOffset.LeftUpperArm
      ),
      RightUpperArm: mergeEulerRotation(
        config.aPoseOffset.RightUpperArm,
        partialConfig.aPoseOffset.RightUpperArm
      ),
      LeftLowerArm: mergeEulerRotation(
        config.aPoseOffset.LeftLowerArm,
        partialConfig.aPoseOffset.LeftLowerArm
      ),
      RightLowerArm: mergeEulerRotation(
        config.aPoseOffset.RightLowerArm,
        partialConfig.aPoseOffset.RightLowerArm
      ),
    };
  }

  // zStabilization 깊은 병합
  if (partialConfig.zStabilization) {
    config.zStabilization = {
      ...config.zStabilization,
      ...partialConfig.zStabilization,
    };
  }

  // xyStabilization 깊은 병합
  if (partialConfig.xyStabilization) {
    config.xyStabilization = {
      ...config.xyStabilization,
      ...partialConfig.xyStabilization,
    };
  }

  // quaternionSmoothing 깊은 병합
  if (partialConfig.quaternionSmoothing) {
    config.quaternionSmoothing = {
      ...config.quaternionSmoothing,
      ...partialConfig.quaternionSmoothing,
    };
  }

  // poseAlignment 깊은 병합
  if (partialConfig.poseAlignment) {
    config.poseAlignment = {
      ...config.poseAlignment,
      ...partialConfig.poseAlignment,
    };
  }

  // 나머지 최상위 필드 병합
  if (partialConfig.phase !== undefined) config.phase = partialConfig.phase;
  if (partialConfig.dampening !== undefined) config.dampening = partialConfig.dampening;
  if (partialConfig.debug !== undefined) config.debug = partialConfig.debug;
  if (partialConfig.debugInterval !== undefined) config.debugInterval = partialConfig.debugInterval;

  // Phase별 정책 강제 적용
  enforceStabilizationPolicy();
}

/**
 * 현재 설정 조회 (깊은 복사로 반환)
 */
export function getConfig(): Readonly<AnimatorConfig> {
  return JSON.parse(JSON.stringify(config));
}

/**
 * 설정 초기화
 */
export function resetConfig(): void {
  config = JSON.parse(JSON.stringify(defaultConfig));
  enforceStabilizationPolicy();
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 미러링을 위한 normalized 랜드마크 X 좌표 반전 (0~1 범위)
 */
function mirrorNormalizedLandmarks(landmarks: Landmark[]): Landmark[] {
  return landmarks.map((lm) => ({
    x: 1 - lm.x,  // normalized 좌표: 1에서 빼기
    y: lm.y,
    z: lm.z,
    visibility: lm.visibility,
  }));
}

/**
 * 미러링을 위한 world 랜드마크 X 좌표 반전 (실수 범위)
 */
function mirrorWorldLandmarks(landmarks: Landmark[]): Landmark[] {
  return landmarks.map((lm) => ({
    x: -lm.x,  // world 좌표: 부호 반전
    y: lm.y,
    z: lm.z,
    visibility: lm.visibility,
  }));
}

/**
 * 값 클램핑
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Z축 안정화 적용 (EMA + 점프 제한 + 클램프)
 * 최종 값(오프셋 적용 후)에 적용
 */
function stabilizeZ(boneName: string, rawZ: number): number {
  if (!config.zStabilization.enabled) return rawZ;

  // 상태 초기화
  if (!zStabilizationState[boneName]) {
    zStabilizationState[boneName] = { lastZ: rawZ, emaZ: rawZ };
  }

  const state = zStabilizationState[boneName];
  const { emaAlpha, jumpThreshold, clampMin, clampMax } = config.zStabilization;

  // 1. 점프 제한 (급격한 변화 방지)
  let limitedZ = rawZ;
  const diff = rawZ - state.lastZ;
  if (Math.abs(diff) > jumpThreshold) {
    limitedZ = state.lastZ + Math.sign(diff) * jumpThreshold;
  }

  // 2. EMA 스무딩
  const smoothedZ = state.emaZ * (1 - emaAlpha) + limitedZ * emaAlpha;

  // 3. 클램프
  const finalZ = clamp(smoothedZ, clampMin, clampMax);

  // 상태 업데이트
  state.lastZ = limitedZ;
  state.emaZ = smoothedZ;

  return finalZ;
}

/**
 * X/Y축 안정화 적용 (UpperArm 전용, 선택적)
 */
function stabilizeXY(
  boneName: string,
  rawX: number,
  rawY: number
): { x: number; y: number } {
  if (!config.xyStabilization.enabled) return { x: rawX, y: rawY };

  // UpperArm만 적용
  if (!boneName.includes('UpperArm')) return { x: rawX, y: rawY };

  // 상태 초기화
  if (!xyStabilizationState[boneName]) {
    xyStabilizationState[boneName] = { emaX: rawX, emaY: rawY };
  }

  const state = xyStabilizationState[boneName];
  const { emaAlpha, clampX, clampY } = config.xyStabilization;

  // EMA 스무딩
  const smoothedX = state.emaX * (1 - emaAlpha) + rawX * emaAlpha;
  const smoothedY = state.emaY * (1 - emaAlpha) + rawY * emaAlpha;

  // 클램프 (설정된 경우만)
  let finalX = smoothedX;
  let finalY = smoothedY;

  if (clampX) {
    finalX = clamp(smoothedX, clampX.min, clampX.max);
  }
  if (clampY) {
    finalY = clamp(smoothedY, clampY.min, clampY.max);
  }

  // 상태 업데이트
  state.emaX = smoothedX;
  state.emaY = smoothedY;

  return { x: finalX, y: finalY };
}

/**
 * Quaternion SLERP 스무딩 적용 (Phase 2 전용)
 * Euler→Quaternion 변환 시 축 혼선으로 인한 떨림 감소
 */
function smoothQuaternion(boneName: string, targetQuat: THREE.Quaternion): THREE.Quaternion {
  // Phase 2가 아니면 스무딩 적용하지 않음 (방어 로직)
  if (config.phase !== 2 || !config.quaternionSmoothing.enabled) {
    return targetQuat;
  }

  // 상태 초기화
  if (!quaternionSmoothingState[boneName]) {
    quaternionSmoothingState[boneName] = targetQuat.clone();
    return targetQuat;
  }

  const currentQuat = quaternionSmoothingState[boneName];
  const { slerpFactor } = config.quaternionSmoothing;

  // SLERP 보간
  currentQuat.slerp(targetQuat, slerpFactor);

  return currentQuat.clone();
}

/**
 * 자세 안정성 체크 (움직임 감지)
 * rawRotation을 quaternion으로 변환하여 이전 프레임과 비교
 */
function checkPoseStability(boneName: string, rawRotation: EulerRotation): boolean {
  const currentQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(rawRotation.x, rawRotation.y, rawRotation.z, 'XYZ')
  );

  // 이전 프레임 없으면 초기화
  if (!previousRawRotations[boneName]) {
    previousRawRotations[boneName] = currentQuat.clone();
    return true;
  }

  const prevQuat = previousRawRotations[boneName];

  // 두 quaternion 사이의 각도 차이 계산
  const angleDiff = prevQuat.angleTo(currentQuat);

  // 상태 업데이트
  previousRawRotations[boneName] = currentQuat.clone();

  // 임계값 이하면 안정적
  return angleDiff < STABILITY_THRESHOLD;
}

// ============================================================================
// 디버그 함수
// ============================================================================

/**
 * 프레임별 디버그 로그 (Phase 2에서는 quaternion 포함)
 */
function debugLogFrame(
  boneName: string,
  raw: EulerRotation,
  final: EulerRotation,
  bone: THREE.Object3D | null
): void {
  if (!config.debug) return;
  if (frameCount % config.debugInterval !== 0) return;

  const quatInfo = bone
    ? `quat(${bone.quaternion.x.toFixed(3)}, ${bone.quaternion.y.toFixed(3)}, ${bone.quaternion.z.toFixed(3)}, ${bone.quaternion.w.toFixed(3)})`
    : 'no bone';

  console.log(
    `[VRM] ${boneName} | raw z=${raw.z.toFixed(3)} → final z=${final.z.toFixed(3)} | ${quatInfo}`
  );
}

/**
 * VRM 모델의 rest pose 진단 (개발자용)
 *
 * 주의: 이 함수는 '추정'만 제공하며, 사용자에게 노출되지 않음
 * 결과를 참고하여 Phase 2 자세 맞추기를 사용하거나 수동 aPoseOffset 조정
 *
 * @returns 개발자 진단 정보 (UI에 직접 노출하지 말 것)
 */
export function diagnoseVRMRestPose(vrm: VRM): {
  leftUpperArmZ: number;
  rightUpperArmZ: number;
  avgAbsZ: number;
  /** 내부 추정값 - UI에 노출하지 말 것 */
  _internalEstimatedType: 'A-pose' | 'T-pose' | 'unknown';
  /** 개발자용 권장사항 */
  _devRecommendation: string;
} {
  const leftArm = vrm.humanoid?.getNormalizedBoneNode(BoneNames.LeftUpperArm);
  const rightArm = vrm.humanoid?.getNormalizedBoneNode(BoneNames.RightUpperArm);

  // Quaternion → Euler 변환으로 Z축 측정 (gimbal 영향 최소화)
  const leftEuler = leftArm
    ? new THREE.Euler().setFromQuaternion(leftArm.quaternion, 'XYZ')
    : new THREE.Euler();
  const rightEuler = rightArm
    ? new THREE.Euler().setFromQuaternion(rightArm.quaternion, 'XYZ')
    : new THREE.Euler();

  const leftZ = leftEuler.z;
  const rightZ = rightEuler.z;
  const avgAbsZ = (Math.abs(leftZ) + Math.abs(rightZ)) / 2;

  // 내부 추정 (사용자에게 노출하지 않음)
  let estimatedType: 'A-pose' | 'T-pose' | 'unknown' = 'unknown';
  let devRecommendation = '';

  if (avgAbsZ < TPOSE_THRESHOLD) {
    // T-pose 감지 (권장)
    estimatedType = 'T-pose';
    devRecommendation = `[DEV] ✓ T-pose detected (avgAbsZ=${avgAbsZ.toFixed(3)}). ` +
      `Phase 1 recommended - Kalidokit defaults work perfectly!`;
  } else if (avgAbsZ >= APOSE_MIN && avgAbsZ <= APOSE_MAX) {
    estimatedType = 'A-pose';
    devRecommendation = `[DEV] A-pose detected (avgAbsZ=${avgAbsZ.toFixed(3)}). ` +
      `Use Phase 2 with startPoseAlignment() for automatic offset estimation.`;
  } else {
    devRecommendation = `[DEV] Uncertain pose (avgAbsZ=${avgAbsZ.toFixed(3)}). ` +
      `Try startPoseAlignment() or manual aPoseOffset adjustment.`;
  }

  if (config.debug) {
    console.log(`[VRM Diagnose] Left UpperArm.z: ${leftZ.toFixed(3)}, Right UpperArm.z: ${rightZ.toFixed(3)}`);
    console.log(`[VRM Diagnose] ${devRecommendation}`);
  }

  return {
    leftUpperArmZ: leftZ,
    rightUpperArmZ: rightZ,
    avgAbsZ,
    _internalEstimatedType: estimatedType,
    _devRecommendation: devRecommendation,
  };
}

// ============================================================================
// 자세 맞추기 함수 (사용자 친화적 API)
// 내부적으로는 오프셋 추정(calibration)을 수행
// ============================================================================

/**
 * 자세 맞추기 시작
 * 사용자에게는 "1초만 가만히 서 주세요"로 안내
 *
 * @param vrm - VRM 모델
 * @param boneNames - 맞출 본 목록 (기본: 양쪽 UpperArm)
 */
export function startPoseAlignment(
  vrm: VRM,
  boneNames: VRMHumanBoneName[] = [BoneNames.LeftUpperArm, BoneNames.RightUpperArm]
): void {
  // Phase 2로 전환 (자세 맞추기는 Phase 2에서 동작)
  if (config.phase !== 2) {
    updateConfig({ phase: 2 });
  }

  // rest pose 복원 후 시작 (깨끗한 상태에서 샘플링)
  restoreVRMRestPose(vrm);

  for (const boneName of boneNames) {
    const bone = vrm.humanoid?.getNormalizedBoneNode(boneName);

    poseAlignmentData[boneName] = {
      isAligning: true,
      samples: [],
      sampleCount: 0,
      // 시작 시점의 bone quaternion을 target으로 캡처
      targetQuaternion: bone ? bone.quaternion.clone() : new THREE.Quaternion(),
      offsetQuaternion: null,
      // 자세 안정화 게이트 초기화
      stabilityHistory: [],
      isStable: false,
      stableFrameCount: 0,
    };
  }

  if (config.debug) {
    console.log(`[PoseAlignment] Started for bones: ${boneNames.join(', ')}`);
  }
}

/**
 * 자세 맞추기 샘플 추가 (내부 함수)
 * rawRotation(Kalidokit 원본, 오프셋/안정화 적용 전)을 수집
 * 자세가 안정적일 때만 샘플 누적
 */
function addAlignmentSample(boneName: string, rawRotation: EulerRotation): void {
  const state = poseAlignmentData[boneName];
  if (!state || !state.isAligning) return;

  // 자세 안정성 체크
  const isCurrentlyStable = checkPoseStability(boneName, rawRotation);

  // 안정성 히스토리 업데이트
  state.stabilityHistory.push(isCurrentlyStable ? 1 : 0);
  if (state.stabilityHistory.length > STABILITY_WINDOW) {
    state.stabilityHistory.shift();
  }

  // 연속 안정 프레임 카운트
  if (isCurrentlyStable) {
    state.stableFrameCount++;
  } else {
    state.stableFrameCount = 0;
  }

  // 충분히 안정적인지 판단
  state.isStable = state.stableFrameCount >= config.poseAlignment.stabilityRequired;

  // 안정 상태가 아니면 샘플 누적하지 않음 (재시도 없이 기다림)
  if (!state.isStable) {
    if (config.debug && frameCount % 30 === 0) {
      console.log(`[PoseAlignment] ${boneName}: Waiting for stability... (stableFrames: ${state.stableFrameCount})`);
    }
    return;
  }

  // rawRotation을 Quaternion으로 변환하여 수집
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler(rawRotation.x, rawRotation.y, rawRotation.z, 'XYZ');
  quat.setFromEuler(euler);

  state.samples.push(quat);
  state.sampleCount++;

  if (config.debug && state.sampleCount % 10 === 0) {
    console.log(`[PoseAlignment] ${boneName}: Collected ${state.sampleCount}/${config.poseAlignment.sampleCount} samples`);
  }

  if (state.sampleCount >= config.poseAlignment.sampleCount) {
    finishPoseAlignment(boneName);
  }
}

/**
 * 자세 맞추기 완료 및 오프셋 계산 (내부 함수)
 * Q_offset = Q_target × inverse(Q_measuredAvg)
 * Hemisphere 정렬 적용 (dot < 0이면 부호 반전)
 */
function finishPoseAlignment(boneName: string): void {
  const state = poseAlignmentData[boneName];
  if (!state || state.samples.length === 0) return;

  // Hemisphere 정렬: 첫 번째 샘플을 기준으로 같은 반구에 정렬
  const refQuat = state.samples[0].clone();
  for (let i = 1; i < state.samples.length; i++) {
    if (refQuat.dot(state.samples[i]) < 0) {
      // 부호 반전 (같은 반구로 정렬)
      state.samples[i].set(
        -state.samples[i].x,
        -state.samples[i].y,
        -state.samples[i].z,
        -state.samples[i].w
      );
    }
  }

  // Quaternion 평균 (SLERP 체인)
  let avgQuat = state.samples[0].clone();
  for (let i = 1; i < state.samples.length; i++) {
    avgQuat.slerp(state.samples[i], 1 / (i + 1));
  }

  // 오프셋 계산: Q_offset = Q_target × inverse(Q_measuredAvg)
  const targetQuat = state.targetQuaternion ?? new THREE.Quaternion();
  const invAvg = avgQuat.clone().invert();
  state.offsetQuaternion = targetQuat.clone().multiply(invAvg);

  state.isAligning = false;

  if (config.debug) {
    console.log(
      `[PoseAlignment] Finished for ${boneName}. ` +
      `Offset: (${state.offsetQuaternion.x.toFixed(3)}, ${state.offsetQuaternion.y.toFixed(3)}, ` +
      `${state.offsetQuaternion.z.toFixed(3)}, ${state.offsetQuaternion.w.toFixed(3)})`
    );
  }
}

/**
 * 자세 맞추기 상태 조회 (사용자 친화적)
 * UI에서 사용할 상태와 메시지 반환
 */
export function getPoseAlignmentState(boneName?: string): PoseAlignmentUIState {
  // 특정 본 또는 전체 상태 확인
  const boneNames = boneName
    ? [boneName]
    : Object.keys(poseAlignmentData);

  if (boneNames.length === 0) {
    return {
      status: 'idle',
      progress: 0,
      message: '',
      isStable: true,
    };
  }

  let totalSamples = 0;
  let totalRequired = 0;
  let isAnyAligning = false;
  let isAllStable = true;
  let isAllCompleted = true;

  for (const name of boneNames) {
    const state = poseAlignmentData[name];
    if (!state) continue;

    totalSamples += state.sampleCount;
    totalRequired += config.poseAlignment.sampleCount;

    if (state.isAligning) {
      isAnyAligning = true;
      isAllCompleted = false;
    }
    if (!state.isStable && state.isAligning) {
      isAllStable = false;
    }
  }

  const progress = totalRequired > 0 ? Math.round((totalSamples / totalRequired) * 100) : 0;

  // HearO 톤앤매너에 맞는 사용자 친화적 메시지
  if (!isAnyAligning && isAllCompleted && totalSamples > 0) {
    return {
      status: 'completed',
      progress: 100,
      message: '자세 맞추기 완료!',
      subMessage: '이제 운동을 시작할 준비가 됐어요!',
      isStable: true,
    };
  }

  if (isAnyAligning) {
    if (!isAllStable) {
      return {
        status: 'waiting',
        progress,
        message: '잠깐만요, 조금만 가만히...',
        subMessage: '움직임이 감지됐어요. 편하게 서 주세요.',
        isStable: false,
      };
    }
    return {
      status: 'aligning',
      progress,
      message: '자세를 맞추는 중...',
      subMessage: '좋아요! 조금만 더 기다려 주세요.',
      isStable: true,
    };
  }

  return {
    status: 'idle',
    progress: 0,
    message: '',
    isStable: true,
  };
}

/**
 * 자세 맞추기 진행 중인지 확인
 */
export function isPoseAlignmentInProgress(): boolean {
  return Object.values(poseAlignmentData).some((state) => state.isAligning);
}

/**
 * 자세 맞추기가 완료되었는지 확인
 */
export function isPoseAlignmentCompleted(): boolean {
  const states = Object.values(poseAlignmentData);
  if (states.length === 0) return false;
  return states.every((state) => !state.isAligning && state.offsetQuaternion !== null);
}

/**
 * 자세 맞추기 초기화
 */
export function resetPoseAlignment(): void {
  Object.keys(poseAlignmentData).forEach((key) => delete poseAlignmentData[key]);
  Object.keys(previousRawRotations).forEach((key) => delete previousRawRotations[key]);

  if (config.debug) {
    console.log('[PoseAlignment] Reset all alignment data');
  }
}

// ============================================================================
// Deprecated Aliases (호환성)
// ============================================================================

/**
 * @deprecated Use startPoseAlignment instead
 */
export const startCalibration = startPoseAlignment;

/**
 * @deprecated Use getPoseAlignmentState instead
 */
export function getCalibrationState(boneName: string): PoseAlignmentState | null {
  console.warn('[Deprecated] getCalibrationState is deprecated. Use getPoseAlignmentState instead.');
  return poseAlignmentData[boneName] || null;
}

/**
 * @deprecated Use resetPoseAlignment instead
 */
export const resetCalibration = resetPoseAlignment;

// ============================================================================
// 회전 적용 함수
// ============================================================================

/**
 * Phase 1: Euler 기반 회전 적용
 * 오프셋 적용 → 안정화 → bone.rotation에 보간 적용
 */
function applyRotationPhase1(
  vrm: VRM,
  boneName: VRMHumanBoneName,
  rawRotation: EulerRotation | undefined,
  offsetKey?: keyof AnimatorConfig['aPoseOffset']
): void {
  if (!rawRotation) return;

  const bone = vrm.humanoid?.getNormalizedBoneNode(boneName);
  if (!bone) return;

  // 1. 오프셋 적용 (빼기: raw - offset = 보정된 값)
  let rotation = { ...rawRotation };
  if (offsetKey && config.aPoseOffset[offsetKey]) {
    const offset = config.aPoseOffset[offsetKey];
    rotation.x -= offset.x;
    rotation.y -= offset.y;
    rotation.z -= offset.z;
  }

  // 2. X/Y 안정화 (UpperArm만, 선택적)
  const stabilizedXY = stabilizeXY(boneName, rotation.x, rotation.y);
  rotation.x = stabilizedXY.x;
  rotation.y = stabilizedXY.y;

  // 3. Z축 안정화 (오프셋 적용 후의 최종 값에 적용)
  rotation.z = stabilizeZ(boneName, rotation.z);

  // 디버그 로그
  debugLogFrame(boneName, rawRotation, rotation, bone);

  // 4. 보간 적용
  const d = config.dampening;
  bone.rotation.x += (rotation.x - bone.rotation.x) * d;
  bone.rotation.y += (rotation.y - bone.rotation.y) * d;
  bone.rotation.z += (rotation.z - bone.rotation.z) * d;
}

/**
 * Phase 2: Quaternion SLERP 기반 회전 적용
 * Euler → Quaternion 변환 → 자세 맞추기 오프셋 적용 → SLERP 스무딩 → bone.quaternion에 적용
 *
 * Phase 2에서는 aPoseOffset을 무시하고 자세 맞추기 오프셋만 사용
 */
function applyRotationPhase2(
  vrm: VRM,
  boneName: VRMHumanBoneName,
  rawRotation: EulerRotation | undefined
): void {
  if (!rawRotation) return;

  const bone = vrm.humanoid?.getNormalizedBoneNode(boneName);
  if (!bone) return;

  // 자세 맞추기 진행 중이면 rawRotation 기반 샘플 수집
  // 오프셋/안정화 적용 전의 순수한 Kalidokit 값 사용
  const alignState = poseAlignmentData[boneName];
  if (alignState?.isAligning) {
    addAlignmentSample(boneName, rawRotation);
  }

  // 1. X/Y 안정화 (선택적)
  let rotation = { ...rawRotation };
  const stabilizedXY = stabilizeXY(boneName, rotation.x, rotation.y);
  rotation.x = stabilizedXY.x;
  rotation.y = stabilizedXY.y;

  // 2. Z축 안정화
  rotation.z = stabilizeZ(boneName, rotation.z);

  // 3. Euler → Quaternion 변환
  const euler = new THREE.Euler(rotation.x, rotation.y, rotation.z, 'XYZ');
  let targetQuat = new THREE.Quaternion().setFromEuler(euler);

  // 4. 자세 맞추기 오프셋 적용 (있는 경우, 자세 맞추기 중이 아닐 때만)
  if (alignState?.offsetQuaternion && !alignState.isAligning) {
    // Q_final = Q_offset × Q_measured
    targetQuat = alignState.offsetQuaternion.clone().multiply(targetQuat);
  }

  // 5. Quaternion SLERP 스무딩 (축 혼선 떨림 방지)
  const smoothedQuat = smoothQuaternion(boneName, targetQuat);

  // 디버그 로그
  debugLogFrame(boneName, rawRotation, rotation, bone);

  // 6. SLERP 보간으로 bone에 적용
  bone.quaternion.slerp(smoothedQuat, config.dampening);
}

/**
 * 통합 회전 적용 함수
 */
function applyRotation(
  vrm: VRM,
  boneName: VRMHumanBoneName,
  rawRotation: EulerRotation | undefined,
  offsetKey?: keyof AnimatorConfig['aPoseOffset']
): void {
  if (config.phase === 1) {
    applyRotationPhase1(vrm, boneName, rawRotation, offsetKey);
  } else {
    applyRotationPhase2(vrm, boneName, rawRotation);
  }
}

// ============================================================================
// 메인 함수
// ============================================================================

/**
 * MediaPipe 랜드마크를 VRM 캐릭터에 적용
 *
 * @param vrm - VRM 모델
 * @param poseLandmarks - 2D 정규화 포즈 랜드마크 (33개)
 * @param _handLandmarks - 손 랜드마크 (현재 미사용, 향후 손가락 리깅용)
 * @param options - 옵션 (미러링, 3D 월드 좌표, 이미지 크기)
 */
export function applyPoseToVRM(
  vrm: VRM,
  poseLandmarks: Landmark[],
  _handLandmarks?: { left?: Landmark[]; right?: Landmark[] },
  options?: {
    mirror?: boolean;
    worldLandmarks3D?: Landmark[];
    imageSize?: { width: number; height: number };
    useWorldLandmarks3D?: boolean;  // 기본 false
  }
): void {
  frameCount++;

  const mirror = options?.mirror ?? true;
  const worldLandmarks = options?.worldLandmarks3D;
  const imageSize = options?.imageSize ?? { width: 640, height: 480 };
  const useWorldLandmarks3D = options?.useWorldLandmarks3D ?? false;

  // 기본 검증
  if (!vrm.humanoid) {
    if (config.debug && frameCount % config.debugInterval === 0) {
      console.log('[VRM] No humanoid');
    }
    return;
  }

  if (!poseLandmarks || poseLandmarks.length < 33) {
    if (config.debug && frameCount % config.debugInterval === 0) {
      console.log('[VRM] Invalid landmarks:', poseLandmarks?.length);
    }
    return;
  }

  // 미러링 처리 (normalized와 world 좌표 분리)
  const processed2D = mirror ? mirrorNormalizedLandmarks(poseLandmarks) : poseLandmarks;

  let processed3D: Landmark[];
  if (useWorldLandmarks3D && worldLandmarks) {
    processed3D = mirror ? mirrorWorldLandmarks(worldLandmarks) : worldLandmarks;
  } else {
    processed3D = processed2D;
  }

  // Kalidokit 형식으로 변환
  const pose2D = processed2D.map((lm) => ({
    x: lm?.x ?? 0,
    y: lm?.y ?? 0,
    z: lm?.z ?? 0,
    visibility: lm?.visibility ?? 1,
  }));

  const pose3D = processed3D.map((lm) => ({
    x: lm?.x ?? 0,
    y: lm?.y ?? 0,
    z: lm?.z ?? 0,
    visibility: lm?.visibility ?? 1,
  }));

  // Kalidokit으로 포즈 리깅 계산
  let poseRig;
  try {
    poseRig = Kalidokit.Pose.solve(
      pose3D as Kalidokit.TFVectorPose,
      pose2D as Kalidokit.TFVectorPose,
      {
        runtime: 'mediapipe',
        imageSize,
        enableLegs: true,
      }
    );
  } catch (error) {
    if (config.debug && frameCount % config.debugInterval === 0) {
      console.warn('[VRM] Kalidokit solve failed:', error);
    }
    return;
  }

  if (!poseRig) return;

  // 척추 적용 (Y/Z 회전 제한)
  if (poseRig.Spine) {
    applyRotation(vrm, BoneNames.Spine, {
      x: poseRig.Spine.x,
      y: poseRig.Spine.y * 0.3,
      z: poseRig.Spine.z * 0.3,
    });
  }

  // 팔 적용
  if (poseRig.LeftUpperArm) {
    applyRotation(vrm, BoneNames.LeftUpperArm, poseRig.LeftUpperArm, 'LeftUpperArm');
  }
  if (poseRig.LeftLowerArm) {
    applyRotation(vrm, BoneNames.LeftLowerArm, poseRig.LeftLowerArm, 'LeftLowerArm');
  }
  if (poseRig.RightUpperArm) {
    applyRotation(vrm, BoneNames.RightUpperArm, poseRig.RightUpperArm, 'RightUpperArm');
  }
  if (poseRig.RightLowerArm) {
    applyRotation(vrm, BoneNames.RightLowerArm, poseRig.RightLowerArm, 'RightLowerArm');
  }

  // 다리 적용
  if (poseRig.LeftUpperLeg) {
    applyRotation(vrm, BoneNames.LeftUpperLeg, poseRig.LeftUpperLeg);
  }
  if (poseRig.LeftLowerLeg) {
    applyRotation(vrm, BoneNames.LeftLowerLeg, poseRig.LeftLowerLeg);
  }
  if (poseRig.RightUpperLeg) {
    applyRotation(vrm, BoneNames.RightUpperLeg, poseRig.RightUpperLeg);
  }
  if (poseRig.RightLowerLeg) {
    applyRotation(vrm, BoneNames.RightLowerLeg, poseRig.RightLowerLeg);
  }
}

/**
 * VRM 표정 설정
 */
export function setVRMExpression(vrm: VRM, expression: string, value: number = 1): void {
  if (!vrm.expressionManager) return;

  // 모든 표정 초기화
  vrm.expressionManager.setValue('happy', 0);
  vrm.expressionManager.setValue('sad', 0);
  vrm.expressionManager.setValue('angry', 0);
  vrm.expressionManager.setValue('surprised', 0);
  vrm.expressionManager.setValue('relaxed', 0);

  // 지정 표정 설정
  vrm.expressionManager.setValue(expression, value);
}

/**
 * VRM 포즈 리셋
 * 모든 본의 quaternion을 identity로 설정하고 팔을 자연스럽게 내림
 *
 * @param options.lowerArms - 팔을 내릴지 여부 (기본: true)
 */
export function resetVRMPose(vrm: VRM, options?: { lowerArms?: boolean }): void {
  if (!vrm.humanoid) return;

  const lowerArms = options?.lowerArms ?? true;

  if (config.debug) {
    console.log('[VRM] Resetting all bones to identity quaternion');
  }

  // 모든 본을 identity quaternion으로 리셋
  Object.values(BoneNames).forEach((boneName) => {
    const bone = vrm.humanoid?.getNormalizedBoneNode(boneName);
    if (bone) {
      bone.quaternion.identity();
    }
  });

  // 안정화 상태 초기화
  Object.keys(zStabilizationState).forEach((key) => delete zStabilizationState[key]);
  Object.keys(xyStabilizationState).forEach((key) => delete xyStabilizationState[key]);
  Object.keys(quaternionSmoothingState).forEach((key) => delete quaternionSmoothingState[key]);

  // 팔을 자연스럽게 내리기 (선택적)
  if (lowerArms) {
    const leftUpperArm = vrm.humanoid.getNormalizedBoneNode(BoneNames.LeftUpperArm);
    const rightUpperArm = vrm.humanoid.getNormalizedBoneNode(BoneNames.RightUpperArm);

    if (leftUpperArm) {
      const euler = new THREE.Euler(0.3, 0, 0.8, 'XYZ');
      leftUpperArm.quaternion.setFromEuler(euler);
    }
    if (rightUpperArm) {
      const euler = new THREE.Euler(0.3, 0, -0.8, 'XYZ');
      rightUpperArm.quaternion.setFromEuler(euler);
    }
  }

  if (config.debug) {
    console.log(`[VRM] Reset complete${lowerArms ? ' with arms lowered' : ''}`);
  }
}

/**
 * VRM rest pose 복원 (모델 고유 자세)
 * VRM의 normalizedRestPose를 사용하여 모델 원본 rest pose 복원
 */
export function restoreVRMRestPose(vrm: VRM): void {
  if (!vrm.humanoid) return;

  if (config.debug) {
    console.log('[VRM] Restoring to model\'s original normalized rest pose');
  }

  // VRM 1.0 API: resetNormalizedPose
  (vrm.humanoid as { resetNormalizedPose?: () => void }).resetNormalizedPose?.();

  // 안정화 상태 초기화
  Object.keys(zStabilizationState).forEach((key) => delete zStabilizationState[key]);
  Object.keys(xyStabilizationState).forEach((key) => delete xyStabilizationState[key]);
  Object.keys(quaternionSmoothingState).forEach((key) => delete quaternionSmoothingState[key]);

  if (config.debug) {
    console.log('[VRM] Restored to normalized rest pose');
  }
}
