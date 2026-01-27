/**
 * 에필로그 타입별 템플릿
 * 챕터 완료, 마일스톤, 첫 방문 등 다양한 엔딩 분기
 */

import type { WorldviewType } from '@/types/vrm';
import type { PerformanceRating } from '@/types/exercise';
import type { EpilogueType } from '@/types/phase';
import { EPISODES_PER_CHAPTER } from '@/stores/useStoryProgressStore';

export type { EpilogueType };

// ============================================================
// 스토리 컨텍스트 (에필로그 결정용)
// ============================================================

export interface EpilogueStoryContext {
  chapter: number;
  episode: number;
  totalSessions: number;
  streakDays: number;
  isFirstVisit: boolean;
  grade: PerformanceRating;
}

// ============================================================
// 에필로그 타입 결정
// ============================================================

/**
 * 에필로그 타입 자동 결정
 *
 * 우선순위 (높은 순):
 *  1. first_visit  — 세계관 첫 방문 (환영 메시지, 가장 짧음)
 *  2. chapter_clear — 챕터 완료 (5회 운동 완수, 축하 + 다음 챕터 예고)
 *  3. milestone     — 스트릭/세션 마일스톤 (7일, 30일, 100회 등)
 *  4. normal        — 기본 성과 기반 에필로그
 *
 * 복수 조건 충족 시 상위 우선순위 하나만 적용.
 * 예: 첫 방문 + 챕터 클리어 동시 → first_visit 우선 (첫 방문 경험이 UX상 중요)
 * 예: 챕터 클리어 + 마일스톤 동시 → chapter_clear 우선
 */
export function determineEpilogueType(context: EpilogueStoryContext): EpilogueType {
  if (context.isFirstVisit) return 'first_visit';
  if (context.episode === EPISODES_PER_CHAPTER) return 'chapter_clear';
  if (isMilestoneEvent(context)) return 'milestone';
  return 'normal';
}

/**
 * 마일스톤 이벤트 여부 확인
 */
function isMilestoneEvent(context: EpilogueStoryContext): boolean {
  const streakMilestones = [7, 14, 30, 50, 100, 365];
  const sessionMilestones = [10, 50, 100, 500, 1000];

  if (streakMilestones.includes(context.streakDays)) return true;
  if (sessionMilestones.includes(context.totalSessions)) return true;

  return false;
}

// ============================================================
// 챕터 클리어 에필로그 템플릿
// ============================================================

const CHAPTER_CLEAR_TEMPLATES: Record<WorldviewType, (chapter: number, grade: PerformanceRating) => string> = {
  fantasy: (ch, grade) => {
    const base = `축하한다, 전사여! 챕터 ${ch}의 모든 수련을 완수했다!`;
    const gradeMsg = grade === 'perfect'
      ? ' 완벽한 실력으로 마무리하다니, 진정한 기사의 자질이구나!'
      : grade === 'good'
      ? ' 훌륭한 성과야. 다음 챕터에서 더 성장할 거라 믿는다.'
      : ' 끝까지 해낸 것만으로도 대단해. 다음 챕터에서 더 강해지자!';
    return base + gradeMsg + ` 이제 챕터 ${ch + 1}이 기다리고 있다!`;
  },
  sports: (ch, grade) => {
    const base = `챕터 ${ch} 완료! 대단해요!`;
    const gradeMsg = grade === 'perfect'
      ? ' 완벽한 퍼포먼스! 이대로라면 금방 복귀할 거예요!'
      : grade === 'good'
      ? ' 좋은 성과예요! 꾸준히 하면 더 좋아질 거예요!'
      : ' 끝까지 해냈어요! 그게 중요합니다!';
    return base + gradeMsg + ` 챕터 ${ch + 1}에서 한 단계 더 올라가봅시다!`;
  },
  idol: (ch, grade) => {
    const base = `와~! 챕터 ${ch} 클리어!`;
    const gradeMsg = grade === 'perfect'
      ? ' 완전 완벽했어! 이 정도면 바로 무대에 설 수 있겠는걸~!'
      : grade === 'good'
      ? ' 잘했어~! 이대로 가면 데뷔 확정이야!'
      : ' 끝까지 한 거 멋져! 다음엔 더 잘할 수 있을 거야!';
    return base + gradeMsg + ` 챕터 ${ch + 1}도 기대돼~!`;
  },
  sf: (ch, grade) => {
    const base = `챕터 ${ch} 프로그램 완료.`;
    const gradeMsg = grade === 'perfect'
      ? ' 최적 수치 달성. 탁월한 수행도입니다.'
      : grade === 'good'
      ? ' 수행도 양호. 기대 이상의 결과입니다.'
      : ' 프로그램 완수 확인. 지속적 훈련을 권장합니다.';
    return base + gradeMsg + ` 챕터 ${ch + 1} 프로토콜을 준비합니다.`;
  },
  zombie: (ch, grade) => {
    const base = `챕터 ${ch} 생존 훈련 완료.`;
    const gradeMsg = grade === 'perfect'
      ? ' 완벽해. 넌 밖에서도 살아남을 수 있어.'
      : grade === 'good'
      ? ' 좋아. 점점 강해지고 있어.'
      : ' 끝까지 한 건 좋아. 멈추면 안 돼.';
    return base + gradeMsg + ` 챕터 ${ch + 1}, 더 험한 훈련이 기다리고 있다.`;
  },
  spy: (ch, grade) => {
    const base = `챕터 ${ch} 미션 완수.`;
    const gradeMsg = grade === 'perfect'
      ? ' 최상급 수행. 인상적이군.'
      : grade === 'good'
      ? ' 양호한 수행. 기대에 부응했다.'
      : ' 미션 완수 확인. 추가 훈련을 편성하겠다.';
    return base + gradeMsg + ` 챕터 ${ch + 1} 브리핑을 준비하겠다.`;
  },
};

