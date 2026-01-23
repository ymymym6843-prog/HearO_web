/**
 * 운동 관련 상수
 * HearO Web - MVP 22개 운동 지원 (전신 14 + 손 8)
 * 기준: 웹캠 환경/재활 안전성/인식 안정성
 */

import type {
  ExerciseType,
  PoseExercise,
  HandExercise,
  ExerciseCategory,
  ExerciseSubCategory,
  RehabBodyPart,
  ExerciseDifficulty,
  DetectionMethod,
  DetectionEngine,
  StateMachineMode,
  ImplementationLevel,
} from '@/types/exercise';
import type { IconName } from '@/components/ui/Icon';

// ============================================
// A. MVP 운동 목록 (22개)
// ============================================

// 전신 운동 목록 (Pose 기반 - 14개)
export const POSE_EXERCISES: PoseExercise[] = [
  // 하체 (6개)
  'squat',
  'wall_squat',
  'chair_stand',
  'straight_leg_raise',
  'standing_march_slow',
  'seated_knee_lift',
  // 상체 (4개)
  'standing_arm_raise_front',
  'shoulder_abduction',
  'elbow_flexion',
  'wall_push',
  // 코어 (4개)
  'seated_core_hold',
  'standing_anti_extension_hold',
  'standing_arm_raise_core',
  'bridge',
];

// 손 운동 목록 (Hands 기반 - 8개)
export const HAND_EXERCISES: HandExercise[] = [
  // ROM/가동성 (3개)
  'finger_flexion',
  'finger_spread',
  'wrist_flexion',
  // 협응/힘줄 (3개)
  'tendon_glide',
  'thumb_opposition',
  'grip_squeeze',
  // 정밀/기능 (2개)
  'pinch_hold',
  'finger_tap_sequence',
];

// 전체 MVP 운동 목록 (22개)
export const MVP_EXERCISES: ExerciseType[] = [
  ...POSE_EXERCISES,
  ...HAND_EXERCISES,
];

// ============================================
// B. 운동 한글명 매핑
// ============================================

export const EXERCISE_NAMES: Record<ExerciseType, string> = {
  // 하체 운동 (6개)
  squat: '스쿼트',
  wall_squat: '벽 스쿼트',
  chair_stand: '의자 앉았다 일어나기',
  straight_leg_raise: '누워서 다리 들기',
  standing_march_slow: '서서 천천히 행진',
  seated_knee_lift: '앉아서 무릎 들기',

  // 상체 운동 (4개)
  standing_arm_raise_front: '팔 앞으로 들기',
  shoulder_abduction: '어깨 벌리기',
  elbow_flexion: '팔꿈치 굽히기',
  wall_push: '벽 밀기',

  // 코어 운동 (4개)
  seated_core_hold: '앉아서 코어 버티기',
  standing_anti_extension_hold: '서서 허리 버티기',
  standing_arm_raise_core: '코어 유지하며 팔 들기',
  bridge: '브릿지',

  // 손 ROM 운동 (3개)
  finger_flexion: '손가락 굽히기/펴기',
  finger_spread: '손가락 벌리기',
  wrist_flexion: '손목 굽히기/펴기',

  // 손 협응 운동 (3개)
  tendon_glide: '힘줄 글라이딩',
  thumb_opposition: '엄지-손가락 터치',
  grip_squeeze: '주먹 쥐기',

  // 손 정밀 운동 (2개)
  pinch_hold: '집게 집기 유지',
  finger_tap_sequence: '손가락 순차 터치',
};

// ============================================
// C. 운동 아이콘 매핑
// ============================================

export const EXERCISE_ICONS: Record<ExerciseType, IconName> = {
  // 하체 운동 (6개)
  squat: 'body-outline',
  wall_squat: 'body-outline',
  chair_stand: 'body-outline',
  straight_leg_raise: 'body-outline',
  standing_march_slow: 'walk-outline',
  seated_knee_lift: 'body-outline',

  // 상체 운동 (4개)
  standing_arm_raise_front: 'barbell-outline',
  shoulder_abduction: 'barbell-outline',
  elbow_flexion: 'barbell-outline',
  wall_push: 'hand-left-outline',

  // 코어 운동 (4개)
  seated_core_hold: 'body-outline',
  standing_anti_extension_hold: 'body-outline',
  standing_arm_raise_core: 'barbell-outline',
  bridge: 'body-outline',

  // 손 ROM 운동 (3개)
  finger_flexion: 'hand-left-outline',
  finger_spread: 'hand-left-outline',
  wrist_flexion: 'hand-left-outline',

  // 손 협응 운동 (3개)
  tendon_glide: 'hand-left-outline',
  thumb_opposition: 'hand-left-outline',
  grip_squeeze: 'hand-left-outline',

  // 손 정밀 운동 (2개)
  pinch_hold: 'hand-left-outline',
  finger_tap_sequence: 'hand-left-outline',
};

