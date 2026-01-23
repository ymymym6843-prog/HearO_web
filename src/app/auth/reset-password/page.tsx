'use client';

/**
 * 비밀번호 재설정 페이지
 * 이메일 입력 → 재설정 링크 발송
 */

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';
import { BRAND_COLORS } from '@/constants/themes';
import { authService } from '@/services/authService';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await authService.resetPassword(email);

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('비밀번호 재설정 요청 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 성공 화면
  if (success) {
    return (
      <div className="min-h-screen bg-hearo-bg flex flex-col justify-center py-12 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md mx-auto text-center"
        >
          <div
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: `${BRAND_COLORS.primary}20` }}
          >
            <Icon name="mail-outline" size={40} color={BRAND_COLORS.primary} />
          </div>

          <h1 className="text-2xl font-bold text-hearo-text mb-3">이메일을 확인하세요</h1>
          <p className="text-hearo-text/60 mb-8">
            <span className="text-hearo-primary font-medium">{email}</span>
            <br />
            으로 비밀번호 재설정 링크를 보냈습니다.
          </p>

          <div className="bg-hearo-surface rounded-xl p-4 mb-6">
            <p className="text-sm text-hearo-text/70">
              이메일이 도착하지 않았다면 스팸 폴더를 확인하거나,
              <br />
              잠시 후 다시 시도해주세요.
            </p>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-hearo-primary hover:underline"
          >
            <Icon name="arrow-back" size={18} />
            로그인으로 돌아가기
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hearo-bg flex flex-col justify-center py-12 px-6">
      {/* 배경 글로우 */}
      <div
        className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full opacity-10 pointer-events-none"
        style={{ backgroundColor: BRAND_COLORS.primary }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md mx-auto"
      >
        {/* 로고 */}
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/images/logo/logo-icon.png"
              alt="HearO"
              width={80}
              height={80}
              className="mx-auto mb-4"
            />
          </Link>
          <h1 className="text-2xl font-bold text-hearo-text">비밀번호 재설정</h1>
          <p className="text-hearo-text/60 mt-2">
            가입한 이메일 주소를 입력하면
            <br />
            비밀번호 재설정 링크를 보내드립니다.
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2"
          >
            <Icon name="warning-outline" size={18} />
            {error}
          </motion.div>
        )}

        {/* 이메일 입력 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-hearo-text/70 mb-1">이메일</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="w-full px-4 py-3 pl-11 bg-hearo-surface rounded-xl text-hearo-text placeholder-hearo-text/40 focus:outline-none focus:ring-2 focus:ring-hearo-primary/50"
              />
              <Icon
                name="mail-outline"
                size={20}
                color="var(--foreground-secondary)"
                className="absolute left-3 top-1/2 -translate-y-1/2"
              />
            </div>
          </div>

          {/* 제출 버튼 */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-50 transition-colors"
            style={{
              backgroundColor: BRAND_COLORS.primary,
              boxShadow: `0 4px 20px ${BRAND_COLORS.primary}40`,
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Icon name="reload-outline" size={20} className="animate-spin" />
                전송 중...
              </span>
            ) : (
              '재설정 링크 보내기'
            )}
          </motion.button>
        </form>

        {/* 로그인 링크 */}
        <p className="text-center mt-8 text-hearo-text/60">
          비밀번호가 기억나셨나요?{' '}
          <Link href="/login" className="text-hearo-primary font-medium hover:underline">
            로그인
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
