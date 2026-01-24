/**
 * TTS Fallback Manager (Web Version)
 * Circuit Breaker 패턴을 사용한 TTS 제공자 자동 전환
 *
 * 폴백 체인:
 * 1. Gemini 2.5 Flash TTS (감정 표현, 고품질)
 * 2. Gemini 2.5 Pro TTS (Flash 제한 시)
 * 3. Google Cloud TTS (WaveNet, 안정적)
 * 4. Web Speech API (브라우저 내장, 오프라인)
 *
 * HearO-v2에서 포팅 + Web 환경 최적화
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('TTSFallback');

// ============================================================
// 상수 정의
// ============================================================

const STORAGE_KEY = 'hearo_tts_fallback_state';

/** Circuit Breaker 설정 */
const CIRCUIT_BREAKER_CONFIG = {
  /** 폴백 진입까지 연속 실패 횟수 */
  failureThreshold: 3,
  /** 자동 복구 시도 간격 (5분) */
  recoveryIntervalMs: 5 * 60 * 1000,
  /** 에러 기록 유지 시간 (1시간) */
  errorWindowMs: 60 * 60 * 1000,
  /** 최대 백오프 시간 (30분) */
  maxBackoffMs: 30 * 60 * 1000,
};

// ============================================================
// 타입 정의
// ============================================================

/** TTS 제공자 유형 */
export type TTSProvider = 'gemini' | 'google_cloud' | 'web_speech' | 'prerendered' | 'none';

/** Gemini 모델 유형 */
export type GeminiModel = 'flash' | 'pro';

/** 에러 유형 */
export type TTSErrorType =
  | 'RATE_LIMIT_EXCEEDED'   // 429
  | 'API_QUOTA_EXCEEDED'    // 403
  | 'NETWORK_ERROR'         // 네트워크 문제
  | 'API_KEY_ERROR'         // API 키 미설정
  | 'MODEL_ERROR'           // 모델 에러
  | 'UNKNOWN_ERROR';        // 기타

/** Circuit Breaker 상태 */
export type CircuitState = 'closed' | 'open' | 'half_open';

/** 제공자별 상태 */
interface ProviderState {
  circuitState: CircuitState;
  consecutiveFailures: number;
  lastErrorTime: number | null;
  lastErrorType: TTSErrorType | null;
  lastSuccessTime: number | null;
  nextRecoveryAttempt: number | null;
}

/** 전체 폴백 상태 */
interface FallbackState {
  gemini: ProviderState;
  googleCloud: ProviderState;
  /** 현재 활성 제공자 */
  activeProvider: TTSProvider;
  /** 현재 Gemini 모델 (flash 또는 pro) */
  currentGeminiModel: GeminiModel;
  /** 총 폴백 횟수 (통계용) */
  totalFallbackCount: number;
  /** 총 복구 횟수 (통계용) */
  totalRecoveryCount: number;
}

/** 폴백 이벤트 */
export interface FallbackEvent {
  type: 'fallback_activated' | 'model_switched' | 'recovery_attempted' | 'recovery_success' | 'recovery_failed';
  fromProvider?: TTSProvider;
  toProvider: TTSProvider;
  fromModel?: GeminiModel;
  toModel?: GeminiModel;
  reason?: TTSErrorType;
  timestamp: number;
}

/** 폴백 이벤트 리스너 */
export type FallbackEventListener = (event: FallbackEvent) => void;

// ============================================================
// 상태 관리
// ============================================================

const createInitialProviderState = (): ProviderState => ({
  circuitState: 'closed',
  consecutiveFailures: 0,
  lastErrorTime: null,
  lastErrorType: null,
  lastSuccessTime: null,
  nextRecoveryAttempt: null,
});

let state: FallbackState = {
  gemini: createInitialProviderState(),
  googleCloud: createInitialProviderState(),
  activeProvider: 'gemini',
  currentGeminiModel: 'flash',
  totalFallbackCount: 0,
  totalRecoveryCount: 0,
};

const eventListeners: Set<FallbackEventListener> = new Set();

// ============================================================
// 저장소 (localStorage)
// ============================================================

function saveState(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    log.warn('Failed to save fallback state', { error });
  }
}

export function loadState(): void {
  if (typeof window === 'undefined') return;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as FallbackState;
      const now = Date.now();

      // 오래된 에러 상태 리셋
      if (parsed.gemini.lastErrorTime &&
          now - parsed.gemini.lastErrorTime > CIRCUIT_BREAKER_CONFIG.errorWindowMs) {
        parsed.gemini = createInitialProviderState();
      }
      if (parsed.googleCloud.lastErrorTime &&
          now - parsed.googleCloud.lastErrorTime > CIRCUIT_BREAKER_CONFIG.errorWindowMs) {
        parsed.googleCloud = createInitialProviderState();
      }

      state = parsed;

      log.info('Loaded fallback state', {
        activeProvider: state.activeProvider,
        geminiModel: state.currentGeminiModel,
        geminiCircuit: state.gemini.circuitState,
        googleCloudCircuit: state.googleCloud.circuitState,
      });
    }
  } catch (error) {
    log.warn('Failed to load fallback state', { error });
  }
}