// ============================================
// D. 운동 부위별 분류
// ============================================

export const EXERCISE_BODY_PARTS: Record<ExerciseType, RehabBodyPart[]> = {
  // 하체 운동 (6개)
  squat: ['knee', 'hip', 'general'],
  wall_squat: ['knee', 'hip', 'back'],
  chair_stand: ['knee', 'hip', 'general'],
  straight_leg_raise: ['hip', 'knee', 'general'],
  standing_march_slow: ['hip', 'knee', 'general'],
  seated_knee_lift: ['hip', 'knee', 'general'],

  // 상체 운동 (4개)
  standing_arm_raise_front: ['shoulder', 'general'],
  shoulder_abduction: ['shoulder', 'general'],
  elbow_flexion: ['elbow', 'shoulder', 'general'],
  wall_push: ['shoulder', 'elbow', 'general'],

  // 코어 운동 (4개)
  seated_core_hold: ['back', 'hip', 'general'],
  standing_anti_extension_hold: ['back', 'hip', 'general'],
  standing_arm_raise_core: ['back', 'shoulder', 'general'],
  bridge: ['back', 'hip', 'general'],

  // 손 ROM 운동 (3개)
  finger_flexion: ['hand', 'wrist', 'general'],
  finger_spread: ['hand', 'general'],
  wrist_flexion: ['wrist', 'hand', 'general'],

  // 손 협응 운동 (3개)
  tendon_glide: ['hand', 'wrist', 'general'],
  thumb_opposition: ['hand', 'general'],
  grip_squeeze: ['hand', 'wrist', 'general'],

  // 손 정밀 운동 (2개)
  pinch_hold: ['hand', 'general'],
  finger_tap_sequence: ['hand', 'general'],
};

// ============================================
// E. 운동 분류 정보
// ============================================

export const EXERCISE_CATEGORIES: Record<ExerciseType, ExerciseCategory> = {
  // 전신 운동 (pose)
  squat: 'pose',
  wall_squat: 'pose',
  chair_stand: 'pose',
  straight_leg_raise: 'pose',
  standing_march_slow: 'pose',
  seated_knee_lift: 'pose',
  standing_arm_raise_front: 'pose',
  shoulder_abduction: 'pose',
  elbow_flexion: 'pose',
  wall_push: 'pose',
  seated_core_hold: 'pose',
  standing_anti_extension_hold: 'pose',
  standing_arm_raise_core: 'pose',
  bridge: 'pose',

  // 손 운동 (hands)
  finger_flexion: 'hands',
  finger_spread: 'hands',
  wrist_flexion: 'hands',
  tendon_glide: 'hands',
  thumb_opposition: 'hands',
  grip_squeeze: 'hands',
  pinch_hold: 'hands',
  finger_tap_sequence: 'hands',
};

export const EXERCISE_SUB_CATEGORIES: Record<ExerciseType, ExerciseSubCategory> = {
  // 하체 운동
  squat: 'lower_body',
  wall_squat: 'lower_body',
  chair_stand: 'lower_body',
  straight_leg_raise: 'lower_body',
  standing_march_slow: 'lower_body',
  seated_knee_lift: 'lower_body',

  // 상체 운동
  standing_arm_raise_front: 'upper_body',
  shoulder_abduction: 'upper_body',
  elbow_flexion: 'upper_body',
  wall_push: 'upper_body',

  // 코어 운동
  seated_core_hold: 'core',
  standing_anti_extension_hold: 'core',
  standing_arm_raise_core: 'core',
  bridge: 'core',

  // 손 ROM 운동
  finger_flexion: 'hand_rom',
  finger_spread: 'hand_rom',
  wrist_flexion: 'hand_rom',

  // 손 협응 운동
  tendon_glide: 'hand_coord',
  thumb_opposition: 'hand_coord',
  grip_squeeze: 'hand_coord',

  // 손 정밀 운동
  pinch_hold: 'hand_precision',
  finger_tap_sequence: 'hand_precision',
};

