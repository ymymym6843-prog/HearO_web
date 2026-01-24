/**
 * TTS Router (Web Version)
 * 컨텍스트 기반 TTS 제공자 라우팅
 *
 * HearO-v2에서 포팅
 *
 * 전략:
 * - 몰입 컨텐츠 (VN 스토리): Gemini TTS (고품질 감정 표현)
 * - 운동 가이드: 프리렌더링 TTS 또는 Web Speech API
 * - 즉시 응답 필요: Web Speech API (브라우저 내장)
 */

import { createLogger } from '@/lib/logger';
import type { VoiceContext } from './geminiTTS';

const log = createLogger('TTSRouter');

// ============================================================
// 타입 정의
// ============================================================

/** TTS 제공자 */
export type TTSProvider = 'gemini' | 'google_cloud' | 'prerendered' | 'web_speech' | 'none';

export interface TTSRouterConfig {
  /** Gemini TTS 활성화 여부 */
  enableGeminiTTS: boolean;
  /** 오프라인 모드 강제 */
  forceOffline: boolean;
  /** Gemini TTS 비용 제한 (일일 문자 수) */
  geminiDailyLimitChars: number;
}

export interface TTSRouterState {
  /** 오늘 Gemini TTS 사용량 (chars) */
  geminiUsageToday: number;
  /** 마지막 리셋 날짜 */
  lastResetDate: string;
}

// ============================================================
// 컨텍스트 분류
// ============================================================

/** Gemini TTS를 사용할 몰입 컨텍스트 목록 */
const IMMERSIVE_CONTEXTS: VoiceContext[] = [
  'vn_narration',
  'vn_dialogue',
  'briefing',
  'epilogue',
  'story_summary',
];

/** 프리렌더링 TTS 우선 컨텍스트 */
const PRERENDERED_CONTEXTS: VoiceContext[] = [
  'epilogue',
  'briefing',
];

/** 즉시 응답이 필요한 컨텍스트 (Web Speech API) */
const LOW_LATENCY_CONTEXTS: VoiceContext[] = [
  'countdown',
  'exercise_start',
  'exercise_complete',
];

/** 운동 가이드 컨텍스트 */
const EXERCISE_CONTEXTS: VoiceContext[] = [
  'exercise_guide',
  'rom_guide',
  'breathing',
  'stretching',
  'rest_guide',
  'posture_correction',
  'coaching',
  'encouragement',
];

// ============================================================
// 상태 관리
// ============================================================

let config: TTSRouterConfig = {
  enableGeminiTTS: true,
  forceOffline: false,
  geminiDailyLimitChars: 10000, // 일일 10K chars 제한
};

const state: TTSRouterState = {
  geminiUsageToday: 0,
  lastResetDate: new Date().toISOString().split('T')[0],
};

// ============================================================
// 유틸리티 함수
// ============================================================

function checkAndResetDailyUsage(): void {
  const today = new Date().toISOString().split('T')[0];
  if (state.lastResetDate !== today) {
    state.geminiUsageToday = 0;
    state.lastResetDate = today;
    log.info('Daily Gemini TTS usage reset');
  }
}

function isOnline(): boolean {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  return true;
}

// ============================================================
// 메인 라우팅 로직
// ============================================================

/**
 * 컨텍스트 기반 TTS 제공자 선택
 */
