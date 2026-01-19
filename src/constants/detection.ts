/**
 * 포즈 감지 관련 상수
 */

// 카메라 기본 설정
export const CAMERA_DEFAULTS = {
  WIDTH: 640,
  HEIGHT: 480,
  FACING_MODE: 'user',
} as const;

// 감지 설정
export const DETECTION_DEFAULTS = {
  /** 홀드 시간 (초) */
  HOLD_TIME: 0.5,
  /** 최소 신뢰도 */
  MIN_CONFIDENCE: 0.5,
  /** 최소 감지 신뢰도 */
  MIN_DETECTION_CONFIDENCE: 0.5,
  /** 최소 존재 신뢰도 */
  MIN_PRESENCE_CONFIDENCE: 0.5,
  /** 최소 추적 신뢰도 */
  MIN_TRACKING_CONFIDENCE: 0.5,
} as const;

// 쿨다운 설정
export const COOLDOWN_DEFAULTS = {
  /** 최소 쿨다운 (ms) */
  MIN: 500,
  /** 최대 쿨다운 (ms) */
  MAX: 1500,
  /** 적응형 쿨다운 계수 */
  ADAPTIVE_FACTOR: 0.4,
} as const;

// 정확도 임계값
export const ACCURACY_THRESHOLDS = {
  /** 완벽 */
  PERFECT: 90,
  /** 좋음 */
  GOOD: 70,
  /** 보통 */
  NORMAL: 50,
  /** 낮음 */
  LOW: 30,
} as const;

// 각도 설정
export const ANGLE_DEFAULTS = {
  /** 각도 허용 오차 */
  TOLERANCE: 10,
  /** 최대 측정 가능 각도 */
  MAX_ANGLE: 180,
  /** 최소 측정 가능 각도 */
  MIN_ANGLE: 0,
} as const;

// 스켈레톤 그리기 설정
export const SKELETON_STYLE = {
  /** 랜드마크 반지름 */
  LANDMARK_RADIUS: 5,
  /** 연결선 두께 */
  CONNECTION_WIDTH: 2,
  /** 기본 색상 */
  DEFAULT_COLOR: '#00D9FF',
  /** 낮은 신뢰도 색상 */
  LOW_CONFIDENCE_COLOR: '#9CA3AF',
  /** 신뢰도 임계값 */
  CONFIDENCE_THRESHOLD: 0.5,
} as const;

// MediaPipe 모델 설정
export const MEDIAPIPE_CONFIG = {
  /** CDN 버전 */
  VERSION: '0.10.22',
  /** 모델 타입 */
  MODEL_TYPE: 'lite' as const,
  /** 위임 타입 */
  DELEGATE: 'GPU' as const,
} as const;

/**
 * 정확도에 따른 등급 반환
 */
export function getAccuracyGrade(accuracy: number): 'perfect' | 'good' | 'normal' | 'low' {
  if (accuracy >= ACCURACY_THRESHOLDS.PERFECT) return 'perfect';
  if (accuracy >= ACCURACY_THRESHOLDS.GOOD) return 'good';
  if (accuracy >= ACCURACY_THRESHOLDS.NORMAL) return 'normal';
  return 'low';
}

/**
 * 정확도에 따른 색상 반환
 */
export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= ACCURACY_THRESHOLDS.PERFECT) return '#22C55E'; // green
  if (accuracy >= ACCURACY_THRESHOLDS.GOOD) return '#3B82F6';    // blue
  if (accuracy >= ACCURACY_THRESHOLDS.NORMAL) return '#F59E0B';  // yellow
  return '#EF4444'; // red
}
