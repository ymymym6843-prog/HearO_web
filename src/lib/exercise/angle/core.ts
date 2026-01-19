/**
 * 핵심 각도 계산 함수
 * 3D, 2D, 측면 각도 계산
 *
 * @module angle/core
 */

import type { Point2D, Point3D } from './types';
import { RAD_TO_DEG } from './constants';

/**
 * 3D 각도 계산 (도 단위) - 인라인 최적화 버전
 * p2가 정점(vertex), p1→p2와 p2→p3 사이 각도
 *
 * @param p1 근위부 (시작점)
 * @param p2 정점 (관절)
 * @param p3 원위부 (끝점)
 * @returns 각도 (0-180도)
 */
export function calculate3DAngle(p1: Point3D, p2: Point3D, p3: Point3D): number {
  // 벡터 계산 인라인화: p2 → p1, p2 → p3
  const v1x = p1.x - p2.x;
  const v1y = p1.y - p2.y;
  const v1z = p1.z - p2.z;
  const v2x = p3.x - p2.x;
  const v2y = p3.y - p2.y;
  const v2z = p3.z - p2.z;

  // 벡터 크기 인라인화
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);

  // 크기가 0인 경우 처리
  if (mag1 === 0 || mag2 === 0) return 0;

  // 내적 인라인화 + 각도 계산
  const dot = v1x * v2x + v1y * v2y + v1z * v2z;
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));

  // 라디안 → 도 변환 (상수 사용)
  return Math.acos(cosAngle) * RAD_TO_DEG;
}

/**
 * 2D 각도 계산 (Z축 무시) - 인라인 최적화 버전
 * 카메라가 정면일 때 사용
 */
export function calculate2DAngle(p1: Point2D | Point3D, p2: Point2D | Point3D, p3: Point2D | Point3D): number {
  // 2D 벡터 계산 (Z축 제외)
  const v1x = p1.x - p2.x;
  const v1y = p1.y - p2.y;
  const v2x = p3.x - p2.x;
  const v2y = p3.y - p2.y;

  // 2D 벡터 크기
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

  if (mag1 === 0 || mag2 === 0) return 0;

  // 2D 내적 + 각도 계산
  const dot = v1x * v2x + v1y * v2y;
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));

  return Math.acos(cosAngle) * RAD_TO_DEG;
}

/**
 * 측면 각도 계산 (X축 무시) - 인라인 최적화 버전
 * 카메라가 측면일 때 사용 (Y-Z 평면)
 */
export function calculateSideAngle(p1: Point3D, p2: Point3D, p3: Point3D): number {
  // Y-Z 평면 벡터 계산 (X축 제외)
  const v1y = p1.y - p2.y;
  const v1z = p1.z - p2.z;
  const v2y = p3.y - p2.y;
  const v2z = p3.z - p2.z;

  // 2D 벡터 크기 (Y-Z 평면)
  const mag1 = Math.sqrt(v1y * v1y + v1z * v1z);
  const mag2 = Math.sqrt(v2y * v2y + v2z * v2z);

  if (mag1 === 0 || mag2 === 0) return 0;

  // 2D 내적 (Y-Z 평면) + 각도 계산
  const dot = v1y * v2y + v1z * v2z;
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));

  return Math.acos(cosAngle) * RAD_TO_DEG;
}
