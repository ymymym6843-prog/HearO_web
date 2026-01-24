/**
 * useMediaPipeWorker - Web Worker 기반 MediaPipe 후처리
 *
 * 메인 스레드: 비디오 캡처 + Three.js 렌더링
 * Worker: 랜드마크 필터링 + 노이즈 제거
 *
 * 이 훅은 MediaPipe 결과를 받아 Worker에서 필터링 후 반환
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Landmark } from '@/types/pose';

// ============================================
// Types
// ============================================

interface WorkerConfig {
  enablePose: boolean;
  enableHands: boolean;
  modelComplexity: 0 | 1 | 2;
  smoothLandmarks: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
}

interface FilteredResult {
  poseLandmarks: Landmark[] | null;
  worldLandmarks: Landmark[] | null;
  handLandmarks: {
    left: Landmark[] | null;
    right: Landmark[] | null;
  };
  confidence: number;
  fps: number;
}

interface UseMediaPipeWorkerOptions {
  enabled?: boolean;
  config?: Partial<WorkerConfig>;
  onPerformanceUpdate?: (fps: number) => void;
}

// ============================================
// 기본 설정
// ============================================

const DEFAULT_CONFIG: WorkerConfig = {
  enablePose: true,
  enableHands: false,
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

// ============================================
// Hook
// ============================================

export function useMediaPipeWorker(options: UseMediaPipeWorkerOptions = {}) {
  const { enabled = true, config = {}, onPerformanceUpdate } = options;

  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [result, setResult] = useState<FilteredResult>({
    poseLandmarks: null,
    worldLandmarks: null,
    handLandmarks: { left: null, right: null },
    confidence: 0,
    fps: 0,
  });

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Worker 초기화
  useEffect(() => {
    if (!enabled) {
      setIsReady(false);
      return;
    }

    // Web Worker 지원 확인
    if (typeof Worker === 'undefined') {
      console.warn('[useMediaPipeWorker] Web Workers not supported');
      setIsReady(false);
      return;
    }

    try {
      // Worker 생성 (Webpack/Next.js 번들링 대응)
      workerRef.current = new Worker(
        new URL('../workers/mediapipe.worker.ts', import.meta.url)
      );

      // 메시지 핸들러
      workerRef.current.onmessage = (event) => {
        const { type, payload } = event.data;

        switch (type) {
          case 'INITIALIZED':
            setIsReady(true);
            console.log('[useMediaPipeWorker] Worker initialized');
            break;

          case 'POSE_RESULT':
            setResult((prev) => ({
              ...prev,
              poseLandmarks: payload.poseLandmarks,
              worldLandmarks: payload.worldLandmarks,
              confidence: payload.confidence,
            }));
            break;

          case 'HAND_RESULT':
            setResult((prev) => ({
              ...prev,
              handLandmarks: {
                left: payload.left || null,
                right: payload.right || null,
              },
            }));
            break;

          case 'PERFORMANCE':
            setResult((prev) => ({ ...prev, fps: payload.fps }));
            onPerformanceUpdate?.(payload.fps);
            break;

          case 'ERROR':
            console.error('[useMediaPipeWorker] Worker error:', payload.message);
            break;
        }
      };

      // 에러 핸들러
      workerRef.current.onerror = (error) => {
        console.error('[useMediaPipeWorker] Worker error:', error);
        setIsReady(false);
      };

      // 초기화 메시지 전송
      workerRef.current.postMessage({
        type: 'INIT',
        payload: mergedConfig,
      });
    } catch (error) {
      console.error('[useMediaPipeWorker] Failed to create worker:', error);
      setIsReady(false);
    }

    // 클린업
    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'TERMINATE' });
        workerRef.current.terminate();
        workerRef.current = null;
        setIsReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // mergedConfig 제외 (무한 루프 방지)

  // 설정 업데이트
  useEffect(() => {
    if (workerRef.current && isReady) {
      workerRef.current.postMessage({
        type: 'UPDATE_CONFIG',
        payload: mergedConfig,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedConfig.enablePose, mergedConfig.enableHands, mergedConfig.smoothLandmarks, isReady]);

  /**
   * 프레임 데이터 전송 (필터링 요청)
   */
  const processFrame = useCallback(
    (data: {
      poseLandmarks?: Landmark[];
      worldLandmarks?: Landmark[];
      leftHand?: Landmark[];
      rightHand?: Landmark[];
    }) => {
      if (!workerRef.current || !isReady) return;

      workerRef.current.postMessage({
        type: 'PROCESS_FRAME',
        payload: {
          ...data,
          timestamp: performance.now(),
        },
      });
    },
    [isReady]
  );

  /**
   * Worker 없이 직접 필터링 (fallback)
   */
  const processFallback = useCallback(
    (data: {
      poseLandmarks?: Landmark[];
      worldLandmarks?: Landmark[];
      leftHand?: Landmark[];
      rightHand?: Landmark[];
    }) => {
      // Worker 없을 때 그대로 반환
      setResult((prev) => ({
        ...prev,
        poseLandmarks: data.poseLandmarks || null,
        worldLandmarks: data.worldLandmarks || null,
        handLandmarks: {
          left: data.leftHand || null,
          right: data.rightHand || null,
        },
        confidence: data.poseLandmarks
          ? data.poseLandmarks.reduce((sum, lm) => sum + (lm.visibility ?? 1), 0) /
            data.poseLandmarks.length
          : 0,
      }));
    },
    []
  );

  return {
    isReady,
    result,
    processFrame: isReady ? processFrame : processFallback,
    updateConfig: (newConfig: Partial<WorkerConfig>) => {
      if (workerRef.current && isReady) {
        workerRef.current.postMessage({
          type: 'UPDATE_CONFIG',
          payload: newConfig,
        });
      }
    },
  };
}

export default useMediaPipeWorker;
