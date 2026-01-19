'use client';

/**
 * ErrorBoundary 컴포넌트
 * React 컴포넌트 트리에서 발생하는 에러를 잡아 처리
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ErrorBoundary');

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary caught error:', { error, componentStack: errorInfo.componentStack });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || '알 수 없는 오류가 발생했습니다';

      return (
        <div
          className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-gray-100 rounded-lg"
          role="alert"
          aria-live="assertive"
          aria-label={`오류 발생: ${errorMessage}`}
        >
          <div className="mb-4" aria-hidden="true">
            <Icon name="alert-circle-outline" size={40} color="#EF4444" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">
            문제가 발생했습니다
          </h2>
          <p className="text-gray-600 text-sm mb-4 text-center">
            {errorMessage}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            aria-label="오류 해결 후 다시 시도"
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 3D/카메라 전용 ErrorBoundary
 * WebGL, MediaPipe 관련 에러 특화 처리
 */
export class MediaErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('MediaErrorBoundary caught error:', { error, componentStack: errorInfo.componentStack });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    // 페이지 새로고침으로 WebGL/MediaPipe 재초기화
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || '';
      const isWebGLError = errorMessage.includes('WebGL') || errorMessage.includes('context');
      const isCameraError = errorMessage.includes('camera') || errorMessage.includes('getUserMedia');
      const isMediaPipeError = errorMessage.includes('MediaPipe') || errorMessage.includes('pose');

      let title = '미디어 오류';
      let description = '카메라 또는 3D 렌더링에 문제가 발생했습니다.';
      let suggestion = '페이지를 새로고침해 주세요.';
      let iconName: IconName = 'warning-outline';

      if (isWebGLError) {
        title = 'WebGL 오류';
        description = '3D 렌더링을 지원하지 않는 브라우저입니다.';
        suggestion = 'Chrome 또는 Edge 브라우저를 사용해 주세요.';
        iconName = 'cube-outline';
      } else if (isCameraError) {
        title = '카메라 오류';
        description = '카메라에 접근할 수 없습니다.';
        suggestion = '카메라 권한을 확인하고 다시 시도해 주세요.';
        iconName = 'camera-outline';
      } else if (isMediaPipeError) {
        title = '포즈 감지 오류';
        description = '포즈 감지 모델을 로드할 수 없습니다.';
        suggestion = '네트워크 연결을 확인하고 다시 시도해 주세요.';
        iconName = 'body-outline';
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="flex flex-col items-center justify-center min-h-[300px] p-6 bg-gray-900 rounded-lg text-white"
          role="alert"
          aria-live="assertive"
          aria-label={`${title}: ${description}`}
        >
          <div className="mb-4" aria-hidden="true">
            <Icon name={iconName} size={48} color="#FBBF24" />
          </div>
          <h2 className="text-xl font-bold mb-2">{title}</h2>
          <p className="text-gray-300 text-sm mb-2 text-center">{description}</p>
          <p className="text-gray-400 text-xs mb-4 text-center">{suggestion}</p>
          <button
            onClick={this.handleRetry}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            aria-label={`${title} 해결을 위해 페이지 새로고침`}
          >
            새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
