/**
 * 세계관별 온보딩 다이얼로그
 * 첫 방문 시 세계관 소개, 재방문 시 짧은 인사
 */

import type { DialogueEntry } from '@/types/phase';
import type { WorldviewType } from '@/types/vrm';

// ============================================================
// 첫 방문 온보딩 다이얼로그 (3-4개 엔트리)
// ============================================================

const FIRST_VISIT_DIALOGUES: Record<WorldviewType, DialogueEntry[]> = {
  fantasy: [
    {
      npcId: 'main',
      emotion: 'happy',
      text: '어서 오거라, 젊은 전사여. 나는 현자 엘더린, 아르카디아 왕국의 수석 현자이다.',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'normal',
      text: '이곳은 아르카디아 왕국, 마법과 기사도가 숨 쉬는 땅이다. 어둠의 세력에 맞서 왕국을 지키려면 강한 몸과 마음이 필요하지.',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'serious',
      text: '너는 마법 기사 수련생으로 선발되었다. 앞으로 나와 함께 수련하며 점점 더 강해지게 될 것이야.',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'happy',
      text: '자, 첫 번째 수련을 시작해볼까? 준비되면 알려주거라!',
      tts: true,
      autoAdvance: 0,
    },
  ],

  sports: [
    {
      npcId: 'main',
      emotion: 'happy',
      text: '반갑습니다! 저는 코치 박, 당신의 재활 트레이너입니다.',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'normal',
      text: '여기는 챔피언 스포츠 재활 센터예요. 부상에서 완전히 회복해서 다시 필드로 돌아가는 게 우리의 목표입니다.',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'serious',
      text: '당신은 컴백을 준비하는 선수입니다. 저와 함께라면 반드시 돌아올 수 있어요!',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'happy',
      text: '자, 오늘부터 같이 시작해봅시다. 파이팅!',
      tts: true,
      autoAdvance: 0,
    },
  ],

  idol: [
    {
      npcId: 'main',
      emotion: 'happy',
      text: '안녕~! 나는 매니저 수진이야. 만나서 반가워!',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'normal',
      text: '여기는 스타라이트 엔터테인먼트! 무대 위에서 빛나는 스타를 꿈꾸는 연습생들이 모인 곳이야.',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'happy',
      text: '너는 이제부터 데뷔를 준비하는 연습생이야! 체력이 기본이니까, 내가 옆에서 도와줄게~',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'happy',
      text: '그럼 첫 연습 시작해볼까? 화이팅!',
      tts: true,
      autoAdvance: 0,
    },
  ],

  sf: [
    {
      npcId: 'main',
      emotion: 'normal',
      text: '환영합니다, 파일럿. 저는 AI 아리아, 네오 의료 센터의 재활 지원 시스템입니다.',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'normal',
      text: '이곳은 네오 의료 센터, 우주 정거장 내 최첨단 재활 시설입니다. 우주 환경 적응을 위한 신체 훈련을 수행합니다.',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'normal',
      text: '당신은 재활 파일럿으로 등록되었습니다. 저와 함께 체계적인 프로그램을 진행하겠습니다.',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'happy',
      text: '첫 번째 프로그램을 시작합니다. 준비가 되면 신호를 보내주십시오.',
      tts: true,
      autoAdvance: 0,
    },
  ],

  zombie: [
    {
      npcId: 'main',
      emotion: 'serious',
      text: '생존자인가? 나는 닥터 리, 라스트 셸터의 의료관이다.',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'normal',
      text: '이곳은 라스트 셸터, 좀비 아포칼립스에서 살아남은 자들의 마지막 캠프다. 밖은 위험하지만, 여기서 준비하면 살아남을 수 있어.',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'serious',
      text: '넌 이제부터 생존자로서 체력을 길러야 해. 강해지지 않으면 밖에서 버틸 수 없다.',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'normal',
      text: '시작하자. 살아남는 건 스스로에게 달렸어.',
      tts: true,
      autoAdvance: 0,
    },
  ],

  spy: [
    {
      npcId: 'main',
      emotion: 'normal',
      text: '에이전트, 접선 확인. 나는 핸들러 오메가, 섀도우 에이전시 작전 지휘관이다.',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'normal',
      text: '이곳은 섀도우 에이전시 비밀 훈련장. 부상에서 회복한 요원들이 현장 복귀를 준비하는 곳이다.',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'serious',
      text: '너는 부상에서 복귀를 준비 중인 요원이다. 현장에 복귀하려면 체력과 민첩성을 회복해야 한다.',
      tts: true,
      autoAdvance: 0,
    },
    {
      npcId: 'main',
      emotion: 'normal',
      text: '훈련을 시작하겠다. 준비가 됐으면 신호를 보내라.',
      tts: true,
      autoAdvance: 0,
    },
  ],
};

// ============================================================
// 재방문 짧은 인사
// ============================================================

const RETURN_VISIT_DIALOGUES: Record<WorldviewType, DialogueEntry[]> = {
  fantasy: [
    {
      npcId: 'main',
      emotion: 'happy',
      text: '다시 돌아왔구나, 전사여! 오늘도 수련할 준비가 됐는가?',
      tts: true,
      autoAdvance: 0,
    },
  ],
  sports: [
    {
      npcId: 'main',
      emotion: 'happy',
      text: '왔어요! 오늘도 화이팅합시다!',
      tts: true,
      autoAdvance: 0,
    },
  ],
  idol: [
    {
      npcId: 'main',
      emotion: 'happy',
      text: '왔구나~! 오늘도 같이 열심히 해보자!',
      tts: true,
      autoAdvance: 0,
    },
  ],
  sf: [
    {
      npcId: 'main',
      emotion: 'normal',
      text: '파일럿, 다시 접속 확인. 오늘의 프로그램을 시작합니다.',
      tts: true,
      autoAdvance: 0,
    },
  ],
  zombie: [
    {
      npcId: 'main',
      emotion: 'normal',
      text: '돌아왔군. 오늘도 생존 훈련이다. 준비해.',
      tts: true,
      autoAdvance: 0,
    },
  ],
  spy: [
    {
      npcId: 'main',
      emotion: 'normal',
      text: '에이전트, 접선 확인. 오늘의 훈련 미션을 시작하겠다.',
      tts: true,
      autoAdvance: 0,
    },
  ],
};

// ============================================================
// 공개 API
// ============================================================

/**
 * 세계관 온보딩 다이얼로그 가져오기
 * @param worldview 세계관 ID
 * @param isFirstVisit 첫 방문 여부
 */
export function getWorldviewOnboardingDialogue(
  worldview: WorldviewType,
  isFirstVisit: boolean
): DialogueEntry[] {
  if (isFirstVisit) {
    return FIRST_VISIT_DIALOGUES[worldview];
  }
  return RETURN_VISIT_DIALOGUES[worldview];
}

export { FIRST_VISIT_DIALOGUES, RETURN_VISIT_DIALOGUES };
