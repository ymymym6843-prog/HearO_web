'use client';

/**
 * 로그인 페이지
 * HearO - 카드 형식 UI + 이메일/비밀번호 및 소셜 로그인
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';
import { BRAND_COLORS } from '@/constants/themes';
import { useAuthStore } from '@/stores/useAuthStore';
import { authService } from '@/services/authService';
import type { OAuthProvider } from '@/services/authService';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const success = await signIn(email, password);
    if (success) {
      router.push('/worldview');
    }
  };

  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setOauthLoading(provider);
    clearError();

    const { error } = await authService.signInWithOAuth(provider);
    if (error) {
      console.error('OAuth login error:', error);
    }
    setOauthLoading(null);
  };

  return (
    <div className="min-h-screen bg-hearo-bg flex flex-col items-center justify-center py-8 px-4">
      {/* 배경 글로우 */}
      <div
        className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full opacity-10 pointer-events-none"
        style={{ backgroundColor: BRAND_COLORS.primary }}
      />

      {/* 로고 */}
      <Link href="/" className="mb-6">
        <Image
          src="/images/logo/logo-icon.png"
          alt="HearO"
          width={60}
          height={60}
        />
      </Link>

      {/* 메인 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-hearo-surface rounded-2xl shadow-xl overflow-hidden"
      >
        {/* 카드 헤더 */}
        <div
          className="px-6 py-5"
          style={{ backgroundColor: `${BRAND_COLORS.primary}15` }}
        >
          <h1 className="text-xl font-bold text-hearo-text">로그인</h1>
          <p className="text-sm text-hearo-text/60 mt-1">
            영웅의 여정을 계속하세요
          </p>
        </div>

        {/* 에러 메시지 */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 py-3 bg-red-500/10 border-b border-red-500/20"
            >
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <Icon name="warning-outline" size={16} />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 카드 내용 */}
        <div className="p-6">
          {/* 로그인 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이메일 */}
            <div>
              <label className="block text-sm text-hearo-text/70 mb-1">
                이메일
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="w-full px-4 py-3 pl-11 bg-hearo-bg rounded-xl text-hearo-text placeholder-hearo-text/40 focus:outline-none focus:ring-2 focus:ring-hearo-primary/50"
                />
                <Icon
                  name="mail-outline"
                  size={20}
                  color="var(--foreground-secondary)"
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                />
              </div>
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-sm text-hearo-text/70 mb-1">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pl-11 pr-11 bg-hearo-bg rounded-xl text-hearo-text placeholder-hearo-text/40 focus:outline-none focus:ring-2 focus:ring-hearo-primary/50"
                />
                <Icon
                  name="lock-closed-outline"
                  size={20}
                  color="var(--foreground-secondary)"
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <Icon
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="var(--foreground-secondary)"
                  />
                </button>
              </div>
            </div>

            {/* 비밀번호 찾기 */}
            <div className="text-right">
              <Link
                href="/auth/reset-password"
                className="text-sm text-hearo-primary hover:underline"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </div>

            {/* 로그인 버튼 */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-50 transition-colors"
              style={{ backgroundColor: BRAND_COLORS.primary }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon name="reload-outline" size={20} className="animate-spin" />
                  로그인 중...
                </span>
              ) : (
                '로그인'
              )}
            </motion.button>
          </form>

          {/* 구분선 */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-hearo-text/20" />
            <span className="text-xs text-hearo-text/50">간편 로그인</span>
            <div className="flex-1 h-px bg-hearo-text/20" />
          </div>

          {/* 소셜 로그인 */}
          <div className="flex gap-3">
            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={!!oauthLoading}
              className="flex-1 py-3 px-4 bg-white text-gray-800 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {oauthLoading === 'google' ? (
                <Icon name="reload-outline" size={20} className="animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span className="hidden sm:inline">Google</span>
            </button>

            <button
              onClick={() => handleOAuthLogin('kakao')}
              disabled={!!oauthLoading}
              className="flex-1 py-3 px-4 bg-[#FEE500] text-[#191919] rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#FDD800] transition-colors disabled:opacity-50"
            >
              {oauthLoading === 'kakao' ? (
                <Icon name="reload-outline" size={20} className="animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#191919" d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
                </svg>
              )}
              <span className="hidden sm:inline">카카오</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* 회원가입 링크 */}
      <p className="mt-6 text-sm text-hearo-text/60">
        계정이 없으신가요?{' '}
        <Link href="/signup" className="text-hearo-primary font-medium hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}
