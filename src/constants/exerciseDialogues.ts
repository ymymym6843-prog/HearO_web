/**
 * 운동별 인트로 대화 시퀀스
 *
 * VN 스타일 대화 시스템을 위한 운동 시작 전 대화 데이터
 * 각 세계관 × 운동별로 맞춤형 대사 제공
 */

import type { DialogueSequence, DialogueEntry } from '@/types/phase';
import type { WorldviewType } from '@/types/vrm';
import type { ExerciseType } from '@/types/exercise';

// 운동 한글 이름 매핑
const EXERCISE_KOREAN_NAMES: Partial<Record<ExerciseType, string>> = {
  squat: '스쿼트',
  wall_squat: '벽 스쿼트',
  chair_stand: '의자 앉았다 일어나기',
  straight_leg_raise: '누워서 다리 들기',
  standing_march_slow: '서서 천천히 행진',
  seated_knee_lift: '앉아서 무릎 들기',
  arm_raise_front: '팔 앞으로 들기',
  shoulder_abduction: '어깨 벌리기',
  elbow_flexion: '팔꿈치 굽히기',
  wall_push: '벽 밀기',
  seated_core_hold: '앉아서 코어 버티기',
  standing_anti_extension_hold: '서서 허리 버티기',
  standing_arm_raise_core: '코어 유지하며 팔 들기',
  bridge: '브릿지',
};

// 세계관별 기본 인트로 대화 템플릿
const WORLDVIEW_INTRO_TEMPLATES: Record<WorldviewType, {
  greeting: string;
  exerciseIntro: (exerciseName: string) => string;
  encouragement: string;
  ready: string;
}> = {
  fantasy: {
    greeting: '용사여, 오늘도 나와 함께 수련할 준비가 되었는가?',
    exerciseIntro: (name) => `오늘의 훈련은 "${name}"이다. 이 기술을 익히면 더 강해질 수 있을 것이다.`,
    encouragement: '좋은 자세야. 천천히, 하지만 힘차게 움직여보자!',
    ready: '자, 준비가 되면 시작 버튼을 누르거라. 함께 해보자!',
  },
  sports: {
    greeting: '좋아, 오늘도 열심히 해보자!',
    exerciseIntro: (name) => `오늘은 "${name}" 훈련이야. 기본기가 중요하니까 집중해서 해보자.`,
    encouragement: '폼이 중요해. 정확한 자세로 천천히 해보자!',
    ready: '준비됐으면 시작 버튼을 눌러. 파이팅!',
  },
  idol: {
    greeting: '안녕~! 오늘도 같이 열심히 해볼까?',
    exerciseIntro: (name) => `오늘은 "${name}"을 할 거야! 스테이지 위에서 빛나려면 체력이 기본이지~`,
    encouragement: '예쁜 라인을 만들려면 자세가 정말 중요해!',
    ready: '준비됐어? 시작 버튼 누르면 같이 시작하자!',
  },
  sf: {
    greeting: '탐사원, 오늘의 신체 훈련 프로토콜을 시작합니다.',
    exerciseIntro: (name) => `금일 훈련 항목: "${name}". 우주 환경 적응을 위한 필수 운동입니다.`,
    encouragement: '생체 데이터 수집 중... 정확한 동작이 최적의 효과를 보장합니다.',
    ready: '준비가 완료되면 시작 신호를 보내주십시오.',
  },
  zombie: {
    greeting: '생존자, 살아남으려면 강해져야 해.',
    exerciseIntro: (name) => `오늘의 훈련: "${name}". 이 동작이 너를 살릴 수도 있어.`,
    encouragement: '좋아, 그 자세야. 위기 상황에서도 이 움직임을 기억해.',
    ready: '준비됐나? 시작하면 끝까지 해야 한다.',
  },
  spy: {
    greeting: '에이전트, 오늘도 완벽한 컨디션을 위한 훈련이다.',
    exerciseIntro: (name) => `오늘의 미션: "${name}". 임무 수행에 필수적인 신체 능력을 강화한다.`,
    encouragement: '좋아. 정확한 동작은 완벽한 임무 수행의 기본이다.',
    ready: '준비가 됐으면 시작 신호를 보내라. 임무를 시작한다.',
  },
};

