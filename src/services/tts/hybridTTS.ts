/**
 * Hybrid TTS Service (Web Version)
 * 통합 TTS 서비스 - 폴백 체인을 통한 최적의 TTS 제공자 자동 선택
 *
 * HearO-v2에서 포팅 + 업데이트된 폴백 체인
 *
 * 폴백 체인:
 * 1. Gemini 2.5 Flash TTS (감정 표현, 고품질)
 * 2. Gemini 2.5 Pro TTS (Flash 제한 시)
 * 3. Google Cloud TTS (WaveNet, 안정적)
 * 4. Web Speech API (브라우저 내장, 최종 폴백)
 *
 * 라우팅 전략:
 * - 프리렌더링 콘텐츠 확인 → 있으면 사용
 * - 몰입 컨텍스트 → Gemini TTS (고품질 감정 표현)
 * - 운동 가이드 → Google Cloud TTS / 프리렌더링
 * - 즉시 응답 → Web Speech API
 */

import { createLogger } from '@/lib/logger';
import type { WorldviewType } from '@/types/vrm';
import type { ExerciseType } from '@/types/exercise';

import {
  selectTTSProvider,
  recordGeminiUsage,
  type TTSProvider,
} from './ttsRouter';
import {
  generateGeminiTTS,
  playGeminiTTS,
  playWorldviewTTS,
  playEpilogueTTS as playGeminiEpilogueTTS,
  type VoiceContext,
  type GeminiTTSOptions,
} from './geminiTTS';
import {
  generateGoogleCloudTTS,
  playGoogleCloudTTS,
} from './googleCloudTTS';
import {
  speakWithWebSpeech,
  stopWebSpeech,
  isWebSpeechSupported,
} from './webSpeechTTS';
import {
  getTTSAudioUrl,
  playEpilogueTTS as playPrerenderedEpilogueTTS,
  stopEpilogueTTS,
  checkTTSAudioExists,
  type PerformanceGrade,
} from '@/services/prerenderedContentService';
import {
  isGeminiAvailable,
  isGoogleCloudAvailable,
  recordGeminiSuccess,
  recordGeminiFailure,
  recordGoogleCloudSuccess,
  recordGoogleCloudFailure,
  getCurrentGeminiModel,
  switchGeminiModel,
  classifyError,
  shouldAttemptGeminiRecovery,
  shouldAttemptGoogleCloudRecovery,
  startGeminiRecoveryAttempt,
  startGoogleCloudRecoveryAttempt,
  getActiveProvider,
  getFallbackStats,
  type GeminiModel,
  type FallbackStats,
} from './fallbackManager';

const log = createLogger('HybridTTS');

// ============================================================
// 타입 정의
// ============================================================

export interface HybridTTSOptions extends GeminiTTSOptions {
  /** 프리렌더링 우선 사용 여부 */
  preferPrerendered?: boolean;
  /** 강제 제공자 지정 */
  forceProvider?: TTSProvider;
  /** Google Cloud TTS 직접 사용 (Gemini 스킵) */
  useGoogleCloud?: boolean;
}

export interface HybridTTSResult {
  success: boolean;
  provider: TTSProvider;
  geminiModel?: GeminiModel;
  error?: string;
}

// ============================================================
// 현재 재생 상태
// ============================================================

let currentProvider: TTSProvider = 'none';
let currentAudioElement: HTMLAudioElement | null = null;

// ============================================================
// 내부 헬퍼 함수
// ============================================================

/**
 * Gemini TTS 시도 (Flash → Pro 폴백 포함)
 */
async function tryGeminiTTS(
  text: string,
  options: GeminiTTSOptions
): Promise<HybridTTSResult> {
  // 복구 시도 확인
  if (shouldAttemptGeminiRecovery()) {
    startGeminiRecoveryAttempt();
    log.info('Attempting Gemini TTS recovery');
  }

  const currentModel = getCurrentGeminiModel();

  try {
    await playGeminiTTS(text, options);
    recordGeminiSuccess();
    recordGeminiUsage(text.length);

    return {
      success: true,
      provider: 'gemini',
      geminiModel: currentModel,
    };
  } catch (error) {
    const errorType = classifyError(error);
    recordGeminiFailure(errorType, currentModel);

    log.warn('Gemini TTS failed', {
      model: currentModel,
      errorType,
      error: error instanceof Error ? error.message : 'Unknown',
    });

    // Flash에서 실패하고 Pro로 전환된 경우 재시도
    const newModel = getCurrentGeminiModel();
    if (currentModel === 'flash' && newModel === 'pro') {
      log.info('Retrying with Gemini Pro model');
      try {
        await playGeminiTTS(text, options);
        recordGeminiSuccess();
        recordGeminiUsage(text.length);

        return {
          success: true,
          provider: 'gemini',
          geminiModel: 'pro',
        };
      } catch (proError) {
        const proErrorType = classifyError(proError);
        recordGeminiFailure(proErrorType, 'pro');

        log.warn('Gemini Pro also failed', { errorType: proErrorType });
      }
    }

    return {
      success: false,
      provider: 'gemini',
      geminiModel: currentModel,
      error: error instanceof Error ? error.message : 'Gemini TTS failed',
    };
  }
}