// ============================================================
// 이벤트 관리
// ============================================================

export function subscribeFallbackEvents(listener: FallbackEventListener): () => void {
  eventListeners.add(listener);
  return () => eventListeners.delete(listener);
}

function emitEvent(event: FallbackEvent): void {
  eventListeners.forEach(listener => {
    try {
      listener(event);
    } catch (error) {
      log.warn('Event listener error', { error });
    }
  });
}

// ============================================================
// 에러 분류
// ============================================================

export function classifyError(error: unknown, statusCode?: number): TTSErrorType {
  if (statusCode === 429) return 'RATE_LIMIT_EXCEEDED';
  if (statusCode === 403) return 'API_QUOTA_EXCEEDED';

  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage.includes('RATE_LIMIT')) return 'RATE_LIMIT_EXCEEDED';
  if (errorMessage.includes('QUOTA')) return 'API_QUOTA_EXCEEDED';
  if (errorMessage.includes('API key') || errorMessage.includes('not configured')) return 'API_KEY_ERROR';
  if (errorMessage.includes('model') || errorMessage.includes('MODEL')) return 'MODEL_ERROR';
  if (errorMessage.includes('network') || errorMessage.includes('fetch') ||
      errorMessage.includes('timeout') || errorMessage.includes('Failed to fetch')) {
    return 'NETWORK_ERROR';
  }

  return 'UNKNOWN_ERROR';
}

// ============================================================
// Gemini 모델 관리
// ============================================================

/**
 * Gemini 모델 전환 (Flash → Pro)
 */
export function switchGeminiModel(): GeminiModel {
  const _previousModel = state.currentGeminiModel;

  if (state.currentGeminiModel === 'flash') {
    state.currentGeminiModel = 'pro';
    log.info('Switched Gemini model: Flash → Pro');

    emitEvent({
      type: 'model_switched',
      toProvider: 'gemini',
      fromModel: 'flash',
      toModel: 'pro',
      timestamp: Date.now(),
    });
  }

  saveState();
  return state.currentGeminiModel;
}

/**
 * Gemini 모델 리셋 (Pro → Flash)
 */
export function resetGeminiModel(): void {
  if (state.currentGeminiModel === 'pro') {
    state.currentGeminiModel = 'flash';
    log.info('Reset Gemini model to Flash');
  }
  saveState();
}

/**
 * 현재 Gemini 모델 반환
 */
export function getCurrentGeminiModel(): GeminiModel {
  return state.currentGeminiModel;
}

// ============================================================
// 제공자별 성공/실패 기록
// ============================================================

/**
 * Gemini TTS 성공 기록
 */
export function recordGeminiSuccess(): void {
  const wasOpen = state.gemini.circuitState !== 'closed';

  state.gemini.consecutiveFailures = 0;
  state.gemini.lastSuccessTime = Date.now();
  state.gemini.circuitState = 'closed';
  state.gemini.nextRecoveryAttempt = null;
  state.activeProvider = 'gemini';

  // 성공 시 Flash 모델로 복귀
  if (state.currentGeminiModel === 'pro') {
    state.currentGeminiModel = 'flash';
    log.info('Gemini success, reset to Flash model');
  }

  if (wasOpen) {
    state.totalRecoveryCount++;
    emitEvent({
      type: 'recovery_success',
      toProvider: 'gemini',
      timestamp: Date.now(),
    });
  }

  saveState();
}

/**
 * Gemini TTS 실패 기록
 */
export function recordGeminiFailure(errorType: TTSErrorType, model: GeminiModel): void {
  const now = Date.now();

  // Rate Limit이고 Flash 모델이면 Pro로 전환
  if (errorType === 'RATE_LIMIT_EXCEEDED' && model === 'flash') {
    switchGeminiModel();
    log.info('Gemini Flash rate limited, switching to Pro');
    return; // Pro 시도를 위해 폴백 카운트 증가 안함
  }

  state.gemini.consecutiveFailures++;
  state.gemini.lastErrorTime = now;
  state.gemini.lastErrorType = errorType;

  log.warn('Gemini TTS failure recorded', {
    errorType,
    model,
    consecutiveFailures: state.gemini.consecutiveFailures,
    threshold: CIRCUIT_BREAKER_CONFIG.failureThreshold,
  });

  // 임계값 도달 시 Google Cloud로 폴백
  if (state.gemini.consecutiveFailures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    activateGoogleCloudFallback(errorType);
  }

  saveState();
}

