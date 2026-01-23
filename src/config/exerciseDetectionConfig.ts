/**
 * 운동 감지 설정 파일
 * HearO Web - MVP 22개 운동의 감지 로직 설정
 *
 * 각 운동의:
 * - 각도 임계값 (AngleThreshold)
 * - 히스테리시스 설정 (채터링 방지)
 * - 상태 머신 설정
 * - 필요한 랜드마크
 * - ROM 목표 각도
 */

import type {
  ExerciseType,
  PoseExercise,
  HandExercise,
  StateMachineMode,
  DetectionMethod,
  JointType,
  AngleTarget,
  HysteresisThreshold,
} from '@/types/exercise';

// MediaPipe Pose 랜드마크 인덱스
export const PoseLandmark = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

// ============================================
// A. 감지 설정 인터페이스
// ============================================

export interface ExerciseDetectionConfig {
  /** 운동 ID */
  exerciseId: ExerciseType;

  /** 감지 방식 */
  detectionMethod: DetectionMethod;

  /** 상태 머신 모드 */
  stateMachineMode: StateMachineMode;

  /** 주 관절 (각도 기반 운동용) */
  primaryJoint?: JointType;

  /** 측정할 각도 구성 (3점) */
  anglePoints?: {
    pointA: number;  // 시작점 랜드마크
    pointB: number;  // 꼭짓점 랜드마크 (각도 중심)
    pointC: number;  // 끝점 랜드마크
  };

  /** 각도 임계값 */
  angleTarget?: AngleTarget;

  /** 히스테리시스 설정 */
  hysteresis: HysteresisThreshold;

  /** 필요한 랜드마크 인덱스 */
  requiredLandmarks: number[];

  /** 최소 신뢰도 */
  minConfidence: number;

  /** EMA 스무딩 계수 (0-1, 높을수록 반응 빠름) */
  emaAlpha: number;

  /** 홀드 시간 (밀리초, 등척성 운동용) */
  holdDuration?: number;

  /** 좌우 교대 여부 */
  alternating?: boolean;

  /** 추가 설정 */
  extraConfig?: Record<string, unknown>;
}

// ============================================
// B. 전신 운동 감지 설정 (14개)
// ============================================

// --- 하체 운동 (6개) ---

export const SQUAT_CONFIG: ExerciseDetectionConfig = {
  exerciseId: 'squat',
  detectionMethod: 'angle',
  stateMachineMode: 'big_is_down',
  primaryJoint: 'knee',
  anglePoints: {
    pointA: PoseLandmark.LEFT_HIP,
    pointB: PoseLandmark.LEFT_KNEE,
    pointC: PoseLandmark.LEFT_ANKLE,
  },
  angleTarget: {
    start: { min: 150, max: 180 },  // 선 자세: ~170°
    end: { min: 80, max: 110 },      // 스쿼트 하단: ~90°
    tolerance: 10,
  },
  hysteresis: {
    downThreshold: 120,  // DOWN 인식 (무릎 120° 이하)
    upThreshold: 150,    // UP 인식 (무릎 150° 이상)
  },
  requiredLandmarks: [
    PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
    PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
    PoseLandmark.LEFT_ANKLE, PoseLandmark.RIGHT_ANKLE,
  ],
  minConfidence: 0.5,
  emaAlpha: 0.3,
};

export const WALL_SQUAT_CONFIG: ExerciseDetectionConfig = {
  exerciseId: 'wall_squat',
  detectionMethod: 'timer',
  stateMachineMode: 'hold_mode',
  primaryJoint: 'knee',
  anglePoints: {
    pointA: PoseLandmark.LEFT_HIP,
    pointB: PoseLandmark.LEFT_KNEE,
    pointC: PoseLandmark.LEFT_ANKLE,
  },
  angleTarget: {
    start: { min: 85, max: 100 },   // 홀드 시작 각도
    end: { min: 85, max: 100 },     // 유지 각도
    tolerance: 10,
  },
  hysteresis: {
    downThreshold: 100,
    upThreshold: 110,
  },
  requiredLandmarks: [
    PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
    PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
    PoseLandmark.LEFT_ANKLE, PoseLandmark.RIGHT_ANKLE,
  ],
  minConfidence: 0.5,
  emaAlpha: 0.3,
  holdDuration: 30000,  // 30초 홀드
};

