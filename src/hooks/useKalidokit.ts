/**
 * useKalidokit - MediaPipe + Kalidokit + VRM 통합 훅
 * Utonics 스타일 벤치마킹 - 단순하고 깔끔한 구조
 *
 * 핵심 원칙:
 * 1. 단순한 좌표 변환 (X축, Z축 반전)
 * 2. 직접적인 Kalidokit.Pose.solve() 사용
 * 3. 다리 visibility 체크
 * 4. 손가락 추적 지원
 */

import { useEffect, useRef, useState } from 'react';
import * as Kalidokit from 'kalidokit';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { Euler, Quaternion } from 'three';
import type { Landmark } from '@/types/pose';

// ============================================================================
// 타입 정의
// ============================================================================

export interface UseKalidokitOptions {
  vrm: VRM | null;
  poseLandmarks: Landmark[] | null;
  worldLandmarks: Landmark[] | null;
  handLandmarks?: {
    left?: Landmark[] | null;
    right?: Landmark[] | null;
  };
  enabled?: boolean;
  mirror?: boolean;
}

export interface UseKalidokitReturn {
  isActive: boolean;
  frameCount: number;
  syncQuality: number;
  handSyncActive: boolean;
}

// ============================================================================
// 상수 정의
// ============================================================================

// 다리 가시성 임계값
const LEG_VISIBILITY_THRESHOLD = 0.5;

// 기본 보간 속도
const DEFAULT_LERP_AMOUNT = 0.3;
const DEFAULT_DAMPENER = 1;

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * Kalidokit 회전을 VRM humanoid bone에 적용하는 헬퍼 함수
 * Utonics 방식: 단순한 축 반전으로 좌표계 변환
 */
function rigRotation(
  vrm: VRM,
  boneName: VRMHumanBoneName,
  rotation: { x: number; y: number; z: number } | null | undefined,
  dampener = DEFAULT_DAMPENER,
  lerpAmount = DEFAULT_LERP_AMOUNT
): void {
  if (!rotation) return;

  const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
  if (!bone) return;

  // Kalidokit 회전값을 VRM 좌표계로 변환
  // MediaPipe/Kalidokit 좌표계 → Three.js/VRM 좌표계 변환
  // X축 반전 (상하), Z축 반전 (좌우 거울)
  const targetQuaternion = new Quaternion().setFromEuler(
    new Euler(
      rotation.x * -1,  // X축 반전 (상하)
      rotation.y,       // Y축 유지 (회전)
      rotation.z * -1   // Z축 반전 (좌우 거울)
    )
  );

  // 부드러운 보간 (SLERP)
  bone.quaternion.slerp(targetQuaternion, lerpAmount * dampener);
}

// ============================================================================
// 메인 훅
// ============================================================================

