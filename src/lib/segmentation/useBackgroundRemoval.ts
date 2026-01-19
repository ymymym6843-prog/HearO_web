/**
 * 배경 분리 훅
 * MediaPipe Selfie Segmentation을 사용한 실시간 배경 제거
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { SelfieSegmentation, Results } from '@mediapipe/selfie_segmentation';
import { createLogger } from '@/lib/logger';

const logger = createLogger('BackgroundRemoval');

interface UseBackgroundRemovalOptions {
  enabled: boolean;
  customBackground?: string | null;
  modelSelection?: 0 | 1; // 0: general, 1: landscape (wider FOV)
}

interface UseBackgroundRemovalReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  processFrame: (video: HTMLVideoElement) => void;
  isReady: boolean;
  error: string | null;
}

export function useBackgroundRemoval({
  enabled,
  customBackground = null,
  modelSelection = 0,
}: UseBackgroundRemovalOptions): UseBackgroundRemovalReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const segmenterRef = useRef<SelfieSegmentation | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 배경 이미지 로드
  useEffect(() => {
    if (customBackground) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        backgroundImageRef.current = img;
        logger.info('배경 이미지 로드 완료');
      };
      img.onerror = () => {
        logger.warn('배경 이미지 로드 실패, 블러 배경 사용');
        backgroundImageRef.current = null;
      };
      img.src = customBackground;
    } else {
      backgroundImageRef.current = null;
    }
  }, [customBackground]);

  // Segmentation 초기화
  useEffect(() => {
    if (!enabled) {
      segmenterRef.current = null;
      setIsReady(false);
      return;
    }

    const initSegmenter = async () => {
      try {
        const segmenter = new SelfieSegmentation({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
        });

        segmenter.setOptions({
          modelSelection,
          selfieMode: true,
        });

        segmenter.onResults((results: Results) => {
          renderWithBackground(results);
        });

        await segmenter.initialize();
        segmenterRef.current = segmenter;
        setIsReady(true);
        setError(null);
        logger.info('배경 분리 초기화 완료');
      } catch (err) {
        const message = err instanceof Error ? err.message : '초기화 실패';
        setError(message);
        logger.error('배경 분리 초기화 실패', err);
      }
    };

    initSegmenter();

    return () => {
      segmenterRef.current?.close();
      segmenterRef.current = null;
    };
  }, [enabled, modelSelection]);

  // 배경 합성 렌더링
  const renderWithBackground = useCallback((results: Results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // 원본 이미지 그리기
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // 배경 그리기 (커스텀 이미지 또는 블러)
    if (backgroundImageRef.current) {
      // 커스텀 배경 이미지
      ctx.drawImage(backgroundImageRef.current, 0, 0, width, height);
    } else {
      // 기본: 반투명 그라데이션 배경
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // 세그멘테이션 마스크 적용
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(results.segmentationMask, 0, 0, width, height);

    // 원본 이미지를 마스크 영역에 그리기
    ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(results.image, 0, 0, width, height);

    ctx.restore();
  }, []);

  // 프레임 처리
  const processFrame = useCallback(async (video: HTMLVideoElement) => {
    if (!enabled || !segmenterRef.current || !isReady) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // 캔버스 크기 맞추기
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    try {
      await segmenterRef.current.send({ image: video });
    } catch (err) {
      // 프레임 드롭은 정상적인 현상
    }
  }, [enabled, isReady]);

  return {
    canvasRef,
    processFrame,
    isReady,
    error,
  };
}

export default useBackgroundRemoval;