export const CHAIR_STAND_CONFIG: ExerciseDetectionConfig = {
  exerciseId: 'chair_stand',
  detectionMethod: 'angle',
  stateMachineMode: 'big_is_down',
  primaryJoint: 'knee',
  anglePoints: {
    pointA: PoseLandmark.LEFT_HIP,
    pointB: PoseLandmark.LEFT_KNEE,
    pointC: PoseLandmark.LEFT_ANKLE,
  },
  angleTarget: {
    start: { min: 160, max: 180 },  // 선 자세
    end: { min: 80, max: 100 },      // 앉은 자세
    tolerance: 10,
  },
  hysteresis: {
    downThreshold: 110,
    upThreshold: 150,
  },
  requiredLandmarks: [
    PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
    PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
    PoseLandmark.LEFT_ANKLE, PoseLandmark.RIGHT_ANKLE,
  ],
  minConfidence: 0.5,
  emaAlpha: 0.3,
};

export const STRAIGHT_LEG_RAISE_CONFIG: ExerciseDetectionConfig = {
  exerciseId: 'straight_leg_raise',
  detectionMethod: 'angle',
  stateMachineMode: 'big_is_up',
  primaryJoint: 'hip',
  anglePoints: {
    pointA: PoseLandmark.LEFT_SHOULDER,
    pointB: PoseLandmark.LEFT_HIP,
    pointC: PoseLandmark.LEFT_KNEE,
  },
  angleTarget: {
    start: { min: 160, max: 180 },  // 바닥에 누운 자세
    end: { min: 100, max: 140 },     // 다리 들어올림
    tolerance: 15,
  },
  hysteresis: {
    downThreshold: 150,
    upThreshold: 130,
  },
  requiredLandmarks: [
    PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
    PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
    PoseLandmark.LEFT_ANKLE, PoseLandmark.RIGHT_ANKLE,
    PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
  ],
  minConfidence: 0.5,
  emaAlpha: 0.25,
  alternating: true,  // 좌우 교대
};

export const STANDING_MARCH_SLOW_CONFIG: ExerciseDetectionConfig = {
  exerciseId: 'standing_march_slow',
  detectionMethod: 'position',
  stateMachineMode: 'alternating',
  primaryJoint: 'hip',
  anglePoints: {
    pointA: PoseLandmark.LEFT_SHOULDER,
    pointB: PoseLandmark.LEFT_HIP,
    pointC: PoseLandmark.LEFT_KNEE,
  },
  angleTarget: {
    start: { min: 160, max: 180 },  // 선 자세
    end: { min: 90, max: 130 },      // 무릎 들기
    tolerance: 15,
  },
  hysteresis: {
    downThreshold: 150,
    upThreshold: 120,
  },
  requiredLandmarks: [
    PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
    PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
  ],
  minConfidence: 0.5,
  emaAlpha: 0.3,
  alternating: true,
};

export const SEATED_KNEE_LIFT_CONFIG: ExerciseDetectionConfig = {
  exerciseId: 'seated_knee_lift',
  detectionMethod: 'angle',
  stateMachineMode: 'big_is_up',
  primaryJoint: 'hip',
  anglePoints: {
    pointA: PoseLandmark.LEFT_SHOULDER,
    pointB: PoseLandmark.LEFT_HIP,
    pointC: PoseLandmark.LEFT_KNEE,
  },
  angleTarget: {
    start: { min: 85, max: 100 },   // 앉은 자세
    end: { min: 50, max: 80 },       // 무릎 들기
    tolerance: 10,
  },
  hysteresis: {
    downThreshold: 90,
    upThreshold: 70,
  },
  requiredLandmarks: [
    PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
    PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
    PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
  ],
  minConfidence: 0.5,
  emaAlpha: 0.3,
  alternating: true,
};

