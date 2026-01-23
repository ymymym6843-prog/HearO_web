/**
 * AI Gateway - AI 호출 최적화 게이트웨이
 * HearO-v2에서 포팅 (Web 환경 최적화)
 *
 * 설계 원칙:
 * 1. 프리렌더링된 콘텐츠 우선 사용 (비용 절감)
 * 2. 템플릿 폴백 (AI 없이도 동작)
 * 3. 특별 상황에서만 AI 호출 (선택적)
 */

import type { WorldviewType } from '@/types/vrm';
import type { ExerciseType, PerformanceRating } from '@/types/exercise';
import type {
  EpilogueContext,
  PrologueContext,
  CoachingContext,
  GenerateStoryResult,
} from '@/types/story';
import {
  WORLDVIEW_MENTORS,
  getHeroTitle,
  getExerciseNameKr,
  getGradeNameKr,
} from '@/constants/storyAgents';
import {
  getEpilogueStory,
  getTTSAudioUrl,
  scoreToGrade,
} from '@/services/prerenderedContentService';

// ============================================================
// 타입 정의
// ============================================================

export interface GenerationResult {
  success: boolean;
  content: string;
  source: 'prerendered' | 'template' | 'ai' | 'fallback';
  audioUrl?: string;
  cached?: boolean;
  error?: string;
}

// ============================================================
// 프리렌더링 콘텐츠 체크
// ============================================================

/**
 * 프리렌더링된 에필로그가 있는지 확인
 */
export async function hasPrerenderedEpilogue(
  worldviewId: WorldviewType,
  exerciseId: ExerciseType,
  grade: PerformanceRating
): Promise<boolean> {
  const story = await getEpilogueStory(worldviewId, exerciseId, grade);
  return story !== null;
}

// ============================================================
// 에필로그 생성
// ============================================================

/**
 * 에필로그 생성 (프리렌더링 → 템플릿 → AI 순서)
 */
export async function generateEpilogue(
  context: EpilogueContext
): Promise<GenerationResult> {
  const {
    worldviewId,
    heroName,
    heroLevel,
    exerciseId,
    reps,
    targetReps,
    accuracy,
    grade,
    leveledUp = false,
    newLevel,
    earnedExp = 0,
    isSpecialEvent = false,
    forceAI = false,
    streakDays = 0,
  } = context;

  // 1. 특별 이벤트가 아니면 프리렌더링 콘텐츠 우선 사용
  if (!isSpecialEvent && !forceAI) {
    const prerenderedStory = await getEpilogueStory(worldviewId, exerciseId, grade);

    if (prerenderedStory) {
      const audioUrl = getTTSAudioUrl(worldviewId, exerciseId, grade);

      console.log('[AIGateway] Using prerendered epilogue', {
        worldviewId,
        exerciseId,
        grade,
      });

      return {
        success: true,
        content: prerenderedStory,
        source: 'prerendered',
        audioUrl: audioUrl || undefined,
      };
    }
  }

  // 2. 템플릿 기반 생성 (폴백)
  const templateContent = generateTemplateEpilogue({
    worldviewId,
    heroName,
    heroLevel,
    exerciseId,
    reps,
    targetReps,
    accuracy,
    grade,
    leveledUp,
    newLevel,
    earnedExp,
  });

  console.log('[AIGateway] Using template epilogue', {
    worldviewId,
    exerciseId,
    grade,
    isSpecialEvent,
  });

  return {
    success: true,
    content: templateContent,
    source: 'template',
  };
}

// ============================================================
// 프롤로그 생성
// ============================================================

/**
 * 프롤로그 생성 (템플릿 기반)
 */
