/**
 * MediaPipe Pose Detection 래퍼
 * @mediapipe/tasks-vision 기반
 */

import {
  PoseLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import type { Landmark } from '@/types/pose';
import {
  DEFAULT_SKELETON_STYLE,
  type SkeletonStyle,
  BODY_PART_WIDTH_MULTIPLIERS,
  CONNECTION_BODY_PARTS,
} from '@/constants/themes';

// ROM 측정에 필수인 주요 관절 (HearO-v2와 동일)
export const CRITICAL_JOINT_INDICES = [
  11, 12, // 어깨 (왼쪽, 오른쪽)
  13, 14, // 팔꿈치
  15, 16, // 손목
  23, 24, // 엉덩이
  25, 26, // 무릎
  27, 28, // 발목
];

// 얼굴 랜드마크 인덱스 (0-10) - 생략 대상
const FACE_LANDMARK_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 손가락/발가락 랜드마크 (17-22, 29-32) - 생략 대상
const EXTREMITY_LANDMARK_INDICES = [17, 18, 19, 20, 21, 22, 29, 30, 31, 32];

// 신뢰도 임계값
const VISIBILITY_THRESHOLD = 0.5;

// 모델 타입 정의
export type PoseModelType = 'lite' | 'full' | 'heavy';

// 설정 타입
export interface PoseDetectionConfig {
  modelType?: PoseModelType;
  minDetectionConfidence?: number;
  minPresenceConfidence?: number;
  minTrackingConfidence?: number;
  delegate?: 'GPU' | 'CPU';
}

// 기본 설정
const DEFAULT_CONFIG: Required<PoseDetectionConfig> = {
  modelType: 'lite',
  minDetectionConfidence: 0.5,
  minPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  delegate: 'GPU',
};

// 모델 URL 매핑
const MODEL_URLS: Record<PoseModelType, string> = {
  lite: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  full: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
  heavy: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
};

// 버전 고정: CDN과 package.json 버전 일치 필수
const MEDIAPIPE_VERSION = '0.10.22-rc.20250304';

let poseLandmarker: PoseLandmarker | null = null;
let lastVideoTime = -1;
let currentConfig: Required<PoseDetectionConfig> = { ...DEFAULT_CONFIG };

/**
 * MediaPipe 초기화
 * @param config 선택적 설정 (modelType, confidence 등)
 */
export async function initializePoseDetection(
  config?: PoseDetectionConfig
): Promise<PoseLandmarker> {
  // 설정 병합
  const newConfig = { ...DEFAULT_CONFIG, ...config };

  // 이미 같은 설정으로 초기화되어 있으면 재사용
  if (poseLandmarker && JSON.stringify(currentConfig) === JSON.stringify(newConfig)) {
    return poseLandmarker;
  }

  // 기존 인스턴스 정리
  if (poseLandmarker) {
    poseLandmarker.close();
    poseLandmarker = null;
  }

  currentConfig = newConfig;

  const vision = await FilesetResolver.forVisionTasks(
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
  );

  // PoseLandmarker는 기본적으로 worldLandmarks를 출력함 (별도 옵션 불필요)
  // result.worldLandmarks에서 3D 월드 좌표 접근 가능
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URLS[currentConfig.modelType],
      delegate: currentConfig.delegate,
    },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: currentConfig.minDetectionConfidence,
    minPosePresenceConfidence: currentConfig.minPresenceConfidence,
    minTrackingConfidence: currentConfig.minTrackingConfidence,
  });

  console.info(`MediaPipe initialized with ${currentConfig.modelType} model`);

  return poseLandmarker;
}

/**
 * 모델 타입 변경
 * 다음 initializePoseDetection 호출 시 적용됨
 */
export async function switchModel(modelType: PoseModelType): Promise<PoseLandmarker> {
  return initializePoseDetection({ ...currentConfig, modelType });
}

/**
 * 현재 설정 조회
 */
export function getCurrentConfig(): Required<PoseDetectionConfig> {
  return { ...currentConfig };
}

// 포즈 감지 결과 타입 (2D + 3D 좌표)
export interface PoseDetectionResult {
  landmarks2D: Landmark[];      // 정규화된 2D 좌표 (0~1)
  worldLandmarks3D: Landmark[]; // 3D 월드 좌표 (미터 단위)
}

// 포즈 감지 실행 (2D 좌표만 반환 - 하위 호환성)
export function detectPose(
  video: HTMLVideoElement,
  timestamp: number
): Landmark[] | null {
  const result = detectPoseWithWorld(video, timestamp);
  return result?.landmarks2D ?? null;
}

// 포즈 감지 실행 (2D + 3D 좌표 모두 반환) - Kalidokit용
export function detectPoseWithWorld(
  video: HTMLVideoElement,
  timestamp: number
): PoseDetectionResult | null {
  if (!poseLandmarker || video.currentTime === lastVideoTime) {
    return null;
  }

  lastVideoTime = video.currentTime;
  const results = poseLandmarker.detectForVideo(video, timestamp);

  if (results.landmarks && results.landmarks.length > 0) {
    // 2D 정규화 좌표
    const landmarks2D = results.landmarks[0].map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility ?? 0,
    }));

    // 3D 월드 좌표 (있으면 사용, 없으면 null)
    const worldLandmarks3D = results.worldLandmarks?.[0]?.map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility ?? 0,
    })) ?? null;

    // worldLandmarks3D가 null이면 landmarks2D를 fallback으로 사용
    return { landmarks2D, worldLandmarks3D: worldLandmarks3D ?? landmarks2D };
  }

  return null;
}