// --- 상체 운동 (4개) ---

export const STANDING_ARM_RAISE_FRONT_CONFIG: ExerciseDetectionConfig = {
  exerciseId: 'standing_arm_raise_front',
  detectionMethod: 'angle',
  stateMachineMode: 'big_is_up',
  primaryJoint: 'shoulder',
  anglePoints: {
    pointA: PoseLandmark.LEFT_HIP,
    pointB: PoseLandmark.LEFT_SHOULDER,
    pointC: PoseLandmark.LEFT_ELBOW,
  },
  angleTarget: {
    start: { min: 0, max: 30 },     // 팔 내린 자세
    end: { min: 150, max: 180 },     // 팔 올린 자세
    tolerance: 15,
  },
  hysteresis: {
    downThreshold: 60,
    upThreshold: 120,
  },
  requiredLandmarks: [
    PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
    PoseLandmark.LEFT_ELBOW, PoseLandmark.RIGHT_ELBOW,
    PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
  ],
  minConfidence: 0.5,
  emaAlpha: 0.3,
};

export const SHOULDER_ABDUCTION_CONFIG: ExerciseDetectionConfig = {
  exerciseId: 'shoulder_abduction',
  detectionMethod: 'angle',
  stateMachineMode: 'big_is_up',
  primaryJoint: 'shoulder',
  anglePoints: {
    pointA: PoseLandmark.LEFT_HIP,
    pointB: PoseLandmark.LEFT_SHOULDER,
    pointC: PoseLandmark.LEFT_ELBOW,
  },
  angleTarget: {
    start: { min: 0, max: 30 },     // 팔 내린 자세
    end: { min: 80, max: 110 },      // 팔 벌린 자세 (90° 목표)
    tolerance: 15,
  },
  hysteresis: {
    downThreshold: 45,
    upThreshold: 70,
  },
  requiredLandmarks: [
    PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
    PoseLandmark.LEFT_ELBOW, PoseLandmark.RIGHT_ELBOW,
    PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
  ],
  minConfidence: 0.5,
  emaAlpha: 0.3,
};

export const ELBOW_FLEXION_CONFIG: ExerciseDetectionConfig = {
  exerciseId: 'elbow_flexion',
  detectionMethod: 'angle',
  stateMachineMode: 'big_is_down',
  primaryJoint: 'elbow',
  anglePoints: {
    pointA: PoseLandmark.LEFT_SHOULDER,
    pointB: PoseLandmark.LEFT_ELBOW,
    pointC: PoseLandmark.LEFT_WRIST,
  },
  angleTarget: {
    start: { min: 150, max: 180 },  // 팔 펴진 자세
    end: { min: 30, max: 60 },       // 팔 굽힌 자세
    tolerance: 10,
  },
  hysteresis: {
    downThreshold: 90,
    upThreshold: 120,
  },
  requiredLandmarks: [
    PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
    PoseLandmark.LEFT_ELBOW, PoseLandmark.RIGHT_ELBOW,
    PoseLandmark.LEFT_WRIST, PoseLandmark.RIGHT_WRIST,
  ],
  minConfidence: 0.5,
  emaAlpha: 0.3,
};

export const WALL_PUSH_CONFIG: ExerciseDetectionConfig = {
  exerciseId: 'wall_push',
  detectionMethod: 'distance',
  stateMachineMode: 'big_is_down',
  primaryJoint: 'elbow',
  anglePoints: {
    pointA: PoseLandmark.LEFT_SHOULDER,
    pointB: PoseLandmark.LEFT_ELBOW,
    pointC: PoseLandmark.LEFT_WRIST,
  },
  angleTarget: {
    start: { min: 150, max: 180 },  // 팔 펴진 자세
    end: { min: 80, max: 110 },      // 팔 굽힌 자세
    tolerance: 15,
  },
  hysteresis: {
    downThreshold: 120,
    upThreshold: 140,
  },
  requiredLandmarks: [
    PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
    PoseLandmark.LEFT_ELBOW, PoseLandmark.RIGHT_ELBOW,
    PoseLandmark.LEFT_WRIST, PoseLandmark.RIGHT_WRIST,
  ],
  minConfidence: 0.5,
  emaAlpha: 0.3,
};

