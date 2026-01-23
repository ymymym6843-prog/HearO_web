'use client';

/**
 * OAuth 콜백 페이지
 * 소셜 로그인 후 리다이렉트 처리
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { BRAND_COLORS } from '@/constants/themes';
import { Icon } from '@/components/ui/Icon';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URL에서 코드 확인
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          router.push('/login?error=auth_callback_failed');
          return;
        }

        if (data.session) {
          // 로그인 성공 - 세계관 선택 페이지로 이동
          router.push('/worldview');
        } else {
          // 세션이 없으면 로그인 페이지로
          router.push('/login');
        }
      } catch (err) {
        console.error('Auth callback exception:', err);
        router.push('/login?error=auth_callback_error');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: 'var(--background-primary)' }}
    >
      {/* 배경 글로우 */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full opacity-20 pointer-events-none animate-pulse"
        style={{ backgroundColor: BRAND_COLORS.primary }}
      />

      <div className="text-center z-10">
        <div className="relative mb-6">
          <div
            className="w-16 h-16 rounded-full animate-spin mx-auto"
            style={{
              border: `3px solid ${BRAND_COLORS.primary}20`,
              borderTopColor: BRAND_COLORS.primary,
            }}
          />
          <Icon
            name="person-outline"
            size={28}
            color={BRAND_COLORS.primary}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          />
        </div>
        <p className="text-hearo-text text-lg font-medium">로그인 처리 중...</p>
        <p className="text-hearo-text/60 text-sm mt-2">잠시만 기다려주세요</p>
      </div>
    </div>
  );
}
