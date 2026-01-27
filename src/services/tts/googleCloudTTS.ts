/**
 * Google Cloud TTS Service (Web Version)
 * Supabase Edge Function을 통한 Google Cloud Text-to-Speech 호출
 *
 * 사용처:
 * - Gemini TTS 실패 시 폴백
 * - 운동 가이드 음성 (명확성 우선)
 *
 * HearO-v2에서 포팅
 */

import { supabase } from '@/lib/supabase/client';
import { createLogger } from '@/lib/logger';
import type { WorldviewType } from '@/types/vrm';
import {
  classifyError,
  recordGoogleCloudSuccess,
  recordGoogleCloudFailure,
  isGoogleCloudAvailable,
} from './fallbackManager';

const log = createLogger('GoogleCloudTTS');

// ============================================================
// 타입 정의
// ============================================================

/** 음성 성별 */
type VoiceGender = 'MALE' | 'FEMALE';

/** 음성 설정 */
export interface CloudVoiceSettings {
  voiceName: string;
  languageCode: string;
  gender: VoiceGender;
  speakingRate: number;  // 0.25 ~ 4.0
  pitch: number;         // -20.0 ~ 20.0
  volumeGainDb: number;  // -96.0 ~ 16.0
}

/** TTS 요청 옵션 */
export interface GoogleCloudTTSOptions {
  text: string;
  voice?: Partial<CloudVoiceSettings>;
  worldviewId?: WorldviewType;
}

/** Edge Function 응답 */
interface GoogleCloudTTSResponse {
  success: boolean;
  audioContent?: string; // Base64
  error?: string;
}

// ============================================================
// 한국어 음성 프리셋
// ============================================================

export const KOREAN_VOICE_NAMES = {
  // WaveNet (최고 품질)
  femaleWaveNetA: 'ko-KR-Wavenet-A',
  femaleWaveNetB: 'ko-KR-Wavenet-B',
  maleWaveNetC: 'ko-KR-Wavenet-C',
  maleWaveNetD: 'ko-KR-Wavenet-D',
  // Neural2 (자연스러움)
  femaleNeural2A: 'ko-KR-Neural2-A',
  femaleNeural2B: 'ko-KR-Neural2-B',
  maleNeural2C: 'ko-KR-Neural2-C',
  // Standard (기본)
  femaleStandardA: 'ko-KR-Standard-A',
  femaleStandardB: 'ko-KR-Standard-B',
  maleStandardC: 'ko-KR-Standard-C',
  maleStandardD: 'ko-KR-Standard-D',
};

/** 세계관별 Google Cloud 음성 설정 */
const WORLDVIEW_CLOUD_VOICES: Record<WorldviewType, CloudVoiceSettings> = {
  fantasy: {
    voiceName: 'ko-KR-Wavenet-C',
    languageCode: 'ko-KR',
    gender: 'MALE',
    speakingRate: 0.9,
    pitch: -2,
    volumeGainDb: 0,
  },
  sports: {
    voiceName: 'ko-KR-Wavenet-D',
    languageCode: 'ko-KR',
    gender: 'MALE',
    speakingRate: 1.1,
    pitch: 0,
    volumeGainDb: 2,
  },
  idol: {
    voiceName: 'ko-KR-Wavenet-A',
    languageCode: 'ko-KR',
    gender: 'FEMALE',
    speakingRate: 1.05,
    pitch: 2,
    volumeGainDb: 0,
  },
  sf: {
    voiceName: 'ko-KR-Neural2-A',
    languageCode: 'ko-KR',
    gender: 'FEMALE',
    speakingRate: 0.95,
    pitch: -1,
    volumeGainDb: 0,
  },
  zombie: {
    voiceName: 'ko-KR-Wavenet-C',
    languageCode: 'ko-KR',
    gender: 'MALE',
    speakingRate: 0.85,
    pitch: -3,
    volumeGainDb: 0,
  },
  spy: {
    voiceName: 'ko-KR-Wavenet-D',
    languageCode: 'ko-KR',
    gender: 'MALE',
    speakingRate: 0.9,
    pitch: -4,
    volumeGainDb: -2,
  },
};

/** 기본 음성 설정 */
const DEFAULT_VOICE_SETTINGS: CloudVoiceSettings = {
  voiceName: 'ko-KR-Wavenet-A',
  languageCode: 'ko-KR',
  gender: 'FEMALE',
  speakingRate: 1.0,
  pitch: 0,
  volumeGainDb: 0,
};

// ============================================================
// 캐시 관리
// ============================================================

interface CacheEntry {
  audioBlob: Blob;
  timestamp: number;
}

const audioCache = new Map<string, CacheEntry>();
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7일
const CACHE_MAX_ITEMS = 50;

function getCacheKey(text: string, voiceName: string, rate: number): string {
  return `gcloud_${text.slice(0, 30)}_${voiceName}_${rate}`;
}

function getFromCache(key: string): Blob | null {
  const entry = audioCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_MAX_AGE_MS) {
    audioCache.delete(key);
    return null;
  }

  return entry.audioBlob;
}