/**
 * Google Cloud TTS 성공 기록
 */
export function recordGoogleCloudSuccess(): void {
  const wasOpen = state.googleCloud.circuitState !== 'closed';

  state.googleCloud.consecutiveFailures = 0;
  state.googleCloud.lastSuccessTime = Date.now();
  state.googleCloud.circuitState = 'closed';
  state.googleCloud.nextRecoveryAttempt = null;

  if (wasOpen) {
    state.totalRecoveryCount++;
    emitEvent({
      type: 'recovery_success',
      toProvider: 'google_cloud',
      timestamp: Date.now(),
    });
  }

  saveState();
}

/**
 * Google Cloud TTS 실패 기록
 */
export function recordGoogleCloudFailure(errorType: TTSErrorType): void {
  const now = Date.now();

  state.googleCloud.consecutiveFailures++;
  state.googleCloud.lastErrorTime = now;
  state.googleCloud.lastErrorType = errorType;

  log.warn('Google Cloud TTS failure recorded', {
    errorType,
    consecutiveFailures: state.googleCloud.consecutiveFailures,
  });

  // 임계값 도달 시 Web Speech로 폴백
  if (state.googleCloud.consecutiveFailures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    activateWebSpeechFallback(errorType);
  }

  saveState();
}

// ============================================================
// 폴백 활성화
// ============================================================

function activateGoogleCloudFallback(reason: TTSErrorType): void {
  if (state.activeProvider === 'google_cloud' || state.activeProvider === 'web_speech') {
    return;
  }

  state.gemini.circuitState = 'open';
  state.activeProvider = 'google_cloud';
  state.totalFallbackCount++;

  // 복구 시간 설정
  const recoveryDelay = getRecoveryDelay(reason);
  state.gemini.nextRecoveryAttempt = Date.now() + recoveryDelay;

  log.warn('Fallback to Google Cloud TTS', {
    reason,
    recoveryDelay,
    nextRecoveryAttempt: new Date(state.gemini.nextRecoveryAttempt).toISOString(),
  });

  emitEvent({
    type: 'fallback_activated',
    fromProvider: 'gemini',
    toProvider: 'google_cloud',
    reason,
    timestamp: Date.now(),
  });

  saveState();
}

function activateWebSpeechFallback(reason: TTSErrorType): void {
  if (state.activeProvider === 'web_speech') {
    return;
  }

  state.googleCloud.circuitState = 'open';
  state.activeProvider = 'web_speech';
  state.totalFallbackCount++;

  const recoveryDelay = getRecoveryDelay(reason);
  state.googleCloud.nextRecoveryAttempt = Date.now() + recoveryDelay;

  log.warn('Fallback to Web Speech API', {
    reason,
    recoveryDelay,
  });

  emitEvent({
    type: 'fallback_activated',
    fromProvider: 'google_cloud',
    toProvider: 'web_speech',
    reason,
    timestamp: Date.now(),
  });

  saveState();
}

function getRecoveryDelay(reason: TTSErrorType): number {
  switch (reason) {
    case 'RATE_LIMIT_EXCEEDED':
      return 2 * 60 * 1000; // 2분
    case 'API_QUOTA_EXCEEDED':
      return 30 * 60 * 1000; // 30분
    case 'API_KEY_ERROR':
      return 60 * 60 * 1000; // 1시간
    default:
      return CIRCUIT_BREAKER_CONFIG.recoveryIntervalMs; // 5분
  }
}

// ============================================================
// 복구 시도
// ============================================================

export function shouldAttemptGeminiRecovery(): boolean {
  if (state.gemini.circuitState !== 'open') return false;
  if (!state.gemini.nextRecoveryAttempt) return true;
  return Date.now() >= state.gemini.nextRecoveryAttempt;
}

export function shouldAttemptGoogleCloudRecovery(): boolean {
  if (state.googleCloud.circuitState !== 'open') return false;
  if (!state.googleCloud.nextRecoveryAttempt) return true;
  return Date.now() >= state.googleCloud.nextRecoveryAttempt;
}

export function startGeminiRecoveryAttempt(): void {
  if (state.gemini.circuitState !== 'open') return;

  state.gemini.circuitState = 'half_open';
  state.currentGeminiModel = 'flash'; // 복구 시 Flash부터 시작

  log.info('Gemini TTS recovery attempt started');

  emitEvent({
    type: 'recovery_attempted',
    toProvider: 'gemini',
    timestamp: Date.now(),
  });

  saveState();
}

