/**
 * Snapshot Service
 *
 * 3D 씬 캡처 + 2D UI 합성 파이프라인
 *
 * Phase 4 (에필로그)에서 사용:
 * 1. 운동 중 최적의 순간 캡처
 * 2. 3D 캔버스 스크린샷
 * 3. 2D NPC 칭찬 UI 합성
 * 4. 개인 스토리북 저장
 */

import type { SnapshotMetadata, SnapshotResult } from '@/types/phase';

// ============================================
// Types
// ============================================

interface CanvasCaptureOptions {
  /** 캡처 너비 */
  width?: number;
  /** 캡처 높이 */
  height?: number;
  /** 이미지 포맷 */
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** JPEG/WebP 품질 (0-1) */
  quality?: number;
  /** 배경 투명 여부 */
  transparent?: boolean;
}

interface CompositionLayer {
  /** 레이어 타입 */
  type: 'image' | 'text' | 'shape';
  /** 소스 (이미지 URL 또는 base64) */
  src?: string;
  /** 텍스트 내용 */
  text?: string;
  /** 위치 (x, y) */
  position: { x: number; y: number };
  /** 크기 */
  size?: { width: number; height: number };
  /** 스타일 */
  style?: {
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    opacity?: number;
    borderRadius?: number;
    backgroundColor?: string;
    shadow?: string;
  };
  /** Z 인덱스 */
  zIndex?: number;
}

interface CompositionOptions {
  /** 기본 캔버스 크기 */
  width: number;
  height: number;
  /** 배경색 */
  backgroundColor?: string;
  /** 레이어 목록 */
  layers: CompositionLayer[];
}

// ============================================
// 상수
// ============================================

const DEFAULT_CAPTURE_OPTIONS: CanvasCaptureOptions = {
  width: 1080,
  height: 1920, // 9:16 세로 비율 (스토리용)
  format: 'image/png',
  quality: 0.92,
  transparent: false,
};

// ============================================
// Canvas 캡처
// ============================================

/**
 * Three.js 캔버스 캡처
 */
export async function captureCanvas(
  canvas: HTMLCanvasElement,
  options: CanvasCaptureOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_CAPTURE_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    try {
      // 캔버스가 preserveDrawingBuffer를 지원해야 함
      const dataUrl = canvas.toDataURL(opts.format, opts.quality);
      resolve(dataUrl);
    } catch (error) {
      // WebGL 보안 제한 등으로 실패할 수 있음
      console.error('[SnapshotService] Canvas capture failed:', error);
      reject(error);
    }
  });
}

/**
 * 리사이즈된 캡처
 */
export async function captureCanvasResized(
  canvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  options: CanvasCaptureOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_CAPTURE_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    try {
      // 임시 캔버스 생성
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = targetWidth;
      tempCanvas.height = targetHeight;

      const ctx = tempCanvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D context'));
        return;
      }

      // 배경 채우기
      if (!opts.transparent) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      // 원본 캔버스를 중앙에 맞춰 그리기
      const sourceAspect = canvas.width / canvas.height;
      const targetAspect = targetWidth / targetHeight;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (sourceAspect > targetAspect) {
        // 원본이 더 넓음 → 높이 맞춤
        drawHeight = targetHeight;
        drawWidth = targetHeight * sourceAspect;
        offsetX = (targetWidth - drawWidth) / 2;
        offsetY = 0;
      } else {
        // 원본이 더 좁음 → 너비 맞춤
        drawWidth = targetWidth;
        drawHeight = targetWidth / sourceAspect;
        offsetX = 0;
        offsetY = (targetHeight - drawHeight) / 2;
      }

      ctx.drawImage(canvas, offsetX, offsetY, drawWidth, drawHeight);

      const dataUrl = tempCanvas.toDataURL(opts.format, opts.quality);
      resolve(dataUrl);
    } catch (error) {
      console.error('[SnapshotService] Resized capture failed:', error);
      reject(error);
    }
  });
}

// ============================================
// 이미지 합성
// ============================================

/**
 * 레이어 합성
 */
export async function composeImage(options: CompositionOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = options.width;
    canvas.height = options.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Failed to get 2D context'));
      return;
    }

    // 배경
    if (options.backgroundColor) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, options.width, options.height);
    }

    // 레이어 정렬 (zIndex 순)
    const sortedLayers = [...options.layers].sort(
      (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
    );

    // 레이어 순차 처리
    const processLayers = async () => {
      for (const layer of sortedLayers) {
        await drawLayer(ctx, layer);
      }
    };

    processLayers()
      .then(() => {
        const dataUrl = canvas.toDataURL('image/png', 0.92);
        resolve(dataUrl);
      })
      .catch(reject);
  });
}

/**
 * 개별 레이어 그리기
 */
async function drawLayer(
  ctx: CanvasRenderingContext2D,
  layer: CompositionLayer
): Promise<void> {
  const { type, position, size, style } = layer;

  // 투명도 설정
  if (style?.opacity !== undefined) {
    ctx.globalAlpha = style.opacity;
  }

  switch (type) {
    case 'image':
      if (layer.src) {
        await drawImage(ctx, layer.src, position, size);
      }
      break;

    case 'text':
      if (layer.text) {
        drawText(ctx, layer.text, position, style);
      }
      break;

    case 'shape':
      drawShape(ctx, position, size, style);
      break;
  }

  // 투명도 리셋
  ctx.globalAlpha = 1;
}

