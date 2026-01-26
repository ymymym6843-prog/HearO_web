/**
 * 운동 감지 유틸리티 함수
 * MVP 개선: MovingAverageFilter, 신뢰도 임계값 상수
 */

import type { Landmark } from '@/types/pose';
import { calculateHybridAngle } from '@/lib/calibration/depthCorrection';

// MVP 상수
export const VISIBILITY_THRESHOLD = 0.4; // 신뢰도 임계값 (0.6→0.4: 조명/각도 관대하게)
export const FRAME_HOLD_THRESHOLD = 2;   // 상태 전환 전 프레임 유지 횟수 (3→2: 30fps 기준 ~67ms)
export const ANGLE_SMOOTHING_WINDOW = 5; // 각도 스무딩 윈도우 크기

/**
 * 이동 평균 필터 (Moving Average Filter)
 * 노이즈 감소 및 각도 스무딩용
 */
export class MovingAverageFilter {
  private values: number[] = [];
  private readonly windowSize: number;

  constructor(windowSize: number = ANGLE_SMOOTHING_WINDOW) {
    this.windowSize = windowSize;
  }

  /**
   * 새 값 추가 및 평균 반환
   */
  add(value: number): number {
    this.values.push(value);
    if (this.values.length > this.windowSize) {
      this.values.shift();
    }
    return this.getAverage();
  }

  /**
   * 현재 평균값
   */
  getAverage(): number {
    if (this.values.length === 0) return 0;
    return this.values.reduce((a, b) => a + b, 0) / this.values.length;
  }

  /**
   * 필터 리셋
   */
  reset(): void {
    this.values = [];
  }

  /**
   * 충분한 데이터가 있는지 확인
   */
  isStable(): boolean {
    return this.values.length >= this.windowSize;
  }
}

// 관절 인덱스 타입
export interface JointIndices {
  p1: number;  // 첫 번째 점 (예: 어깨)
  p2: number;  // 중심점 (예: 팔꿈치)
  p3: number;  // 세 번째 점 (예: 손목)
}

// 각도 계산 결과
export interface AngleResult {
  angle: number;
  confidence: number;
}

/**
 * 세 점을 이용한 관절 각도 계산
 * MediaPipe 랜드마크 인덱스를 기반으로 각도 계산
 */
export function calculateJointAngle(
  landmarks: Landmark[],
  indices: JointIndices
): AngleResult | null {
  const p1 = landmarks[indices.p1];
  const p2 = landmarks[indices.p2];
  const p3 = landmarks[indices.p3];

  if (!p1 || !p2 || !p3) return null;

  const result = calculateHybridAngle(p1, p2, p3);
  return {
    angle: result.angle,
    confidence: result.confidence,
  };
}

/**
 * 각도 범위 내 여부 확인
 */
export function isAngleInRange(
  angle: number,
  min: number,
  max: number
): boolean {
  return angle >= min && angle <= max;
}

/**
 * 각도 진행률 계산 (0-1)
 */
export function calculateAngleProgress(
  currentAngle: number,
  startAngle: number,
  targetAngle: number
): number {
  const totalRange = Math.abs(targetAngle - startAngle);
  if (totalRange === 0) return 0;

  const currentProgress = Math.abs(currentAngle - startAngle);
  return Math.min(1, Math.max(0, currentProgress / totalRange));
}

/**
 * 랜드마크 신뢰도 평균 계산
 */
export function calculateLandmarkConfidence(
  landmarks: Landmark[],
  indices: number[]
): number {
  let totalVisibility = 0;
  let count = 0;

  for (const idx of indices) {
    const landmark = landmarks[idx];
    if (landmark && typeof landmark.visibility === 'number') {
      totalVisibility += landmark.visibility;
      count++;
    }
  }

  return count > 0 ? totalVisibility / count : 0;
}
