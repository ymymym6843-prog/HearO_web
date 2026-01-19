'use client';

/**
 * 공통 로딩 스피너 컴포넌트
 * 일관된 로딩 UI와 접근성 제공
 */

import { motion } from 'framer-motion';

export type LoadingSpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LoadingSpinnerProps {
  size?: LoadingSpinnerSize;
  color?: string;
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

// 사이즈별 설정
const SIZE_CONFIG: Record<LoadingSpinnerSize, { spinner: number; border: number; text: string }> = {
  xs: { spinner: 16, border: 2, text: 'text-xs' },
  sm: { spinner: 24, border: 2, text: 'text-sm' },
  md: { spinner: 32, border: 3, text: 'text-base' },
  lg: { spinner: 48, border: 4, text: 'text-lg' },
  xl: { spinner: 64, border: 4, text: 'text-xl' },
} as const;

export function LoadingSpinner({
  size = 'md',
  color = '#00D9FF',
  label,
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) {
  const config = SIZE_CONFIG[size];

  const spinnerContent = (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label || '로딩 중'}
    >
      <motion.div
        className="rounded-full"
        style={{
          width: config.spinner,
          height: config.spinner,
          border: `${config.border}px solid rgba(255, 255, 255, 0.2)`,
          borderTopColor: color,
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
        aria-hidden="true"
      />
      {label && (
        <span className={`${config.text} text-gray-400`}>
          {label}
        </span>
      )}
      <span className="sr-only">{label || '로딩 중'}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-hearo-bg/90 backdrop-blur-sm flex items-center justify-center z-50">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
}

// 페이지 전체 로딩 컴포넌트
export function PageLoading({ label = '로딩 중...' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-hearo-bg flex items-center justify-center">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}

// 컨텐츠 영역 로딩 컴포넌트
export function ContentLoading({ label }: { label?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center py-12">
      <LoadingSpinner size="md" label={label} />
    </div>
  );
}

// 버튼 내부 로딩 (인라인)
export function InlineLoading({ size = 'sm' }: { size?: LoadingSpinnerSize }) {
  return <LoadingSpinner size={size} />;
}

export default LoadingSpinner;