// ============================================
// F. 운동 난이도
// ============================================

export const EXERCISE_DIFFICULTY: Record<ExerciseType, ExerciseDifficulty> = {
  // 하체 운동
  squat: 'normal',
  wall_squat: 'easy',
  chair_stand: 'easy',
  straight_leg_raise: 'easy',
  standing_march_slow: 'easy',
  seated_knee_lift: 'easy',

  // 상체 운동
  standing_arm_raise_front: 'easy',
  shoulder_abduction: 'easy',
  elbow_flexion: 'easy',
  wall_push: 'easy',

  // 코어 운동
  seated_core_hold: 'easy',
  standing_anti_extension_hold: 'easy',
  standing_arm_raise_core: 'easy',
  bridge: 'easy',

  // 손 ROM 운동
  finger_flexion: 'easy',
  finger_spread: 'easy',
  wrist_flexion: 'easy',

  // 손 협응 운동
  tendon_glide: 'normal',
  thumb_opposition: 'easy',
  grip_squeeze: 'easy',

  // 손 정밀 운동
  pinch_hold: 'normal',
  finger_tap_sequence: 'normal',
};

// ============================================
// G. 감지 설정
// ============================================

export const EXERCISE_DETECTION_METHOD: Record<ExerciseType, DetectionMethod> = {
  // 하체 운동 (angle 기반)
  squat: 'angle',
  wall_squat: 'timer',
  chair_stand: 'angle',
  straight_leg_raise: 'angle',
  standing_march_slow: 'position',
  seated_knee_lift: 'angle',

  // 상체 운동 (angle 기반)
  standing_arm_raise_front: 'angle',
  shoulder_abduction: 'angle',
  elbow_flexion: 'angle',
  wall_push: 'distance',

  // 코어 운동 (timer/alignment 기반)
  seated_core_hold: 'timer',
  standing_anti_extension_hold: 'timer',
  standing_arm_raise_core: 'alignment',
  bridge: 'angle',

  // 손 ROM 운동 (distance 기반)
  finger_flexion: 'distance',
  finger_spread: 'distance',
  wrist_flexion: 'angle',

  // 손 협응 운동 (gesture/sequence 기반)
  tendon_glide: 'gesture',
  thumb_opposition: 'distance',
  grip_squeeze: 'distance',

  // 손 정밀 운동 (timer/sequence 기반)
  pinch_hold: 'timer',
  finger_tap_sequence: 'sequence',
};

export const EXERCISE_DETECTION_ENGINE: Record<ExerciseType, DetectionEngine> = {
  // 전신 운동 (mediapipe_pose)
  squat: 'mediapipe_pose',
  wall_squat: 'mediapipe_pose',
  chair_stand: 'mediapipe_pose',
  straight_leg_raise: 'mediapipe_pose',
  standing_march_slow: 'mediapipe_pose',
  seated_knee_lift: 'mediapipe_pose',
  standing_arm_raise_front: 'mediapipe_pose',
  shoulder_abduction: 'mediapipe_pose',
  elbow_flexion: 'mediapipe_pose',
  wall_push: 'mediapipe_pose',
  seated_core_hold: 'mediapipe_pose',
  standing_anti_extension_hold: 'mediapipe_pose',
  standing_arm_raise_core: 'mediapipe_pose',
  bridge: 'mediapipe_pose',

  // 손 운동 (mediapipe_hands)
  finger_flexion: 'mediapipe_hands',
  finger_spread: 'mediapipe_hands',
  wrist_flexion: 'mediapipe_hands',
  tendon_glide: 'mediapipe_hands',
  thumb_opposition: 'mediapipe_hands',
  grip_squeeze: 'mediapipe_hands',
  pinch_hold: 'mediapipe_hands',
  finger_tap_sequence: 'mediapipe_hands',
};

