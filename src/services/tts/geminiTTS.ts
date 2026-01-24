/**
 * Gemini TTS Service (Web Version)
 * Gemini 2.5 Flash TTS를 사용한 고품질 감정 표현 음성 합성
 *
 * HearO-v2에서 포팅 (Supabase Edge Function 호출)
 *
 * 사용처:
 * - VN 스토리 (vn_narration, vn_dialogue)
 * - 브리핑/에필로그
 * - 몰입 컨텐츠
 */

import { supabase } from '@/lib/supabase/client';
import { createLogger } from '@/lib/logger';
import type { WorldviewType } from '@/types/vrm';
import { GEMINI_TTS_CONFIGS, type GeminiVoiceStyle } from '@/constants/storyAgents';

const log = createLogger('GeminiTTS');

// ============================================================
// 타입 정의
// ============================================================

/** 음성 컨텍스트 */
export type VoiceContext =
  | 'default'
  | 'vn_narration'
  | 'vn_dialogue'
  | 'briefing'
  | 'epilogue'
  | 'story_summary'
  | 'encouragement'
  | 'exercise_guide'
  | 'rom_guide'
  | 'breathing'
  | 'stretching'
  | 'rest_guide'
  | 'posture_correction'
  | 'countdown'
  | 'exercise_start'
  | 'exercise_complete'
  | 'coaching';

/** Gemini TTS 옵션 */
export interface GeminiTTSOptions {
  /** 음성 스타일 */
  voiceStyle?: GeminiVoiceStyle;
  /** 말하기 속도 (0.5 - 2.0) */
  speakingRate?: number;
  /** 음성 이름 (세계관별 음성) */
  voiceName?: string;
  /** 세계관 ID (음성 자동 선택) */
  worldviewId?: WorldviewType;
  /** VoiceContext (통계용) */
  context?: VoiceContext;
  /** 등급 (스타일 자동 선택) */
  grade?: 'perfect' | 'good' | 'normal';
}

/** Edge Function 응답 */
interface GeminiTTSResponse {
  success: boolean;
  audioContent?: string; // Base64
  mimeType?: string;
  error?: string;
  modelUsed?: string;
}

/** 캐시 항목 */
interface CacheEntry {
  audioBlob: Blob;
  mimeType: string;
  createdAt: number;
}

// ============================================================
// 상수 및 설정
// ============================================================

const EDGE_FUNCTION_NAME = 'gemini-tts';

/** 캐시 설정 */
const CACHE_CONFIG = {
  maxItems: 50,
  maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7일
};

/** 컨텍스트별 기본 스타일 */
const CONTEXT_STYLE_MAP: Partial<Record<VoiceContext, GeminiVoiceStyle>> = {
  vn_narration: 'expressive',
  vn_dialogue: 'expressive',
  briefing: 'dramatic',
  epilogue: 'dramatic',
  story_summary: 'gentle',
  encouragement: 'energetic',
};

/** 컨텍스트별 기본 속도 */
const CONTEXT_RATE_MAP: Partial<Record<VoiceContext, number>> = {
  vn_narration: 0.95,
  vn_dialogue: 1.0,
  briefing: 0.9,
  epilogue: 0.85,
  story_summary: 0.9,
};

// ============================================================
// 캐시 관리
// ============================================================

const audioCache = new Map<string, CacheEntry>();

function getCacheKey(text: string, options: GeminiTTSOptions): string {
  const voice = options.voiceName || options.worldviewId || 'default';
  return `gemini_${text.slice(0, 50)}_${voice}_${options.voiceStyle || 'expressive'}_${options.speakingRate || 1.0}`;
}

function cleanCache(): void {
  const now = Date.now();
  const maxAge = CACHE_CONFIG.maxAgeMs;

  for (const [key, entry] of audioCache) {
    if (now - entry.createdAt > maxAge) {
      audioCache.delete(key);
    }
  }

  if (audioCache.size > CACHE_CONFIG.maxItems) {
    const entries = Array.from(audioCache.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt);

    const toRemove = entries.slice(0, audioCache.size - CACHE_CONFIG.maxItems);
    for (const [key] of toRemove) {
      audioCache.delete(key);
    }
  }
}

function getFromCache(key: string): CacheEntry | null {
  const entry = audioCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.createdAt > CACHE_CONFIG.maxAgeMs) {
    audioCache.delete(key);
    return null;
  }

  return entry;
}

function saveToCache(key: string, audioBlob: Blob, mimeType: string): void {
  cleanCache();
  audioCache.set(key, {
    audioBlob,
    mimeType,
    createdAt: Date.now(),
  });
}

// ============================================================
// 헬퍼 함수
// ============================================================

/**
 * 세계관별 음성 이름 가져오기
 */
export function getWorldviewVoiceName(worldviewId: WorldviewType): string {
  return GEMINI_TTS_CONFIGS[worldviewId]?.voiceName || 'Kore';
}

/**
 * 세계관 + 등급별 음성 설정 가져오기
 */
export function getVoiceSettingsForGrade(
  worldviewId: WorldviewType,
  grade: 'perfect' | 'good' | 'normal'
): { voiceName: string; style: GeminiVoiceStyle; rate: number } {
  const config = GEMINI_TTS_CONFIGS[worldviewId];
  const gradeSettings = config.gradeStyles[grade];

  return {
    voiceName: config.voiceName,
    style: gradeSettings.style,
    rate: gradeSettings.rate,
  };
}

// ============================================================
// 메인 API
// ============================================================