/**
 * 운동 인트로 대화 시퀀스 생성
 */
export function createExerciseIntroDialogue(
  worldview: WorldviewType,
  exerciseType: ExerciseType
): DialogueSequence {
  const template = WORLDVIEW_INTRO_TEMPLATES[worldview];
  const exerciseName = EXERCISE_KOREAN_NAMES[exerciseType] || exerciseType;

  const entries: DialogueEntry[] = [
    {
      npcId: 'main',
      emotion: 'happy',
      text: template.greeting,
      tts: true,
      autoAdvance: 0, // 수동 진행
    },
    {
      npcId: 'main',
      emotion: 'normal',
      text: template.exerciseIntro(exerciseName),
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'serious',
      text: template.encouragement,
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'happy',
      text: template.ready,
      tts: true,
      autoAdvance: 0,
      onComplete: 'startTransition', // 대화 완료 시 전환 시작
    },
  ];

  return {
    id: `intro-${worldview}-${exerciseType}`,
    entries,
    currentIndex: 0,
  };
}

/**
 * 운동 완료 대화 시퀀스 생성
 */
export function createExerciseCompleteDialogue(
  worldview: WorldviewType,
  exerciseType: ExerciseType,
  rating: 'perfect' | 'good' | 'normal'
): DialogueSequence {
  const exerciseName = EXERCISE_KOREAN_NAMES[exerciseType] || exerciseType;

  const ratingDialogues: Record<WorldviewType, Record<string, string>> = {
    fantasy: {
      perfect: `대단하다, 용사여! "${exerciseName}" 훈련을 완벽하게 해냈구나!`,
      good: `잘했다! "${exerciseName}" 훈련을 훌륭하게 마쳤어.`,
      normal: `좋아, "${exerciseName}" 훈련을 끝까지 해냈군. 다음엔 더 잘할 수 있을 거야!`,
    },
    sports: {
      perfect: `와, 완벽해! "${exerciseName}" 최고의 기록이야!`,
      good: `좋아, "${exerciseName}" 잘했어! 이 조자로 계속 가자!`,
      normal: `"${exerciseName}" 끝까지 했네. 다음엔 더 좋아질 거야!`,
    },
    idol: {
      perfect: `대박~! "${exerciseName}" 완전 완벽했어! 스타 자질 100%야!`,
      good: `오! "${exerciseName}" 잘했어~! 이쁘게 잘 했어!`,
      normal: `"${exerciseName}" 완료! 조금만 더 연습하면 완벽해질 거야!`,
    },
    sf: {
      perfect: `탁월합니다. "${exerciseName}" 최적 수치 달성. 효율 100%.`,
      good: `"${exerciseName}" 훈련 완료. 수행 능력 양호.`,
      normal: `"${exerciseName}" 훈련 종료. 추가 훈련 권장.`,
    },
    zombie: {
      perfect: `훌륭해! "${exerciseName}" 완벽했어. 넌 살아남을 거야.`,
      good: `좋아, "${exerciseName}" 잘 해냈어. 더 강해지고 있어.`,
      normal: `"${exerciseName}" 끝. 계속 훈련해야 해.`,
    },
    spy: {
      perfect: `임무 완료. "${exerciseName}" 수행 능력 최상급. 인상적이군.`,
      good: `"${exerciseName}" 임무 성공. 수준급 실력이야.`,
      normal: `"${exerciseName}" 임무 종료. 추가 훈련이 필요해.`,
    },
  };

  const emotion: Record<string, 'happy' | 'normal' | 'serious'> = {
    perfect: 'happy',
    good: 'happy',
    normal: 'normal',
  };

  const entries: DialogueEntry[] = [
    {
      npcId: 'main',
      emotion: emotion[rating],
      text: ratingDialogues[worldview][rating],
      tts: true,
      autoAdvance: 0,
    },
  ];

  return {
    id: `complete-${worldview}-${exerciseType}-${rating}`,
    entries,
    currentIndex: 0,
  };
}

const exerciseDialogues = {
  createExerciseIntroDialogue,
  createExerciseCompleteDialogue,
  EXERCISE_KOREAN_NAMES,
};

export default exerciseDialogues;