export const EXERCISE_STATE_MACHINE_MODE: Record<ExerciseType, StateMachineMode> = {
  // 하체 운동
  squat: 'big_is_down',
  wall_squat: 'hold_mode',
  chair_stand: 'big_is_down',
  straight_leg_raise: 'big_is_up',
  standing_march_slow: 'alternating',
  seated_knee_lift: 'big_is_up',

  // 상체 운동
  standing_arm_raise_front: 'big_is_up',
  shoulder_abduction: 'big_is_up',
  elbow_flexion: 'big_is_down',
  wall_push: 'big_is_down',

  // 코어 운동
  seated_core_hold: 'hold_mode',
  standing_anti_extension_hold: 'hold_mode',
  standing_arm_raise_core: 'big_is_up',
  bridge: 'big_is_up',

  // 손 ROM 운동
  finger_flexion: 'big_is_down',
  finger_spread: 'big_is_up',
  wrist_flexion: 'big_is_up',

  // 손 협응 운동
  tendon_glide: 'sequence',
  thumb_opposition: 'sequence',
  grip_squeeze: 'big_is_down',

  // 손 정밀 운동
  pinch_hold: 'hold_mode',
  finger_tap_sequence: 'sequence',
};

export const EXERCISE_IMPLEMENTATION_LEVEL: Record<ExerciseType, ImplementationLevel> = {
  // 하체 운동
  squat: 'high',
  wall_squat: 'timer',
  chair_stand: 'high',
  straight_leg_raise: 'high',
  standing_march_slow: 'high',
  seated_knee_lift: 'high',

  // 상체 운동
  standing_arm_raise_front: 'high',
  shoulder_abduction: 'high',
  elbow_flexion: 'high',
  wall_push: 'medium',

  // 코어 운동
  seated_core_hold: 'timer',
  standing_anti_extension_hold: 'timer',
  standing_arm_raise_core: 'high',
  bridge: 'high',

  // 손 ROM 운동
  finger_flexion: 'high',
  finger_spread: 'high',
  wrist_flexion: 'high',

  // 손 협응 운동
  tendon_glide: 'medium',
  thumb_opposition: 'high',
  grip_squeeze: 'high',

  // 손 정밀 운동
  pinch_hold: 'timer',
  finger_tap_sequence: 'medium',
};

// ============================================
// H. 기본 운동 설정값
// ============================================

export const DEFAULT_EXERCISE_CONFIG = {
  // 기본 세트/횟수
  defaultReps: 10,
  defaultSets: 3,
  defaultRestSeconds: 30,
  defaultHoldSeconds: 5,

  // 감지 설정
  emaAlpha: 0.3,           // EMA 스무딩 계수
  confidenceThreshold: 0.5, // 최소 신뢰도

  // 히스테리시스 기본값
  defaultHysteresis: {
    upThreshold: 0.6,
    downThreshold: 0.4,
  },
} as const;

// 운동별 기본 횟수
export const EXERCISE_DEFAULT_REPS: Record<ExerciseType, number> = {
  // 하체 운동
  squat: 10,
  wall_squat: 1,        // 홀드 운동
  chair_stand: 10,
  straight_leg_raise: 10,
  standing_march_slow: 20,
  seated_knee_lift: 10,

  // 상체 운동
  standing_arm_raise_front: 10,
  shoulder_abduction: 10,
  elbow_flexion: 10,
  wall_push: 10,

  // 코어 운동
  seated_core_hold: 1,  // 홀드 운동
  standing_anti_extension_hold: 1, // 홀드 운동
  standing_arm_raise_core: 10,
  bridge: 10,

  // 손 ROM 운동
  finger_flexion: 10,
  finger_spread: 10,
  wrist_flexion: 10,

  // 손 협응 운동
  tendon_glide: 5,      // 5개 제스처 사이클
  thumb_opposition: 4,  // 4손가락
  grip_squeeze: 10,

  // 손 정밀 운동
  pinch_hold: 1,        // 홀드 운동
  finger_tap_sequence: 4, // 4손가락
};

// 운동별 홀드 시간 (초)
export const EXERCISE_HOLD_SECONDS: Partial<Record<ExerciseType, number>> = {
  wall_squat: 30,
  seated_core_hold: 10,
  standing_anti_extension_hold: 10,
  pinch_hold: 5,
};

// ============================================
// I. 유틸리티 함수
// ============================================

/**
 * 운동 이름 가져오기
 */
export function getExerciseName(exerciseType: ExerciseType | string): string {
  return EXERCISE_NAMES[exerciseType as ExerciseType] || formatExerciseName(exerciseType);
}

/**
 * snake_case를 한글 포맷으로 변환 (fallback)
 */