export function startGoogleCloudRecoveryAttempt(): void {
  if (state.googleCloud.circuitState !== 'open') return;

  state.googleCloud.circuitState = 'half_open';

  log.info('Google Cloud TTS recovery attempt started');

  emitEvent({
    type: 'recovery_attempted',
    toProvider: 'google_cloud',
    timestamp: Date.now(),
  });

  saveState();
}

// ============================================================
// 공개 API
// ============================================================

export function getActiveProvider(): TTSProvider {
  return state.activeProvider;
}

export function isGeminiAvailable(): boolean {
  return state.gemini.circuitState === 'closed' ||
         (state.gemini.circuitState === 'open' && shouldAttemptGeminiRecovery());
}

export function isGoogleCloudAvailable(): boolean {
  return state.googleCloud.circuitState === 'closed' ||
         (state.googleCloud.circuitState === 'open' && shouldAttemptGoogleCloudRecovery());
}

export interface FallbackStats {
  activeProvider: TTSProvider;
  currentGeminiModel: GeminiModel;
  gemini: {
    circuitState: CircuitState;
    consecutiveFailures: number;
    lastErrorType: TTSErrorType | null;
    lastErrorTime: Date | null;
    nextRecoveryAttempt: Date | null;
  };
  googleCloud: {
    circuitState: CircuitState;
    consecutiveFailures: number;
    lastErrorType: TTSErrorType | null;
    lastErrorTime: Date | null;
    nextRecoveryAttempt: Date | null;
  };
  totalFallbackCount: number;
  totalRecoveryCount: number;
}

export function getFallbackStats(): FallbackStats {
  return {
    activeProvider: state.activeProvider,
    currentGeminiModel: state.currentGeminiModel,
    gemini: {
      circuitState: state.gemini.circuitState,
      consecutiveFailures: state.gemini.consecutiveFailures,
      lastErrorType: state.gemini.lastErrorType,
      lastErrorTime: state.gemini.lastErrorTime ? new Date(state.gemini.lastErrorTime) : null,
      nextRecoveryAttempt: state.gemini.nextRecoveryAttempt ? new Date(state.gemini.nextRecoveryAttempt) : null,
    },
    googleCloud: {
      circuitState: state.googleCloud.circuitState,
      consecutiveFailures: state.googleCloud.consecutiveFailures,
      lastErrorType: state.googleCloud.lastErrorType,
      lastErrorTime: state.googleCloud.lastErrorTime ? new Date(state.googleCloud.lastErrorTime) : null,
      nextRecoveryAttempt: state.googleCloud.nextRecoveryAttempt ? new Date(state.googleCloud.nextRecoveryAttempt) : null,
    },
    totalFallbackCount: state.totalFallbackCount,
    totalRecoveryCount: state.totalRecoveryCount,
  };
}

export function forceProvider(provider: TTSProvider): void {
  state.activeProvider = provider;

  if (provider === 'gemini') {
    state.gemini.circuitState = 'closed';
    state.currentGeminiModel = 'flash';
  } else if (provider === 'google_cloud') {
    state.gemini.circuitState = 'open';
    state.googleCloud.circuitState = 'closed';
  } else if (provider === 'web_speech') {
    state.gemini.circuitState = 'open';
    state.googleCloud.circuitState = 'open';
  }

  log.info('TTS provider forced', { provider });
  saveState();
}

export function resetState(): void {
  state = {
    gemini: createInitialProviderState(),
    googleCloud: createInitialProviderState(),
    activeProvider: 'gemini',
    currentGeminiModel: 'flash',
    totalFallbackCount: 0,
    totalRecoveryCount: 0,
  };

  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }

  log.info('TTS fallback state reset');
}

// 초기화
if (typeof window !== 'undefined') {
  loadState();
}

const fallbackManager = {
  // 에러 분류
  classifyError,

  // Gemini 모델 관리
  getCurrentGeminiModel,
  switchGeminiModel,
  resetGeminiModel,

  // 성공/실패 기록
  recordGeminiSuccess,
  recordGeminiFailure,
  recordGoogleCloudSuccess,
  recordGoogleCloudFailure,

  // 상태 조회
  getActiveProvider,
  isGeminiAvailable,
  isGoogleCloudAvailable,
  getFallbackStats,

  // 복구
  shouldAttemptGeminiRecovery,
  shouldAttemptGoogleCloudRecovery,
  startGeminiRecoveryAttempt,
  startGoogleCloudRecoveryAttempt,

  // 유틸리티
  forceProvider,
  resetState,
  loadState,

  // 이벤트
  subscribeFallbackEvents,
};

export default fallbackManager;
