/**
 * Story Agent Types - 스토리 에이전트 타입 정의
 * HearO-v2에서 포팅 (통일된 스토리 시스템)
 */

import type { WorldviewType } from './vrm';
import type { ExerciseType, PerformanceRating } from './exercise';

// ============================================================
// 기본 타입 정의
// ============================================================

/** 스토리 에이전트 테마 */
export interface StoryAgentTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

/** 스토리 에이전트 설정 */
export interface StoryAgentConfig {
  worldviewId: WorldviewType;
  worldviewName: string;
  genre: string;
  theme: StoryAgentTheme;
  mentorNpc: MentorNpcInfo;
}

/** 멘토 NPC 정보 */
export interface MentorNpcInfo {
  id: string;
  name: string;
  role: string;
  voiceStyle: string;
  personality: string;
}

/** 스토리 메모리 아이템 */
export interface StoryMemoryItem {
  summary: string;
  performance: string;
  timestamp?: string;
}

/** 사용자 상태 */
export interface UserState {
  username: string;
  rehabPhase: number;
  currentChapter: number;
  heroLevel: number;
  heroTitle: string;
  totalSessions: number;
  streakDays: number;
  lastPerformance: string;
  storyMemory: StoryMemoryItem[];
  prologueChoices?: Record<string, string>;
}

/** 세션 결과 */
export interface SessionResult {
  exerciseType: ExerciseType;
  completedReps: number;
  targetReps: number;
  successRate: number;
  duration: number;
  grade: PerformanceRating;
}

// ============================================================
// 스토리 템플릿 타입
// ============================================================

/** 스토리 템플릿 함수들 */
export interface StoryTemplates {
  sessionStart: (exerciseType: string, targetReps: number) => string;
  midExercise: (currentReps: number, targetReps: number, successRate: number) => string;
  sessionComplete: (result: SessionResult) => string;
  chapterComplete: (chapterNum: number, achievements: string[]) => string;
  dailyGreeting: (dayOfWeek: string, weather?: string) => string;
  streakCelebration: (streakDays: number) => string;
}

// ============================================================
// 보상 시스템 타입
// ============================================================

export interface RewardTitle {
  id: string;
  name: string;
  requirement: number;
}

export interface RewardAchievement {
  id: string;
  name: string;
  description: string;
}

export interface StoryRewards {
  titles: RewardTitle[];
  achievements: RewardAchievement[];
}

// ============================================================
// 스토리 에이전트 인터페이스
// ============================================================

export interface StoryAgent {
  config: StoryAgentConfig;
  systemPrompt: string;
  buildPrompt: (userState: UserState) => string;
  templates: StoryTemplates;
  rewards: StoryRewards;
}

// ============================================================
// 세계관 정보
// ============================================================

export interface WorldViewInfo {
  id: WorldviewType;
  name: string;
  iconName: string;
  title: string;
  description: string;
  theme: StoryAgentTheme;
  mentor: MentorNpcInfo;
}

// ============================================================
// 스토리 생성 파라미터/결과
// ============================================================

export type StoryType =
  | 'sessionStart'
  | 'midExercise'
  | 'sessionComplete'
  | 'chapterComplete'
  | 'dailyGreeting'
  | 'streakCelebration';

export interface GenerateStoryParams {
  worldviewId: WorldviewType;
  userId: string;
  storyType: StoryType;
  data: SessionStartData | MidExerciseData | SessionCompleteData | ChapterCompleteData | DailyGreetingData | StreakCelebrationData;
}

export interface GenerateStoryResult {
  success: boolean;
  story: string;
  worldview?: WorldviewType;
  storyType?: StoryType;
  timestamp?: string;
  error?: string;
  message?: string;
  fromCache?: boolean;
  source?: 'template' | 'ai' | 'prerendered' | 'fallback';
}

// 스토리 타입별 데이터 인터페이스
export interface SessionStartData {
  exerciseType: ExerciseType;
  targetReps: number;
}

export interface MidExerciseData {
  currentReps: number;
  targetReps: number;
  successRate: number;
}

export interface SessionCompleteData {
  exerciseType: ExerciseType;
  completedReps: number;
  targetReps: number;
  accuracy: number;
  grade: PerformanceRating;
  levelUp?: boolean;
  newLevel?: number;
}

export interface ChapterCompleteData {
  chapterNum: number;
  achievements: string[];
}

export interface DailyGreetingData {
  dayOfWeek: string;
  weather?: string;
}

export interface StreakCelebrationData {
  streakDays: number;
}

// ============================================================
// 에필로그/프롤로그 컨텍스트
// ============================================================

export interface EpilogueContext {
  worldviewId: WorldviewType;
  userId: string;
  heroName: string;
  heroLevel: number;
  exerciseId: ExerciseType;
  exerciseName?: string;
  reps: number;
  targetReps: number;
  accuracy: number;
  grade: PerformanceRating;
  leveledUp?: boolean;
  newLevel?: number;
  newTitle?: string;
  earnedExp?: number;
  isSpecialEvent?: boolean;
  forceAI?: boolean;
  streakDays?: number;
  /** 현재 챕터 번호 */
  chapter?: number;
  /** 현재 에피소드 번호 */
  episode?: number;
  /** 해당 세계관 총 세션 수 */
  totalSessions?: number;
}

export interface PrologueContext {
  worldviewId: WorldviewType;
  userId: string;
  heroName: string;
  heroLevel: number;
  exerciseId: ExerciseType;
  exerciseName?: string;
  targetReps: number;
  streakDays?: number;
  isSpecialEvent?: boolean;
  forceAI?: boolean;
}

export interface CoachingContext {
  worldviewId: WorldviewType;
  heroName: string;
  exerciseId: ExerciseType;
  exerciseName?: string;
  currentReps: number;
  targetReps: number;
  accuracy: number;
}

// ============================================================
// TTS 음성 설정
// ============================================================

/** TTS 음성 스타일 */
export interface TTSVoiceConfig {
  worldviewId: WorldviewType;
  voiceId: string;
  voiceName: string;
  language: 'ko-KR';
  style: 'cheerful' | 'calm' | 'serious' | 'energetic' | 'mysterious' | 'warm';
  pitch: number;      // 0.5 ~ 2.0
  speed: number;      // 0.5 ~ 2.0
  description: string;
}

// ============================================================
// Export
// ============================================================

export type { WorldviewType };
