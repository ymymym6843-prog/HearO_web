/**
 * 운동 감지 모듈 내보내기
 * MVP 운동 22개 지원 (14개 포즈 + 8개 손)
 */

// 타입 및 유틸리티
export * from './types';
export * from './utils';

// 기본 감지기
export * from './BaseDetector';

// 포즈 운동 감지기
export * from './SquatDetector';
export * from './ArmRaiseDetector';
export * from './ElbowFlexionDetector';
export * from './LegRaiseDetector';
export * from './HoldDetector';
export * from './BridgeDetector';
export * from './MarchDetector';
export * from './WallPushDetector';
export * from './ChairStandDetector';

// 운동 타입에 따른 감지기 팩토리
import type { ExerciseType } from '@/types/exercise';
import { BaseDetector } from './BaseDetector';
import { getSquatDetector, resetSquatDetector } from './SquatDetector';
import { getArmRaiseDetector, resetArmRaiseDetector } from './ArmRaiseDetector';
import { getElbowFlexionDetector, resetElbowFlexionDetector } from './ElbowFlexionDetector';
import { getLegRaiseDetector, resetLegRaiseDetector } from './LegRaiseDetector';
import { getHoldDetector, resetHoldDetector } from './HoldDetector';
import { getBridgeDetector, resetBridgeDetector } from './BridgeDetector';
import { getMarchDetector, resetMarchDetector } from './MarchDetector';
import { getWallPushDetector, resetWallPushDetector } from './WallPushDetector';
import { getChairStandDetector, resetChairStandDetector } from './ChairStandDetector';

type DetectorFactory = () => BaseDetector;

/**
 * 운동별 감지기 매핑
 * - squat fallback 제거: 각 운동은 전용 감지기 사용
 * - 미구현 운동은 에러 발생
 */
const detectorRegistry: Partial<Record<ExerciseType, DetectorFactory>> = {
  // === 하체 운동 ===
  squat: getSquatDetector,
  wall_squat: () => getHoldDetector('wall_squat'),
  chair_stand: getChairStandDetector,
  straight_leg_raise: () => getLegRaiseDetector('straight_leg_raise'),
  standing_march_slow: getMarchDetector,
  seated_knee_lift: () => getLegRaiseDetector('seated_knee_lift'),

  // === 상체 운동 ===
  arm_raise_front: () => getArmRaiseDetector('arm_raise_front'),
  shoulder_abduction: () => getArmRaiseDetector('shoulder_abduction'),
  elbow_flexion: getElbowFlexionDetector,
  wall_push: getWallPushDetector,

  // === 코어 운동 ===
  seated_core_hold: () => getHoldDetector('seated_core_hold'),
  standing_anti_extension_hold: () => getHoldDetector('standing_anti_extension_hold'),
  standing_arm_raise_core: () => getArmRaiseDetector('standing_arm_raise_core'),
  bridge: getBridgeDetector,
};

const resetRegistry: Partial<Record<ExerciseType, () => void>> = {
  // === 하체 운동 ===
  squat: resetSquatDetector,
  wall_squat: () => resetHoldDetector('wall_squat'),
  chair_stand: resetChairStandDetector,
  straight_leg_raise: () => resetLegRaiseDetector('straight_leg_raise'),
  standing_march_slow: resetMarchDetector,
  seated_knee_lift: () => resetLegRaiseDetector('seated_knee_lift'),

  // === 상체 운동 ===
  arm_raise_front: () => resetArmRaiseDetector('arm_raise_front'),
  shoulder_abduction: () => resetArmRaiseDetector('shoulder_abduction'),
  elbow_flexion: resetElbowFlexionDetector,
  wall_push: resetWallPushDetector,

  // === 코어 운동 ===
  seated_core_hold: () => resetHoldDetector('seated_core_hold'),
  standing_anti_extension_hold: () => resetHoldDetector('standing_anti_extension_hold'),
  standing_arm_raise_core: () => resetArmRaiseDetector('standing_arm_raise_core'),
  bridge: resetBridgeDetector,
};

/**
 * 손 운동 목록
 */
const HAND_EXERCISES: ExerciseType[] = [
  'finger_flexion',
  'finger_spread',
  'wrist_flexion',
  'tendon_glide',
  'thumb_opposition',
  'grip_squeeze',
  'pinch_hold',
  'finger_tap_sequence',
];

/**
 * 손 운동 여부 확인
 */
function isHandExercise(exerciseType: ExerciseType): boolean {
  return HAND_EXERCISES.includes(exerciseType);
}

/**
 * 운동 타입에 맞는 감지기 반환
 * @throws Error - 미구현 운동 또는 손 운동인 경우
 */
export function getDetectorForExercise(exerciseType: ExerciseType): BaseDetector {
  // 손 운동은 별도 시스템에서 처리
  if (isHandExercise(exerciseType)) {
    throw new Error(`[NotImplemented] 손 운동은 HandPoseDetector를 사용하세요: ${exerciseType}`);
  }

  const factory = detectorRegistry[exerciseType];
  if (!factory) {
    // squat fallback 제거: 명시적 에러 발생
    throw new Error(`[NotImplemented] 감지기가 구현되지 않은 운동입니다: ${exerciseType}`);
  }

  return factory();
}

/**
 * 특정 운동 감지기 리셋
 */
export function resetDetector(exerciseType: ExerciseType): void {
  const resetFn = resetRegistry[exerciseType];
  if (resetFn) {
    resetFn();
  }
}

/**
 * 모든 감지기 리셋
 */
export function resetAllDetectors(): void {
  // 개별 리셋 함수 호출
  resetSquatDetector();
  resetArmRaiseDetector();
  resetElbowFlexionDetector();
  resetLegRaiseDetector();
  resetHoldDetector();
  resetBridgeDetector();
  resetMarchDetector();
  resetWallPushDetector();
  resetChairStandDetector();
}

/**
 * 지원하는 포즈 운동 목록 반환
 */
export function getSupportedPoseExercises(): ExerciseType[] {
  return Object.keys(detectorRegistry) as ExerciseType[];
}

/**
 * 지원하는 손 운동 목록 반환
 */
export function getSupportedHandExercises(): ExerciseType[] {
  return [...HAND_EXERCISES];
}

/**
 * 지원하는 모든 운동 목록 반환
 */
export function getSupportedExercises(): ExerciseType[] {
  return [...getSupportedPoseExercises(), ...getSupportedHandExercises()];
}

/**
 * 포즈 운동이 지원되는지 확인
 */
export function isPoseExerciseSupported(exerciseType: ExerciseType): boolean {
  return exerciseType in detectorRegistry;
}

/**
 * 운동 타입이 지원되는지 확인 (포즈 + 손)
 */
export function isExerciseSupported(exerciseType: ExerciseType): boolean {
  return isPoseExerciseSupported(exerciseType) || isHandExercise(exerciseType);
}

/**
 * 감지기 구현 상태 테이블 출력 (디버깅용)
 */
export function printDetectorStatus(): void {
  console.log('\n=== 운동 감지기 구현 상태 ===\n');

  console.log('📦 포즈 운동 (14개):');
  const poseExercises = getSupportedPoseExercises();
  poseExercises.forEach(exercise => {
    const factory = detectorRegistry[exercise];
    const status = factory ? '✅ 구현됨' : '❌ 미구현';
    console.log(`  - ${exercise}: ${status}`);
  });

  console.log('\n🖐️ 손 운동 (8개):');
  HAND_EXERCISES.forEach(exercise => {
    console.log(`  - ${exercise}: ✅ HandPoseDetector 사용`);
  });

  console.log('\n총 지원: 22개 운동\n');
}
