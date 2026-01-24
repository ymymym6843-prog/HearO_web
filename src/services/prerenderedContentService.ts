/**
 * Pre-rendered Content Service (Web Version)
 * 프리렌더링된 에필로그 콘텐츠 로더
 *
 * HearO-v2에서 포팅 (React Native → Next.js Web)
 *
 * 기능:
 * - 에필로그 스토리 로드 (JSON)
 * - 에필로그 TTS 오디오 로드 (WAV)
 * - NPC 이미지 로드
 */

import type { WorldviewType } from '@/types/vrm';
import type { ExerciseType, PerformanceRating } from '@/types/exercise';

// ============================================================
// 타입 정의
// ============================================================

/** 성과 등급 (TTS/스토리용) */
export type PerformanceGrade = 'perfect' | 'good' | 'normal';

/** 에필로그 콘텐츠 */
export interface EpilogueContent {
  worldviewId: WorldviewType;
  exerciseId: ExerciseType;
  grade: PerformanceGrade;
  text: string;
  audioUrl?: string;
  mentorNpcId: string;
}

/** NPC 감정 타입 */
export type NPCEmotion = 'normal' | 'happy' | 'serious';

/** 엔딩 티어 */
export type EndingTier = 's' | 'a' | 'b' | 'c' | 'd';

/** 세계관별 멘토 NPC 정보 */
export const WORLDVIEW_MENTORS: Record<WorldviewType, { id: string; name: string }> = {
  fantasy: { id: 'elderlin', name: '현자 엘더린' },
  sports: { id: 'coach_park', name: '코치 박' },
  idol: { id: 'manager_sujin', name: '매니저 수진' },
  sf: { id: 'aria', name: 'AI 아리아' },
  zombie: { id: 'dr_lee', name: '닥터 리' },
  spy: { id: 'handler_omega', name: '핸들러 오메가' },
};

// ============================================================
// TTS 지원 운동 목록 (16개 중복 운동)
// ============================================================

const TTS_SUPPORTED_EXERCISES: ExerciseType[] = [
  // 신체 운동 (5개)
  'squat',
  'bridge',
  'straight_leg_raise',
  'wall_squat',
  'chair_stand',
  // 코어 운동 (5개)
  'seated_core_hold',
  'standing_march_slow',
  'seated_knee_lift',
  'standing_anti_extension_hold',
  'standing_arm_raise_core',
  // 손 재활 운동 (6개)
  'finger_flexion',
  'tendon_glide',
  'thumb_opposition',
  'finger_spread',
  'grip_squeeze',
  'wrist_flexion',
];

// ============================================================
// TTS 오디오 URL 생성
// ============================================================

/**
 * TTS 오디오 URL 가져오기
 * @param worldviewId 세계관 ID
 * @param exerciseId 운동 ID
 * @param grade 성과 등급
 */
export function getTTSAudioUrl(
  worldviewId: WorldviewType,
  exerciseId: ExerciseType,
  grade: PerformanceGrade
): string | null {
  // TTS 지원 운동인지 확인
  if (!TTS_SUPPORTED_EXERCISES.includes(exerciseId)) {
    console.debug('[PrerenderedContent] Exercise not in TTS supported list:', exerciseId);
    return null;
  }

  const audioPath = `/assets/prerendered/tts/${worldviewId}/${exerciseId}_${grade}.wav`;
  return audioPath;
}

/**
 * TTS 오디오 파일 존재 여부 확인 (비동기)
 */
