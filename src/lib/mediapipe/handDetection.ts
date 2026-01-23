/**
 * MediaPipe Hand Detection 래퍼
 * 전신 운동 시 손가락 추적용 (Pose Landmarker와 함께 사용)
 */

import {
  HandLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import type { Landmark } from '@/types/pose';

// 버전 고정: CDN과 package.json 버전 일치 필수
const MEDIAPIPE_VERSION = '0.10.22-rc.20250304';

// Hand Landmarker 인스턴스
let handLandmarker: HandLandmarker | null = null;
let lastVideoTime = -1;

// 설정 타입
export interface HandDetectionConfig {
  numHands?: number;
  minDetectionConfidence?: number;
  minPresenceConfidence?: number;
  minTrackingConfidence?: number;
  delegate?: 'GPU' | 'CPU';
}

// 기본 설정
const DEFAULT_CONFIG: Required<HandDetectionConfig> = {
  numHands: 2,
  minDetectionConfidence: 0.5,
  minPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  delegate: 'GPU',
};

let currentConfig: Required<HandDetectionConfig> = { ...DEFAULT_CONFIG };

// 손 감지 결과 타입
export interface HandDetectionResult {
  left: Landmark[] | null;
  right: Landmark[] | null;
}

/**
 * MediaPipe Hand Landmarker 초기화
 */
export async function initializeHandDetection(
  config?: HandDetectionConfig
): Promise<HandLandmarker> {
  const newConfig = { ...DEFAULT_CONFIG, ...config };

  // 이미 같은 설정으로 초기화되어 있으면 재사용
  if (handLandmarker && JSON.stringify(currentConfig) === JSON.stringify(newConfig)) {
    return handLandmarker;
  }

  // 기존 인스턴스 정리
  if (handLandmarker) {
    handLandmarker.close();
    handLandmarker = null;
  }

  currentConfig = newConfig;

  const vision = await FilesetResolver.forVisionTasks(
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
  );

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      delegate: currentConfig.delegate,
    },
    runningMode: 'VIDEO',
    numHands: currentConfig.numHands,
    minHandDetectionConfidence: currentConfig.minDetectionConfidence,
    minHandPresenceConfidence: currentConfig.minPresenceConfidence,
    minTrackingConfidence: currentConfig.minTrackingConfidence,
  });

  console.info('[HandDetection] MediaPipe Hand Landmarker initialized');

  return handLandmarker;
}

/**
 * 손 감지 실행
 */
export function detectHands(
  video: HTMLVideoElement,
  timestamp: number
): HandDetectionResult | null {
  if (!handLandmarker || video.currentTime === lastVideoTime) {
    return null;
  }

  lastVideoTime = video.currentTime;
  const results = handLandmarker.detectForVideo(video, timestamp);

  const handResult: HandDetectionResult = {
    left: null,
    right: null,
  };

  if (results.landmarks && results.landmarks.length > 0) {
    for (let i = 0; i < results.landmarks.length; i++) {
      const landmarks = results.landmarks[i].map((lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: 1, // Hand landmarks don't have visibility
      }));

      // handedness: MediaPipe는 카메라 기준으로 Left/Right 반환
      // 미러링된 화면에서는 반대로 표시됨
      const handedness = results.handednesses[i]?.[0]?.categoryName;

      if (handedness === 'Left') {
        handResult.left = landmarks;
      } else if (handedness === 'Right') {
        handResult.right = landmarks;
      }
    }
  }

  return handResult;
}

// 손 연결선 정의 (21개 랜드마크)
const HAND_CONNECTIONS: [number, number][] = [
  // 손바닥
  [0, 1], [1, 2], [2, 3], [3, 4],     // 엄지
  [0, 5], [5, 6], [6, 7], [7, 8],     // 검지
  [0, 9], [9, 10], [10, 11], [11, 12], // 중지
  [0, 13], [13, 14], [14, 15], [15, 16], // 약지
  [0, 17], [17, 18], [18, 19], [19, 20], // 소지
  // 손바닥 가로 연결
  [5, 9], [9, 13], [13, 17],
];

/**
 * 손 스켈레톤 그리기
 */
export function drawHandSkeleton(
  canvas: HTMLCanvasElement,
  landmarks: Landmark[],
  options?: {
    color?: string;
    lineWidth?: number;
    jointRadius?: number;
  }
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || !landmarks || landmarks.length === 0) return;

  const {
    color = '#4ECDC4',
    lineWidth = 2,
    jointRadius = 4,
  } = options || {};

  const width = canvas.width;
  const height = canvas.height;

  // 글로우 효과
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  // 연결선 그리기
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const [from, to] of HAND_CONNECTIONS) {
    const fromLm = landmarks[from];
    const toLm = landmarks[to];
    if (!fromLm || !toLm) continue;

    ctx.beginPath();
    ctx.moveTo(fromLm.x * width, fromLm.y * height);
    ctx.lineTo(toLm.x * width, toLm.y * height);
    ctx.stroke();
  }

  // 글로우 효과 해제
  ctx.shadowBlur = 0;

  // 관절점 그리기
  for (const lm of landmarks) {
    const x = lm.x * width;
    const y = lm.y * height;

    // 외곽 발광
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.3;
    ctx.arc(x, y, jointRadius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 메인 점
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, jointRadius, 0, Math.PI * 2);
    ctx.fill();

    // 하이라이트
    ctx.beginPath();
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.6;
    ctx.arc(x, y, jointRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/**
 * Hand Landmarker 정리
 */
export function closeHandDetection(): void {
  if (handLandmarker) {
    handLandmarker.close();
    handLandmarker = null;
  }
  lastVideoTime = -1;
}

/**
 * Hand Landmarker 초기화 상태 확인
 */
export function isHandDetectionInitialized(): boolean {
  return handLandmarker !== null;
}