/**
 * Gemini TTS로 음성 생성
 *
 * @param text - 음성으로 변환할 텍스트
 * @param options - TTS 옵션
 * @returns Blob 오디오 데이터와 MIME 타입
 */
export async function generateGeminiTTS(
  text: string,
  options: GeminiTTSOptions = {}
): Promise<{ audioBlob: Blob; mimeType: string }> {
  // 세계관 기반 음성 선택
  let voiceName = options.voiceName;
  let voiceStyle = options.voiceStyle;
  let speakingRate = options.speakingRate;

  // 세계관 + 등급 기반 자동 설정
  if (options.worldviewId && options.grade) {
    const settings = getVoiceSettingsForGrade(options.worldviewId, options.grade);
    voiceName = voiceName || settings.voiceName;
    voiceStyle = voiceStyle || settings.style;
    speakingRate = speakingRate || settings.rate;
  } else if (options.worldviewId) {
    voiceName = voiceName || getWorldviewVoiceName(options.worldviewId);
  }

  // 컨텍스트 기반 기본값
  const context = options.context;
  voiceStyle = voiceStyle || (context ? CONTEXT_STYLE_MAP[context] : undefined) || 'expressive';
  speakingRate = speakingRate || (context ? CONTEXT_RATE_MAP[context] : undefined) || 1.0;

  // 캐시 확인
  const cacheKey = getCacheKey(text, { voiceName, voiceStyle, speakingRate });
  const cached = getFromCache(cacheKey);
  if (cached) {
    log.debug('Cache hit', { cacheKey });
    return { audioBlob: cached.audioBlob, mimeType: cached.mimeType };
  }

  log.info('Generating Gemini TTS', {
    textLength: text.length,
    voiceName,
    voiceStyle,
    speakingRate,
    context,
  });

  try {
    // Edge Function 호출
    const { data, error } = await supabase.functions.invoke<GeminiTTSResponse>(
      EDGE_FUNCTION_NAME,
      {
        body: {
          text,
          voiceStyle,
          speakingRate,
          voiceName: voiceName || 'Kore',
        },
      }
    );

    if (error) {
      log.error('Edge Function error', { error });
      throw new Error(`Gemini TTS error: ${error.message}`);
    }

    if (!data?.success || !data.audioContent) {
      log.error('TTS generation failed', { error: data?.error });
      throw new Error(data?.error || 'No audio content returned');
    }

    // Base64 → Blob 변환
    const binaryString = atob(data.audioContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const mimeType = data.mimeType || 'audio/mp3';
    const audioBlob = new Blob([bytes], { type: mimeType });

    // 캐시 저장
    saveToCache(cacheKey, audioBlob, mimeType);

    log.info('Gemini TTS generated successfully', {
      textLength: text.length,
      audioSize: audioBlob.size,
      modelUsed: data.modelUsed,
    });

    return { audioBlob, mimeType };

  } catch (error) {
    log.error('Gemini TTS generation failed', { error });
    throw error;
  }
}

/**
 * 오디오 재생 (헬퍼 함수)
 */
export async function playGeminiTTS(
  text: string,
  options: GeminiTTSOptions = {}
): Promise<void> {
  const { audioBlob } = await generateGeminiTTS(text, options);

  return new Promise((resolve, reject) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };

    audio.onerror = (e) => {
      URL.revokeObjectURL(audioUrl);
      reject(new Error(`Audio playback error: ${e}`));
    };

    audio.play().catch(reject);
  });
}

/**
 * 세계관 VN 대화용 TTS 재생
 */
export async function playWorldviewTTS(
  text: string,
  worldviewId: WorldviewType,
  context: VoiceContext = 'vn_dialogue'
): Promise<void> {
  const voiceName = getWorldviewVoiceName(worldviewId);

  return playGeminiTTS(text, {
    voiceName,
    context,
    worldviewId,
  });
}

/**
 * 에필로그용 TTS 재생 (등급별 스타일 적용)
 */
export async function playEpilogueTTS(
  text: string,
  worldviewId: WorldviewType,
  grade: 'perfect' | 'good' | 'normal'
): Promise<void> {
  const settings = getVoiceSettingsForGrade(worldviewId, grade);

  return playGeminiTTS(text, {
    voiceName: settings.voiceName,
    voiceStyle: settings.style,
    speakingRate: settings.rate,
    context: 'epilogue',
  });
}

// ============================================================
// 캐시 통계
// ============================================================

export interface GeminiTTSCacheStats {
  itemCount: number;
  estimatedSizeMB: number;
  oldestItemAge: number | null;
}

export function getGeminiTTSCacheStats(): GeminiTTSCacheStats {
  let totalSize = 0;
  let oldestTime: number | null = null;

  for (const entry of audioCache.values()) {
    totalSize += entry.audioBlob.size;
    if (oldestTime === null || entry.createdAt < oldestTime) {
      oldestTime = entry.createdAt;
    }
  }

  return {
    itemCount: audioCache.size,
    estimatedSizeMB: totalSize / (1024 * 1024),
    oldestItemAge: oldestTime ? Date.now() - oldestTime : null,
  };
}

export function clearGeminiTTSCache(): void {
  audioCache.clear();
  log.info('Gemini TTS cache cleared');
}

// ============================================================
// Export
// ============================================================

const geminiTTSService = {
  generateGeminiTTS,
  playGeminiTTS,
  playWorldviewTTS,
  playEpilogueTTS,
  getWorldviewVoiceName,
  getVoiceSettingsForGrade,
  getGeminiTTSCacheStats,
  clearGeminiTTSCache,
};

export default geminiTTSService;
