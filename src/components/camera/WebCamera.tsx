'use client';

/**
 * 웹 카메라 컴포넌트
 * MediaPipe 포즈 감지와 연동
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  initializePoseDetection,
  detectPoseWithWorld,
  drawSkeleton,
  closePoseDetection,
} from '@/lib/mediapipe/poseDetection';
import {
  initializeHandDetection,
  detectHands,
  drawHandSkeleton,
  closeHandDetection,
} from '@/lib/mediapipe/handDetection';
import type { Landmark } from '@/types/pose';
import { useCharacterStore } from '@/stores/useCharacterStore';
import { getSkeletonStyle } from '@/constants/themes';
import type { WorldviewType } from '@/types/vrm';
import { AlertModal } from '@/components/common/ConfirmModal';
import { Icon, type IconName } from '@/components/ui/Icon';
import { createLogger } from '@/lib/logger';

const logger = createLogger('WebCamera');

// 디버그용 프레임 카운터
let frameCount = 0;

interface WebCameraProps {
  width?: number;
  height?: number;
  showSkeleton?: boolean;
  showHandSkeleton?: boolean;  // 손 랜드마크 표시 여부
  enableHandTracking?: boolean; // 손 추적 활성화 여부
  worldview?: WorldviewType;
  onPoseDetected?: (landmarks: Landmark[]) => void;
  onHandsDetected?: (hands: { left: Landmark[] | null; right: Landmark[] | null }) => void;
  className?: string;
}

export function WebCamera({
  width = 640,
  height = 480,
  showSkeleton = true,
  showHandSkeleton = true,
  enableHandTracking = true,
  worldview,
  onPoseDetected,
  onHandsDetected,
  className = '',
}: WebCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const detectLoopRef = useRef<(() => void) | undefined>(undefined);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isHandInitialized, setIsHandInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'permission' | 'mediapipe' | 'device' | 'unknown' | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');

  const { setPoseLandmarks, setHandLandmarks } = useCharacterStore();

  // 스타일 객체 메모이제이션 (렌더링 최적화)
  const containerStyle = useMemo(() => ({ width, height }), [width, height]);

  // 권한 설정 도움말 표시
  const showPermissionHelp = useCallback(() => {
    const isChrome = navigator.userAgent.includes('Chrome');
    const message = isChrome
      ? 'Chrome 설정 > 개인정보 보호 및 보안 > 사이트 설정 > 카메라에서 이 사이트를 허용해주세요.'
      : '브라우저 설정에서 이 사이트의 카메라 권한을 허용해주세요.';
    setHelpMessage(message);
    setShowHelpModal(true);
  }, []);

  // 포즈 감지 루프 함수를 ref에 저장하여 순환 참조 방지
  useEffect(() => {
    detectLoopRef.current = () => {
      if (!videoRef.current || !isInitialized) {
        animationRef.current = requestAnimationFrame(() => detectLoopRef.current?.());
        return;
      }

      const video = videoRef.current;
      const timestamp = performance.now();
      const result = detectPoseWithWorld(video, timestamp);

      if (result) {
        const { landmarks2D, worldLandmarks3D } = result;

        // 디버그: 포즈 감지 확인 (첫 3프레임만 상세 로그)
        if (frameCount < 3) {
          console.log('[WebCamera] Frame', frameCount);
          console.log('[WebCamera] landmarks2D:', landmarks2D?.length);
          console.log('[WebCamera] worldLandmarks3D:', worldLandmarks3D?.length);
          console.log('[WebCamera] worldLandmarks3D === landmarks2D:', worldLandmarks3D === landmarks2D);
        }
        frameCount++;

        // 스토어 업데이트 (2D + 3D 좌표 모두 저장)
        setPoseLandmarks(landmarks2D, worldLandmarks3D);

        // 콜백 호출 (하위 호환성: 2D 좌표만 전달)
        onPoseDetected?.(landmarks2D);

        // 스켈레톤 그리기 (세계관별 스타일 적용)
        if (showSkeleton && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawSkeleton(canvas, landmarks2D, getSkeletonStyle(worldview));
          }
        }
      }

      // 손 감지 (활성화된 경우)
      if (enableHandTracking && isHandInitialized) {
        const handResult = detectHands(video, timestamp);
        if (handResult) {
          // 스토어 업데이트
          setHandLandmarks('left', handResult.left);
          setHandLandmarks('right', handResult.right);

          // 콜백 호출
          onHandsDetected?.(handResult);

          // 손 스켈레톤 그리기
          if (showHandSkeleton && canvasRef.current) {
            const canvas = canvasRef.current;
            if (handResult.left) {
              drawHandSkeleton(canvas, handResult.left, { color: '#FF6B6B' });
            }
            if (handResult.right) {
              drawHandSkeleton(canvas, handResult.right, { color: '#4ECDC4' });
            }
          }
        }
      }

      animationRef.current = requestAnimationFrame(() => detectLoopRef.current?.());
    };
  }, [isInitialized, isHandInitialized, showSkeleton, showHandSkeleton, enableHandTracking, worldview, setPoseLandmarks, setHandLandmarks, onPoseDetected, onHandsDetected]);

  // 초기화
  useEffect(() => {
    let mounted = true;
    let currentStream: MediaStream | null = null;

    const init = async () => {
      // 에러 상태 초기화
      if (mounted) {
        setError(null);
        setErrorType(null);
      }

      // 1. 카메라 접근
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: width },
            height: { ideal: height },
            facingMode: 'user',
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        currentStream = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
            if (mounted) setHasPermission(true);
          } catch (playErr) {
            logger.error('비디오 재생 실패', playErr);
            if (mounted) {
              setErrorType('device');
              setError('비디오 재생에 실패했습니다. 브라우저를 새로고침 해주세요.');
            }
            return;
          }
        }
      } catch (err) {
        logger.error('카메라 초기화 실패', err);
        if (mounted) {
          setHasPermission(false);

          // 에러 유형 분류
          if (err instanceof DOMException) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              setErrorType('permission');
              setError('카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
              setErrorType('device');
              setError('카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.');
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
              setErrorType('device');
              setError('카메라가 다른 프로그램에서 사용 중입니다. 다른 앱을 종료한 후 다시 시도해주세요.');
            } else {
              setErrorType('unknown');
              setError(err.message || '알 수 없는 카메라 오류');
            }
          } else {
            setErrorType('unknown');
            setError(err instanceof Error ? err.message : '카메라 접근 실패');
          }
        }
        return;
      }

      // 2. MediaPipe Pose 초기화
      try {
        await initializePoseDetection();
        if (mounted) setIsInitialized(true);
      } catch (err) {
        logger.error('MediaPipe Pose 초기화 실패', err);
        if (mounted) {
          setErrorType('mediapipe');
          setError('포즈 감지 모듈 초기화에 실패했습니다. 페이지를 새로고침 해주세요.');

          // 카메라 스트림 정리
          if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
          }
        }
        return;
      }

      // 3. MediaPipe Hand 초기화 (옵션)
      if (enableHandTracking) {
        try {
          await initializeHandDetection();
          if (mounted) {
            setIsHandInitialized(true);
            logger.info('MediaPipe Hand Landmarker 초기화 완료');
          }
        } catch (err) {
          // 손 추적 실패는 치명적이지 않음 - 경고만 표시
          console.warn('[WebCamera] MediaPipe Hand 초기화 실패 (포즈 감지는 정상 작동):', err);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      // 정리
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      closePoseDetection();
      closeHandDetection();

      // 카메라 스트림 정리
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [width, height, retryCount, enableHandTracking]);

  // 감지 루프 시작
  useEffect(() => {
    if (isInitialized && detectLoopRef.current) {
      animationRef.current = requestAnimationFrame(() => detectLoopRef.current?.());
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isInitialized]);

  // 에러 유형별 아이콘
  const getErrorIcon = (): IconName => {
    switch (errorType) {
      case 'permission':
        return 'lock-closed-outline';
      case 'device':
        return 'camera-outline';
      case 'mediapipe':
        return 'analytics-outline';
      default:
        return 'warning-outline';
    }
  };

  // 에러 유형별 제목
  const getErrorTitle = () => {
    switch (errorType) {
      case 'permission':
        return '카메라 권한 필요';
      case 'device':
        return '카메라 문제';
      case 'mediapipe':
        return '포즈 감지 오류';
      default:
        return '오류 발생';
    }
  };

  // 재시도 핸들러 (메모이제이션)
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setHasPermission(null);
    setIsInitialized(false);
  }, []);

  // 권한 없음 또는 에러 상태
  if (hasPermission === false || errorType === 'mediapipe') {
    return (
      <div
        className={`flex items-center justify-center bg-gray-900 text-white ${className}`}
        style={containerStyle}
        role="alert"
        aria-live="polite"
        aria-label={`${getErrorTitle()}: ${error}`}
      >
        <div className="text-center p-4">
          <div className="flex justify-center mb-2" aria-hidden="true">
            <Icon name={getErrorIcon()} size={32} color="#9CA3AF" />
          </div>
          <p className="text-lg mb-2 font-medium">{getErrorTitle()}</p>
          <p className="text-sm text-gray-400 mb-4 max-w-xs">{error}</p>

          {/* 권한 설정 안내 (권한 오류인 경우) */}
          {errorType === 'permission' && (
            <div
              className="text-xs text-gray-500 mb-4 p-2 bg-gray-800 rounded flex flex-col items-center gap-1"
              aria-label="권한 설정 안내: 브라우저 주소창 왼쪽의 자물쇠 아이콘을 클릭하여 권한을 설정하세요"
            >
              <p>브라우저 주소창 왼쪽의</p>
              <div className="flex items-center gap-1">
                <Icon name="lock-closed-outline" size={14} color="#6B7280" aria-hidden="true" />
                <p>아이콘을 클릭하여 권한을 설정하세요</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-center">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 text-sm transition-colors"
              aria-label="카메라 다시 시도"
            >
              다시 시도
            </button>
            {errorType === 'permission' && (
              <button
                onClick={showPermissionHelp}
                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm transition-colors"
                aria-label="카메라 권한 설정 방법 보기"
              >
                설정 방법
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={containerStyle}>
      {/* 비디오 */}
      <video
        ref={videoRef}
        width={width}
        height={height}
        autoPlay
        playsInline
        muted
        className="absolute top-0 left-0 transform scale-x-[-1]"
        style={containerStyle}
      />

      {/* 스켈레톤 캔버스 */}
      {showSkeleton && (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute top-0 left-0 transform scale-x-[-1]"
          style={containerStyle}
        />
      )}

      {/* 로딩 오버레이 */}
      {!isInitialized && hasPermission === null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-center">
            <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
            <p>카메라 초기화 중...</p>
          </div>
        </div>
      )}

      {/* 권한 설정 도움말 모달 */}
      <AlertModal
        isOpen={showHelpModal}
        title="카메라 권한 설정"
        message={helpMessage}
        variant="info"
        onConfirm={() => setShowHelpModal(false)}
      />
    </div>
  );
}

export default WebCamera;
