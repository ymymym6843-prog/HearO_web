'use client';

/**
 * RepCounter - 횟수 카운터 컴포넌트
 * 애니메이션과 함께 운동 횟수를 표시
 * React.memo로 불필요한 리렌더링 방지
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type RepCounterSize = 'sm' | 'md' | 'lg';

interface RepCounterProps {
  current: number;
  target: number;
  themeColor?: string;
  size?: RepCounterSize;
}

// 정적 설정 - 컴포넌트 외부에서 한 번만 생성
const SIZE_CONFIG: Record<RepCounterSize, { main: string; sub: string; ring: number }> = {
  sm: { main: 'text-4xl', sub: 'text-xl', ring: 100 },
  md: { main: 'text-6xl', sub: 'text-2xl', ring: 140 },
  lg: { main: 'text-8xl', sub: 'text-3xl', ring: 180 },
} as const;

export const RepCounter = memo(function RepCounter({
  current,
  target,
  themeColor = '#8B5CF6',
  size = 'md',
}: RepCounterProps) {
  const config = SIZE_CONFIG[size];
  const progress = target > 0 ? (current / target) * 100 : 0;
  const circumference = 2 * Math.PI * (config.ring / 2 - 8);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={target}
      aria-label={`운동 횟수: ${current}회 / ${target}회 완료`}
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
          r={config.ring / 2 - 8}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="6"
        />
        {/* 진행 원 */}
        <motion.circle
          cx={config.ring / 2}
          cy={config.ring / 2}
          r={config.ring / 2 - 8}
          fill="none"
          stroke={themeColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </svg>

      {/* 숫자 표시 */}
      <div className="text-center z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <span
              className={`${config.main} font-black`}
              style={{ color: themeColor }}
            >
              {current}
            </span>
          </motion.div>
        </AnimatePresence>
        <span className={`${config.sub} text-white/50 font-medium`}>
          / {target}
        </span>
      </div>

      {/* 완료 효과 - key 기반 애니메이션 */}
      <AnimatePresence>
        {current > 0 && (
          <motion.div
            key={`pulse-${current}`}
            className="absolute inset-0 rounded-full pointer-events-none"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              backgroundColor: themeColor,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

export default RepCounter;