function formatExerciseName(exerciseType: string): string {
  if (!exerciseType) return '운동';
  return exerciseType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * 운동 아이콘 가져오기
 */
export function getExerciseIcon(exerciseType: ExerciseType | string): IconName {
  return EXERCISE_ICONS[exerciseType as ExerciseType] || 'fitness-outline';
}

/**
 * MVP 운동 여부 확인
 */
export function isMvpExercise(exerciseType: string): exerciseType is ExerciseType {
  return MVP_EXERCISES.includes(exerciseType as ExerciseType);
}

/**
 * Pose 운동 여부 확인
 */
export function isPoseExercise(exerciseType: string): exerciseType is PoseExercise {
  return POSE_EXERCISES.includes(exerciseType as PoseExercise);
}

/**
 * Hand 운동 여부 확인
 */
export function isHandExercise(exerciseType: string): exerciseType is HandExercise {
  return HAND_EXERCISES.includes(exerciseType as HandExercise);
}

/**
 * 운동 부위 가져오기
 */
export function getExerciseBodyParts(exerciseType: ExerciseType | string): RehabBodyPart[] {
  return EXERCISE_BODY_PARTS[exerciseType as ExerciseType] || ['general'];
}

/**
 * 카테고리 가져오기
 */
export function getExerciseCategory(exerciseType: ExerciseType | string): ExerciseCategory {
  return EXERCISE_CATEGORIES[exerciseType as ExerciseType] || 'pose';
}

/**
 * 서브카테고리 가져오기
 */
export function getExerciseSubCategory(exerciseType: ExerciseType | string): ExerciseSubCategory {
  return EXERCISE_SUB_CATEGORIES[exerciseType as ExerciseType] || 'lower_body';
}

/**
 * 난이도 가져오기
 */
export function getExerciseDifficulty(exerciseType: ExerciseType | string): ExerciseDifficulty {
  return EXERCISE_DIFFICULTY[exerciseType as ExerciseType] || 'normal';
}

/**
 * 감지 방식 가져오기
 */
export function getDetectionMethod(exerciseType: ExerciseType | string): DetectionMethod {
  return EXERCISE_DETECTION_METHOD[exerciseType as ExerciseType] || 'angle';
}

/**
 * 감지 엔진 가져오기
 */
export function getDetectionEngine(exerciseType: ExerciseType | string): DetectionEngine {
  return EXERCISE_DETECTION_ENGINE[exerciseType as ExerciseType] || 'mediapipe_pose';
}

/**
 * 상태 머신 모드 가져오기
 */
export function getStateMachineMode(exerciseType: ExerciseType | string): StateMachineMode {
  return EXERCISE_STATE_MACHINE_MODE[exerciseType as ExerciseType] || 'big_is_down';
}

/**
 * 기본 횟수 가져오기
 */
export function getDefaultReps(exerciseType: ExerciseType | string): number {
  return EXERCISE_DEFAULT_REPS[exerciseType as ExerciseType] || DEFAULT_EXERCISE_CONFIG.defaultReps;
}

/**
 * 홀드 시간 가져오기 (홀드 운동용)
 */
export function getHoldSeconds(exerciseType: ExerciseType | string): number | undefined {
  return EXERCISE_HOLD_SECONDS[exerciseType as ExerciseType];
}

/**
 * 카테고리별 운동 목록 가져오기
 */
export function getExercisesByCategory(category: ExerciseCategory): ExerciseType[] {
  return MVP_EXERCISES.filter(ex => EXERCISE_CATEGORIES[ex] === category);
}

/**
 * 서브카테고리별 운동 목록 가져오기
 */
export function getExercisesBySubCategory(subCategory: ExerciseSubCategory): ExerciseType[] {
  return MVP_EXERCISES.filter(ex => EXERCISE_SUB_CATEGORIES[ex] === subCategory);
}

/**
 * 부위별 운동 목록 가져오기
 */
export function getExercisesByBodyPart(bodyPart: RehabBodyPart): ExerciseType[] {
  return MVP_EXERCISES.filter(ex => EXERCISE_BODY_PARTS[ex].includes(bodyPart));
}

/**
 * 난이도별 운동 목록 가져오기
 */
export function getExercisesByDifficulty(difficulty: ExerciseDifficulty): ExerciseType[] {
  return MVP_EXERCISES.filter(ex => EXERCISE_DIFFICULTY[ex] === difficulty);
}
