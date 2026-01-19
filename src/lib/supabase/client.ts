/**
 * Supabase 클라이언트 설정
 * 브라우저 환경용
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Supabase');

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// 환경변수가 실제로 설정되어 있는지 확인
export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!isSupabaseConfigured) {
  logger.warn(
    'Supabase URL or Anon Key not found. ' +
    'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables. ' +
    'Database features will be disabled.'
  );
}

// Supabase 클라이언트 생성 (타입 적용)
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// 서버 사이드용 클라이언트 생성 (필요시)
export function createServerClient() {
  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export default supabase;
