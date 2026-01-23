/**
 * TTS Services Index
 * 모든 TTS 관련 서비스 통합 export
 *
 * 폴백 체인:
 * 1. Gemini 2.5 Flash TTS (감정 표현, 고품질)
 * 2. Gemini 2.5 Pro TTS (Flash 제한 시)
 * 3. Google Cloud TTS (WaveNet, 안정적)
 * 4. Web Speech API (브라우저 내장, 최종 폴백)
 */

// Hybrid TTS (통합 서비스 - 주로 이것을 사용)
export {
  speak,
  speakVNDialogue,
  speakEpilogue,
  stop,
  getCurrentProvider,
  isSpeaking,
  getTTSFallbackStats,
  getCurrentGeminiModelInfo,
  type HybridTTSOptions,
  type HybridTTSResult,
} from './hybridTTS';

// Gemini TTS (고품질 AI TTS)
export {
  generateGeminiTTS,
  playGeminiTTS,
  playWorldviewTTS,
  playEpilogueTTS,
  getWorldviewVoiceName,
  getVoiceSettingsForGrade,
  getGeminiTTSCacheStats,
  clearGeminiTTSCache,
  type GeminiTTSOptions,
  type VoiceContext,
} from './geminiTTS';

// Google Cloud TTS (안정적인 고품질 TTS)
export {
  generateGoogleCloudTTS,
  playGoogleCloudTTS,
  playWorldviewGoogleCloudTTS,
  isGoogleCloudTTSAvailable,
  getGoogleCloudTTSCacheStats,
  clearGoogleCloudTTSCache,
  KOREAN_VOICE_NAMES,
  type CloudVoiceSettings,
  type GoogleCloudTTSOptions,
} from './googleCloudTTS';

// TTS Router (제공자 선택 로직)
export {
  selectTTSProvider,
  recordGeminiUsage,
  updateRouterConfig,
  getRouterConfig,
  getRouterState,
  getRouterStats,
  setGeminiTTSEnabled,
  isImmersiveContext,
  getRemainingGeminiQuota,
  type TTSProvider,
  type TTSRouterConfig,
  type TTSRouterState,
  type TTSRouterStats,
} from './ttsRouter';

// Fallback Manager (Circuit Breaker 패턴)
export {
  classifyError,
  getCurrentGeminiModel,
  switchGeminiModel,
  resetGeminiModel,
  recordGeminiSuccess,
  recordGeminiFailure,
  recordGoogleCloudSuccess,
  recordGoogleCloudFailure,
  isGeminiAvailable,
  isGoogleCloudAvailable,
  shouldAttemptGeminiRecovery,
  shouldAttemptGoogleCloudRecovery,
  getActiveProvider,
  getFallbackStats,
  forceProvider,
  resetState as resetFallbackState,
  subscribeFallbackEvents,
  type GeminiModel,
  type TTSErrorType,
  type CircuitState,
  type FallbackEvent,
  type FallbackStats,
} from './fallbackManager';

// Web Speech TTS (브라우저 내장)
export {
  speakWithWebSpeech,
  stopWebSpeech,
  isWebSpeechSpeaking,
  isWebSpeechSupported,
  getAvailableVoices,
  findKoreanVoice,
  waitForVoices,
  type WebSpeechOptions,
} from './webSpeechTTS';

// Default export: Hybrid TTS 서비스
export { default as hybridTTS } from './hybridTTS';
export { default as geminiTTS } from './geminiTTS';
export { default as googleCloudTTS } from './googleCloudTTS';
export { default as ttsRouter } from './ttsRouter';
export { default as fallbackManager } from './fallbackManager';
export { default as webSpeechTTS } from './webSpeechTTS';
