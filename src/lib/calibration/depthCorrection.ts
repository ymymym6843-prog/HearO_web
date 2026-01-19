/**
 * 깊이 보정 모듈
 * 2D 각도 계산의 카메라 각도 의존성 문제 해결
 *
 * 문제: 기존 2D 각도 계산은 Z축(깊이)를 무시하여 카메라 각도에 민감함
 * 해결: Z축 값을 가중치로 사용하여 각도 보정
 */

import type { Landmark } from '@/types/pose';

// 깊이 보정 파라미터
export const DEPTH_CORRECTION_PARAMS = {
  // Z축 값 임계값 (이 값보다 큰 차이가 있으면 깊이 보정 적용)
  zThreshold: 0.1,

  // 깊이 가중치 범위
  minWeight: 0.5,
  maxWeight: 1.0,

  // 정면 기준 Z값 (카메라 방향 기준)
  frontalZ: 0,

  // 깊이 보정 강도 (0-1)
  correctionStrength: 0.7,
} as const;

/**
 * 랜드마크의 깊이 신뢰도 계산
 * Z값이 안정적일수록 높은 신뢰도
 */
export function calculateDepthConfidence(landmarks: Landmark[]): number {
  if (landmarks.length === 0) return 0;

  // Z값의 분산 계산
  const zValues = landmarks.map((lm) => lm.z);
  const avgZ = zValues.reduce((a, b) => a + b, 0) / zValues.length;
  const variance = zValues.reduce((sum, z) => sum + Math.pow(z - avgZ, 2), 0) / zValues.length;

  // 분산이 낮을수록 신뢰도가 높음
  const confidence = Math.max(0, 1 - Math.sqrt(variance) * 5);
  return Math.min(1, confidence);
}

/**
 * 두 점 간의 깊이 차이 기반 가중치 계산
 */
export function calculateDepthWeight(z1: number, z2: number): number {
  const zDiff = Math.abs(z1 - z2);

  if (zDiff < DEPTH_CORRECTION_PARAMS.zThreshold) {
    return DEPTH_CORRECTION_PARAMS.maxWeight;
  }

  // 깊이 차이가 클수록 가중치 감소
  const weight =
    DEPTH_CORRECTION_PARAMS.maxWeight -
    (zDiff - DEPTH_CORRECTION_PARAMS.zThreshold) *
      DEPTH_CORRECTION_PARAMS.correctionStrength;

  return Math.max(DEPTH_CORRECTION_PARAMS.minWeight, weight);
}

/**
 * 깊이 보정된 2D 각도 계산
 * 3개 점으로 각도를 계산하되, Z축 정보로 보정
 */
export function calculate2DAngleWithDepthCorrection(
  point1: Landmark,
  point2: Landmark, // 중심점 (관절)
  point3: Landmark
): { angle: number; confidence: number; depthWeight: number } {
  // 기본 2D 각도 계산
  const vector1 = {
    x: point1.x - point2.x,
    y: point1.y - point2.y,
  };

  const vector2 = {
    x: point3.x - point2.x,
    y: point3.y - point2.y,
  };

  const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
  const magnitude1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2);
  const magnitude2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return { angle: 0, confidence: 0, depthWeight: 0 };
  }

  let cosAngle = dotProduct / (magnitude1 * magnitude2);
  cosAngle = Math.max(-1, Math.min(1, cosAngle));

  const angleRadians = Math.acos(cosAngle);
  const angleDegrees = angleRadians * (180 / Math.PI);

  // 깊이 가중치 계산 (세 점의 Z값 고려)
  const weight1 = calculateDepthWeight(point1.z, point2.z);
  const weight2 = calculateDepthWeight(point2.z, point3.z);
  const avgDepthWeight = (weight1 + weight2) / 2;

  // 신뢰도 계산 (visibility 고려)
  const avgVisibility =
    ((point1.visibility || 0) + (point2.visibility || 0) + (point3.visibility || 0)) / 3;
  const confidence = avgVisibility * avgDepthWeight;

  return {
    angle: angleDegrees,
    confidence,
    depthWeight: avgDepthWeight,
  };
}