// 주요 연결선 정의 (몸통 중심, 얼굴/손가락/발가락 제외)
const BODY_CONNECTIONS: [number, number][] = [
  // 몸통
  [11, 12], // 어깨-어깨
  [11, 23], // 왼어깨-왼엉덩이
  [12, 24], // 오른어깨-오른엉덩이
  [23, 24], // 엉덩이-엉덩이
  // 팔
  [11, 13], // 왼어깨-왼팔꿈치
  [13, 15], // 왼팔꿈치-왼손목
  [12, 14], // 오른어깨-오른팔꿈치
  [14, 16], // 오른팔꿈치-오른손목
  // 다리
  [23, 25], // 왼엉덩이-왼무릎
  [25, 27], // 왼무릎-왼발목
  [24, 26], // 오른엉덩이-오른무릎
  [26, 28], // 오른무릎-오른발목
];

// 부위별 선 두께 계산
function getConnectionWidth(from: number, to: number, baseWidth: number): number {
  const key = `${from}-${to}`;
  const reverseKey = `${to}-${from}`;
  const bodyPart = CONNECTION_BODY_PARTS[key] || CONNECTION_BODY_PARTS[reverseKey] || 'upperArm';
  return baseWidth * BODY_PART_WIDTH_MULTIPLIERS[bodyPart];
}

// 스켈레톤 그리기 (세계관별 스타일 지원 + 부위별 두께 + 불필요한 랜드마크 생략)
export function drawSkeleton(
  canvas: HTMLCanvasElement,
  landmarks: Landmark[],
  skeletonStyle?: SkeletonStyle
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 스타일 적용 (기본값 사용)
  const style = skeletonStyle || DEFAULT_SKELETON_STYLE;
  const width = canvas.width;
  const height = canvas.height;

  // 글로우 효과 설정
  if (style.glowEffect && style.glowColor) {
    ctx.shadowColor = style.glowColor;
    ctx.shadowBlur = 10;
  }

  // 1. 연결선 그리기 (부위별 두께 적용, 얼굴/손가락/발가락 제외)
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const [from, to] of BODY_CONNECTIONS) {
    const fromLm = landmarks[from];
    const toLm = landmarks[to];

    // 신뢰도 체크
    if (!fromLm || !toLm) continue;
    if (fromLm.visibility < VISIBILITY_THRESHOLD || toLm.visibility < VISIBILITY_THRESHOLD) continue;

    const lineWidth = getConnectionWidth(from, to, style.boneWidth);

    ctx.beginPath();
    ctx.strokeStyle = style.boneColor;
    ctx.lineWidth = lineWidth;
    ctx.moveTo(fromLm.x * width, fromLm.y * height);
    ctx.lineTo(toLm.x * width, toLm.y * height);
    ctx.stroke();
  }

  // 글로우 효과 해제 (관절점에는 다르게 적용)
  ctx.shadowBlur = 0;

  // 2. 관절점 그리기 (주요 관절만, 얼굴/손가락/발가락 제외)
  for (let i = 0; i < landmarks.length; i++) {
    // 얼굴, 손가락, 발가락 인덱스는 건너뜀
    if (FACE_LANDMARK_INDICES.includes(i) || EXTREMITY_LANDMARK_INDICES.includes(i)) {
      continue;
    }

    const lm = landmarks[i];
    if (!lm || lm.visibility < VISIBILITY_THRESHOLD) continue;

    const x = lm.x * width;
    const y = lm.y * height;
    const isCritical = CRITICAL_JOINT_INDICES.includes(i);
    const radius = isCritical ? style.jointRadius : style.jointRadius * 0.7;

    // 주요 관절은 강조 색상 사용
    if (isCritical && style.emphasisColor) {
      // 외곽 발광 효과
      ctx.beginPath();
      ctx.fillStyle = style.emphasisColor;
      ctx.globalAlpha = 0.3;
      ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 메인 관절점
    ctx.beginPath();
    ctx.fillStyle = isCritical ? (style.emphasisColor || style.jointColor) : style.jointColor;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // 중앙 하이라이트
    ctx.beginPath();
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.6;
    ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// 정리
export function closePoseDetection(): void {
  if (poseLandmarker) {
    poseLandmarker.close();
    poseLandmarker = null;
  }
  lastVideoTime = -1;
}

// 월드 좌표 얻기 (3D)
export function getWorldLandmarks(
  video: HTMLVideoElement,
  timestamp: number
): Landmark[] | null {
  if (!poseLandmarker || video.currentTime === lastVideoTime) {
    return null;
  }

  const results = poseLandmarker.detectForVideo(video, timestamp);

  if (results.worldLandmarks && results.worldLandmarks.length > 0) {
    return results.worldLandmarks[0].map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility ?? 0,
    }));
  }

  return null;
}

/**
 * 디바이스 성능에 따른 모델 추천
 * GPU 성능이 낮은 기기에서는 lite 모델 권장
 */
export function getRecommendedModel(): PoseModelType {
  // GPU 정보 확인 (간단한 휴리스틱)
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

  if (!gl) {
    return 'lite'; // WebGL 없으면 lite
  }

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    const rendererLower = renderer.toLowerCase();

    // 고성능 GPU 체크
    if (
      rendererLower.includes('nvidia') ||
      rendererLower.includes('radeon') ||
      rendererLower.includes('apple m')
    ) {
      return 'full';
    }

    // 저성능 GPU (내장 그래픽)
    if (
      rendererLower.includes('intel') ||
      rendererLower.includes('mali') ||
      rendererLower.includes('adreno')
    ) {
      return 'lite';
    }
  }

  // 기본값
  return 'lite';
}
