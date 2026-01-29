/**
 * 반복 플레이 대사 변형
 * 세션 히스토리 기반으로 다이얼로그를 차별화
 *
 * 변형 기준:
 * - 첫 방문 (episode=1): 풀 소개
 * - 재방문 (episode 2-4): 친밀도 높은 짧은 인사 + 새 팁
 * - 챕터 전환 (episode % 5 === 0): 챕터 클리어 축하 + 다음 챕터 예고
 * - 특별 이벤트 (streak 7/30/100): 특별 대사
 */

import type { DialogueEntry } from '@/types/phase';
import type { WorldviewType } from '@/types/vrm';

// ============================================================
// 스토리 컨텍스트 타입
// ============================================================

export interface StoryContext {
  chapter: number;
  episode: number;
  totalSessions: number;
  streakDays: number;
  isFirstVisit: boolean;
}

// ============================================================
// 재방문 에피소드별 인사 변형
// ============================================================

type EpisodeGreetingFn = (ctx: StoryContext) => string;

const EPISODE_GREETINGS: Record<WorldviewType, EpisodeGreetingFn[]> = {
  fantasy: [
    (ctx) => `다시 왔구나, 전사여! 벌써 ${ctx.totalSessions}번째 수련이야. 실력이 느는 게 보인다!`,
    (ctx) => `오늘로 챕터 ${ctx.chapter}의 ${ctx.episode}번째 수련이다. 점점 강해지고 있어!`,
    () => '꾸준히 오는 자가 진정한 기사가 되는 법이지. 오늘도 힘내보자!',
    () => '마법의 기운이 네 안에서 자라고 있구나. 오늘도 수련하자!',
  ],
  sports: [
    (ctx) => `${ctx.totalSessions}번째 훈련이에요! 꾸준함이 최고의 무기죠!`,
    (ctx) => `챕터 ${ctx.chapter} 진행 중! ${ctx.episode}번째 세션, 파이팅!`,
    () => '오늘도 왔군요! 이 페이스면 복귀가 머지않았어요!',
    () => '매일 조금씩 나아지고 있어요. 오늘도 최선을 다해봅시다!',
  ],
  idol: [
    (ctx) => `${ctx.totalSessions}번째 연습이야~! 넌 정말 성실해!`,
    (ctx) => `챕터 ${ctx.chapter}의 ${ctx.episode}번째! 데뷔가 가까워지고 있어!`,
    () => '오늘도 왔구나~! 팬들이 좋아할 거야!',
    () => '매일 연습하는 너, 진짜 프로다~!',
  ],
  sf: [
    (ctx) => `파일럿, ${ctx.totalSessions}번째 훈련 세션 시작. 수행 데이터 축적 중입니다.`,
    (ctx) => `챕터 ${ctx.chapter}, 세션 ${ctx.episode}. 재활 진행률이 상승 중입니다.`,
    () => '정기 훈련 프로토콜 실행. 이전 대비 개선이 감지됩니다.',
    () => '파일럿의 꾸준한 참여가 최적의 결과를 만들고 있습니다.',
  ],
  zombie: [
    (ctx) => `${ctx.totalSessions}번째 훈련이야. 네가 점점 강해지는 게 느껴진다.`,
    (ctx) => `챕터 ${ctx.chapter}, ${ctx.episode}번째. 밖에서 살아남을 준비가 되어가고 있어.`,
    () => '또 왔군. 좋아, 살아남으려면 멈추면 안 돼.',
    () => '매일 오는 건 좋은 징조야. 강해지고 있다는 뜻이니까.',
  ],
  spy: [
    (ctx) => `에이전트, ${ctx.totalSessions}번째 훈련 접수. 성과 데이터 분석 중.`,
    (ctx) => `챕터 ${ctx.chapter}, 미션 ${ctx.episode}. 복귀 준비도가 상승 중이다.`,
    () => '정시 접선 확인. 신뢰할 수 있는 요원이군.',
    () => '꾸준한 훈련이 현장에서 살아남는 비결이다.',
  ],
};

// ============================================================
// 챕터 전환 축하 메시지
// ============================================================

