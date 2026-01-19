/**
 * 각도 계산 상수
 * 랜드마크 인덱스 및 Kalman 필터 파라미터
 *
 * @module angle/constants
 */

import type { JointType } from '@/types/exercise';
import { PoseLandmark } from '@/types/pose';

// 관절별 랜드마크 인덱스 정의 (MediaPipe Pose 33개)
export const JOINT_LANDMARKS: Record<JointType, {
  proximal: PoseLandmark;  // 근위부 (시작점)
  vertex: PoseLandmark;    // 정점 (관절)
  distal: PoseLandmark;    // 원위부 (끝점)
  altProximal?: PoseLandmark;  // 대안 근위부
  altDistal?: PoseLandmark;    // 대안 원위부
}> = {
  // 무릎 각도: 고관절 - 무릎 - 발목
  knee: {
    proximal: PoseLandmark.LEFT_HIP,
    vertex: PoseLandmark.LEFT_KNEE,
    distal: PoseLandmark.LEFT_ANKLE,
    altProximal: PoseLandmark.RIGHT_HIP,
    altDistal: PoseLandmark.RIGHT_ANKLE,
  },

  // 고관절 각도: 어깨 - 고관절 - 무릎
  hip: {
    proximal: PoseLandmark.LEFT_SHOULDER,
    vertex: PoseLandmark.LEFT_HIP,
    distal: PoseLandmark.LEFT_KNEE,
    altProximal: PoseLandmark.RIGHT_SHOULDER,
    altDistal: PoseLandmark.RIGHT_KNEE,
  },

  // 어깨 각도: 팔꿈치 - 어깨 - 고관절
  shoulder: {
    proximal: PoseLandmark.LEFT_ELBOW,
    vertex: PoseLandmark.LEFT_SHOULDER,
    distal: PoseLandmark.LEFT_HIP,
    altProximal: PoseLandmark.RIGHT_ELBOW,
    altDistal: PoseLandmark.RIGHT_HIP,
  },

  // 팔꿈치 각도: 어깨 - 팔꿈치 - 손목
  elbow: {
    proximal: PoseLandmark.LEFT_SHOULDER,
    vertex: PoseLandmark.LEFT_ELBOW,
    distal: PoseLandmark.LEFT_WRIST,
    altProximal: PoseLandmark.RIGHT_SHOULDER,
    altDistal: PoseLandmark.RIGHT_WRIST,
  },

  // 척추 각도: 어깨 중심 - 골반 중심 (기울기)
  spine: {
    proximal: PoseLandmark.LEFT_SHOULDER,
    vertex: PoseLandmark.LEFT_HIP,
    distal: PoseLandmark.LEFT_KNEE,
    altProximal: PoseLandmark.RIGHT_SHOULDER,
    altDistal: PoseLandmark.RIGHT_KNEE,
  },

  // 발목 각도: 무릎 - 발목 - 발끝
  ankle: {
    proximal: PoseLandmark.LEFT_KNEE,
    vertex: PoseLandmark.LEFT_ANKLE,
    distal: PoseLandmark.LEFT_FOOT_INDEX,
    altProximal: PoseLandmark.RIGHT_KNEE,
    altDistal: PoseLandmark.RIGHT_FOOT_INDEX,
  },

  // 손목 각도: 팔꿈치 - 손목 - 검지 (손가락)
  wrist: {
    proximal: PoseLandmark.LEFT_ELBOW,
    vertex: PoseLandmark.LEFT_WRIST,
    distal: PoseLandmark.LEFT_INDEX,
    altProximal: PoseLandmark.RIGHT_ELBOW,
    altDistal: PoseLandmark.RIGHT_INDEX,
  },

  // 목 각도: 귀 - 어깨 중심 - 골반 중심
  neck: {
    proximal: PoseLandmark.LEFT_EAR,
    vertex: PoseLandmark.LEFT_SHOULDER,
    distal: PoseLandmark.LEFT_HIP,
    altProximal: PoseLandmark.RIGHT_EAR,
    altDistal: PoseLandmark.RIGHT_HIP,
  },
};

// Kalman 필터 파라미터
export const KALMAN_PARAMS: Record<string, { processNoise: number; measurementNoise: number }> = {
  knee: { processNoise: 0.08, measurementNoise: 0.8 },
  hip: { processNoise: 0.1, measurementNoise: 1.0 },
  shoulder: { processNoise: 0.12, measurementNoise: 1.2 },
  elbow: { processNoise: 0.08, measurementNoise: 0.8 },
  ankle: { processNoise: 0.1, measurementNoise: 1.0 },
  spine: { processNoise: 0.15, measurementNoise: 1.5 },
  wrist: { processNoise: 0.1, measurementNoise: 1.0 },
  neck: { processNoise: 0.12, measurementNoise: 1.2 },
};

// 카메라 캐시 설정
export const CAMERA_CACHE_TTL = 500;

// 라디안 → 도 변환 상수
export const RAD_TO_DEG = 180 / Math.PI;