/**
 * 이미지 레이어 그리기
 */
async function drawImage(
  ctx: CanvasRenderingContext2D,
  src: string,
  position: { x: number; y: number },
  size?: { width: number; height: number }
): Promise<void> {
  return new Promise((resolve, _reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const w = size?.width || img.width;
      const h = size?.height || img.height;
      ctx.drawImage(img, position.x, position.y, w, h);
      resolve();
    };

    img.onerror = () => {
      console.warn('[SnapshotService] Failed to load image:', src);
      resolve(); // 실패해도 계속 진행
    };

    img.src = src;
  });
}

/**
 * 텍스트 레이어 그리기
 */
function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  position: { x: number; y: number },
  style?: CompositionLayer['style']
): void {
  ctx.font = `${style?.fontWeight || 'normal'} ${style?.fontSize || 24}px ${
    style?.fontFamily || 'sans-serif'
  }`;
  ctx.fillStyle = style?.color || '#ffffff';

  // 그림자
  if (style?.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }

  ctx.fillText(text, position.x, position.y);

  // 그림자 리셋
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

/**
 * 도형 레이어 그리기
 */
function drawShape(
  ctx: CanvasRenderingContext2D,
  position: { x: number; y: number },
  size?: { width: number; height: number },
  style?: CompositionLayer['style']
): void {
  const w = size?.width || 100;
  const h = size?.height || 50;
  const radius = style?.borderRadius || 0;

  ctx.fillStyle = style?.backgroundColor || '#000000';

  if (radius > 0) {
    // 둥근 모서리 사각형
    ctx.beginPath();
    ctx.roundRect(position.x, position.y, w, h, radius);
    ctx.fill();
  } else {
    ctx.fillRect(position.x, position.y, w, h);
  }
}

// ============================================
// 스냅샷 생성 파이프라인
// ============================================

/**
 * 전체 스냅샷 생성
 */
export async function createSnapshot(
  threeCanvas: HTMLCanvasElement,
  metadata: Omit<SnapshotMetadata, 'timestamp'>,
  npcOverlay?: {
    imageSrc: string;
    message: string;
    color: string;
  }
): Promise<SnapshotResult> {
  // 1. 3D 캔버스 캡처
  const canvasImage = await captureCanvasResized(threeCanvas, 1080, 1920);

  // 2. 합성 레이어 구성
  const layers: CompositionLayer[] = [
    // 기본 3D 씬
    {
      type: 'image',
      src: canvasImage,
      position: { x: 0, y: 0 },
      size: { width: 1080, height: 1920 },
      zIndex: 0,
    },
  ];

  // NPC 오버레이 추가
  if (npcOverlay) {
    // NPC 이미지
    layers.push({
      type: 'image',
      src: npcOverlay.imageSrc,
      position: { x: 50, y: 1400 },
      size: { width: 150, height: 200 },
      zIndex: 1,
    });

    // 메시지 박스
    layers.push({
      type: 'shape',
      position: { x: 220, y: 1500 },
      size: { width: 800, height: 120 },
      style: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 16,
      },
      zIndex: 2,
    });

    // 메시지 텍스트
    layers.push({
      type: 'text',
      text: npcOverlay.message,
      position: { x: 250, y: 1570 },
      style: {
        color: '#ffffff',
        fontSize: 32,
        fontWeight: 'bold',
        shadow: 'true',
      },
      zIndex: 3,
    });
  }

  // 워터마크
  layers.push({
    type: 'text',
    text: 'HearO',
    position: { x: 950, y: 1880 },
    style: {
      color: 'rgba(255,255,255,0.5)',
      fontSize: 24,
    },
    zIndex: 10,
  });

  // 3. 최종 합성
  const composedImage = await composeImage({
    width: 1080,
    height: 1920,
    layers,
  });

  return {
    canvasImage,
    composedImage,
    metadata: {
      ...metadata,
      timestamp: Date.now(),
    },
  };
}

/**
 * 스냅샷 다운로드
 */
export function downloadSnapshot(result: SnapshotResult, filename?: string): void {
  const link = document.createElement('a');
  link.download = filename || `hearo_${result.metadata.timestamp}.png`;
  link.href = result.composedImage;
  link.click();
}

/**
 * 스냅샷 공유 (Web Share API)
 */
export async function shareSnapshot(result: SnapshotResult): Promise<boolean> {
  if (!navigator.share) {
    console.warn('[SnapshotService] Web Share API not supported');
    return false;
  }

  try {
    // Data URL을 Blob으로 변환
    const response = await fetch(result.composedImage);
    const blob = await response.blob();
    const file = new File([blob], `hearo_${result.metadata.timestamp}.png`, {
      type: 'image/png',
    });

    await navigator.share({
      title: 'HearO 운동 결과',
      text: `${result.metadata.exerciseType} 운동 완료! 등급: ${result.metadata.performanceRating}`,
      files: [file],
    });

    return true;
  } catch (error) {
    console.error('[SnapshotService] Share failed:', error);
    return false;
  }
}

const snapshotService = {
  captureCanvas,
  captureCanvasResized,
  composeImage,
  createSnapshot,
  downloadSnapshot,
  shareSnapshot,
};

export default snapshotService;
