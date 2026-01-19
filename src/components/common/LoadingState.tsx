'use client';

/**
 * 로딩 상태 컴포넌트
 * 다양한 로딩 상황에 맞는 UI 제공
 */

import { motion } from 'framer-motion';

export type LoadingSize = 'sm' | 'md' | 'lg' | 'full';
export type LoadingVariant = 'spinner' | 'dots' | 'pulse' | 'skeleton';

interface LoadingStateProps {
  size?: LoadingSize;
  variant?: LoadingVariant;
  message?: string;
  subMessage?: string;
  className?: string;
}

// 크기별 스타일
const sizeStyles: Record<LoadingSize, { container: string; spinner: number; text: string }> = {
  sm: { container: 'p-2', spinner: 20, text: 'text-sm' },
  md: { container: 'p-4', spinner: 32, text: 'text-base' },
  lg: { container: 'p-6', spinner: 48, text: 'text-lg' },
  full: { container: 'min-h-screen', spinner: 64, text: 'text-xl' },
};

export function LoadingState({
  size = 'md',
  variant = 'spinner',
  message,
  subMessage,
  className = '',
}: LoadingStateProps) {
  const styles = sizeStyles[size];

  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-4
        ${styles.container} ${className}
      `}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {variant === 'spinner' && <Spinner size={styles.spinner} />}
      {variant === 'dots' && <LoadingDots size={styles.spinner} />}
      {variant === 'pulse' && <PulseLoader size={styles.spinner} />}

      {message && (
        <p className={`text-white font-medium ${styles.text}`}>
          {message}
        </p>
      )}
      {subMessage && (
        <p className="text-gray-400 text-sm">
          {subMessage}
        </p>
      )}

      <span className="sr-only">로딩 중...</span>
    </div>
  );
}

// 스피너 컴포넌트
function Spinner({ size }: { size: number }) {
  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          className="text-gray-700"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-hearo-primary"
        />
      </svg>
    </motion.div>
  );
}

// 점 애니메이션 컴포넌트
function LoadingDots({ size }: { size: number }) {
  const dotSize = Math.max(8, size / 4);

  return (
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="bg-hearo-primary rounded-full"
          style={{ width: dotSize, height: dotSize }}
          animate={{
            y: [0, -10, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

// 펄스 로더 컴포넌트
function PulseLoader({ size }: { size: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0 bg-hearo-primary rounded-full"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      />
      <div
        className="absolute inset-1/4 bg-hearo-primary rounded-full"
      />
    </div>
  );
}

// 스켈레톤 로더 컴포넌트
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({
  width = '100%',
  height = 20,
  className = '',
  rounded = 'md',
}: SkeletonProps) {
  const roundedClass = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }[rounded];

  return (
    <motion.div
      className={`bg-gray-700 ${roundedClass} ${className}`}
      style={{ width, height }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
}

// 운동 페이지용 로딩 화면
export function ExerciseLoadingState() {
  return (
    <div className="min-h-screen bg-hearo-bg flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <Spinner size={64} />
        <h2 className="text-2xl font-bold text-white mt-6">
          운동 준비 중
        </h2>
        <p className="text-gray-400 mt-2">
          카메라와 AI를 초기화하고 있습니다...
        </p>

        <div className="mt-8 space-y-3 w-64">
          <LoadingStep label="카메라 연결" delay={0} />
          <LoadingStep label="AI 모델 로드" delay={0.5} />
          <LoadingStep label="운동 데이터 준비" delay={1} />
        </div>
      </motion.div>
    </div>
  );
}

function LoadingStep({ label, delay }: { label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-3 text-left"
    >
      <motion.div
        className="w-5 h-5 border-2 border-hearo-primary rounded-full"
        animate={{
          backgroundColor: ['transparent', '#00D9FF', 'transparent'],
        }}
        transition={{
          duration: 1,
          delay: delay + 0.5,
          repeat: Infinity,
        }}
      />
      <span className="text-gray-300">{label}</span>
    </motion.div>
  );
}

// 카메라 로딩 상태
export function CameraLoadingState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
      <div className="text-center">
        <LoadingState
          size="lg"
          variant="pulse"
          message="카메라 연결 중..."
          subMessage="카메라 접근 권한을 허용해주세요"
        />
      </div>
    </div>
  );
}

// MediaPipe 로딩 상태
export function MediaPipeLoadingState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
      <div className="text-center">
        <LoadingState
          size="lg"
          variant="dots"
          message="AI 모델 로딩 중..."
          subMessage="잠시만 기다려주세요"
        />
      </div>
    </div>
  );
}
