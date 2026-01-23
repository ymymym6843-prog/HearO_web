/**
 * Supabase Edge Function: Gemini TTS
 * Gemini 2.5 Flash/Pro TTS를 사용한 고품질 감정 표현 음성 합성
 *
 * HearO-v2에서 포팅 (동일한 설정 유지)
 *
 * 환경 변수:
 * - GEMINI_API_KEY: Google AI Studio API 키
 *
 * 특징:
 * - 자연스러운 감정 표현
 * - 다양한 음성 스타일 지원
 * - 한국어 최적화
 * - Flash → Pro 자동 폴백 (Rate Limit 시)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================================
// 타입 정의
// ============================================================

/** 음성 스타일 */
type VoiceStyle = 'neutral' | 'expressive' | 'dramatic' | 'gentle' | 'energetic';

/** 요청 타입 */
interface GeminiTTSRequest {
  text: string;
  voiceStyle?: VoiceStyle;
  speakingRate?: number; // 0.5 - 2.0
  voiceName?: string; // Kore (한국어), Zubenelgenubi, Algieba, etc.
}

/** 응답 타입 */
interface GeminiTTSResponse {
  success: boolean;
  audioContent?: string; // Base64 인코딩된 오디오
  mimeType?: string;
  error?: string;
  modelUsed?: string; // 사용된 모델 (Flash 또는 Pro)
}

// ============================================================
// Gemini API 설정
// ============================================================

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** TTS 모델 (Flash 우선, Pro 폴백) */
const TTS_MODELS = {
  primary: 'gemini-2.5-flash-preview-tts',
  fallback: 'gemini-2.5-pro-preview-tts',
} as const;

/** 한국어 기본 음성 (세계관별 음성 미지정 시) */
const DEFAULT_VOICE = 'Kore';

/** 세계관별 음성 매핑 (HearO-v2와 동일) */
const WORLDVIEW_VOICES: Record<string, string> = {
  fantasy: 'Zubenelgenubi',   // 현자 엘더린 (중후한 남성)
  sports: 'Algieba',          // 코치 박 (활기찬 남성)
  idol: 'Achernar',           // 매니저 수진 (밝은 여성)
  sf: 'Autonoe',              // AI 아리아 (차분한 여성)
  zombie: 'Enceladus',        // 닥터 리 (신뢰감 있는 남성)
  spy: 'Charon',              // 핸들러 오메가 (낮고 차분한 남성)
};

/** 스타일별 프롬프트 접두사 */
const STYLE_PREFIXES: Record<VoiceStyle, string> = {
  neutral: '',
  expressive: '[Expressive, emotive tone] ',
  dramatic: '[Dramatic, theatrical delivery] ',
  gentle: '[Soft, gentle voice] ',
  energetic: '[Energetic, upbeat tone] ',
};

// ============================================================
// Rate Limiting
// ============================================================

const RATE_LIMIT = {
  maxRetries: 2,
  baseDelayMs: 500,
  maxTextLength: 3000, // Gemini TTS 권장 최대 길이
};

// ============================================================
// Gemini TTS 합성
// ============================================================

/**
 * Gemini TTS API 호출 (단일 모델)
 */
async function synthesizeSpeechWithModel(
  request: GeminiTTSRequest,
  apiKey: string,
  model: string
): Promise<GeminiTTSResponse> {
  // 스타일 접두사 추가
  const style = request.voiceStyle || 'expressive';
  const styledText = STYLE_PREFIXES[style] + request.text;

  console.log(`[gemini-tts] Trying model: ${model}, voice: ${request.voiceName || DEFAULT_VOICE}`);

  // Gemini TTS API 호출
  const response = await fetch(
    `${GEMINI_API_BASE}/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: styledText,
          }],
        }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: request.voiceName || DEFAULT_VOICE,
              },
            },
            speakingRate: request.speakingRate || 1.0,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[gemini-tts] API error (${model}):`, response.status, errorText);

    // 특정 에러 처리
    if (response.status === 429) {
      return { success: false, error: 'RATE_LIMIT_EXCEEDED', modelUsed: model };
    }
    if (response.status === 403) {
      return { success: false, error: 'API_QUOTA_EXCEEDED', modelUsed: model };
    }
    if (response.status === 400) {
      return { success: false, error: `Invalid request: ${errorText}`, modelUsed: model };
    }

    return { success: false, error: `API error: ${response.status}`, modelUsed: model };
  }

  const data = await response.json();

  // 응답에서 오디오 데이터 추출
  const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;

  if (!audioData?.data) {
    console.error('[gemini-tts] No audio data in response:', JSON.stringify(data));
    return { success: false, error: 'No audio content returned', modelUsed: model };
  }

  console.log(`[gemini-tts] Success with model: ${model}`);
  return {
    success: true,
    audioContent: audioData.data,
    mimeType: audioData.mimeType || 'audio/mp3',
    modelUsed: model,
  };
}

/**
 * Gemini TTS API 호출 (Flash → Pro 폴백)
 */
async function synthesizeSpeech(
  request: GeminiTTSRequest,
  apiKey: string
): Promise<GeminiTTSResponse> {
  try {
    // 텍스트 검증
    if (!request.text || request.text.trim().length === 0) {
      return { success: false, error: 'Text is required' };
    }

    // 텍스트 길이 제한
    if (request.text.length > RATE_LIMIT.maxTextLength) {
      return {
        success: false,
        error: `Text exceeds maximum length (${RATE_LIMIT.maxTextLength} characters)`,
      };
    }

    // 1. Flash 모델로 먼저 시도
    const flashResult = await synthesizeSpeechWithModel(request, apiKey, TTS_MODELS.primary);

    if (flashResult.success) {
      return flashResult;
    }

    // 2. Rate Limit 에러인 경우 Pro 모델로 폴백
    if (flashResult.error === 'RATE_LIMIT_EXCEEDED' || flashResult.error === 'API_QUOTA_EXCEEDED') {
      console.log('[gemini-tts] Flash rate limited, falling back to Pro model...');

      const proResult = await synthesizeSpeechWithModel(request, apiKey, TTS_MODELS.fallback);

      if (proResult.success) {
        return proResult;
      }

      // Pro도 실패한 경우
      console.error('[gemini-tts] Both Flash and Pro models failed');
      return {
        success: false,
        error: `Both models failed. Flash: ${flashResult.error}, Pro: ${proResult.error}`,
        modelUsed: 'both_failed',
      };
    }

    // Rate Limit이 아닌 다른 에러는 그대로 반환
    return flashResult;

  } catch (error: unknown) {
    console.error('[gemini-tts] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 재시도 로직
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = RATE_LIMIT.maxRetries
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delay = RATE_LIMIT.baseDelayMs * Math.pow(2, attempt);
        console.warn(`[gemini-tts] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// ============================================================
// HTTP Handler
// ============================================================

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const request: GeminiTTSRequest = await req.json();

    // 입력 검증
    if (!request.text) {
      return new Response(
        JSON.stringify({ success: false, error: 'Text is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // API 키 가져오기
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      console.error('[gemini-tts] GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // TTS 합성 (재시도 포함)
    const result = await withRetry(() => synthesizeSpeech(request, apiKey));

    if (!result.success) {
      const status = result.error?.includes('RATE_LIMIT') ? 429 :
                     result.error?.includes('QUOTA') ? 403 : 500;

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
      );
    }

    // 성공 응답
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[gemini-tts] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
