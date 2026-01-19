/**
 * 관절 각도 계산
 * 특정 관절의 각도 및 척추 기울기 계산
 *
 * @module angle/joint
 */

import type { JointType } from '@/types/exercise';
import { PoseLandmark } from '@/types/pose';
import type { Point3D, AngleResult } from './types';
import { JOINT_LANDMARKS } from './constants';
import { calculate3DAngle } from './core';

/**
 * 특정 관절의 각도 계산
 */
export function calculateJointAngle(
  landmarks: Point3D[],
  joint: JointType,
  side: 'left' | 'right' = 'left'
): AngleResult | null {
  const jointConfig = JOINT_LANDMARKS[joint];
  if (!jointConfig) return null;

  // 좌/우에 따른 랜드마크 선택
  let proximalIdx: number;
  let vertexIdx: number;
  let distalIdx: number;

  if (side === 'left') {
    proximalIdx = jointConfig.proximal;
    vertexIdx = jointConfig.vertex;
    distalIdx = jointConfig.distal;
  } else {
    // Right side: 랜드마크 인덱스 +1 (MediaPipe 규칙)
    proximalIdx = jointConfig.altProximal ?? jointConfig.proximal + 1;
    vertexIdx = jointConfig.vertex + 1;
    distalIdx = jointConfig.altDistal ?? jointConfig.distal + 1;
  }

  // 랜드마크 가져오기
  const p1 = landmarks[proximalIdx];
  const p2 = landmarks[vertexIdx];
  const p3 = landmarks[distalIdx];

  if (!p1 || !p2 || !p3) return null;

  // 신뢰도 계산 (가시성 평균)
  const visibility1 = p1.visibility ?? 0;
  const visibility2 = p2.visibility ?? 0;
  const visibility3 = p3.visibility ?? 0;
  const confidence = (visibility1 + visibility2 + visibility3) / 3;

  // 각도 계산
  const angle = calculate3DAngle(p1, p2, p3);

  return {
    angle,
    confidence,
    joint,
    timestamp: Date.now(),
  };
}

/**
 * 척추 기울기 계산 (특수 처리)
 */
export function calculateSpineAngle(landmarks: Point3D[]): AngleResult | null {
  // 어깨 중심점
  const leftShoulder = landmarks[PoseLandmark.LEFT_SHOULDER];
  const rightShoulder = landmarks[PoseLandmark.RIGHT_SHOULDER];

  // 골반 중심점
  const leftHip = landmarks[PoseLandmark.LEFT_HIP];
  const rightHip = landmarks[PoseLandmark.RIGHT_HIP];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return null;

  // 중심점 계산
  const shoulderCenter: Point3D = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: (leftShoulder.z + rightShoulder.z) / 2,
    visibility: Math.min(leftShoulder.visibility ?? 0, rightShoulder.visibility ?? 0),
  };

  const hipCenter: Point3D = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: (leftHip.z + rightHip.z) / 2,
    visibility: Math.min(leftHip.visibility ?? 0, rightHip.visibility ?? 0),
  };

  // 수직선 기준점 (골반 중심 위쪽)
  const verticalReference: Point3D = {
    x: hipCenter.x,
    y: hipCenter.y - 1,
    z: hipCenter.z,
    visibility: 1,
  };

  // 기울기 각도 계산
  const angle = calculate3DAngle(verticalReference, hipCenter, shoulderCenter);

  const confidence = Math.min(
    shoulderCenter.visibility ?? 0,
    hipCenter.visibility ?? 0
  );

  return {
    angle,
    confidence,
    joint: 'spine',
    timestamp: Date.now(),
  };
}
