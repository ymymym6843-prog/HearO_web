/**
 * 손 랜드마크 시각화 유틸리티
 */

import {
  type HandLandmarkPoint,
  type Handedness,
  type FingerName,
  HAND_CONNECTIONS,
  FINGER_TIPS,
} from '@/types/hand';

/** 손 색상 설정 */
const HAND_COLORS = {
  Left: {
    landmark: '#FF6B6B',
    connection: '#FF8E8E',
    highlight: '#FFD93D',
  },
  Right: {
    landmark: '#4ECDC4',
    connection: '#7EDDD6',
    highlight: '#FFD93D',
  },
};

/** 손가락별 색상 */
const FINGER_COLORS: Record<FingerName, string> = {
  thumb: '#FF6B6B',
  index: '#4ECDC4',
  middle: '#45B7D1',
  ring: '#96CEB4',
  pinky: '#FFEAA7',
};

/**
 * 손 랜드마크 그리기 클래스
 */
export class HandDrawer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.width = ctx.canvas.width;
    this.height = ctx.canvas.height;
  }

  /**
   * 캔버스 크기 업데이트
   */
  updateSize(): void {
    this.width = this.ctx.canvas.width;
    this.height = this.ctx.canvas.height;
  }

  /**
   * 손 전체 그리기
   */
  drawHand(
    landmarks: HandLandmarkPoint[],
    handedness: Handedness,
    mirror = true
  ): void {
    const colors = HAND_COLORS[handedness];
    const processed = this.processLandmarks(landmarks, mirror);

    // 연결선 그리기
    this.drawConnections(processed, colors.connection);

    // 랜드마크 점 그리기
    this.drawLandmarks(processed, colors.landmark);
  }

  /**
   * 손가락별 색상으로 그리기
   * @param baseColor - 기본 색상 (제공시 모든 손가락에 동일 색상 적용)
   */
  drawHandWithFingerColors(
    landmarks: HandLandmarkPoint[],
    mirror = true,
    baseColor?: string
  ): void {
    const processed = this.processLandmarks(landmarks, mirror);

    // 손바닥 연결선 (회색 또는 기본색상의 어두운 버전)
    this.drawPalmConnections(processed, baseColor);

    // 각 손가락별로 그리기
    this.drawFinger(processed, 'thumb', baseColor || FINGER_COLORS.thumb);
    this.drawFinger(processed, 'index', baseColor || FINGER_COLORS.index);
    this.drawFinger(processed, 'middle', baseColor || FINGER_COLORS.middle);
    this.drawFinger(processed, 'ring', baseColor || FINGER_COLORS.ring);
    this.drawFinger(processed, 'pinky', baseColor || FINGER_COLORS.pinky);
  }

  /**
   * 개별 손가락 그리기
   */
  private drawFinger(
    landmarks: HandLandmarkPoint[],
    finger: FingerName,
    color: string
  ): void {
    const fingerIndices = this.getFingerIndices(finger);

    // 손목에서 MCP로 연결
    this.drawLine(landmarks[0], landmarks[fingerIndices[0]], color, 2);

    // 손가락 관절들 연결
    for (let i = 0; i < fingerIndices.length - 1; i++) {
      this.drawLine(
        landmarks[fingerIndices[i]],
        landmarks[fingerIndices[i + 1]],
        color,
        2
      );
    }

    // 관절 점 그리기
    fingerIndices.forEach((idx, i) => {
      const radius = i === fingerIndices.length - 1 ? 6 : 4; // TIP은 더 크게
      this.drawPoint(landmarks[idx], color, radius);
    });
  }

  /**
   * 손가락 인덱스 배열 반환
   */
  private getFingerIndices(finger: FingerName): number[] {
    switch (finger) {
      case 'thumb':
        return [1, 2, 3, 4];
      case 'index':
        return [5, 6, 7, 8];
      case 'middle':
        return [9, 10, 11, 12];
      case 'ring':
        return [13, 14, 15, 16];
      case 'pinky':
        return [17, 18, 19, 20];
    }
  }

  /**
   * 손바닥 연결선 그리기
   */
  private drawPalmConnections(landmarks: HandLandmarkPoint[], baseColor?: string): void {
    const palmColor = baseColor ? this.darkenColor(baseColor, 0.5) : '#666666';
    // MCP 관절들 연결
    this.drawLine(landmarks[5], landmarks[9], palmColor, 1);
    this.drawLine(landmarks[9], landmarks[13], palmColor, 1);
    this.drawLine(landmarks[13], landmarks[17], palmColor, 1);
    // 손목
    this.drawPoint(landmarks[0], baseColor || '#FFFFFF', 5);
  }

  /**
   * 색상 어둡게
   */
  private darkenColor(color: string, factor: number): string {
    // HEX 색상을 어둡게
    const hex = color.replace('#', '');
    const r = Math.floor(parseInt(hex.substring(0, 2), 16) * factor);
    const g = Math.floor(parseInt(hex.substring(2, 4), 16) * factor);
    const b = Math.floor(parseInt(hex.substring(4, 6), 16) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * 연결선 그리기
   */
  private drawConnections(
    landmarks: HandLandmarkPoint[],
    color: string
  ): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;

    HAND_CONNECTIONS.forEach(([start, end]) => {
      const p1 = landmarks[start];
      const p2 = landmarks[end];

      this.ctx.beginPath();
      this.ctx.moveTo(p1.x * this.width, p1.y * this.height);
      this.ctx.lineTo(p2.x * this.width, p2.y * this.height);
      this.ctx.stroke();
    });
  }

  /**
   * 랜드마크 점 그리기
   */
  private drawLandmarks(
    landmarks: HandLandmarkPoint[],
    color: string
  ): void {
    landmarks.forEach((lm, index) => {
      // TIP은 더 크게, 손목은 가장 크게
      let radius = 4;
      if (index === 0) radius = 6;
      else if ([4, 8, 12, 16, 20].includes(index)) radius = 5;

      this.drawPoint(lm, color, radius);
    });
  }

  /**
   * 단일 점 그리기
   */
  private drawPoint(
    point: HandLandmarkPoint,
    color: string,
    radius: number
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(
      point.x * this.width,
      point.y * this.height,
      radius,
      0,
      2 * Math.PI
    );
    this.ctx.fill();

    // 테두리
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  /**
   * 두 점 사이 선 그리기
   */
  private drawLine(
    p1: HandLandmarkPoint,
    p2: HandLandmarkPoint,
    color: string,
    lineWidth: number
  ): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(p1.x * this.width, p1.y * this.height);
    this.ctx.lineTo(p2.x * this.width, p2.y * this.height);
    this.ctx.stroke();
  }

  /**
   * 엄지-손가락 터치 시각화
   */
  drawThumbTouch(
    landmarks: HandLandmarkPoint[],
    targetFinger: FingerName,
    isClose: boolean,
    mirror = true
  ): void {
    const processed = this.processLandmarks(landmarks, mirror);
    const thumbTip = processed[FINGER_TIPS.thumb];
    const fingerTip = processed[FINGER_TIPS[targetFinger]];

    // 엄지와 대상 손가락 TIP 연결선
    const color = isClose ? '#00FF00' : '#FFFF00';
    this.ctx.setLineDash([5, 5]);
    this.drawLine(thumbTip, fingerTip, color, 2);
    this.ctx.setLineDash([]);

    // 강조 원
    if (isClose) {
      this.ctx.strokeStyle = '#00FF00';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      const midX = ((thumbTip.x + fingerTip.x) / 2) * this.width;
      const midY = ((thumbTip.y + fingerTip.y) / 2) * this.height;
      this.ctx.arc(midX, midY, 15, 0, 2 * Math.PI);
      this.ctx.stroke();
    }
  }

  /**
   * 진행 상태 바 그리기
   */
  drawProgressBar(
    current: number,
    total: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const progress = current / total;

    // 배경
    this.ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
    this.ctx.fillRect(x, y, width, height);

    // 진행 바
    this.ctx.fillStyle = '#4ECDC4';
    this.ctx.fillRect(x, y, width * progress, height);

    // 테두리
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);

    // 텍스트
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${current}/${total}`, x + width / 2, y + height / 2 + 5);
  }

  /**
   * 거울 모드 처리
   */
  private processLandmarks(
    landmarks: HandLandmarkPoint[],
    mirror: boolean
  ): HandLandmarkPoint[] {
    if (!mirror) return landmarks;
    return landmarks.map((lm) => ({ ...lm, x: 1 - lm.x }));
  }

  /**
   * 캔버스 클리어
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * 텍스트 그리기
   */
  drawText(
    text: string,
    x: number,
    y: number,
    color = '#FFFFFF',
    fontSize = 16
  ): void {
    this.ctx.font = `bold ${fontSize}px Arial`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'left';
    this.ctx.fillText(text, x, y);
  }
}
