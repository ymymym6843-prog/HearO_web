'use client';

/**
 * BackgroundRandomizer - 배경 랜덤 변경 버튼
 *
 * 기능:
 * - 버튼 클릭 시 랜덤 배경으로 변경
 * - 세계관 테마에 맞는 스타일
 * - 애니메이션 피드백
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorldviewId } from '@/constants/worldviews';
import { WORLDVIEWS } from '@/constants/worldviews';

// ============================================
// 타입 정의
// ============================================

export interface BackgroundRandomizerProps {
  /** 세계관 ID (테마 색상용) */
  worldviewId: WorldviewId;
  /** 랜덤 배경 변경 콜백 */
  onRandomize: () => void;
  /** 현재 배경 인덱스 (표시용) */
  currentIndex?: number;
  /** 전체 배경 개수 */
  totalCount?: number;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 크기 */
  size?: 'sm' | 'md' | 'lg';
  /** 추가 클래스 */
  className?: string;
  /** 라벨 표시 여부 */
  showLabel?: boolean;
  /** 인덱스 표시 여부 */
  showIndex?: boolean;
}

// ============================================
// 메인 컴포넌트
// ============================================

export function BackgroundRandomizer({
  worldviewId,
  onRandomize,
  currentIndex,
  totalCount = 20,
  disabled = false,
  size = 'md',
  className = '',
  showLabel = true,
  showIndex = false,
}: BackgroundRandomizerProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const themeColor = WORLDVIEWS[worldviewId]?.colors.primary || '#8B5CF6';

  // 크기별 스타일
  const sizeStyles = {
    sm: {
      button: 'px-3 py-1.5 text-xs gap-1.5',
      icon: 'text-sm',
    },
    md: {
      button: 'px-4 py-2 text-sm gap-2',
      icon: 'text-base',
    },
    lg: {
      button: 'px-5 py-2.5 text-base gap-2',
      icon: 'text-lg',
    },
  };

  const handleClick = useCallback(() => {
    if (disabled || isAnimating) return;

    setIsAnimating(true);
    onRandomize();

    // 애니메이션 완료 후 상태 리셋
    setTimeout(() => setIsAnimating(false), 500);
  }, [disabled, isAnimating, onRandomize]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <motion.button
        onClick={handleClick}
        disabled={disabled || isAnimating}
        className={`
          flex items-center justify-center rounded-lg font-medium
          transition-all duration-200 ease-out
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeStyles[size].button}
        `}
        style={{
          backgroundColor: `${themeColor}20`,
          color: themeColor,
          border: `1px solid ${themeColor}40`,
        }}
        whileHover={!disabled ? { scale: 1.02, backgroundColor: `${themeColor}30` } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
      >
        {/* 주사위 아이콘 */}
        <motion.span
          className={sizeStyles[size].icon}
          animate={isAnimating ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          🎲
        </motion.span>

        {/* 라벨 */}
        {showLabel && (
          <span>배경 바꾸기</span>
        )}
      </motion.button>

      {/* 인덱스 표시 */}
      <AnimatePresence mode="wait">
        {showIndex && currentIndex !== undefined && (
          <motion.span
            key={currentIndex}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="text-xs text-gray-400 tabular-nums"
          >
            {currentIndex + 1}/{totalCount}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// 컴팩트 버전 (아이콘만)
// ============================================

export function BackgroundRandomizerCompact({
  worldviewId,
  onRandomize,
  disabled = false,
  className = '',
}: Pick<BackgroundRandomizerProps, 'worldviewId' | 'onRandomize' | 'disabled' | 'className'>) {
  const [isAnimating, setIsAnimating] = useState(false);
  const themeColor = WORLDVIEWS[worldviewId]?.colors.primary || '#8B5CF6';

  const handleClick = useCallback(() => {
    if (disabled || isAnimating) return;

    setIsAnimating(true);
    onRandomize();

    setTimeout(() => setIsAnimating(false), 500);
  }, [disabled, isAnimating, onRandomize]);

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled || isAnimating}
      className={`
        w-10 h-10 flex items-center justify-center rounded-full
        transition-all duration-200 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      style={{
        backgroundColor: `${themeColor}20`,
        border: `1px solid ${themeColor}40`,
      }}
      whileHover={!disabled ? { scale: 1.1, backgroundColor: `${themeColor}30` } : {}}
      whileTap={!disabled ? { scale: 0.9 } : {}}
      title="배경 바꾸기"
    >
      <motion.span
        className="text-lg"
        animate={isAnimating ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        🎲
      </motion.span>
    </motion.button>
  );
}

export default BackgroundRandomizer;
