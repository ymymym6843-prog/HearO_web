'use client';

/**
 * HoldTimer - 홀드 타이머 컴포넌트
 * 플랭크, 사이드 플랭크 등 등척성 운동의 유지 시간 표시
 * React.memo로 불필요한 리렌더링 방지
 */

import { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';

interface HoldTimerProps {
  currentTime: number;     // 현재 유지 시간 (초)
  targetTime: number;      // 목표 시간 (초)
  themeColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

// 정적 설정 - 컴포넌트 외부에서 한 번만 생성
const SIZE_CONFIG = {
  sm: { main: 'text-3xl', sub: 'text-sm', ring: 80 },
  md: { main: 'text-5xl', sub: 'text-lg', ring: 120 },
  lg: { main: 'text-7xl', sub: 'text-xl', ring: 160 },
} as const;

export const HoldTimer = memo(function HoldTimer({
  currentTime,
  targetTime,
  themeColor = '#8B5CF6',
  size = 'md',
}: HoldTimerProps) {
  const progress = targetTime > 0 ? Math.min(100, (currentTime / targetTime) * 100) : 0;
  const remainingTime = Math.max(0, targetTime - currentTime);

  const config = SIZE_CONFIG[size];
  const circumference = 2 * Math.PI * (config.ring / 2 - 6);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // 시간 포맷 (메모이제이션)
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return secs.toString();
  }, []);

  // 색상 계산 (메모이제이션)
  const displayColor = useMemo(() => {
    if (progress >= 100) return '#10B981'; // 완료 - 초록
    if (remainingTime <= 5) return '#F59E0B'; // 5초 이하 - 주황
    return themeColor;
  }, [progress, remainingTime, themeColor]);

  return (
    <div
      className="relative flex items-center justify-center"
      role="timer"
      aria-label={`홀드 타이머: ${Math.floor(currentTime)}초 / ${targetTime}초, ${Math.floor(remainingTime)}초 남음`}
      aria-live="polite"
    >
      {/* 진행 링 */}
      <svg
        className="absolute transform -rotate-90"
        width={config.ring}
        height={config.ring}
        aria-hidden="true"
      >
        {/* 배경 원 */}
        <circle
          cx={config.ring / 2}
          cy={config.ring / 2}
          r={config.ring / 2 - 6}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="5"
        />
        {/* 진행 원 */}
        <motion.circle
          cx={config.ring / 2}
          cy={config.ring / 2}
          r={config.ring / 2 - 6}
          fill="none"
          stroke={displayColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </svg>

      {/* 시간 표시 */}
      <div className="text-center z-10">
        <div className="flex flex-col items-center">
          {/* 남은 시간 (큰 글씨) */}
          <motion.span
            className={`${config.main} font-black`}
            style={{ color: displayColor }}
            animate={{ scale: remainingTime <= 5 && remainingTime > 0 ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 0.5, repeat: remainingTime <= 5 && remainingTime > 0 ? Infinity : 0 }}
          >
            {formatTime(remainingTime)}
          </motion.span>

          {/* 라벨 */}
          <span className={`${config.sub} text-white/50 font-medium`}>
            {progress >= 100 ? '완료!' : '남음'}
          </span>
        </div>
      </div>

      {/* 완료 효과 */}
      {progress >= 100 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.3, opacity: 0 }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ backgroundColor: displayColor }}
        />
      )}
    </div>
  );
});

export default HoldTimer;
