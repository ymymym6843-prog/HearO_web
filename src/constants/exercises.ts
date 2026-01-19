/**
 * 운동 관련 상수
 * 웹캠 지원 운동만 포함 (7개)
 */

import type { ExerciseType } from '@/types/exercise';
import type { IconName } from '@/components/ui/Icon';

// 운동 한글명 매핑 (6개 MVP 운동)
export const EXERCISE_NAMES: Record<string, string> = {
  // 하체 운동 (2개)
  squat: '스쿼트',
  lunge: '런지',
  // 상체 운동 (2개)
  bicep_curl: '바이셉컬',
  arm_raise: '암레이즈',
  // 전신/코어 운동 (2개)
  high_knees: '하이니즈',
  plank_hold: '플랭크',
} as const;

// 운동 아이콘 매핑 (6개 MVP 운동)
export const EXERCISE_ICONS: Record<string, IconName> = {
  // 하체 운동 (2개)
  squat: 'body-outline',
  lunge: 'walk-outline',
  // 상체 운동 (2개)
  bicep_curl: 'barbell-outline',
  arm_raise: 'barbell-outline',
  // 전신/코어 운동 (2개)
  high_knees: 'walk-outline',
  plank_hold: 'body-outline',
} as const;

// 운동 부위별 분류 (6개 MVP 운동)
export const EXERCISE_BODY_PARTS: Record<string, string[]> = {
  // 하체 운동 (2개)
  squat: ['하체', '무릎', '고관절'],
  lunge: ['하체', '고관절', '무릎'],
  // 상체 운동 (2개)
  bicep_curl: ['상체', '팔'],
  arm_raise: ['상체', '어깨'],
  // 전신/코어 운동 (2개)
  high_knees: ['하체', '심폐'],
  plank_hold: ['코어', '전신'],
} as const;

/**
 * 운동 이름 가져오기
 * @param exerciseType - 운동 타입 (snake_case)
 * @returns 한글 운동명
 */
export function getExerciseName(exerciseType: string): string {
  return EXERCISE_NAMES[exerciseType] || formatExerciseName(exerciseType);
}

/**
 * snake_case를 한글 포맷으로 변환 (fallback)
 */
function formatExerciseName(exerciseType: string): string {
  // 운동 타입이 없으면 기본값 반환
  if (!exerciseType) return '운동';

  // snake_case를 공백으로 분리하고 각 단어 첫글자 대문자로
  return exerciseType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * 운동 아이콘 가져오기
 * @param exerciseType - 운동 타입
 * @returns IconName
 */
export function getExerciseIcon(exerciseType: string): IconName {
  return EXERCISE_ICONS[exerciseType] || 'fitness-outline';
}

/**
 * 운동 타입이 지원되는 운동인지 확인
 * @param exerciseType - 운동 타입
 */
export function isMvpExercise(exerciseType: string): exerciseType is ExerciseType {
  const supportedExercises: ExerciseType[] = [
    // 하체 운동 (2개)
    'squat',
    'lunge',
    // 상체 운동 (2개)
    'bicep_curl',
    'arm_raise',
    // 전신/코어 운동 (2개)
    'high_knees',
    'plank_hold',
  ];
  return supportedExercises.includes(exerciseType as ExerciseType);
}

/**
 * 운동 부위 가져오기
 * @param exerciseType - 운동 타입
 */
export function getExerciseBodyParts(exerciseType: string): string[] {
  return EXERCISE_BODY_PARTS[exerciseType] || ['전신'];
}