// --- 코어 운동 (4개) ---

export const SEATED_CORE_HOLD_CONFIG: ExerciseDetectionConfig = {
  exerciseId: 'seated_core_hold',
  detectionMethod: 'timer',
  stateMachineMode: 'hold_mode',
  primaryJoint: 'spine',
  anglePoints: {
    pointA: PoseLandmark.LEFT_SHOULDER,
    pointB: PoseLandmark.LEFT_HIP,
    pointC: PoseLandmark.LEFT_KNEE,
  },
  angleTarget: {
    start: { min: 80, max: 100 },
    end: { min: 80, max: 100 },
    tolerance: 10,
  },
  hysteresis: {
    downThreshold: 75,
    upThreshold: 85,
  },
  requiredLandmarks: [
    PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
    PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
    PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
  ],
  minConfidence: 0.5,
  emaAlpha: 0.2,
  holdDuration: 10000,  // 10초 홀드
};

export const STANDING_ANTI_EXTENSION_HOLD_CONFIG: ExerciseDetectionConfig = {
  exerciseId: 'standing_anti_extension_hold',
  detectionMethod: 'timer',
  stateMachineMode: 'hold_mode',
  primaryJoint: 'spine',
  anglePoints: {
    pointA: PoseLandmark.LEFT_SHOULDER,
    pointB: PoseLandmark.LEFT_HIP,
    pointC: PoseLandmark.LEFT_KNEE,
  },
  angleTarget: {
    start: { min: 170, max: 180 },
    end: { min: 170, max: 180 },
    tolerance: 5,
  },
  hysteresis: {
    downThreshold: 165,
    upThreshold: 175,
  },
  requiredLandmarks: [
    PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
    PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
    PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
  ],
  minConfidence: 0.5,
  emaAlpha: 0.2,
  holdDuration: 10000,
};

export const STANDING_ARM_RAISE_CORE_CONFIG: ExerciseDetectionConfig = {
  exerciseId: 'standing_arm_raise_core',
  detectionMethod: 'alignment',
  stateMachineMode: 'big_is_up',
  primaryJoint: 'shoulder',
  anglePoints: {
    pointA: PoseLandmark.LEFT_HIP,
    pointB: PoseLandmark.LEFT_SHOULDER,
    pointC: PoseLandmark.LEFT_ELBOW,
  },
  angleTarget: {
    start: { min: 0, max: 30 },
    end: { min: 150, max: 180 },
    tolerance: 15,
  },
  hysteresis: {
    downThreshold: 60,
    upThreshold: 120,
  },
  requiredLandmarks: [
    PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
    PoseLandmark.LEFT_ELBOW, PoseLandmark.RIGHT_ELBOW,
    PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
  ],
  minConfidence: 0.5,
  emaAlpha: 0.3,
  extraConfig: {
    // 코어 안정화 체크: 허리 움직임 모니터링
    coreStabilityCheck: true,
    maxSpineDeviation: 10,  // 허용 척추 편차 (도)
  },
};

export const BRIDGE_CONFIG: ExerciseDetectionConfig = {
  exerciseId: 'bridge',
  detectionMethod: 'angle',
  stateMachineMode: 'big_is_up',
  primaryJoint: 'hip',
  anglePoints: {
    pointA: PoseLandmark.LEFT_SHOULDER,
    pointB: PoseLandmark.LEFT_HIP,
    pointC: PoseLandmark.LEFT_KNEE,
  },
  angleTarget: {
    start: { min: 45, max: 70 },    // 바닥에 누운 자세
    end: { min: 160, max: 180 },     // 엉덩이 들어올린 자세
    tolerance: 15,
  },
  hysteresis: {
    downThreshold: 100,
    upThreshold: 140,
  },
  requiredLandmarks: [
    PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
    PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
    PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
  ],
  minConfidence: 0.5,
  emaAlpha: 0.3,
};

// ============================================
// C. 손 운동 감지 설정 (8개)
// ============================================

