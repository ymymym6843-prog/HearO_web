/**
 * 운동 감지 모듈 내보내기
 * MVP 운동 6개만 포함
 */

// 타입 및 유틸리티
export * from './types';
export * from './utils';

// 기본 감지기
export * from './BaseDetector';

// MVP 운동 감지기 (6개)
export * from './SquatDetector';
export * from './LungeDetector';
export * from './BicepCurlDetector';
export * from './ArmRaiseDetector';
export * from './HighKneesDetector';
export * from './PlankHoldDetector';

// 운동 타입에 따른 감지기 팩토리
import type { ExerciseType } from '@/types/exercise';
import { BaseDetector } from './BaseDetector';
import { getSquatDetector, resetSquatDetector } from './SquatDetector';
import { getLungeDetector, resetLungeDetector } from './LungeDetector';
import { getBicepCurlDetector, resetBicepCurlDetector } from './BicepCurlDetector';
import { getArmRaiseDetector, resetArmRaiseDetector } from './ArmRaiseDetector';
import { getHighKneesDetector, resetHighKneesDetector } from './HighKneesDetector';
import { getPlankHoldDetector, resetPlankHoldDetector } from './PlankHoldDetector';

type DetectorFactory = () => BaseDetector;

const detectorRegistry: Partial<Record<ExerciseType, DetectorFactory>> = {
  // 하체 운동 (2개)
  squat: getSquatDetector,
  lunge: getLungeDetector,
  // 상체 운동 (2개)
  bicep_curl: getBicepCurlDetector,
  arm_raise: getArmRaiseDetector,
  // 전신/코어 운동 (2개)
  high_knees: getHighKneesDetector,
  plank_hold: getPlankHoldDetector,
};

const resetRegistry: Partial<Record<ExerciseType, () => void>> = {
  // 하체 운동 (2개)
  squat: resetSquatDetector,
  lunge: resetLungeDetector,
  // 상체 운동 (2개)
  bicep_curl: resetBicepCurlDetector,
  arm_raise: resetArmRaiseDetector,
  // 전신/코어 운동 (2개)
  high_knees: resetHighKneesDetector,
  plank_hold: resetPlankHoldDetector,
};

/**
 * 운동 타입에 맞는 감지기 반환
 */
export function getDetectorForExercise(exerciseType: ExerciseType): BaseDetector {
  const factory = detectorRegistry[exerciseType];
  if (!factory) {
    throw new Error(`감지기가 구현되지 않은 운동: ${exerciseType}`);
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
  Object.values(resetRegistry).forEach((resetFn) => resetFn());
}

/**
 * 지원하는 운동 목록 반환
 */
export function getSupportedExercises(): ExerciseType[] {
  return Object.keys(detectorRegistry) as ExerciseType[];
}

/**
 * 운동 타입이 지원되는지 확인
 */
export function isExerciseSupported(exerciseType: ExerciseType): boolean {
  return exerciseType in detectorRegistry;
}
