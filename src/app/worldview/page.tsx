'use client';

/**
 * 세계관 선택 페이지
 * 사용자가 스토리 세계관을 선택
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { WorldviewCarousel } from '@/components/worldview/WorldviewCarousel';
import { useWorldStore } from '@/stores/useWorldStore';
import type { WorldviewId } from '@/constants/worldviews';
import { WORLDVIEWS } from '@/constants/worldviews';

export default function WorldviewSelectPage() {
  const router = useRouter();
  const { setWorldview } = useWorldStore();
  const [selectedWorldview, setSelectedWorldview] = useState<WorldviewId | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelect = useCallback((worldviewId: WorldviewId) => {
    setSelectedWorldview(worldviewId);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedWorldview) return;

    setIsLoading(true);

    // Zustand 스토어에 세계관 저장
    setWorldview(selectedWorldview);

    // 운동 목록 페이지로 이동
    setTimeout(() => {
      router.push('/exercise');
    }, 500);
  }, [selectedWorldview, router, setWorldview]);

  const selectedWorld = selectedWorldview ? WORLDVIEWS[selectedWorldview] : null;

  return (
    <div className="min-h-screen bg-hearo-bg">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-hearo-bg/80 backdrop-blur-lg border-b border-hearo-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo/logo-icon.png"
              alt="HearO"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="text-lg font-bold text-hearo-text">HearO</span>
          </Link>

          <Link
            href="/"
            className="text-hearo-text/60 hover:text-hearo-text transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 py-8">
        {/* 타이틀 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-hearo-text mb-3">
            어떤 세계로 떠날까요?
          </h1>
          <p className="text-hearo-text/60 text-lg">
            당신의 이야기가 펼쳐질 세계를 선택하세요
          </p>
        </motion.div>

        {/* 캐러셀 */}
        <div className="max-w-4xl mx-auto mb-8">
          <WorldviewCarousel
            onSelect={handleSelect}
            selectedWorldview={selectedWorldview ?? undefined}
          />
        </div>

        {/* 하단 버튼 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-md mx-auto"
        >
          <button
            onClick={handleConfirm}
            disabled={!selectedWorldview || isLoading}
            className={`
              w-full py-4 rounded-2xl font-bold text-lg
              transition-all duration-300
              ${selectedWorldview && !isLoading
                ? 'text-white shadow-lg hover:shadow-xl active:scale-[0.98]'
                : 'bg-hearo-surface text-hearo-text/40 cursor-not-allowed'
              }
            `}
            style={{
              backgroundColor: selectedWorld?.colors.primary ?? undefined,
              boxShadow: selectedWorld
                ? `0 10px 40px ${selectedWorld.colors.primary}40`
                : undefined,
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                준비 중...
              </span>
            ) : selectedWorldview ? (
              '이 세계로 떠나기'
            ) : (
              '세계를 선택하세요'
            )}
          </button>
        </motion.div>
      </main>

      {/* 푸터 */}
      <footer className="py-6 text-center text-hearo-text/40 text-sm">
        <p>세계관은 나중에 변경할 수 있어요</p>
      </footer>
    </div>
  );
}