// 손 운동은 MediaPipe Hands를 사용하므로 별도 구조
export interface HandExerciseDetectionConfig {
  exerciseId: HandExercise;
  detectionMethod: DetectionMethod;
  stateMachineMode: StateMachineMode;

  /** 목표 제스처 시퀀스 */
  targetGestures?: string[];

  /** 거리 임계값 (터치 판정용) */
  distanceThreshold?: number;

  /** 홀드 시간 (밀리초) */
  holdDuration?: number;

  /** 최소 신뢰도 */
  minConfidence: number;

  /** EMA 스무딩 계수 */
  emaAlpha: number;
}

export const FINGER_FLEXION_CONFIG: HandExerciseDetectionConfig = {
  exerciseId: 'finger_flexion',
  detectionMethod: 'distance',
  stateMachineMode: 'big_is_down',
  targetGestures: ['open', 'fist'],
  holdDuration: 5000,
  minConfidence: 0.5,
  emaAlpha: 0.3,
};

export const FINGER_SPREAD_CONFIG: HandExerciseDetectionConfig = {
  exerciseId: 'finger_spread',
  detectionMethod: 'distance',
  stateMachineMode: 'big_is_up',
  holdDuration: 5000,
  minConfidence: 0.5,
  emaAlpha: 0.3,
};

export const WRIST_FLEXION_CONFIG: HandExerciseDetectionConfig = {
  exerciseId: 'wrist_flexion',
  detectionMethod: 'angle',
  stateMachineMode: 'big_is_up',
  holdDuration: 3000,
  minConfidence: 0.5,
  emaAlpha: 0.25,
};

export const TENDON_GLIDE_CONFIG: HandExerciseDetectionConfig = {
  exerciseId: 'tendon_glide',
  detectionMethod: 'gesture',
  stateMachineMode: 'sequence',
  targetGestures: ['open', 'hook', 'table_top', 'straight_fist', 'full_fist'],
  holdDuration: 3000,
  minConfidence: 0.5,
  emaAlpha: 0.3,
};

export const THUMB_OPPOSITION_CONFIG: HandExerciseDetectionConfig = {
  exerciseId: 'thumb_opposition',
  detectionMethod: 'distance',
  stateMachineMode: 'sequence',
  distanceThreshold: 0.05,
  holdDuration: 500,
  minConfidence: 0.5,
  emaAlpha: 0.3,
};

export const GRIP_SQUEEZE_CONFIG: HandExerciseDetectionConfig = {
  exerciseId: 'grip_squeeze',
  detectionMethod: 'distance',
  stateMachineMode: 'big_is_down',
  targetGestures: ['open', 'fist'],
  holdDuration: 5000,
  minConfidence: 0.5,
  emaAlpha: 0.3,
};

export const PINCH_HOLD_CONFIG: HandExerciseDetectionConfig = {
  exerciseId: 'pinch_hold',
  detectionMethod: 'timer',
  stateMachineMode: 'hold_mode',
  distanceThreshold: 0.05,
  holdDuration: 5000,
  minConfidence: 0.5,
  emaAlpha: 0.3,
};

export const FINGER_TAP_SEQUENCE_CONFIG: HandExerciseDetectionConfig = {
  exerciseId: 'finger_tap_sequence',
  detectionMethod: 'sequence',
  stateMachineMode: 'sequence',
  distanceThreshold: 0.05,
  holdDuration: 500,
  minConfidence: 0.5,
  emaAlpha: 0.3,
};

// ============================================
// D. 설정 레지스트리
// ============================================