// ============================================================
// 마일스톤 에필로그 템플릿
// ============================================================

const MILESTONE_TEMPLATES: Record<WorldviewType, (ctx: EpilogueStoryContext) => string> = {
  fantasy: (ctx) => {
    if (ctx.streakDays >= 100) return `100일 연속 수련! 너는 진정한 전설의 영웅이다! ${ctx.totalSessions}회의 수련이 너를 최강의 기사로 만들었어!`;
    if (ctx.streakDays >= 30) return `30일 연속! 왕국의 모든 기사가 너를 존경한다!`;
    if (ctx.streakDays >= 7) return `7일 연속 수련! 꾸준함이야말로 진정한 힘이다!`;
    if (ctx.totalSessions >= 100) return `${ctx.totalSessions}회 수련 달성! 전설의 기사 반열에 올랐구나!`;
    return `${ctx.totalSessions}회 수련 달성! 대단한 성과야!`;
  },
  sports: (ctx) => {
    if (ctx.streakDays >= 100) return `100일 연속! 당신은 진정한 챔피언이에요! 총 ${ctx.totalSessions}회 훈련, 기록적이에요!`;
    if (ctx.streakDays >= 30) return `30일 연속 훈련! 프로 선수의 근성이에요!`;
    if (ctx.streakDays >= 7) return `7일 연속! 이 페이스면 완전 복귀 확실!`;
    if (ctx.totalSessions >= 100) return `${ctx.totalSessions}회 훈련 달성! 놀라운 기록이에요!`;
    return `${ctx.totalSessions}회 훈련 마일스톤! 파이팅!`;
  },
  idol: (ctx) => {
    if (ctx.streakDays >= 100) return `100일 연속~! 넌 이미 톱 스타야! ${ctx.totalSessions}회 연습 대단해!`;
    if (ctx.streakDays >= 30) return `30일 연속 연습! 데뷔 확정이야~!`;
    if (ctx.streakDays >= 7) return `7일 연속! 넌 진짜 프로 연습생이야~!`;
    if (ctx.totalSessions >= 100) return `${ctx.totalSessions}회 연습! 전설의 아이돌이야!`;
    return `${ctx.totalSessions}회 연습 달성! 대박~!`;
  },
  sf: (ctx) => {
    if (ctx.streakDays >= 100) return `100일 연속 훈련. 전설적 파일럿 등급 확정. 총 세션: ${ctx.totalSessions}.`;
    if (ctx.streakDays >= 30) return `30일 연속. 최적 재활 궤도 진입.`;
    if (ctx.streakDays >= 7) return `7일 연속. 파일럿 헌신도 상위 등급.`;
    if (ctx.totalSessions >= 100) return `${ctx.totalSessions}회 훈련 달성. 레전드 파일럿 데이터 기록.`;
    return `${ctx.totalSessions}회 세션 마일스톤 달성.`;
  },
  zombie: (ctx) => {
    if (ctx.streakDays >= 100) return `100일 연속 생존. 넌 전설의 생존자다. 총 ${ctx.totalSessions}회 훈련.`;
    if (ctx.streakDays >= 30) return `30일 연속. 넌 이 캠프의 희망이야.`;
    if (ctx.streakDays >= 7) return `7일 연속 훈련. 생존력이 확실히 올라갔어.`;
    if (ctx.totalSessions >= 100) return `${ctx.totalSessions}회 훈련. 넌 이 세계에서 가장 강한 생존자야.`;
    return `${ctx.totalSessions}회 훈련 달성. 점점 강해지고 있어.`;
  },
  spy: (ctx) => {
    if (ctx.streakDays >= 100) return `100일 연속. 전설의 요원으로 기록. 총 미션: ${ctx.totalSessions}.`;
    if (ctx.streakDays >= 30) return `30일 연속. 최우수 요원 후보 등록.`;
    if (ctx.streakDays >= 7) return `7일 연속. 신뢰도 상향 조정.`;
    if (ctx.totalSessions >= 100) return `${ctx.totalSessions}회 미션 완수. 전설적 기록.`;
    return `${ctx.totalSessions}회 미션 마일스톤. 인상적이군.`;
  },
};