export function generatePrologue(context: PrologueContext): GenerationResult {
  const {
    worldviewId,
    heroName,
    heroLevel,
    exerciseId,
    targetReps,
    streakDays = 0,
  } = context;

  const mentor = WORLDVIEW_MENTORS[worldviewId];
  const heroTitle = getHeroTitle(worldviewId, heroLevel);
  const exerciseName = context.exerciseName || getExerciseNameKr(exerciseId);
  const timeGreeting = getTimeGreeting();

  // 세계관별 프롤로그 템플릿
  const templates: Record<WorldviewType, string> = {
    fantasy: `${timeGreeting}, ${heroTitle} ${heroName}님. 오늘의 수련은 "${exerciseName}"입니다. ${targetReps}회를 목표로 시작해볼까요? ${mentor.name}이(가) 지켜보고 있습니다.`,
    sports: `${timeGreeting}, ${heroName} 선수! 오늘 훈련 종목은 "${exerciseName}"입니다. ${targetReps}회, 준비되셨죠? 최선을 다해봅시다!`,
    idol: `${timeGreeting}, ${heroName}님~ 오늘 연습 메뉴는 "${exerciseName}"이에요! ${targetReps}회 함께 해볼까요? 팬들이 응원하고 있어요!`,
    sf: `${timeGreeting}, 파일럿 ${heroName}. 금일 재활 프로그램: "${exerciseName}". 목표 횟수: ${targetReps}회. 프로그램을 시작합니다.`,
    zombie: `${timeGreeting}, ${heroName}. 오늘의 생존 훈련은 "${exerciseName}"이다. ${targetReps}회를 채워야 한다. 살아남으려면 강해져야 해.`,
    spy: `${timeGreeting}, 요원 ${heroName}. 오늘 훈련 미션: "${exerciseName}". 목표: ${targetReps}회. 현장 복귀를 위해 힘을 길러야 합니다.`,
  };

  const content = templates[worldviewId];

  // 연속 운동 보너스 메시지
  let bonusMessage = '';
  if (streakDays > 0) {
    bonusMessage = ` (연속 ${streakDays}일째 운동 중!)`;
  }

  return {
    success: true,
    content: content + bonusMessage,
    source: 'template',
  };
}

// ============================================================
// 코칭 메시지 생성
// ============================================================

/**
 * 실시간 코칭 메시지 생성 (항상 템플릿 사용)
 */
export function generateCoaching(context: CoachingContext): GenerationResult {
  const {
    worldviewId,
    heroName,
    exerciseId,
    currentReps,
    targetReps,
    accuracy,
  } = context;

  const remaining = targetReps - currentReps;
  const progress = Math.round((currentReps / targetReps) * 100);
  const exerciseName = context.exerciseName || getExerciseNameKr(exerciseId);

  // 진행률에 따른 메시지
  let message = '';

  if (progress < 25) {
    message = getCoachingMessage(worldviewId, 'start', heroName, remaining);
  } else if (progress < 50) {
    message = getCoachingMessage(worldviewId, 'quarter', heroName, remaining);
  } else if (progress < 75) {
    message = getCoachingMessage(worldviewId, 'half', heroName, remaining);
  } else if (progress < 100) {
    message = getCoachingMessage(worldviewId, 'almost', heroName, remaining);
  } else {
    message = getCoachingMessage(worldviewId, 'complete', heroName, 0);
  }

  return {
    success: true,
    content: message,
    source: 'template',
  };
}

// ============================================================
// 헬퍼 함수
// ============================================================

/**
 * 시간대별 인사말
 */
function getTimeGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 6) return '새벽이네요';
  if (hour < 12) return '좋은 아침이에요';
  if (hour < 18) return '안녕하세요';
  return '좋은 저녁이에요';
}

/**
 * 템플릿 기반 에필로그 생성
 */
function generateTemplateEpilogue(params: {
  worldviewId: WorldviewType;
  heroName: string;
  heroLevel: number;
  exerciseId: ExerciseType;
  reps: number;
  targetReps: number;
  accuracy: number;
  grade: PerformanceRating;
  leveledUp: boolean;
  newLevel?: number;
  earnedExp: number;
}): string {
  const {
    worldviewId,
    heroName,
    heroLevel,
    exerciseId,
    reps,
    targetReps,
    accuracy,
    grade,
    leveledUp,
    newLevel,
    earnedExp,
  } = params;

  const mentor = WORLDVIEW_MENTORS[worldviewId];
  const heroTitle = getHeroTitle(worldviewId, heroLevel);
  const exerciseName = getExerciseNameKr(exerciseId);
  const gradeKr = getGradeNameKr(grade);

  // 등급별 기본 메시지
  const gradeMessages: Record<PerformanceRating, string> = {
    perfect: `${heroTitle} ${heroName}님, "${exerciseName}" 운동을 완벽하게 수행하셨습니다! ${accuracy}%의 정확도로 ${reps}회를 모두 완료했네요.`,
    good: `${heroTitle} ${heroName}님, "${exerciseName}" 운동을 잘 마치셨습니다! ${accuracy}%의 정확도로 훌륭한 결과예요.`,
    normal: `${heroTitle} ${heroName}님, "${exerciseName}" 운동을 마치셨습니다. ${accuracy}%의 정확도로 ${reps}회 완료! 꾸준히 하면 더 좋아질 거예요.`,
  };

  let content = gradeMessages[grade];

  // 레벨업 메시지 추가
  if (leveledUp && newLevel) {
    const newTitle = getHeroTitle(worldviewId, newLevel);
    content += ` 축하합니다! 레벨 ${newLevel}로 승급하여 "${newTitle}"가 되셨습니다!`;
  }

  // 경험치 메시지 추가
  if (earnedExp > 0) {
    content += ` (+${earnedExp} EXP)`;
  }

  return content;
}