function saveToCache(key: string, audioBlob: Blob): void {
  // 캐시 정리
  if (audioCache.size >= CACHE_MAX_ITEMS) {
    const entries = Array.from(audioCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, Math.ceil(CACHE_MAX_ITEMS / 4));
    toRemove.forEach(([k]) => audioCache.delete(k));
  }

  audioCache.set(key, { audioBlob, timestamp: Date.now() });
}

// ============================================================
// 메인 API
// ============================================================

/**
 * Google Cloud TTS로 음성 생성
 */
export async function generateGoogleCloudTTS(
  options: GoogleCloudTTSOptions
): Promise<{ audioBlob: Blob; mimeType: string }> {
  const { text, voice, worldviewId } = options;

  // 음성 설정 결정
  let voiceSettings: CloudVoiceSettings;
  if (voice) {
    voiceSettings = { ...DEFAULT_VOICE_SETTINGS, ...voice };
  } else if (worldviewId) {
    voiceSettings = WORLDVIEW_CLOUD_VOICES[worldviewId];
  } else {
    voiceSettings = DEFAULT_VOICE_SETTINGS;
  }

  // 캐시 확인
  const cacheKey = getCacheKey(text, voiceSettings.voiceName, voiceSettings.speakingRate);
  const cached = getFromCache(cacheKey);
  if (cached) {
    log.debug('Cache hit', { cacheKey });
    return { audioBlob: cached, mimeType: 'audio/mp3' };
  }

  log.info('Generating Google Cloud TTS', {
    textLength: text.length,
    voiceName: voiceSettings.voiceName,
    speakingRate: voiceSettings.speakingRate,
  });

  try {
    const { data, error } = await supabase.functions.invoke<GoogleCloudTTSResponse>(
      'google-cloud-tts',
      {
        body: {
          text,
          voice: {
            languageCode: voiceSettings.languageCode,
            name: voiceSettings.voiceName,
            ssmlGender: voiceSettings.gender,
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: voiceSettings.speakingRate,
            pitch: voiceSettings.pitch,
            volumeGainDb: voiceSettings.volumeGainDb,
          },
        },
      }
    );

    if (error) {
      log.error('Edge Function error', { error });
      const errorType = classifyError(error.message);
      recordGoogleCloudFailure(errorType);
      throw new Error(`Google Cloud TTS error: ${error.message}`);
    }

    if (!data?.success || !data.audioContent) {
      log.error('TTS generation failed', { error: data?.error });
      const errorType = classifyError(data?.error || 'Unknown error');
      recordGoogleCloudFailure(errorType);
      throw new Error(data?.error || 'No audio content returned');
    }

    // 성공 기록
    recordGoogleCloudSuccess();

    // Base64 → Blob 변환
    const binaryString = atob(data.audioContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const audioBlob = new Blob([bytes], { type: 'audio/mp3' });

    // 캐시 저장
    saveToCache(cacheKey, audioBlob);

    log.info('Google Cloud TTS generated successfully', {
      textLength: text.length,
      audioSize: audioBlob.size,
    });

    return { audioBlob, mimeType: 'audio/mp3' };

  } catch (error) {
    log.error('Google Cloud TTS generation failed', { error });
    throw error;
  }
}

/**
 * Google Cloud TTS 재생
 */
export async function playGoogleCloudTTS(
  options: GoogleCloudTTSOptions
): Promise<void> {
  const { audioBlob } = await generateGoogleCloudTTS(options);

  return new Promise((resolve, reject) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      const mediaError = audio.error;
      const errorMsg = mediaError
        ? `Audio playback error: code=${mediaError.code}, ${mediaError.message}`
        : 'Audio playback error: unknown';
      reject(new Error(errorMsg));
    };

    audio.play().catch((err) => {
      URL.revokeObjectURL(audioUrl);
      reject(err);
    });
  });
}

/**
 * 세계관별 Google Cloud TTS 재생
 */
export async function playWorldviewGoogleCloudTTS(
  text: string,
  worldviewId: WorldviewType
): Promise<void> {
  return playGoogleCloudTTS({ text, worldviewId });
}

/**
 * Google Cloud TTS 사용 가능 여부
 */
export function isGoogleCloudTTSAvailable(): boolean {
  return isGoogleCloudAvailable();
}

/**
 * 캐시 통계
 */
export function getGoogleCloudTTSCacheStats(): {
  itemCount: number;
  estimatedSizeMB: number;
} {
  let totalSize = 0;
  for (const entry of audioCache.values()) {
    totalSize += entry.audioBlob.size;
  }

  return {
    itemCount: audioCache.size,
    estimatedSizeMB: totalSize / (1024 * 1024),
  };
}

/**
 * 캐시 초기화
 */
export function clearGoogleCloudTTSCache(): void {
  audioCache.clear();
  log.info('Google Cloud TTS cache cleared');
}

// ============================================================
// Export
// ============================================================

const googleCloudTTSService = {
  generateGoogleCloudTTS,
  playGoogleCloudTTS,
  playWorldviewGoogleCloudTTS,
  isGoogleCloudTTSAvailable,
  getGoogleCloudTTSCacheStats,
  clearGoogleCloudTTSCache,
  KOREAN_VOICE_NAMES,
};

export default googleCloudTTSService;