export async function checkTTSAudioExists(
  worldviewId: WorldviewType,
  exerciseId: ExerciseType,
  grade: PerformanceGrade
): Promise<boolean> {
  const url = getTTSAudioUrl(worldviewId, exerciseId, grade);
  if (!url) return false;

  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================================
// TTS 오디오 플레이어
// ============================================================

let currentAudio: HTMLAudioElement | null = null;

/**
 * 에필로그 TTS 재생
 */
export async function playEpilogueTTS(
  worldviewId: WorldviewType,
  exerciseId: ExerciseType,
  grade: PerformanceGrade,
  onComplete?: () => void
): Promise<boolean> {
  try {
    // 기존 재생 중지
    stopEpilogueTTS();

    const audioUrl = getTTSAudioUrl(worldviewId, exerciseId, grade);
    if (!audioUrl) {
      console.info('[PrerenderedContent] No TTS available, skipping');
      onComplete?.();
      return false;
    }

    // 파일 존재 확인
    const exists = await checkTTSAudioExists(worldviewId, exerciseId, grade);
    if (!exists) {
      console.info('[PrerenderedContent] TTS file not found:', audioUrl);
      onComplete?.();
      return false;
    }

    // 오디오 재생
    currentAudio = new Audio(audioUrl);
    currentAudio.volume = 1.0;

    currentAudio.onended = () => {
      onComplete?.();
    };

    currentAudio.onerror = () => {
      console.error('[PrerenderedContent] Audio playback error');
      onComplete?.();
    };

    await currentAudio.play();

    console.info('[PrerenderedContent] TTS started:', { worldviewId, exerciseId, grade });
    return true;
  } catch (error) {
    console.error('[PrerenderedContent] Failed to play TTS:', error);
    onComplete?.();
    return false;
  }
}

/**
 * 에필로그 TTS 중지
 */
export function stopEpilogueTTS(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

/**
 * TTS 재생 중인지 확인
 */
export function isEpilogueTTSPlaying(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}

// ============================================================
// NPC 이미지 URL 생성
// ============================================================

/**
 * NPC 이미지 URL 가져오기
 */
export function getNPCImageUrl(
  worldviewId: WorldviewType,
  npcId: string,
  emotion: NPCEmotion = 'normal'
): string {
  return `/assets/prerendered/npc/${worldviewId}/${npcId}/${emotion}.jpg`;
}

/**
 * 세계관 멘토 NPC 이미지 URL 가져오기
 */
export function getMentorNPCImageUrl(
  worldviewId: WorldviewType,
  emotion: NPCEmotion = 'normal'
): string | null {
  const mentor = WORLDVIEW_MENTORS[worldviewId];
  if (!mentor) return null;

  return getNPCImageUrl(worldviewId, mentor.id, emotion);
}

/**
 * 성과 등급에 따른 NPC 감정 결정
 */
export function gradeToNPCEmotion(grade: PerformanceGrade): NPCEmotion {
  switch (grade) {
    case 'perfect':
    case 'good':
      return 'happy';
    case 'normal':
    default:
      return 'normal';
  }
}

// ============================================================
// 스토리 로더 (JSON 기반)
// ============================================================

let storiesCache: Record<string, Record<string, Record<string, string>>> | null = null;

/**
 * 스토리 데이터 로드 (캐싱)
 */
async function loadStoriesData(): Promise<Record<string, Record<string, Record<string, string>>> | null> {
  if (storiesCache) return storiesCache;

  try {
    const response = await fetch('/assets/prerendered/stories/all_stories.json');
    if (!response.ok) {
      console.error('[PrerenderedContent] Failed to load stories:', response.status);
      return null;
    }

    storiesCache = await response.json();
    return storiesCache;
  } catch (error) {
    console.error('[PrerenderedContent] Error loading stories:', error);
    return null;
  }
}

/**
 * 에필로그 스토리 텍스트 가져오기
 */
export async function getEpilogueStory(
  worldviewId: WorldviewType,
  exerciseId: ExerciseType,
  grade: PerformanceGrade
): Promise<string | null> {
  const stories = await loadStoriesData();
  if (!stories) return null;

  const worldviewStories = stories[worldviewId];
  if (!worldviewStories) {
    console.warn('[PrerenderedContent] Worldview stories not found:', worldviewId);
    return null;
  }

  const exerciseStories = worldviewStories[exerciseId];
  if (!exerciseStories) {
    console.warn('[PrerenderedContent] Exercise stories not found:', exerciseId);
    return null;
  }

  const storyText = exerciseStories[grade];
  if (!storyText) {
    console.warn('[PrerenderedContent] Grade story not found:', grade);
    return null;
  }

  return storyText;
}

// ============================================================
// 통합 에필로그 콘텐츠 로더
// ============================================================

/**
 * 에필로그 콘텐츠 전체 로드
 */
export async function loadEpilogueContent(
  worldviewId: WorldviewType,
  exerciseId: ExerciseType,
  grade: PerformanceGrade
): Promise<EpilogueContent | null> {
  const text = await getEpilogueStory(worldviewId, exerciseId, grade);
  const mentor = WORLDVIEW_MENTORS[worldviewId];
  const audioUrl = getTTSAudioUrl(worldviewId, exerciseId, grade);

  return {
    worldviewId,
    exerciseId,
    grade,
    text: text || getDefaultEpilogueText(grade),
    audioUrl: audioUrl || undefined,
    mentorNpcId: mentor?.id || 'narrator',
  };
}

/**
 * 기본 에필로그 텍스트 (스토리 없을 경우)
 */
function getDefaultEpilogueText(grade: PerformanceGrade): string {
  switch (grade) {
    case 'perfect':
      return '완벽한 수행이었습니다! 정말 대단해요!';
    case 'good':
      return '잘했어요! 꾸준히 하면 더 좋아질 거예요.';
    case 'normal':
    default:
      return '좋은 시작이에요. 다음엔 더 잘할 수 있을 거예요!';
  }
}

// ============================================================
// 등급 변환 유틸리티
// ============================================================

/**
 * 정확도 점수를 성과 등급으로 변환
 */
export function scoreToGrade(accuracy: number): PerformanceGrade {
  if (accuracy >= 90) return 'perfect';
  if (accuracy >= 70) return 'good';
  return 'normal';
}

/**
 * PerformanceRating을 PerformanceGrade로 변환
 */
export function ratingToGrade(rating: PerformanceRating): PerformanceGrade {
  return rating; // 동일한 값
}

/**
 * 성과 등급을 엔딩 티어로 변환
 */
export function gradeToEndingTier(grade: PerformanceGrade): EndingTier {
  switch (grade) {
    case 'perfect':
      return 's';
    case 'good':
      return 'a';
    case 'normal':
    default:
      return 'b';
  }
}

// ============================================================
// Export
// ============================================================

const prerenderedContentService = {
  // TTS
  getTTSAudioUrl,
  checkTTSAudioExists,
  playEpilogueTTS,
  stopEpilogueTTS,
  isEpilogueTTSPlaying,

  // NPC 이미지
  getNPCImageUrl,
  getMentorNPCImageUrl,
  gradeToNPCEmotion,

  // 스토리
  getEpilogueStory,
  loadEpilogueContent,

  // 유틸리티
  scoreToGrade,
  ratingToGrade,
  gradeToEndingTier,

  // 상수
  WORLDVIEW_MENTORS,
  TTS_SUPPORTED_EXERCISES,
};

export default prerenderedContentService;