// ============================================================
// 첫 방문 에필로그
// ============================================================

const FIRST_VISIT_TEMPLATES: Record<WorldviewType, (grade: PerformanceRating) => string> = {
  fantasy: (grade) => {
    if (grade === 'perfect') return '첫 수련을 완벽하게 해냈다니! 넌 타고난 전사야! 아르카디아 왕국에 빛이 되어줄 거야!';
    if (grade === 'good') return '좋은 시작이야! 첫 수련부터 이 정도면 대단해. 앞으로가 기대된다!';
    return '첫 수련을 마쳤어! 처음부터 잘할 필요는 없어. 꾸준히 하면 반드시 강해질 거야!';
  },
  sports: (grade) => {
    if (grade === 'perfect') return '첫 훈련부터 완벽! 당신은 타고난 선수예요!';
    if (grade === 'good') return '좋은 시작이에요! 이대로라면 금방 복귀할 거예요!';
    return '첫 훈련 완료! 시작이 반이에요. 함께 해봐요!';
  },
  idol: (grade) => {
    if (grade === 'perfect') return '첫 연습부터 완벽~! 넌 타고난 스타야!';
    if (grade === 'good') return '좋은 시작이야~! 이대로 가면 데뷔 성공이야!';
    return '첫 연습 완료! 시작이 반이야~ 같이 열심히 하자!';
  },
  sf: (grade) => {
    if (grade === 'perfect') return '첫 세션 최적 수치 달성. 탁월한 적응력입니다.';
    if (grade === 'good') return '첫 세션 양호. 기대 이상의 수행도입니다.';
    return '첫 세션 완료. 초기 데이터 수집 성공. 지속적 훈련을 권장합니다.';
  },
  zombie: (grade) => {
    if (grade === 'perfect') return '첫 훈련부터 완벽이야. 넌 살아남을 거야.';
    if (grade === 'good') return '좋아. 첫 훈련치고 괜찮아. 계속하면 더 강해질 거야.';
    return '첫 훈련 완료. 시작한 것만으로도 대단해. 멈추지 마.';
  },
  spy: (grade) => {
    if (grade === 'perfect') return '첫 미션 최상급 수행. 유망한 요원이군.';
    if (grade === 'good') return '첫 미션 양호. 잠재력이 보인다.';
    return '첫 미션 완수. 시작이 좋다. 훈련을 계속하겠다.';
  },
};

// ============================================================
// 라이트 믹스: 우선순위로 생략된 보조 조건의 축하 문구
// ============================================================

/**
 * first_visit가 우선 적용될 때, 동시에 만족되는 보조 조건의 짧은 축하 문구 반환.
 * 완전한 분기 추가 없이 "보상감"을 보조적으로 전달.
 *
 * 참고: 현재 첫 방문 시 totalSessions=1, episode=1이므로 실질적으로 빈 문자열 반환.
 * 향후 "세계관 재설정" 등으로 isFirstVisit이 진행 중 트리거될 경우를 대비한 방어 코드.
 */
function getOverlappingBonusSuffix(context: EpilogueStoryContext): string {
  // first_visit이면서 동시에 챕터 클리어/마일스톤인 경우만 해당
  if (context.episode === EPISODES_PER_CHAPTER) {
    return ` 게다가 챕터 ${context.chapter}도 클리어!`;
  }
  if (isMilestoneEvent(context)) {
    return ' 마일스톤까지 달성했어!';
  }
  return '';
}

// ============================================================
// 공개 API
// ============================================================

/**
 * 에필로그 타입에 따른 에필로그 텍스트 생성
 */
export function getEpilogueByType(
  worldview: WorldviewType,
  epilogueType: EpilogueType,
  context: EpilogueStoryContext
): string {
  switch (epilogueType) {
    case 'chapter_clear':
      return CHAPTER_CLEAR_TEMPLATES[worldview](context.chapter, context.grade);
    case 'milestone':
      return MILESTONE_TEMPLATES[worldview](context);
    case 'first_visit': {
      const base = FIRST_VISIT_TEMPLATES[worldview](context.grade);
      const bonus = getOverlappingBonusSuffix(context);
      return base + bonus;
    }
    case 'normal':
    default:
      return ''; // normal은 기존 성과 기반 에필로그 사용
  }
}

/**
 * 에필로그 타입이 특별 에필로그인지 확인
 */
export function isSpecialEpilogue(type: EpilogueType): boolean {
  return type !== 'normal';
}
