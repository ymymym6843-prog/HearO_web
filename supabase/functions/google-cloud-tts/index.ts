/**
 * Supabase Edge Function: Google Cloud TTS
 * Google Cloud Text-to-Speech API를 사용한 고품질 음성 합성
 *
 * VN 화면 전용 - WaveNet/Neural2 음성 지원
 *
 * 환경 변수:
 * - GOOGLE_CLOUD_TTS_API_KEY: Google Cloud API 키
 *
 * 참고: Google Cloud Console에서 Text-to-Speech API 활성화 필요
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// 요청 타입 (Google Cloud TTS API 형식)
interface TTSRequest {
  text: string;
  voice: {
    languageCode: string;
    name: string;
    ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  };
  audioConfig: {
    audioEncoding: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
    speakingRate?: number;
    pitch?: number;
    volumeGainDb?: number;
  };
}

// 응답 타입
interface TTSResponse {
  success: boolean;
  audioContent?: string; // Base64 인코딩된 오디오
  error?: string;
}

// Rate limiting
const RATE_LIMIT = {
  maxRetries: 2,
  baseDelayMs: 500,
};

/**
 * Google Cloud TTS API 호출
 */
async function synthesizeSpeech(
  request: TTSRequest,
  apiKey: string
): Promise<TTSResponse> {
  try {
    // 텍스트 검증
    if (!request.text || request.text.trim().length === 0) {
      return { success: false, error: 'Text is required' };
    }

    // 텍스트 길이 제한 (5000자)
    if (request.text.length > 5000) {
      return { success: false, error: 'Text exceeds maximum length (5000 characters)' };
    }

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: request.text },
          voice: {
            languageCode: request.voice.languageCode,
            name: request.voice.name,
            ssmlGender: request.voice.ssmlGender,
          },
          audioConfig: {
            audioEncoding: request.audioConfig.audioEncoding,
            speakingRate: request.audioConfig.speakingRate ?? 1.0,
            pitch: request.audioConfig.pitch ?? 0,
            volumeGainDb: request.audioConfig.volumeGainDb ?? 0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[google-cloud-tts] API error:', errorText);

      // 특정 에러 처리
      if (response.status === 429) {
        return { success: false, error: 'RATE_LIMIT_EXCEEDED' };
      }
      if (response.status === 403) {
        return { success: false, error: 'API_QUOTA_EXCEEDED' };
      }
      if (response.status === 400) {
        return { success: false, error: `Invalid request: ${errorText}` };
      }

      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();

    if (!data.audioContent) {
      return { success: false, error: 'No audio content returned' };
    }

    return {
      success: true,
      audioContent: data.audioContent,
    };

  } catch (error: unknown) {
    console.error('[google-cloud-tts] Error:', error);
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
        console.warn(`[google-cloud-tts] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

serve(async (req: Request) => {
  // CORS preflight - 204 No Content로 응답
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const request: TTSRequest = await req.json();

    // 입력 검증
    if (!request.text || !request.voice || !request.audioConfig) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // API 키 가져오기 (환경 변수에서만)
    const apiKey = Deno.env.get('GOOGLE_CLOUD_TTS_API_KEY');

    if (!apiKey) {
      console.error('[google-cloud-tts] GOOGLE_CLOUD_TTS_API_KEY not configured');
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

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[google-cloud-tts] Error:', error);

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