/**
 * 세계관별 코칭 메시지
 */
function getCoachingMessage(
  worldviewId: WorldviewType,
  phase: 'start' | 'quarter' | 'half' | 'almost' | 'complete',
  heroName: string,
  remaining: number
): string {
  const messages: Record<WorldviewType, Record<string, string>> = {
    fantasy: {
      start: `힘을 모아라, ${heroName}! ${remaining}회 남았다!`,
      quarter: `좋아, 순조롭게 진행 중이다! ${remaining}회!`,
      half: `절반 완료! 멈추지 마라, ${heroName}!`,
      almost: `거의 다 왔어! ${remaining}회만 더!`,
      complete: `훌륭하다, ${heroName}! 수련 완료!`,
    },
    sports: {
      start: `파이팅, ${heroName}! ${remaining}회 가자!`,
      quarter: `좋아요! 페이스 유지! ${remaining}회!`,
      half: `하프타임! 끝까지 달려요! ${remaining}회!`,
      almost: `막바지! ${remaining}회만 더!`,
      complete: `완벽해요, ${heroName}! 훈련 끝!`,
    },
    idol: {
      start: `화이팅, ${heroName}! ${remaining}회 남았어요!`,
      quarter: `잘하고 있어요~ ${remaining}회!`,
      half: `반이나 했어요! ${remaining}회 파이팅!`,
      almost: `거의 다 왔어요! ${remaining}회만!`,
      complete: `최고예요, ${heroName}! 연습 끝!`,
    },
    sf: {
      start: `프로그램 진행 중. 잔여: ${remaining}회.`,
      quarter: `수행도 양호. 잔여: ${remaining}회.`,
      half: `50% 달성. 잔여: ${remaining}회.`,
      almost: `목표 근접. 잔여: ${remaining}회.`,
      complete: `프로그램 완료. 수고하셨습니다, ${heroName}.`,
    },
    zombie: {
      start: `버텨, ${heroName}! ${remaining}회 더!`,
      quarter: `살아남고 있어! ${remaining}회!`,
      half: `절반 생존! ${remaining}회만 더!`,
      almost: `거의 끝이야! ${remaining}회!`,
      complete: `오늘도 살아남았어, ${heroName}!`,
    },
    spy: {
      start: `집중, ${heroName}. 잔여: ${remaining}회.`,
      quarter: `진행 순조롭습니다. ${remaining}회.`,
      half: `미션 50% 완료. ${remaining}회.`,
      almost: `미션 완료 임박. ${remaining}회.`,
      complete: `미션 완료. 수고했습니다, ${heroName}.`,
    },
  };

  return messages[worldviewId][phase];
}

// ============================================================
// 특별 이벤트 판단
// ============================================================

/**
 * 특별 이벤트 판단 (AI 호출 필요 여부)
 */
export function isSpecialEvent(context: {
  totalSessions?: number;
  streakDays?: number;
  isFirstExercise?: boolean;
  isMilestone?: boolean;
}): boolean {
  const { totalSessions = 0, streakDays = 0, isFirstExercise = false, isMilestone = false } = context;

  // 첫 운동
  if (isFirstExercise || totalSessions === 1) return true;

  // 연속 기록 마일스톤
  if ([7, 14, 30, 50, 100, 365].includes(streakDays)) return true;

  // 세션 마일스톤
  if ([10, 50, 100, 500, 1000].includes(totalSessions)) return true;

  // 기타 마일스톤
  if (isMilestone) return true;

  return false;
}

// ============================================================
// 통합 헬퍼
// ============================================================

/**
 * 템플릿 우선 시도 (기존 서비스 연동용)
 */
export async function tryTemplateFirst(
  type: 'epilogue' | 'prologue' | 'coaching',
  context: EpilogueContext | PrologueContext | CoachingContext
): Promise<GenerationResult> {
  switch (type) {
    case 'epilogue':
      return generateEpilogue(context as EpilogueContext);
    case 'prologue':
      return generatePrologue(context as PrologueContext);
    case 'coaching':
      return generateCoaching(context as CoachingContext);
    default:
      return {
        success: false,
        content: '',
        source: 'fallback',
        error: 'Unknown type',
      };
  }
}

// ============================================================
// Export
// ============================================================

export default {
  generateEpilogue,
  generatePrologue,
  generateCoaching,
  tryTemplateFirst,
  isSpecialEvent,
  hasPrerenderedEpilogue,
};
