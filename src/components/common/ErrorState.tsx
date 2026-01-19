'use client';

/**
 * 에러 상태 컴포넌트
 * 다양한 에러 상황에 맞는 UI 제공
 */

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';

export type ErrorType = 'general' | 'camera' | 'mediapipe' | 'network' | 'auth' | 'notfound';

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
  className?: string;
}

// 에러 타입별 기본 설정
const errorConfig: Record<ErrorType, {
  icon: IconName;
  defaultTitle: string;
  defaultMessage: string;
  color: string;
}> = {
  general: {
    icon: 'alert-circle',
    defaultTitle: '오류가 발생했습니다',
    defaultMessage: '일시적인 문제가 발생했습니다. 다시 시도해주세요.',
    color: '#EF4444',
  },
  camera: {
    icon: 'videocam-outline',
    defaultTitle: '카메라 연결 실패',
    defaultMessage: '카메라에 접근할 수 없습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.',
    color: '#F59E0B',
  },
  mediapipe: {
    icon: 'body-outline',
    defaultTitle: 'AI 모델 로드 실패',
    defaultMessage: 'AI 모델을 불러올 수 없습니다. 네트워크 연결을 확인하고 다시 시도해주세요.',
    color: '#8B5CF6',
  },
  network: {
    icon: 'warning',
    defaultTitle: '네트워크 오류',
    defaultMessage: '인터넷 연결을 확인해주세요.',
    color: '#F59E0B',
  },
  auth: {
    icon: 'lock-closed-outline',
    defaultTitle: '인증이 필요합니다',
    defaultMessage: '이 기능을 사용하려면 로그인이 필요합니다.',
    color: '#3B82F6',
  },
  notfound: {
    icon: 'information-circle-outline',
    defaultTitle: '페이지를 찾을 수 없습니다',
    defaultMessage: '요청하신 페이지가 존재하지 않습니다.',
    color: '#6B7280',
  },
};

export function ErrorState({
  type = 'general',
  title,
  message,
  onRetry,
  onBack,
  className = '',
}: ErrorStateProps) {
  const config = errorConfig[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex flex-col items-center justify-center text-center p-6
        ${className}
      `}
      role="alert"
      aria-live="assertive"
    >
      {/* 아이콘 */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
        className="mb-6 p-4 rounded-full bg-white/5"
        style={{ color: config.color }}
      >
        <Icon name={config.icon} size={64} color={config.color} />
      </motion.div>

      {/* 제목 */}
      <h2 className="text-2xl font-bold text-white mb-2">
        {title || config.defaultTitle}
      </h2>

      {/* 메시지 */}
      <p className="text-gray-400 max-w-md mb-8">
        {message || config.defaultMessage}
      </p>

      {/* 액션 버튼 */}
      <div className="flex gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="
              px-6 py-3 rounded-xl
              bg-white/10 hover:bg-white/20
              text-white font-medium
              transition-colors
            "
          >
            돌아가기
          </button>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="
              px-6 py-3 rounded-xl
              bg-hearo-primary hover:bg-hearo-primary/80
              text-black font-bold
              transition-colors
            "
          >
            다시 시도
          </button>
        )}
      </div>
    </motion.div>
  );
}

// 전체 화면 에러 상태
export function FullPageError({
  type = 'general',
  title,
  message,
  onRetry,
  onBack,
}: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-hearo-bg flex items-center justify-center">
      <ErrorState
        type={type}
        title={title}
        message={message}
        onRetry={onRetry}
        onBack={onBack}
      />
    </div>
  );
}

// 카메라 에러 오버레이
export function CameraErrorOverlay({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
      <ErrorState
        type="camera"
        message={message}
        onRetry={onRetry}
      />
    </div>
  );
}

// MediaPipe 에러 오버레이
export function MediaPipeErrorOverlay({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
      <ErrorState
        type="mediapipe"
        message={message}
        onRetry={onRetry}
      />
    </div>
  );
}

// 인라인 에러 메시지 (작은 영역용)
interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({ message, onRetry, className = '' }: InlineErrorProps) {
  return (
    <div
      className={`
        flex items-center gap-3 p-4 rounded-xl
        bg-red-500/10 border border-red-500/30
        ${className}
      `}
      role="alert"
    >
      <Icon name="alert-circle" size={20} color="#EF4444" />
      <span className="text-red-400 text-sm flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-red-400 hover:text-red-300 text-sm font-medium"
        >
          재시도
        </button>
      )}
    </div>
  );
}

// 네트워크 오프라인 배너
export function OfflineBanner() {
  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      exit={{ y: -100 }}
      className="
        fixed top-0 left-0 right-0 z-50
        bg-yellow-500 text-black
        px-4 py-2 text-center font-medium
      "
    >
      <div className="flex items-center justify-center gap-2">
        <Icon name="warning" size={18} color="#000" />
        <span>오프라인 상태입니다. 인터넷 연결을 확인해주세요.</span>
      </div>
    </motion.div>
  );
}

// 에러 경계에서 사용할 폴백 컴포넌트
export function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error?: Error | null;
  resetErrorBoundary?: () => void;
}) {
  return (
    <FullPageError
      type="general"
      title="예기치 않은 오류"
      message={error?.message || '앱에서 오류가 발생했습니다.'}
      onRetry={resetErrorBoundary || (() => window.location.reload())}
    />
  );
}
