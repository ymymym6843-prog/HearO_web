/**
 * Supabase Edge Function: Image Generation
 * Visual Novel 스타일 이미지 생성 (Gemini 우선)
 *
 * 우선순위: Gemini 3 Pro Image (최고품질) → Gemini 2.5 Flash (빠른폴백) → Imagen 3 → Hugging Face
 *
 * 보안:
 * - API 키는 Supabase Secrets에서만 관리 (GEMINI_API_KEY)
 * - 클라이언트는 프롬프트만 전송
 * - EXPO_PUBLIC_ 환경변수 사용 금지
 *
 * v4: Visual Novel 스타일 + Gemini 3 Pro 우선 (2026-01)
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
interface ImageRequest {
  prompt: string;
  worldviewId?: string;
  aspectRatio?: '16:9' | '1:1' | '9:16' | '3:4' | '4:3';
  style?: 'illustration' | 'photorealistic' | 'anime';
  userId?: string; // 쿼터 체크용
}

// 응답 타입
interface ImageResponse {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
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
      p_api_type: 'image',
    });
    if (error) {
      console.warn('[generate-image] Quota check failed:', error.message);
      return null;
    }
    return data as QuotaResult;
  } catch (err) {
    console.warn('[generate-image] Quota check error:', err);
    return null;
  }
}

/**
 * 사용량 기록
 */
async function recordUsage(
  userId: string,
  modelUsed: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    // 모델별 비용 추정
    const costEstimates: Record<string, number> = {
      'imagen-4': 0.04,
      'imagen-4-fast': 0.02,
      'imagen-3': 0.03,
      'gemini-3-pro-image': 0.05, // 고품질 모델
      'gemini-2.5-flash-image': 0.039,
      'stable-diffusion-xl': 0.005,
    };
    await supabase.rpc('record_api_usage', {
      p_user_id: userId,
      p_api_type: 'image',
      p_tokens_used: 0,
      p_cost_estimate: success ? (costEstimates[modelUsed] || 0.02) : 0,
      p_request_type: 'background',
      p_model_used: modelUsed,
      p_success: success,
      p_error_message: errorMessage || null,
    });
  } catch (err) {
    console.warn('[generate-image] Usage recording failed:', err);
  }
}

