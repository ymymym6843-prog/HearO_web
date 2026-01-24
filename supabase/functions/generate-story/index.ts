/**
 * Supabase Edge Function: Story Generation
 * Gemini API를 사용한 스토리 생성 - API 키 보안 보호
 *
 * HearO-v2에서 포팅 (동일한 설정 유지)
 *
 * 모델 우선순위:
 * 1. gemini-3-pro-preview (최신 고품질)
 * 2. gemini-2.5-pro (폴백)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// 요청 타입
interface StoryRequest {
  worldViewId: string;
  storyType: string;
  systemPrompt: string;
  userPrompt: string;
  userId?: string; // 쿼터 체크용
}

// 응답 타입
interface StoryResponse {
  success: boolean;
  story?: string;
  error?: string;
  modelUsed?: string;
  quota?: {
    daily_remaining: number;
    monthly_remaining: number;
  };
}

// 쿼터 체크 결과 타입
interface QuotaResult {
  allowed: boolean;
  daily_limit: number;
  daily_used: number;
  daily_remaining: number;
  monthly_limit: number;
  monthly_used: number;
  monthly_remaining: number;
}

// Rate limiting 설정
const RATE_LIMIT = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

// 모델 설정
const MODELS = {
  primary: 'gemini-3-pro-preview',  // 1순위: Gemini 3 Pro (최고 품질)
  fallback: 'gemini-2.5-pro',       // 2순위: Gemini 2.5 Pro (폴백)
};

// 모델별 비용 (1M 토큰당)
const MODEL_COSTS: Record<string, number> = {
  'gemini-2.5-pro': 0.00000125,
  'gemini-2.5-flash': 0.0000005,
  'gemini-3-pro-preview': 0.000002,
};

/**
 * Exponential backoff 재시도 로직
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = RATE_LIMIT.maxRetries
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const is429Error = (error instanceof Error && error.message.includes('429')) ||
                         (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 429);

      if (is429Error) {
        const delayMs = Math.min(
          RATE_LIMIT.baseDelayMs * Math.pow(2, attempt),
          RATE_LIMIT.maxDelayMs
        );

        console.warn(`[generate-story] Rate limited. Retry ${attempt + 1}/${maxRetries} after ${delayMs}ms`);

        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
      }

      if (!is429Error) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Gemini API 호출 (특정 모델)
 */
async function callGeminiModel(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<StoryResponse> {
  try {
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generate-story] ${model} API error:`, errorText);

      if (response.status === 429) {
        throw { status: 429, message: `Rate limit exceeded: ${errorText}` };
      }

      throw new Error(`${model} API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No text generated');
    }

    console.log(`[generate-story] Success with ${model}`);
    return {
      success: true,
      story: generatedText,
      modelUsed: model,
    };
  } catch (error: unknown) {
    console.error(`[generate-story] ${model} error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Gemini API 호출 (폴백 체인)
 */
async function generateWithGemini(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<StoryResponse> {
  // 1순위: Gemini 3.0 Pro
  console.log('[generate-story] Trying gemini-3-pro...');
  const result3 = await callGeminiModel(MODELS.primary, systemPrompt, userPrompt, apiKey);

  if (result3.success) {
    return result3;
  }

  // 2순위: Gemini 2.5 Pro (폴백)
  console.log('[generate-story] gemini-3-pro failed, falling back to gemini-2.5-pro...');
  const result25 = await callGeminiModel(MODELS.fallback, systemPrompt, userPrompt, apiKey);

  if (result25.success) {
    return result25;
  }

  // 모든 시도 실패
  return {
    success: false,
    error: `All models failed. Last error: ${result25.error}`,
  };
}

/**
 * Supabase 클라이언트 생성
 */
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * 쿼터 체크
 */
async function checkQuota(userId: string): Promise<QuotaResult | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('check_api_quota', {
      p_user_id: userId,
      p_api_type: 'story',
    });

    if (error) {
      console.warn('[generate-story] Quota check failed:', error.message);
      return null; // 쿼터 체크 실패 시 허용 (graceful degradation)
    }

    return data as QuotaResult;
  } catch (err) {
    console.warn('[generate-story] Quota check error:', err);
    return null;
  }
}

/**
 * 사용량 기록
 */
async function recordUsage(
  userId: string,
  storyType: string,
  success: boolean,
  tokensUsed: number = 0,
  errorMessage?: string,
  modelUsed: string = MODELS.fallback
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const costPerToken = MODEL_COSTS[modelUsed] || MODEL_COSTS[MODELS.fallback];

    await supabase.rpc('record_api_usage', {
      p_user_id: userId,
      p_api_type: 'story',
      p_tokens_used: tokensUsed,
      p_cost_estimate: tokensUsed * costPerToken,
      p_request_type: storyType,
      p_model_used: modelUsed,
      p_success: success,
      p_error_message: errorMessage || null,
    });
  } catch (err) {
    console.warn('[generate-story] Usage recording failed:', err);
  }
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { worldViewId: _worldViewId, storyType: _storyType, systemPrompt, userPrompt, userId }: StoryRequest =
      await req.json();

    // 입력 검증
    if (!systemPrompt || !userPrompt) {
      return new Response(
        JSON.stringify({ success: false, error: 'systemPrompt and userPrompt are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 쿼터 체크 (userId가 있는 경우)
    let quotaInfo: QuotaResult | null = null;
    if (userId) {
      quotaInfo = await checkQuota(userId);

      if (quotaInfo && !quotaInfo.allowed) {
        console.warn(`[generate-story] Quota exceeded for user ${userId}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'QUOTA_EXCEEDED',
            quota: {
              daily_remaining: quotaInfo.daily_remaining,
              monthly_remaining: quotaInfo.monthly_remaining,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
    }

    // API 키 가져오기
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      console.error('[generate-story] GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 재시도 로직으로 Gemini 호출
    const result = await retryWithBackoff(async () => {
      const res = await generateWithGemini(systemPrompt, userPrompt, geminiApiKey);
      if (!res.success && res.error?.includes('429')) {
        throw { status: 429, message: res.error };
      }
      return res;
    });

    // 사용량 기록
    if (userId) {
      const tokensUsed = result.story?.length || 0;
      const modelUsed = result.modelUsed || MODELS.fallback;
      await recordUsage(userId, storyType, result.success, tokensUsed, result.error, modelUsed);
    }

    // 쿼터 정보 포함하여 응답
    const responseWithQuota: StoryResponse = {
      ...result,
      quota: quotaInfo ? {
        daily_remaining: quotaInfo.daily_remaining - (result.success ? 1 : 0),
        monthly_remaining: quotaInfo.monthly_remaining - (result.success ? 1 : 0),
      } : undefined,
    };

    return new Response(JSON.stringify(responseWithQuota), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[generate-story] Error:', error);

    const is429 = (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 429) ||
                  (error instanceof Error && error.message.includes('429'));

    return new Response(
      JSON.stringify({
        success: false,
        error: is429 ? 'RATE_LIMIT_EXCEEDED' : (error instanceof Error ? error.message : 'Internal server error'),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: is429 ? 429 : 500,
      }
    );
  }
});