/**
 * 3D 각도 계산 (깊이 정보 완전 활용)
 */
export function calculate3DAngle(
  point1: Landmark,
  point2: Landmark,
  point3: Landmark
): { angle: number; confidence: number } {
  const vector1 = {
    x: point1.x - point2.x,
    y: point1.y - point2.y,
    z: point1.z - point2.z,
  };

  const vector2 = {
    x: point3.x - point2.x,
    y: point3.y - point2.y,
    z: point3.z - point2.z,
  };

  const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z;
  const magnitude1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2 + vector1.z ** 2);
  const magnitude2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2 + vector2.z ** 2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return { angle: 0, confidence: 0 };
  }

  let cosAngle = dotProduct / (magnitude1 * magnitude2);
  cosAngle = Math.max(-1, Math.min(1, cosAngle));

  const angleRadians = Math.acos(cosAngle);
  const angleDegrees = angleRadians * (180 / Math.PI);

  // 신뢰도 계산
  const avgVisibility =
    ((point1.visibility || 0) + (point2.visibility || 0) + (point3.visibility || 0)) / 3;

  return {
    angle: angleDegrees,
    confidence: avgVisibility,
  };
}

/**
 * 하이브리드 각도 계산 (2D + 3D 가중 평균)
 * 깊이 정보 신뢰도에 따라 2D/3D 비율 조절
 */
export function calculateHybridAngle(
  point1: Landmark,
  point2: Landmark,
  point3: Landmark
): { angle: number; confidence: number; method: '2D' | '3D' | 'hybrid' } {
  const result2D = calculate2DAngleWithDepthCorrection(point1, point2, point3);
  const result3D = calculate3DAngle(point1, point2, point3);

  // 깊이 신뢰도가 높으면 3D 각도에 더 가중치
  const depthReliability = result2D.depthWeight;

  // 깊이 신뢰도가 0.8 이상이면 3D 주로 사용
  if (depthReliability >= 0.8) {
    return {
      angle: result3D.angle,
      confidence: result3D.confidence,
      method: '3D',
    };
  }

  // 깊이 신뢰도가 0.5 미만이면 2D 주로 사용
  if (depthReliability < 0.5) {
    return {
      angle: result2D.angle,
      confidence: result2D.confidence * 0.8, // 2D만 사용시 신뢰도 약간 감소
      method: '2D',
    };
  }

  // 하이브리드: 가중 평균
  const weight3D = depthReliability;
  const weight2D = 1 - depthReliability;

  const hybridAngle = result2D.angle * weight2D + result3D.angle * weight3D;
  const hybridConfidence = result2D.confidence * weight2D + result3D.confidence * weight3D;

  return {
    angle: hybridAngle,
    confidence: hybridConfidence,
    method: 'hybrid',
  };
}

/**
 * 카메라 방향 감지 (사용자가 정면을 보고 있는지)
 */
export function detectCameraOrientation(
  leftShoulder: Landmark,
  rightShoulder: Landmark
): {
  isFrontal: boolean;
  angle: number;
  confidence: number;
} {
  // 어깨 간 Z값 차이로 정면 여부 판단
  const zDiff = Math.abs(leftShoulder.z - rightShoulder.z);

  // 어깨 간 X값 차이 (정면일 때 X 차이가 있어야 함)
  const xDiff = Math.abs(leftShoulder.x - rightShoulder.x);

  // 정면일 때: Z 차이 작고, X 차이가 충분히 있음
  const isFrontal = zDiff < 0.15 && xDiff > 0.1;

  // 각도 추정 (대략적인 회전 각도)
  const estimatedAngle = Math.atan2(zDiff, xDiff) * (180 / Math.PI);

  // 신뢰도
  const avgVisibility = ((leftShoulder.visibility || 0) + (rightShoulder.visibility || 0)) / 2;

  return {
    isFrontal,
    angle: estimatedAngle,
    confidence: avgVisibility,
  };
}
