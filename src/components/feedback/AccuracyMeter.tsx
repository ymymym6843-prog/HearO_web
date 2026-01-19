'use client';

/**
 * AccuracyMeter - 실시간 정확도 표시 컴포넌트
 * 현재 자세의 정확도를 시각적으로 표시
 * React.memo로 불필요한 리렌더링 방지
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { getSuccessRateColor } from '@/constants/themes';

type AccuracyMeterSize = 'sm' | 'md' | 'lg';

interface AccuracyMeterProps {
  accuracy: number; // 0-100
  size?: AccuracyMeterSize;
  showLabel?: boolean;
  themeColor?: string;
}

// 정적 설정 - 컴포넌트 외부에서 한 번만 생성
const SIZE_CONFIG: Record<AccuracyMeterSize, { width: number; height: number; fontSize: string }> = {
  sm: { width: 80, height: 6, fontSize: 'text-xs' },
  md: { width: 120, height: 8, fontSize: 'text-sm' },
  lg: { width: 160, height: 10, fontSize: 'text-base' },
} as const;

export const AccuracyMeter = memo(function AccuracyMeter({
  accuracy,
  size = 'md',
  showLabel = true,
  themeColor,
}: AccuracyMeterProps) {
  const color = themeColor || getSuccessRateColor(accuracy);
  const config = SIZE_CONFIG[size];

  return (
    <div className="flex flex-col gap-1">
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className={`${config.fontSize} text-white/60`}>정확도</span>
          <span
            className={`${config.fontSize} font-bold`}
            style={{ color }}
          >
            {Math.round(accuracy)}%
          </span>
        </div>
      )}

      <div
        className="rounded-full overflow-hidden"
        style={{
          width: config.width,
          height: config.height,
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
        }}
        role="meter"
        aria-valuenow={Math.round(accuracy)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`자세 정확도: ${Math.round(accuracy)}%`}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${accuracy}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
});

export default AccuracyMeter;