serve(async (req: Request) => {
  // CORS preflight - 204 No Content로 응답
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 인증 필수 체크
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[generate-image] Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // JWT 검증 및 사용자 확인
    const supabase = getSupabaseClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.warn('[generate-image] Invalid token:', authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const authenticatedUserId = user.id;

    const { prompt, worldviewId, aspectRatio = '16:9', style = 'illustration', userId }: ImageRequest =
      await req.json();

    // userId가 제공된 경우 인증된 사용자와 일치하는지 확인
    if (userId && userId !== authenticatedUserId) {
      console.warn('[generate-image] User ID mismatch:', { provided: userId, authenticated: authenticatedUserId });
      return new Response(
        JSON.stringify({ success: false, error: 'User ID mismatch' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // 인증된 사용자 ID 사용
    const effectiveUserId = userId || authenticatedUserId;

    if (!prompt) {
      return new Response(
        JSON.stringify({ success: false, error: 'Prompt is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 쿼터 체크 (인증된 사용자)
    let quotaInfo: QuotaResult | null = null;
    quotaInfo = await checkQuota(effectiveUserId);

    if (quotaInfo && !quotaInfo.allowed) {
      console.warn(`[generate-image] Quota exceeded for user ${effectiveUserId}`);
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

    // 향상된 프롬프트 생성
    const enhancedPrompt = buildEnhancedPrompt(prompt, style, worldviewId);

    // 보안: Supabase Secrets에서만 API 키 로드
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      console.error('[generate-image] GEMINI_API_KEY not found in Supabase Secrets');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    let modelUsed = 'unknown';
    let result: ImageResponse = { success: false, error: 'No model succeeded' };

    // 1순위: Gemini 3 Pro Image (최고 품질, 복잡한 프롬프트 처리)
    console.log('[generate-image] Trying Gemini 3 Pro Image...');
    const gemini3ProResult = await generateWithGemini3ProImage(enhancedPrompt, geminiApiKey);
    if (gemini3ProResult.success) {
      modelUsed = 'gemini-3-pro-image';
      result = gemini3ProResult;
    } else {
      // 2순위: Gemini 2.5 Flash Image (빠른 폴백)
      console.log('[generate-image] Gemini 3 Pro failed, trying Gemini 2.5 Flash Image...');
      const gemini25Result = await generateWithGemini25Flash(enhancedPrompt, geminiApiKey);
      if (gemini25Result.success) {
        modelUsed = 'gemini-2.5-flash-image';
        result = gemini25Result;
      } else {
        // 3순위: Imagen 3 (폴백)
        console.log('[generate-image] Gemini 2.5 failed, trying Imagen 3...');
        const imagen3Result = await generateWithImagen3(enhancedPrompt, geminiApiKey, aspectRatio);
        if (imagen3Result.success) {
          modelUsed = 'imagen-3';
          result = imagen3Result;
        } else {
          // 4순위: Hugging Face (최후 폴백)
          const hfApiKey = Deno.env.get('HUGGINGFACE_API_KEY');
          if (hfApiKey) {
            console.log('[generate-image] Imagen 3 failed, trying Hugging Face...');
            const hfResult = await generateWithHuggingFace(enhancedPrompt, hfApiKey);
            if (hfResult.success) {
              modelUsed = 'stable-diffusion-xl';
              result = hfResult;
            }
          }
        }
      }
    }

    // 사용량 기록
    await recordUsage(effectiveUserId, modelUsed, result.success, result.error);

    // 모두 실패한 경우
    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: 'All image generation attempts failed', details: result.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 쿼터 정보 포함하여 응답
    const responseWithQuota: ImageResponse = {
      ...result,
      modelUsed,
      quota: quotaInfo ? {
        daily_remaining: quotaInfo.daily_remaining - 1,
        monthly_remaining: quotaInfo.monthly_remaining - 1,
      } : undefined,
    };

    console.log(`[generate-image] Success with model: ${modelUsed}`);
    return new Response(JSON.stringify(responseWithQuota), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[generate-image] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * 프롬프트 향상 - Visual Novel 스타일
 * 세계관별 일관된 아트 스타일 유지
 */
function buildEnhancedPrompt(prompt: string, style: string, worldviewId?: string): string {
  // Visual Novel 스타일 기본 프리픽스 (모든 이미지에 적용)
  const visualNovelBase = `visual novel character portrait, anime illustration style,
korean webtoon aesthetic, high quality digital art,
clean lineart, soft cel shading, vibrant colors,
professional game asset, consistent art style`.replace(/\n/g, ' ');

  // 스타일별 추가 가이드
  const styleGuides: Record<string, string> = {
    illustration: 'detailed 2D illustration, game CG quality, soft lighting',
    photorealistic: 'semi-realistic style, detailed rendering, studio lighting',
    anime: 'japanese anime style, cel shading, expressive eyes with highlights',
  };

  // 세계관별 테마 및 색상 팔레트 (일관성 유지)
  const worldviewStyles: Record<string, { theme: string; palette: string }> = {
    fantasy: {
      theme: 'medieval fantasy setting, magical atmosphere, enchanted elements, mystical aura',
      palette: 'golden highlights, royal purple, emerald green, warm magical glow'
    },
    sports: {
      theme: 'modern athletic setting, stadium energy, competitive spirit, dynamic motion',
      palette: 'vibrant red, clean white, sky blue, energetic yellow'
    },
    idol: {
      theme: 'K-pop stage aesthetic, glamorous spotlight, concert atmosphere, star quality',
      palette: 'pastel pink, lavender purple, holographic sparkle, bright neon accents'
    },
    sf: {
      theme: 'futuristic space station, holographic displays, sci-fi technology',
      palette: 'neon cyan, electric blue, silver metallic, deep space black'
    },
    zombie: {
      theme: 'post-apocalyptic survival, gritty atmosphere, tactical gear',
      palette: 'muted olive green, rust orange, concrete gray, warning red'
    },
    spy: {
      theme: 'noir espionage aesthetic, urban shadows, sophisticated elegance',
      palette: 'noir black, midnight blue, gold accent, crimson red'
    },
  };

  // 품질 태그
  const qualityTags = 'masterpiece, best quality, highly detailed face, sharp focus';

  // 제외 태그 (Gemini는 negative prompt를 직접 지원하지 않으므로 Exclude로 명시)
  const excludeTags = 'low quality, blurry, distorted, deformed, bad anatomy, ugly, text, watermark, realistic photo, 3D render';

  const styleGuide = styleGuides[style] || styleGuides.illustration;
  const worldviewStyle = worldviewId && worldviewStyles[worldviewId]
    ? worldviewStyles[worldviewId]
    : { theme: '', palette: '' };

  // 프롬프트 조합: Visual Novel 기본 + 원본 프롬프트 + 세계관 테마 + 품질
  const parts = [
    visualNovelBase,
    prompt,
    worldviewStyle.theme,
    `Color palette: ${worldviewStyle.palette}`,
    styleGuide,
    qualityTags,
    `Exclude: ${excludeTags}`
  ].filter(Boolean);

  return parts.join('. ');
}

/**
 * Gemini 3 Pro Image Preview - 최신 고품질 이미지 생성
 * https://ai.google.dev/gemini-api/docs/image-generation
 */
async function generateWithGemini3ProImage(
  prompt: string,
  apiKey: string
): Promise<ImageResponse> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-image] Gemini 3 Pro Image API error:', response.status, errorText);
      throw new Error(`Gemini 3 Pro Image API error: ${response.status}`);
    }

    const data = await response.json();

    // 이미지 데이터 추출
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part: { inlineData?: { mimeType?: string; data?: string } }) =>
      part.inlineData?.mimeType?.startsWith('image/')
    );

    if (imagePart?.inlineData?.data) {
      console.log('[generate-image] Gemini 3 Pro Image success');
      return {
        success: true,
        imageBase64: imagePart.inlineData.data,
      };
    }

    throw new Error('No image data in Gemini 3 Pro response');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-image] Gemini 3 Pro Image error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Gemini 2.5 Flash Image (Nano Banana) - 빠른 고품질 이미지 생성
 * https://ai.google.dev/gemini-api/docs/image-generation
 */
async function generateWithGemini25Flash(
  prompt: string,
  apiKey: string
): Promise<ImageResponse> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-image] Gemini 2.5 Flash API error:', response.status, errorText);
      throw new Error(`Gemini 2.5 Flash API error: ${response.status}`);
    }

    const data = await response.json();

    // 이미지 데이터 추출
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part: { inlineData?: { mimeType?: string; data?: string } }) =>
      part.inlineData?.mimeType?.startsWith('image/')
    );

    if (imagePart?.inlineData?.data) {
      console.log('[generate-image] Gemini 2.5 Flash Image success');
      return {
        success: true,
        imageBase64: imagePart.inlineData.data,
      };
    }

    throw new Error('No image data in Gemini 2.5 response');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-image] Gemini 2.5 Flash error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Imagen 3 이미지 생성 (폴백 - Imagen 4 이전 안정 버전)
 * https://ai.google.dev/gemini-api/docs/imagen
 */
async function generateWithImagen3(
  prompt: string,
  apiKey: string,
  aspectRatio: string
): Promise<ImageResponse> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: prompt,
            }
          ],
          parameters: {
            aspectRatio: aspectRatio,
            numberOfImages: 1,
            personGeneration: 'allow_adult',
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-image] Imagen 3 API error:', response.status, errorText);
      throw new Error(`Imagen 3 API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Imagen 3 응답에서 이미지 추출
    const predictions = data.predictions || [];
    if (predictions.length > 0 && predictions[0].bytesBase64Encoded) {
      console.log('[generate-image] Imagen 3 success');
      return {
        success: true,
        imageBase64: predictions[0].bytesBase64Encoded,
      };
    }

    throw new Error('No image data in Imagen 3 response');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-image] Imagen 3 error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Hugging Face Stable Diffusion (최후 폴백)
 */
async function generateWithHuggingFace(
  prompt: string,
  apiKey: string
): Promise<ImageResponse> {
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy',
            num_inference_steps: 30,
            guidance_scale: 7.5,
          },
        }),
      }
    );

    if (!response.ok) {
      // 모델 로딩 중
      if (response.status === 503) {
        const data = await response.json();
        if (data.estimated_time) {
          console.log(`[generate-image] Model loading, waiting ${data.estimated_time}s...`);
          await new Promise(resolve => setTimeout(resolve, Math.min(data.estimated_time * 1000, 30000)));
          return generateWithHuggingFace(prompt, apiKey);
        }
      }
      throw new Error(`Hugging Face API error: ${response.status}`);
    }

    // 응답은 이미지 바이너리
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    console.log('[generate-image] Hugging Face success');
    return {
      success: true,
      imageBase64: base64,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-image] Hugging Face error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