/**
 * Google Cloud TTS 시도
 */
async function tryGoogleCloudTTS(
  text: string,
  worldviewId?: WorldviewType
): Promise<HybridTTSResult> {
  // 복구 시도 확인
  if (shouldAttemptGoogleCloudRecovery()) {
    startGoogleCloudRecoveryAttempt();
    log.info('Attempting Google Cloud TTS recovery');
  }

  try {
    await playGoogleCloudTTS({ text, worldviewId });
    recordGoogleCloudSuccess();

    return {
      success: true,
      provider: 'google_cloud',
    };
  } catch (error) {
    const errorType = classifyError(error);
    recordGoogleCloudFailure(errorType);

    log.warn('Google Cloud TTS failed', {
      errorType,
      error: error instanceof Error ? error.message : 'Unknown',
    });

    return {
      success: false,
      provider: 'google_cloud',
      error: error instanceof Error ? error.message : 'Google Cloud TTS failed',
    };
  }
}

/**
 * Web Speech API 시도 (최종 폴백)
 */
async function tryWebSpeechTTS(
  text: string,
  rate?: number
): Promise<HybridTTSResult> {
  if (!isWebSpeechSupported()) {
    return {
      success: false,
      provider: 'web_speech',
      error: 'Web Speech API not supported',
    };
  }

  try {
    await speakWithWebSpeech(text, { rate });
    return {
      success: true,
      provider: 'web_speech',
    };
  } catch (error) {
    log.warn('Web Speech TTS failed', { error });
    return {
      success: false,
      provider: 'web_speech',
      error: error instanceof Error ? error.message : 'Web Speech TTS failed',
    };
  }
}

// ============================================================
// 메인 API
// ============================================================

/**
 * 통합 TTS 재생
 * 폴백 체인: Gemini Flash → Gemini Pro → Google Cloud → Web Speech
 */
export async function speak(
  text: string,
  context: VoiceContext = 'default',
  options: HybridTTSOptions = {}
): Promise<HybridTTSResult> {
  // 기존 재생 중지
  await stop();

  // 강제 제공자 지정 처리
  if (options.forceProvider) {
    currentProvider = options.forceProvider;

    switch (options.forceProvider) {
      case 'gemini':
        return tryGeminiTTS(text, { ...options, context });
      case 'google_cloud':
        return tryGoogleCloudTTS(text, options.worldviewId);
      case 'web_speech':
        return tryWebSpeechTTS(text, options.speakingRate);
      default:
        break;
    }
  }

  // Google Cloud 직접 사용 요청
  if (options.useGoogleCloud) {
    currentProvider = 'google_cloud';
    const result = await tryGoogleCloudTTS(text, options.worldviewId);
    if (result.success) return result;
    // 실패 시 Web Speech 폴백
    return tryWebSpeechTTS(text, options.speakingRate);
  }

  // 라우터로 제공자 선택
  const selectedProvider = selectTTSProvider(context, text.length);
  currentProvider = selectedProvider;

  log.info('Speaking with fallback chain', {
    context,
    textLength: text.length,
    initialProvider: selectedProvider,
    geminiAvailable: isGeminiAvailable(),
    googleCloudAvailable: isGoogleCloudAvailable(),
  });

  // 1. Gemini TTS 시도 (Flash → Pro)
  if (selectedProvider === 'gemini' && isGeminiAvailable()) {
    const geminiResult = await tryGeminiTTS(text, { ...options, context });
    if (geminiResult.success) return geminiResult;

    log.info('Gemini TTS failed, trying Google Cloud TTS');
  }

  // 2. Google Cloud TTS 시도
  if (isGoogleCloudAvailable()) {
    const googleCloudResult = await tryGoogleCloudTTS(text, options.worldviewId);
    if (googleCloudResult.success) return googleCloudResult;

    log.info('Google Cloud TTS failed, trying Web Speech');
  }

  // 3. Web Speech API (최종 폴백)
  const webSpeechResult = await tryWebSpeechTTS(text, options.speakingRate);
  if (webSpeechResult.success) return webSpeechResult;

  // 모든 제공자 실패
  currentProvider = 'none';
  return {
    success: false,
    provider: 'none',
    error: 'All TTS providers failed',
  };
}

/**
 * 세계관 VN 대화 재생
 * 세계관별 NPC 음성으로 재생 (폴백 체인 적용)
 */
