/**
 * 유틸리티 함수
 * 각도 스무딩, 변환, 추출 등
 *
 * @module angle/utils
 */

import type { JointType } from '@/types/exercise';
import type { Point3D } from './types';
import { jointKalmanFilters } from './filter';

/**
 * 각도 부드럽게 하기 (이동 평균)
 */
export function smoothAngle(
  currentAngle: number,
  previousAngles: number[],
  windowSize: number = 3
): number {
  const allAngles = [...previousAngles.slice(-(windowSize - 1)), currentAngle];
  const sum = allAngles.reduce((a, b) => a + b, 0);
  return sum / allAngles.length;
}

/**
 * Kalman 필터를 사용한 각도 스무딩 (권장)
 */
export function smoothAngleKalman(
  joint: JointType,
  currentAngle: number,
  side: 'left' | 'right' = 'left'
): number {
  return jointKalmanFilters.filter(joint, currentAngle, side);
}

/**
 * 각도 변화율 계산 (도/초)
 */
export function calculateAngularVelocity(
  angle1: number,
  angle2: number,
  timeDeltaMs: number
): number {
  if (timeDeltaMs === 0) return 0;
  const timeDeltaSec = timeDeltaMs / 1000;
  return Math.abs(angle2 - angle1) / timeDeltaSec;
}

/**
 * 랜드마크에서 Point3D 추출
 */
export function extractPoint3D(landmark: {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}): Point3D {
  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z ?? 0,
    visibility: landmark.visibility ?? 0,
  };
}

/**
 * 랜드마크 배열을 Point3D 배열로 변환
 */
export function convertLandmarksToPoints(
  landmarks: { x: number; y: number; z?: number; visibility?: number }[]
): Point3D[] {
  return landmarks.map(extractPoint3D);
}

/**
 * 각도가 범위 내에 있는지 확인
 */
export function isAngleInRange(
  angle: number,
  targetRange: { min: number; max: number },
  tolerance: number = 0
): boolean {
  return angle >= targetRange.min - tolerance && angle <= targetRange.max + tolerance;
}

/**
 * 각도 진행률 계산 (0-100%)
 */
export function calculateAngleProgress(
  currentAngle: number,
  startAngle: number,
  targetAngle: number
): number {
  const totalRange = Math.abs(targetAngle - startAngle);
  if (totalRange === 0) return 0;

  const currentProgress = Math.abs(currentAngle - startAngle);
  const progress = (currentProgress / totalRange) * 100;

  return Math.max(0, Math.min(100, progress));
}