const CHAPTER_CLEAR_MESSAGES: Record<WorldviewType, (chapter: number) => string> = {
  fantasy: (ch) => `대단하다! 챕터 ${ch}의 수련을 모두 완수했다! 더 강력한 도전이 기다리고 있을 것이야.`,
  sports: (ch) => `챕터 ${ch} 클리어! 이 정도면 진짜 복귀가 코앞이에요! 다음 단계도 화이팅!`,
  idol: (ch) => `와~! 챕터 ${ch} 완료! 데뷔가 점점 가까워지고 있어! 다음 챕터도 기대돼~!`,
  sf: (ch) => `챕터 ${ch} 프로그램 완료. 재활 진행률 업데이트. 다음 단계 프로토콜을 준비합니다.`,
  zombie: (ch) => `챕터 ${ch} 생존 훈련 완료. 네가 살아남을 확률이 올라가고 있어. 멈추지 마.`,
  spy: (ch) => `챕터 ${ch} 미션 완수. 현장 복귀 준비도 상승. 다음 단계 브리핑을 준비하겠다.`,
};

// ============================================================
// 스트릭 특별 메시지
// ============================================================

const STREAK_MESSAGES: Record<WorldviewType, Record<number, string>> = {
  fantasy: {
    7: '7일 연속 수련이라니! 전설의 기사에 한 발짝 더 가까워졌구나!',
    30: '30일 연속! 네 헌신은 왕국의 전설이 될 것이다!',
    100: '100일 연속 수련! 너는 이미 전설의 영웅이야!',
  },
  sports: {
    7: '7일 연속! 이 꾸준함이면 완전 복귀 확실해요!',
    30: '30일 연속 훈련! 프로 선수의 자질이 보여요!',
    100: '100일 연속! 당신은 진정한 챔피언이에요!',
  },
  idol: {
    7: '7일 연속 연습~! 넌 진짜 프로 연습생이야!',
    30: '30일 연속이라니~! 데뷔 확정이야!',
    100: '100일 연속! 넌 이미 톱 스타야!',
  },
  sf: {
    7: '7일 연속 훈련. 파일럿의 헌신도가 높습니다.',
    30: '30일 연속. 최적의 재활 궤도에 진입했습니다.',
    100: '100일 연속. 전설적 파일럿 등급으로 분류합니다.',
  },
  zombie: {
    7: '7일 연속 생존 훈련. 네 생존력이 올라가고 있어.',
    30: '30일 연속. 넌 이 캠프의 희망이야.',
    100: '100일 연속. 넌 전설의 생존자다.',
  },
  spy: {
    7: '7일 연속 훈련. 신뢰도 상향 조정.',
    30: '30일 연속. 최우수 요원 후보로 등록.',
    100: '100일 연속. 전설의 요원으로 기록.',
  },
};

// ============================================================
// 공개 API
// ============================================================

/**
 * 컨텍스트 기반 인사 다이얼로그 생성
 */
export function getContextualGreeting(
  worldview: WorldviewType,
  context: StoryContext
): DialogueEntry[] {
  const entries: DialogueEntry[] = [];

  // 1. 스트릭 특별 메시지 (최우선)
  const streakMsg = STREAK_MESSAGES[worldview]?.[context.streakDays];
  if (streakMsg) {
    entries.push({
      npcId: 'main',
      emotion: 'happy',
      text: streakMsg,
      tts: true,
      autoAdvance: 0,
    });
    return entries;
  }

  // 2. 챕터 클리어 직후 (이전 세션이 챕터의 마지막이었을 때)
  // episode가 1이고 totalSessions > 1이면 방금 챕터가 넘어간 것
  if (context.episode === 1 && context.totalSessions > 1) {
    const clearedChapter = context.chapter - 1;
    if (clearedChapter > 0) {
      entries.push({
        npcId: 'main',
        emotion: 'happy',
        text: CHAPTER_CLEAR_MESSAGES[worldview](clearedChapter),
        tts: true,
        autoAdvance: 0,
      });
      return entries;
    }
  }

  // 3. 에피소드별 변형 인사
  const greetings = EPISODE_GREETINGS[worldview];
  // totalSessions가 0이거나 음수일 때 방어 처리
  const safeTotal = Math.max(1, context.totalSessions);
  const greetingIdx = (safeTotal - 1) % greetings.length;
  const greetingText = greetings[greetingIdx](context);

  entries.push({
    npcId: 'main',
    emotion: 'happy',
    text: greetingText,
    tts: true,
    autoAdvance: 0,
  });

  return entries;
}

/**
 * 챕터 클리어 메시지 가져오기 (에필로그용)
 */
export function getChapterClearMessage(
  worldview: WorldviewType,
  chapter: number
): string {
  return CHAPTER_CLEAR_MESSAGES[worldview](chapter);
}

/**
 * 스트릭 메시지 가져오기
 */
export function getStreakMessage(
  worldview: WorldviewType,
  streakDays: number
): string | null {
  return STREAK_MESSAGES[worldview]?.[streakDays] || null;
}