export async function speakVNDialogue(
  text: string,
  worldviewId: WorldviewType
): Promise<HybridTTSResult> {
  await stop();
  currentProvider = 'gemini';

  log.info('Speaking VN dialogue', { worldviewId, textLength: text.length });

  // 1. Gemini TTS 시도 (Flash → Pro)
  if (isGeminiAvailable()) {
    const geminiResult = await tryGeminiTTS(text, {
      worldviewId,
      context: 'vn_dialogue',
    });
    if (geminiResult.success) return geminiResult;
  }

  // 2. Google Cloud TTS 폴백
  if (isGoogleCloudAvailable()) {
    const googleCloudResult = await tryGoogleCloudTTS(text, worldviewId);
    if (googleCloudResult.success) return googleCloudResult;
  }

  // 3. Web Speech API 최종 폴백
  return tryWebSpeechTTS(text);
}

/**
 * 에필로그 TTS 재생 (프리렌더링 우선, 폴백 체인 적용)
 */
export async function speakEpilogue(
  worldviewId: WorldviewType,
  exerciseId: ExerciseType,
  grade: PerformanceGrade,
  fallbackText?: string
): Promise<HybridTTSResult> {
  await stop();

  // 1. 프리렌더링 TTS 확인
  const hasPrerendered = await checkTTSAudioExists(worldviewId, exerciseId, grade);

  if (hasPrerendered) {
    log.info('Using prerendered epilogue TTS', { worldviewId, exerciseId, grade });
    currentProvider = 'prerendered';

    return new Promise((resolve) => {
      playPrerenderedEpilogueTTS(worldviewId, exerciseId, grade, () => {
        resolve({ success: true, provider: 'prerendered' });
      }).catch((error) => {
        log.error('Prerendered TTS failed', { error });
        // 프리렌더링 실패 시 동적 생성으로 폴백
        if (fallbackText) {
          speakEpilogueDynamic(worldviewId, grade, fallbackText).then(resolve);
        } else {
          resolve({ success: false, provider: 'prerendered', error: String(error) });
        }
      });
    });
  }

  // 2. 프리렌더링 없으면 동적 생성
  if (fallbackText) {
    return speakEpilogueDynamic(worldviewId, grade, fallbackText);
  }

  return { success: false, provider: 'none', error: 'No TTS available for epilogue' };
}

/**
 * 에필로그 동적 TTS 생성 (폴백 체인 적용)
 */
async function speakEpilogueDynamic(
  worldviewId: WorldviewType,
  grade: PerformanceGrade,
  text: string
): Promise<HybridTTSResult> {
  log.info('Using dynamic TTS for epilogue', { worldviewId, grade });

  // 1. Gemini TTS 시도 (등급별 스타일 적용)
  if (isGeminiAvailable()) {
    currentProvider = 'gemini';

    try {
      await playGeminiEpilogueTTS(text, worldviewId, grade);
      recordGeminiSuccess();
      recordGeminiUsage(text.length);
      return { success: true, provider: 'gemini', geminiModel: getCurrentGeminiModel() };
    } catch (error) {
      const errorType = classifyError(error);
      recordGeminiFailure(errorType, getCurrentGeminiModel());
      log.warn('Gemini epilogue TTS failed', { error });

      // Pro 모델로 재시도
      if (getCurrentGeminiModel() === 'pro') {
        try {
          await playGeminiEpilogueTTS(text, worldviewId, grade);
          recordGeminiSuccess();
          recordGeminiUsage(text.length);
          return { success: true, provider: 'gemini', geminiModel: 'pro' };
        } catch (proError) {
          recordGeminiFailure(classifyError(proError), 'pro');
        }
      }
    }
  }

  // 2. Google Cloud TTS 폴백
  if (isGoogleCloudAvailable()) {
    const googleCloudResult = await tryGoogleCloudTTS(text, worldviewId);
    if (googleCloudResult.success) return googleCloudResult;
  }

  // 3. Web Speech API 최종 폴백
  return tryWebSpeechTTS(text);
}

/**
 * 모든 TTS 중지
 */
export async function stop(): Promise<void> {
  // Web Speech 중지
  stopWebSpeech();

  // 프리렌더링 오디오 중지
  stopEpilogueTTS();

  // 현재 오디오 요소 중지
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    currentAudioElement = null;
  }

  currentProvider = 'none';
  log.debug('All TTS stopped');
}

/**
 * 현재 재생 중인 제공자 확인
 */
export function getCurrentProvider(): TTSProvider {
  return currentProvider;
}

/**
 * 재생 중인지 확인
 */
export function isSpeaking(): boolean {
  return currentProvider !== 'none';
}

/**
 * 폴백 상태 통계 반환
 */
export function getTTSFallbackStats(): FallbackStats {
  return getFallbackStats();
}

/**
 * 현재 Gemini 모델 반환
 */
export function getCurrentGeminiModelInfo(): GeminiModel {
  return getCurrentGeminiModel();
}

// ============================================================
// Export
// ============================================================

export default {
  speak,
  speakVNDialogue,
  speakEpilogue,
  stop,
  getCurrentProvider,
  isSpeaking,
  getTTSFallbackStats,
  getCurrentGeminiModelInfo,
};