export function selectTTSProvider(
  context: VoiceContext,
  textLength?: number,
  hasPrerendered?: boolean
): TTSProvider {
  checkAndResetDailyUsage();

  // 1. 오프라인 강제 모드
  if (config.forceOffline) {
    log.debug('Forced offline mode', { context });
    return 'web_speech';
  }

  // 2. 네트워크 연결 없음
  if (!isOnline()) {
    log.debug('Offline - using web speech', { context });
    return 'web_speech';
  }

  // 3. 프리렌더링 우선 (에필로그, 브리핑)
  if (PRERENDERED_CONTEXTS.includes(context) && hasPrerendered) {
    log.debug('Prerendered content available', { context });
    return 'prerendered';
  }

  // 4. 즉시 응답 필요 컨텍스트
  if (LOW_LATENCY_CONTEXTS.includes(context)) {
    log.debug('Low latency context - using web speech', { context });
    return 'web_speech';
  }

  // 5. Gemini TTS 비활성화 상태
  if (!config.enableGeminiTTS) {
    log.debug('Gemini TTS disabled', { context });
    return 'web_speech';
  }

  // 6. Gemini TTS 일일 한도 초과
  const charCount = textLength || 100;
  if (state.geminiUsageToday + charCount > config.geminiDailyLimitChars) {
    log.warn('Gemini TTS daily limit reached', {
      used: state.geminiUsageToday,
      limit: config.geminiDailyLimitChars,
    });
    return 'web_speech';
  }

  // 7. 몰입 컨텍스트 → Gemini TTS
  if (IMMERSIVE_CONTEXTS.includes(context)) {
    log.debug('Immersive context - using Gemini TTS', { context });
    return 'gemini';
  }

  // 8. 운동 가이드 → Web Speech (또는 프리렌더링)
  if (EXERCISE_CONTEXTS.includes(context)) {
    log.debug('Exercise context - using web speech', { context });
    return 'web_speech';
  }

  // 9. 기본: Web Speech API
  log.debug('Default - using web speech', { context });
  return 'web_speech';
}

/**
 * Gemini TTS 사용량 기록
 */
export function recordGeminiUsage(charCount: number): void {
  checkAndResetDailyUsage();
  state.geminiUsageToday += charCount;
  log.debug('Gemini TTS usage recorded', {
    added: charCount,
    total: state.geminiUsageToday,
  });
}

// ============================================================
// 설정 관리 API
// ============================================================

export function updateRouterConfig(updates: Partial<TTSRouterConfig>): void {
  config = { ...config, ...updates };
  log.info('TTS Router config updated', { ...config } as Record<string, unknown>);
}

export function getRouterConfig(): TTSRouterConfig {
  return { ...config };
}

export function getRouterState(): TTSRouterState {
  checkAndResetDailyUsage();
  return { ...state };
}

export function setGeminiTTSEnabled(enabled: boolean): void {
  config.enableGeminiTTS = enabled;
  log.info(`Gemini TTS ${enabled ? 'enabled' : 'disabled'}`);
}

export function isImmersiveContext(context: VoiceContext): boolean {
  return IMMERSIVE_CONTEXTS.includes(context);
}

export function getRemainingGeminiQuota(): number {
  checkAndResetDailyUsage();
  return Math.max(0, config.geminiDailyLimitChars - state.geminiUsageToday);
}

// ============================================================
// 통계
// ============================================================

export interface TTSRouterStats {
  geminiUsageToday: number;
  geminiDailyLimit: number;
  geminiRemainingQuota: number;
  geminiUsagePercent: number;
  isGeminiEnabled: boolean;
  isOnline: boolean;
}

export function getRouterStats(): TTSRouterStats {
  checkAndResetDailyUsage();

  return {
    geminiUsageToday: state.geminiUsageToday,
    geminiDailyLimit: config.geminiDailyLimitChars,
    geminiRemainingQuota: getRemainingGeminiQuota(),
    geminiUsagePercent: (state.geminiUsageToday / config.geminiDailyLimitChars) * 100,
    isGeminiEnabled: config.enableGeminiTTS,
    isOnline: isOnline(),
  };
}

// ============================================================
// Export
// ============================================================

const ttsRouter = {
  selectTTSProvider,
  recordGeminiUsage,
  updateRouterConfig,
  getRouterConfig,
  getRouterState,
  getRouterStats,
  setGeminiTTSEnabled,
  isImmersiveContext,
  getRemainingGeminiQuota,
};

export default ttsRouter;