export const POSE_EXERCISE_CONFIGS: Record<PoseExercise, ExerciseDetectionConfig> = {
  // 하체 운동
  squat: SQUAT_CONFIG,
  wall_squat: WALL_SQUAT_CONFIG,
  chair_stand: CHAIR_STAND_CONFIG,
  straight_leg_raise: STRAIGHT_LEG_RAISE_CONFIG,
  standing_march_slow: STANDING_MARCH_SLOW_CONFIG,
  seated_knee_lift: SEATED_KNEE_LIFT_CONFIG,
  // 상체 운동
  standing_arm_raise_front: STANDING_ARM_RAISE_FRONT_CONFIG,
  shoulder_abduction: SHOULDER_ABDUCTION_CONFIG,
  elbow_flexion: ELBOW_FLEXION_CONFIG,
  wall_push: WALL_PUSH_CONFIG,
  // 코어 운동
  seated_core_hold: SEATED_CORE_HOLD_CONFIG,
  standing_anti_extension_hold: STANDING_ANTI_EXTENSION_HOLD_CONFIG,
  standing_arm_raise_core: STANDING_ARM_RAISE_CORE_CONFIG,
  bridge: BRIDGE_CONFIG,
};

export const HAND_EXERCISE_CONFIGS: Record<HandExercise, HandExerciseDetectionConfig> = {
  // ROM/가동성
  finger_flexion: FINGER_FLEXION_CONFIG,
  finger_spread: FINGER_SPREAD_CONFIG,
  wrist_flexion: WRIST_FLEXION_CONFIG,
  // 협응/힘줄
  tendon_glide: TENDON_GLIDE_CONFIG,
  thumb_opposition: THUMB_OPPOSITION_CONFIG,
  grip_squeeze: GRIP_SQUEEZE_CONFIG,
  // 정밀/기능
  pinch_hold: PINCH_HOLD_CONFIG,
  finger_tap_sequence: FINGER_TAP_SEQUENCE_CONFIG,
};

// ============================================
// E. 유틸리티 함수
// ============================================

/**
 * 운동 타입에 맞는 감지 설정 가져오기
 */
export function getExerciseConfig(exerciseId: ExerciseType): ExerciseDetectionConfig | HandExerciseDetectionConfig | null {
  if (exerciseId in POSE_EXERCISE_CONFIGS) {
    return POSE_EXERCISE_CONFIGS[exerciseId as PoseExercise];
  }
  if (exerciseId in HAND_EXERCISE_CONFIGS) {
    return HAND_EXERCISE_CONFIGS[exerciseId as HandExercise];
  }
  return null;
}

/**
 * Pose 운동 설정 가져오기
 */
export function getPoseExerciseConfig(exerciseId: PoseExercise): ExerciseDetectionConfig {
  return POSE_EXERCISE_CONFIGS[exerciseId];
}

/**
 * Hand 운동 설정 가져오기
 */
export function getHandExerciseConfig(exerciseId: HandExercise): HandExerciseDetectionConfig {
  return HAND_EXERCISE_CONFIGS[exerciseId];
}

/**
 * 3점 각도 계산 (도 단위)
 */
export function calculateAngle(
  pointA: { x: number; y: number },
  pointB: { x: number; y: number },
  pointC: { x: number; y: number }
): number {
  const radians = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
                  Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) {
    angle = 360 - angle;
  }
  return angle;
}

/**
 * EMA 스무딩 적용
 */
export function applyEMA(currentValue: number, previousValue: number, alpha: number): number {
  return alpha * currentValue + (1 - alpha) * previousValue;
}

/**
 * 히스테리시스 상태 전환 체크
 */
export function checkHysteresisTransition(
  currentAngle: number,
  currentState: 'up' | 'down',
  threshold: HysteresisThreshold,
  mode: StateMachineMode
): 'up' | 'down' | null {
  if (mode === 'big_is_down') {
    // 값이 클수록 DOWN (예: 팔꿈치 펴짐 = 각도 큼)
    if (currentState === 'up' && currentAngle <= threshold.downThreshold) {
      return 'down';
    }
    if (currentState === 'down' && currentAngle >= threshold.upThreshold) {
      return 'up';
    }
  } else if (mode === 'big_is_up') {
    // 값이 클수록 UP (예: 팔 들어올림 = 각도 큼)
    if (currentState === 'down' && currentAngle >= threshold.upThreshold) {
      return 'up';
    }
    if (currentState === 'up' && currentAngle <= threshold.downThreshold) {
      return 'down';
    }
  }
  return null;  // 상태 변화 없음
}
