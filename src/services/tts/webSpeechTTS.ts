/**
 * Web Speech TTS Service
 * 브라우저 내장 Web Speech API를 사용한 TTS
 *
 * 용도:
 * - 즉시 응답이 필요한 경우 (카운트다운, 운동 시작/완료)
 * - 오프라인 폴백
 * - Gemini 할당량 초과 시 폴백
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('WebSpeechTTS');

// ============================================================
// 타입 정의
// ============================================================

export interface WebSpeechOptions {
  /** 말하기 속도 (0.1 - 10) */
  rate?: number;
  /** 피치 (0 - 2) */
  pitch?: number;
  /** 볼륨 (0 - 1) */
  volume?: number;
  /** 언어 */
  lang?: string;
  /** 음성 이름 */
  voiceName?: string;
}

// ============================================================
// 기본 설정
// ============================================================

const DEFAULT_OPTIONS: WebSpeechOptions = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  lang: 'ko-KR',
};

// ============================================================
// 음성 목록
// ============================================================

let cachedVoices: SpeechSynthesisVoice[] = [];

/**
 * 사용 가능한 음성 목록 가져오기
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return [];
  }

  if (cachedVoices.length > 0) {
    return cachedVoices;
  }

  cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

/**
 * 한국어 음성 찾기
 */
export function findKoreanVoice(): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();

  // 한국어 음성 우선
  const koreanVoice = voices.find(v => v.lang.startsWith('ko'));
  if (koreanVoice) return koreanVoice;

  // 기본 음성
  const defaultVoice = voices.find(v => v.default);
  return defaultVoice || null;
}

/**
 * 음성 목록 로드 대기
 */
export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      resolve(voices);
      return;
    }

    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    };
  });
}

// ============================================================
// 메인 API
// ============================================================

/**
 * Web Speech API로 텍스트 음성 재생
 */
export function speakWithWebSpeech(
  text: string,
  options: WebSpeechOptions = {}
): Promise<void> {
  return new Promise((resolve, _reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      log.warn('Web Speech API not available');
      resolve(); // 조용히 실패
      return;
    }

    // 기존 재생 중지
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // 옵션 적용
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    utterance.rate = mergedOptions.rate || 1.0;
    utterance.pitch = mergedOptions.pitch || 1.0;
    utterance.volume = mergedOptions.volume || 1.0;
    utterance.lang = mergedOptions.lang || 'ko-KR';

    // 음성 선택
    if (mergedOptions.voiceName) {
      const voices = getAvailableVoices();
      const voice = voices.find(v => v.name === mergedOptions.voiceName);
      if (voice) {
        utterance.voice = voice;
      }
    } else {
      const koreanVoice = findKoreanVoice();
      if (koreanVoice) {
        utterance.voice = koreanVoice;
      }
    }

    utterance.onend = () => {
      log.debug('Web Speech finished', { textLength: text.length });
      resolve();
    };

    utterance.onerror = (event) => {
      log.error('Web Speech error', { error: event.error });
      // 에러가 발생해도 resolve (조용히 실패)
      resolve();
    };

    log.debug('Starting Web Speech', { textLength: text.length });
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * 재생 중지
 */
export function stopWebSpeech(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * 재생 중인지 확인
 */
export function isWebSpeechSpeaking(): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return false;
  }
  return window.speechSynthesis.speaking;
}

/**
 * Web Speech API 지원 여부
 */
export function isWebSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// ============================================================
// Export
// ============================================================

const webSpeechTTSService = {
  speakWithWebSpeech,
  stopWebSpeech,
  isWebSpeechSpeaking,
  isWebSpeechSupported,
  getAvailableVoices,
  findKoreanVoice,
  waitForVoices,
};

export default webSpeechTTSService;