export function useKalidokit(options: UseKalidokitOptions): UseKalidokitReturn {
  const {
    vrm,
    poseLandmarks,
    worldLandmarks,
    handLandmarks,
    enabled = true,
    mirror = true,
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [syncQuality, setSyncQuality] = useState(0);
  const [handSyncActive, setHandSyncActive] = useState(false);

  // Refs for latest data (avoid stale closures)
  const poseLandmarksRef = useRef<Landmark[] | null>(null);
  const worldLandmarksRef = useRef<Landmark[] | null>(null);
  const handLandmarksRef = useRef<{ left?: Landmark[] | null; right?: Landmark[] | null }>({});
  const animationFrameRef = useRef<number>(0);

  // Update refs when data changes
  useEffect(() => {
    poseLandmarksRef.current = poseLandmarks;
  }, [poseLandmarks]);

  useEffect(() => {
    worldLandmarksRef.current = worldLandmarks;
  }, [worldLandmarks]);

  useEffect(() => {
    handLandmarksRef.current = handLandmarks || {};
  }, [handLandmarks]);

  // Main sync loop
  useEffect(() => {
    // 비활성화 시 정리 및 종료
    if (!enabled || !vrm) {
      setIsActive(false);
      setFrameCount(0);
      setSyncQuality(0);
      setHandSyncActive(false);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
      return;
    }

    setIsActive(true);
    let lastLogTime = 0;
    let localFrameCount = 0;

    const syncLoop = () => {
      const currentPose2D = poseLandmarksRef.current;
      const currentPose3D = worldLandmarksRef.current;

      // 유효한 랜드마크 체크
      if (
        currentPose2D &&
        currentPose2D.length >= 33 &&
        currentPose3D &&
        currentPose3D.length >= 33
      ) {
        const now = Date.now();

        try {
          // 모든 landmarks가 유효한지 확인
          const validLandmarks = currentPose2D.every(
            (lm) => lm && typeof lm.x === 'number' && typeof lm.y === 'number' && typeof lm.z === 'number'
          );

          const validWorldLandmarks = currentPose3D.every(
            (lm) => lm && typeof lm.x === 'number' && typeof lm.y === 'number' && typeof lm.z === 'number'
          );

          if (!validLandmarks || !validWorldLandmarks) {
            animationFrameRef.current = requestAnimationFrame(syncLoop);
            return;
          }

          // Kalidokit으로 자동 계산
          const riggedPose = Kalidokit.Pose.solve(
            currentPose3D,  // 3D world coordinates (첫 번째 파라미터)
            currentPose2D,  // 2D screen coordinates (두 번째 파라미터)
            {
              runtime: 'mediapipe',
              video: undefined,
              imageSize: { width: 640, height: 480 },
              enableLegs: true,
            }
          );

          // VRM humanoid bone에 적용
          if (riggedPose) {
            // 상체
            if (riggedPose.Hips?.rotation) {
              rigRotation(vrm, VRMHumanBoneName.Hips, riggedPose.Hips.rotation);
            }
            rigRotation(vrm, VRMHumanBoneName.Spine, riggedPose.Spine);
            // Chest, Neck, Head는 Face.solve()에서 제공됨 - 현재 미구현

            // 왼팔
            rigRotation(vrm, VRMHumanBoneName.LeftUpperArm, riggedPose.LeftUpperArm);
            rigRotation(vrm, VRMHumanBoneName.LeftLowerArm, riggedPose.LeftLowerArm);
            rigRotation(vrm, VRMHumanBoneName.LeftHand, riggedPose.LeftHand);

            // 오른팔
            rigRotation(vrm, VRMHumanBoneName.RightUpperArm, riggedPose.RightUpperArm);
            rigRotation(vrm, VRMHumanBoneName.RightLowerArm, riggedPose.RightLowerArm);
            rigRotation(vrm, VRMHumanBoneName.RightHand, riggedPose.RightHand);

            // 다리 - 하반신 랜드마크 가시성 확인 후 적용 (Utonics 방식)
            // MediaPipe 랜드마크: 23=왼쪽 엉덩이, 24=오른쪽 엉덩이, 25=왼쪽 무릎, 26=오른쪽 무릎
            const leftHipVisible = (currentPose2D[23]?.visibility ?? 0) >= LEG_VISIBILITY_THRESHOLD;
            const rightHipVisible = (currentPose2D[24]?.visibility ?? 0) >= LEG_VISIBILITY_THRESHOLD;
            const leftKneeVisible = (currentPose2D[25]?.visibility ?? 0) >= LEG_VISIBILITY_THRESHOLD;
            const rightKneeVisible = (currentPose2D[26]?.visibility ?? 0) >= LEG_VISIBILITY_THRESHOLD;

            // 왼쪽 다리: 엉덩이와 무릎이 모두 보일 때만 업데이트
            if (leftHipVisible && leftKneeVisible) {
              rigRotation(vrm, VRMHumanBoneName.LeftUpperLeg, riggedPose.LeftUpperLeg);
              rigRotation(vrm, VRMHumanBoneName.LeftLowerLeg, riggedPose.LeftLowerLeg);
            }

            // 오른쪽 다리: 엉덩이와 무릎이 모두 보일 때만 업데이트
            if (rightHipVisible && rightKneeVisible) {
              rigRotation(vrm, VRMHumanBoneName.RightUpperLeg, riggedPose.RightUpperLeg);
              rigRotation(vrm, VRMHumanBoneName.RightLowerLeg, riggedPose.RightLowerLeg);
            }

            localFrameCount++;
            setFrameCount(localFrameCount);

            // 1초마다 한 번씩 로그
            if (now - lastLogTime > 1000) {
              console.log('[useKalidokit] Sync active:', {
                frame: localFrameCount,
                pose: 'applied',
                leftLegVisible: leftHipVisible && leftKneeVisible,
                rightLegVisible: rightHipVisible && rightKneeVisible,
              });
              lastLogTime = now;
            }
          }

          // Sync quality 계산 (평균 visibility)
          const avgVisibility =
            currentPose2D.reduce((sum, lm) => sum + (lm.visibility ?? 1), 0) / currentPose2D.length;
          setSyncQuality(avgVisibility);

        } catch (error) {
          console.error('[useKalidokit] Pose sync error:', error);
        }
      }

      // 손가락 추적 (미러 모드: 왼손↔오른손 교차 매핑)
      const currentHands = handLandmarksRef.current;
      if (currentHands) {
        try {
          let handApplied = false;

          // 사용자 왼손 → 아바타 오른손 (미러 모드)
          if (currentHands.left && currentHands.left.length === 21) {
            const riggedHand = Kalidokit.Hand.solve(
              currentHands.left,
              mirror ? 'Right' : 'Left'  // 미러 모드면 반대편에 적용
            ) as Record<string, { x: number; y: number; z: number } | null>;

            if (riggedHand) {
              const targetSide = mirror ? 'Right' : 'Left';
              applyHandRotations(vrm, riggedHand, targetSide);
              handApplied = true;
            }
          }

          // 사용자 오른손 → 아바타 왼손 (미러 모드)
          if (currentHands.right && currentHands.right.length === 21) {
            const riggedHand = Kalidokit.Hand.solve(
              currentHands.right,
              mirror ? 'Left' : 'Right'  // 미러 모드면 반대편에 적용
            ) as Record<string, { x: number; y: number; z: number } | null>;

            if (riggedHand) {
              const targetSide = mirror ? 'Left' : 'Right';
              applyHandRotations(vrm, riggedHand, targetSide);
              handApplied = true;
            }
          }

          setHandSyncActive(handApplied);
        } catch (error) {
          console.error('[useKalidokit] Hand sync error:', error);
          setHandSyncActive(false);
        }
      } else {
        setHandSyncActive(false);
      }

      animationFrameRef.current = requestAnimationFrame(syncLoop);
    };

    animationFrameRef.current = requestAnimationFrame(syncLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, vrm, mirror]);

  return {
    isActive,
    frameCount,
    syncQuality,
    handSyncActive,
  };
}

/**
 * 손가락 회전 적용 (Utonics 방식)
 */
function applyHandRotations(
  vrm: VRM,
  riggedHand: Record<string, { x: number; y: number; z: number } | null>,
  side: 'Left' | 'Right'
): void {
  // 엄지
  rigRotation(vrm, `${side.toLowerCase()}ThumbMetacarpal` as VRMHumanBoneName, riggedHand[`${side}ThumbProximal`]);
  rigRotation(vrm, `${side.toLowerCase()}ThumbProximal` as VRMHumanBoneName, riggedHand[`${side}ThumbIntermediate`]);
  rigRotation(vrm, `${side.toLowerCase()}ThumbDistal` as VRMHumanBoneName, riggedHand[`${side}ThumbDistal`]);

  // 검지
  rigRotation(vrm, `${side.toLowerCase()}IndexProximal` as VRMHumanBoneName, riggedHand[`${side}IndexProximal`]);
  rigRotation(vrm, `${side.toLowerCase()}IndexIntermediate` as VRMHumanBoneName, riggedHand[`${side}IndexIntermediate`]);
  rigRotation(vrm, `${side.toLowerCase()}IndexDistal` as VRMHumanBoneName, riggedHand[`${side}IndexDistal`]);

  // 중지
  rigRotation(vrm, `${side.toLowerCase()}MiddleProximal` as VRMHumanBoneName, riggedHand[`${side}MiddleProximal`]);
  rigRotation(vrm, `${side.toLowerCase()}MiddleIntermediate` as VRMHumanBoneName, riggedHand[`${side}MiddleIntermediate`]);
  rigRotation(vrm, `${side.toLowerCase()}MiddleDistal` as VRMHumanBoneName, riggedHand[`${side}MiddleDistal`]);

  // 약지
  rigRotation(vrm, `${side.toLowerCase()}RingProximal` as VRMHumanBoneName, riggedHand[`${side}RingProximal`]);
  rigRotation(vrm, `${side.toLowerCase()}RingIntermediate` as VRMHumanBoneName, riggedHand[`${side}RingIntermediate`]);
  rigRotation(vrm, `${side.toLowerCase()}RingDistal` as VRMHumanBoneName, riggedHand[`${side}RingDistal`]);

  // 소지
  rigRotation(vrm, `${side.toLowerCase()}LittleProximal` as VRMHumanBoneName, riggedHand[`${side}LittleProximal`]);
  rigRotation(vrm, `${side.toLowerCase()}LittleIntermediate` as VRMHumanBoneName, riggedHand[`${side}LittleIntermediate`]);
  rigRotation(vrm, `${side.toLowerCase()}LittleDistal` as VRMHumanBoneName, riggedHand[`${side}LittleDistal`]);
}

// ============================================================================
// 유틸리티 함수 (외부 사용용)
// ============================================================================

/**
 * VRM 포즈 리셋 (T-pose)
 */
export function resetVRMPose(vrm: VRM): void {
  if (!vrm.humanoid) return;

  // 모든 본을 identity quaternion으로 리셋
  const boneNames: VRMHumanBoneName[] = [
    VRMHumanBoneName.Hips,
    VRMHumanBoneName.Spine,
    VRMHumanBoneName.Chest,
    VRMHumanBoneName.Neck,
    VRMHumanBoneName.Head,
    VRMHumanBoneName.LeftUpperArm,
    VRMHumanBoneName.LeftLowerArm,
    VRMHumanBoneName.LeftHand,
    VRMHumanBoneName.RightUpperArm,
    VRMHumanBoneName.RightLowerArm,
    VRMHumanBoneName.RightHand,
    VRMHumanBoneName.LeftUpperLeg,
    VRMHumanBoneName.LeftLowerLeg,
    VRMHumanBoneName.LeftFoot,
    VRMHumanBoneName.RightUpperLeg,
    VRMHumanBoneName.RightLowerLeg,
    VRMHumanBoneName.RightFoot,
  ];

  boneNames.forEach((boneName) => {
    const bone = vrm.humanoid?.getNormalizedBoneNode(boneName);
    if (bone) {
      bone.quaternion.identity();
    }
  });

  console.log('[useKalidokit] VRM pose reset to T-pose');
}

/**
 * VRM 표정 설정
 */
export function setVRMExpression(vrm: VRM, expression: string, value: number = 1): void {
  if (!vrm.expressionManager) return;

  // 모든 표정 초기화
  const expressions = ['happy', 'sad', 'angry', 'surprised', 'relaxed', 'neutral'];
  expressions.forEach((exp) => {
    vrm.expressionManager?.setValue(exp, 0);
  });

  // 지정 표정 설정
  vrm.expressionManager.setValue(expression, value);
}

export default useKalidokit;
