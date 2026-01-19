/**
 * NPC 대사 템플릿
 * 세계관별, 상황별 NPC 대사
 */

import type { WorldviewType } from '@/types/vrm';
import type { PerformanceRating } from '@/types/exercise';

// 대사 상황 타입
export type DialogueSituation =
  | 'exercise_start'
  | 'exercise_perfect'
  | 'exercise_good'
  | 'exercise_normal'
  | 'exercise_complete'
  | 'encouragement'
  | 'posture_correction';

// 세계관별 대사 템플릿
export const NPC_DIALOGUE_TEMPLATES: Record<
  WorldviewType,
  Record<DialogueSituation, string[]>
> = {
  fantasy: {
    exercise_start: [
      '마법의 힘을 깨워봅시다! 준비되셨나요?',
      '오늘의 수련을 시작하겠습니다!',
      '고대의 힘을 느껴보세요!',
    ],
    exercise_perfect: [
      '완벽합니다! 마법의 힘이 깨어나고 있어요!',
      '대단해요! 전설의 영웅이 될 자질이 보입니다!',
      '놀라운 실력이에요! 마법의 기운이 폭발합니다!',
    ],
    exercise_good: [
      '좋아요! 마법의 흐름을 느끼고 있군요!',
      '잘하고 있어요! 조금만 더 집중해보세요!',
      '훌륭해요! 마법사로서의 자질이 빛나고 있어요!',
    ],
    exercise_normal: [
      '괜찮아요, 마법은 시간이 필요해요. 다시 해봐요!',
      '포기하지 마세요! 위대한 마법사도 처음엔 서툴렀어요!',
      '연습이 완벽을 만듭니다! 한 번 더!',
    ],
    exercise_complete: [
      '수련 완료! 마법의 힘이 한층 강해졌어요!',
      '훌륭한 수련이었습니다! 오늘도 성장했네요!',
      '대단해요! 전설의 영웅에 한 걸음 더 가까워졌어요!',
    ],
    encouragement: [
      '힘내세요! 마법의 힘은 당신 안에 있어요!',
      '포기하지 마세요! 빛은 항상 어둠을 이깁니다!',
      '당신의 마법은 무한해요! 자신을 믿으세요!',
    ],
    posture_correction: [
      '자세를 바르게 해보세요. 마법의 흐름이 막히면 안 돼요!',
      '몸의 균형을 잡아보세요. 마법사에게 균형은 필수에요!',
      '천천히, 정확하게! 마법은 급하게 쓰면 안 됩니다!',
    ],
  },
  sports: {
    exercise_start: [
      '자, 훈련 시작이다! 준비됐나?',
      '오늘도 최선을 다해보자! 화이팅!',
      '챔피언이 되려면 노력해야 해! 시작하자!',
    ],
    exercise_perfect: [
      '완벽해! 이게 진짜 챔피언의 자세야!',
      '대단해! 네 실력이 정말 늘었어!',
      '최고야! 이 조자로 계속 가자!',
    ],
    exercise_good: [
      '좋아! 조금만 더 힘내봐!',
      '잘하고 있어! 포기하지 마!',
      '훌륭해! 이 기세로 밀어붙여!',
    ],
    exercise_normal: [
      '괜찮아, 다시 해보자! 넘어져도 일어나는 게 챔피언이야!',
      '포기하지 마! 진짜 승부는 지금부터야!',
      '연습이 최고의 스승이야! 한 번 더!',
    ],
    exercise_complete: [
      '훈련 끝! 오늘도 한계를 넘었어!',
      '수고했어! 오늘의 땀이 내일의 승리야!',
      '훌륭해! 챔피언의 길에 한 걸음 더 가까워졌어!',
    ],
    encouragement: [
      '힘내! 넌 할 수 있어!',
      '포기는 없어! 끝까지 가보자!',
      '네 안에 챔피언이 있어! 깨워봐!',
    ],
    posture_correction: [
      '자세 점검! 기본기가 중요해!',
      '폼을 바로잡아! 자세가 곧 실력이야!',
      '천천히 정확하게! 빠른 것보다 정확한 게 먼저야!',
    ],
  },
  idol: {
    exercise_start: [
      '오늘의 레슨을 시작할게요! 준비됐죠?',
      '스타가 되려면 연습은 필수! 시작해요!',
      '무대 위의 빛나는 모습을 위해! 파이팅!',
    ],
    exercise_perfect: [
      '완벽해요! 무대에서 빛날 준비가 됐어요!',
      '대단해요! 이게 진짜 스타의 모습이에요!',
      '최고예요! 팬들이 열광할 거예요!',
    ],
    exercise_good: [
      '좋아요! 조금만 더 열심히 해봐요!',
      '잘하고 있어요! 이 조자로 계속!',
      '훌륭해요! 점점 더 빛나고 있어요!',
    ],
    exercise_normal: [
      '괜찮아요, 연습하면 누구나 늘어요!',
      '포기하지 마요! 모든 스타도 처음엔 연습생이었어요!',
      '다시 해봐요! 당신의 가능성은 무한해요!',
    ],
    exercise_complete: [
      '레슨 끝! 오늘도 한 걸음 성장했어요!',
      '수고했어요! 스타의 길에 점점 가까워지고 있어요!',
      '훌륭해요! 무대 위의 당신이 기대돼요!',
    ],
    encouragement: [
      '힘내요! 당신의 꿈은 이루어질 거예요!',
      '포기하지 마요! 빛나는 순간이 올 거예요!',
      '당신은 특별해요! 자신을 믿어요!',
    ],
    posture_correction: [
      '자세를 바르게! 무대에서는 모든 것이 보여요!',
      '우아하게! 아이돌은 항상 아름다워야 해요!',
      '천천히 정확하게! 완벽한 퍼포먼스를 위해!',
    ],
  },
  sf: {
    exercise_start: [
      '훈련 프로그램을 시작합니다. 준비되셨습니까?',
      '신체 강화 프로토콜 가동. 시작하겠습니다.',
      '최적의 컨디션을 위한 훈련을 개시합니다.',
    ],
    exercise_perfect: [
      '완벽한 수행입니다. 신체 능력이 최적화되고 있습니다.',
      '탁월합니다. 예상 성능을 초과했습니다.',
      '놀라운 결과입니다. 데이터가 긍정적입니다.',
    ],
    exercise_good: [
      '양호합니다. 계속 진행하세요.',
      '좋은 성과입니다. 조금 더 최적화가 가능합니다.',
      '효율적인 수행입니다. 이 상태를 유지하세요.',
    ],
    exercise_normal: [
      '재시도를 권장합니다. 학습 알고리즘이 조정됩니다.',
      '포기하지 마세요. 반복이 최적화의 핵심입니다.',
      '데이터 수집 중. 다음 시도에서 개선될 것입니다.',
    ],
    exercise_complete: [
      '훈련 완료. 신체 데이터가 업데이트되었습니다.',
      '프로토콜 종료. 오늘의 성과가 기록되었습니다.',
      '훌륭합니다. 다음 레벨로의 진행이 가능합니다.',
    ],
    encouragement: [
      '포기는 비효율적입니다. 계속하세요.',
      '당신의 잠재력은 계산을 초월합니다.',
      '최적의 결과를 위해 노력하세요.',
    ],
    posture_correction: [
      '자세 보정이 필요합니다. 센서 데이터를 확인하세요.',
      '효율성을 위해 정확한 동작이 권장됩니다.',
      '동작 최적화를 위해 천천히 수행하세요.',
    ],
  },
  spy: {
    exercise_start: [
      '훈련을 시작한다. 임무 수행을 위해 준비해라.',
      '체력은 요원의 기본이다. 시작하지.',
      '실전처럼 훈련하라. 그것이 살아남는 방법이다.',
    ],
    exercise_perfect: [
      '완벽하다. 이 정도면 현장 투입이 가능하다.',
      '훌륭해. 최고의 요원이 될 자질이 보인다.',
      '인상적이다. 기대 이상의 결과야.',
    ],
    exercise_good: [
      '좋아. 조금만 더 다듬으면 완벽해진다.',
      '나쁘지 않아. 이 조자로 계속해.',
      '괜찮은 수행이다. 꾸준히 해라.',
    ],
    exercise_normal: [
      '다시. 현장에서 실수는 생명을 위협한다.',
      '포기하지 마. 훈련이 널 살린다.',
      '반복해. 몸이 기억할 때까지.',
    ],
    exercise_complete: [
      '훈련 종료. 오늘도 살아남는 법을 배웠다.',
      '수고했다. 다음 임무를 위해 쉬어라.',
      '훌륭해. 요원으로서의 자질이 성장했다.',
    ],
    encouragement: [
      '포기는 죽음이다. 계속해.',
      '약점을 극복하는 것이 진정한 강함이다.',
      '임무를 완수해. 그것이 네 존재 이유다.',
    ],
    posture_correction: [
      '자세를 바로잡아. 잘못된 습관은 치명적이다.',
      '정확성이 생명이다. 천천히 정확하게.',
      '기본에 충실해. 그것이 최고의 기술이다.',
    ],
  },
  zombie: {
    exercise_start: [
      '생존 훈련 시작이야. 준비됐어?',
      '살아남으려면 강해져야 해. 시작하자.',
      '좀비들이 기다려. 우리도 준비하자.',
    ],
    exercise_perfect: [
      '완벽해! 이 정도면 어떤 상황에서도 살아남을 수 있어!',
      '대단해! 네가 우리 팀의 희망이야!',
      '최고야! 좀비 떼도 네 상대가 못 돼!',
    ],
    exercise_good: [
      '좋아! 조금만 더 힘내!',
      '잘하고 있어! 포기하지 마!',
      '훌륭해! 계속 이 조자로!',
    ],
    exercise_normal: [
      '괜찮아, 다시 해보자! 살아남는 게 중요해!',
      '포기하지 마! 우리 모두 살아야 해!',
      '연습이야. 실전에서 실수하면 끝이니까.',
    ],
    exercise_complete: [
      '훈련 끝! 오늘도 더 강해졌어!',
      '수고했어! 내일도 살아남자!',
      '훌륭해! 생존 확률이 올라갔어!',
    ],
    encouragement: [
      '힘내! 포기하면 끝이야!',
      '살아남자! 우리가 희망이야!',
      '네가 강해지면 모두가 산다!',
    ],
    posture_correction: [
      '자세 조심! 다치면 모두가 위험해져!',
      '천천히 정확하게! 부상은 치명적이야!',
      '기본에 충실해! 그게 살아남는 방법이야!',
    ],
  },
};

// 성능 등급에 따른 상황 매핑
export function getDialogueSituation(
  rating: PerformanceRating
): DialogueSituation {
  const mapping: Record<PerformanceRating, DialogueSituation> = {
    perfect: 'exercise_perfect',
    good: 'exercise_good',
    normal: 'exercise_normal',
  };
  return mapping[rating];
}

// 랜덤 대사 가져오기
export function getRandomDialogue(
  worldview: WorldviewType,
  situation: DialogueSituation
): string {
  const dialogues = NPC_DIALOGUE_TEMPLATES[worldview][situation];
  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

// 성능에 따른 랜덤 대사 가져오기
export function getPerformanceDialogue(
  worldview: WorldviewType,
  rating: PerformanceRating
): string {
  const situation = getDialogueSituation(rating);
  return getRandomDialogue(worldview, situation);
}
