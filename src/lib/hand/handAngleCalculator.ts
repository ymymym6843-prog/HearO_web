/**
 * 손가락 각도 계산 유틸리티
 * 각 관절의 굴곡/신전, 벌림/모음 각도 계산
 */

import {
  type HandLandmarkPoint,
  type FingerAngles,
  type FingerName,
  type HandGesture,
  type HandAngles,
  HandLandmark,
  FINGER_TIPS,
} from '@/types/hand';

/** 3D 벡터 */
interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * 두 점 사이 벡터 계산
 */
function getVector(from: HandLandmarkPoint, to: HandLandmarkPoint): Vector3D {
  return {
    x: to.x - from.x,
    y: to.y - from.y,
    z: to.z - from.z,
  };
}

/**
 * 벡터 내적
 */
function dotProduct(v1: Vector3D, v2: Vector3D): number {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

/**
 * 벡터 크기
 */
function magnitude(v: Vector3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * 두 벡터 사이 각도 (라디안)
 */
function angleBetweenVectors(v1: Vector3D, v2: Vector3D): number {
  const dot = dotProduct(v1, v2);
  const mag1 = magnitude(v1);
  const mag2 = magnitude(v2);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle);
}

/**
 * 라디안 → 도
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * 세 점으로 관절 각도 계산
 * @param a 첫 번째 점 (부모 관절)
 * @param b 중간 점 (현재 관절)
 * @param c 마지막 점 (자식 관절)
 * @returns 각도 (도)
 */
export function calculateJointAngle(
  a: HandLandmarkPoint,
  b: HandLandmarkPoint,
  c: HandLandmarkPoint
): number {
  const v1 = getVector(b, a);
  const v2 = getVector(b, c);
  return toDegrees(angleBetweenVectors(v1, v2));
}

/**
 * 손가락 굴곡 각도 계산
 * @param landmarks 21개 손 랜드마크
 * @param finger 손가락 이름
 * @returns 손가락 각도 정보
 */
export function calculateFingerFlexion(
  landmarks: HandLandmarkPoint[],
  finger: FingerName
): FingerAngles | (Omit<FingerAngles, 'dip'> & { ip: number }) {
  const wrist = landmarks[HandLandmark.WRIST];

  if (finger === 'thumb') {
    const cmc = landmarks[HandLandmark.THUMB_CMC];
    const mcp = landmarks[HandLandmark.THUMB_MCP];
    const ip = landmarks[HandLandmark.THUMB_IP];
    const tip = landmarks[HandLandmark.THUMB_TIP];

    const mcpAngle = calculateJointAngle(wrist, cmc, mcp);
    const pipAngle = calculateJointAngle(cmc, mcp, ip);
    const ipAngle = calculateJointAngle(mcp, ip, tip);

    return {
      mcp: mcpAngle,
      pip: pipAngle,
      ip: ipAngle,
      totalFlexion: mcpAngle + pipAngle + ipAngle,
    };
  }

  // 검지, 중지, 약지, 새끼
  const mcpIndex = getFingerMCP(finger);
  const mcp = landmarks[mcpIndex];
  const pip = landmarks[mcpIndex + 1];
  const dip = landmarks[mcpIndex + 2];
  const tip = landmarks[mcpIndex + 3];

  const mcpAngle = calculateJointAngle(wrist, mcp, pip);
  const pipAngle = calculateJointAngle(mcp, pip, dip);
  const dipAngle = calculateJointAngle(pip, dip, tip);

  return {
    mcp: mcpAngle,
    pip: pipAngle,
    dip: dipAngle,
    totalFlexion: mcpAngle + pipAngle + dipAngle,
  };
}

/**
 * 손가락 MCP 인덱스 반환
 */
function getFingerMCP(finger: FingerName): number {
  switch (finger) {
    case 'thumb':
      return HandLandmark.THUMB_CMC;
    case 'index':
      return HandLandmark.INDEX_FINGER_MCP;
    case 'middle':
      return HandLandmark.MIDDLE_FINGER_MCP;
    case 'ring':
      return HandLandmark.RING_FINGER_MCP;
    case 'pinky':
      return HandLandmark.PINKY_MCP;
  }
}

/**
 * 전체 손 각도 계산
 */
export function calculateAllFingerAngles(landmarks: HandLandmarkPoint[]): HandAngles {
  const thumb = calculateFingerFlexion(landmarks, 'thumb') as Omit<FingerAngles, 'dip'> & { ip: number };
  const index = calculateFingerFlexion(landmarks, 'index') as FingerAngles;
  const middle = calculateFingerFlexion(landmarks, 'middle') as FingerAngles;
  const ring = calculateFingerFlexion(landmarks, 'ring') as FingerAngles;
  const pinky = calculateFingerFlexion(landmarks, 'pinky') as FingerAngles;

  // 손목 각도 (간단한 2D 추정)
  const wrist = landmarks[HandLandmark.WRIST];
  const middleMcp = landmarks[HandLandmark.MIDDLE_FINGER_MCP];
  const wristFlexion = calculateWristFlexion(wrist, middleMcp);

  return {
    thumb,
    index,
    middle,
    ring,
    pinky,
    wrist: {
      flexion: wristFlexion,
      deviation: 0, // 추후 구현
    },
  };
}

/**
 * 손목 굴곡 각도 계산 (간단 버전)
 */
function calculateWristFlexion(wrist: HandLandmarkPoint, middleMcp: HandLandmarkPoint): number {
  const dy = middleMcp.y - wrist.y;
  const dz = middleMcp.z - wrist.z;
  return toDegrees(Math.atan2(dz, dy));
}

/**
 * 두 점 사이 거리 계산
 */
export function calculateDistance(
  p1: HandLandmarkPoint,
  p2: HandLandmarkPoint
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 엄지-손가락 터치 거리 계산
 * @returns 정규화된 거리 (0에 가까울수록 터치)
 */
export function calculateThumbToFingerDistance(
  landmarks: HandLandmarkPoint[],
  finger: FingerName
): number {
  const thumbTip = landmarks[FINGER_TIPS.thumb];
  const fingerTip = landmarks[FINGER_TIPS[finger]];
  return calculateDistance(thumbTip, fingerTip);
}

/**
 * 손가락 펴짐 여부 판단
 * @param landmarks 손 랜드마크
 * @param finger 손가락 이름
 * @param threshold 펴짐 판단 각도 (기본 160도)
 */
export function isFingerExtended(
  landmarks: HandLandmarkPoint[],
  finger: FingerName,
  threshold = 160
): boolean {
  const angles = calculateFingerFlexion(landmarks, finger);
  // PIP 관절이 거의 펴져있으면 손가락이 펴진 것
  return angles.pip > threshold;
}

/**
 * 손가락 굽힘 여부 판단
 * @param threshold 굽힘 판단 각도 (기본 90도 이하)
 */
export function isFingerFlexed(
  landmarks: HandLandmarkPoint[],
  finger: FingerName,
  threshold = 90
): boolean {
  const angles = calculateFingerFlexion(landmarks, finger);
  return angles.pip < threshold;
}

/**
 * 손가락 벌림 각도 계산 (인접 손가락 사이)
 */
export function calculateFingerSpread(
  landmarks: HandLandmarkPoint[]
): Record<string, number> {
  const indexMcp = landmarks[HandLandmark.INDEX_FINGER_MCP];
  const middleMcp = landmarks[HandLandmark.MIDDLE_FINGER_MCP];
  const ringMcp = landmarks[HandLandmark.RING_FINGER_MCP];
  const pinkyMcp = landmarks[HandLandmark.PINKY_MCP];

  const indexTip = landmarks[HandLandmark.INDEX_FINGER_TIP];
  const middleTip = landmarks[HandLandmark.MIDDLE_FINGER_TIP];
  const ringTip = landmarks[HandLandmark.RING_FINGER_TIP];
  const pinkyTip = landmarks[HandLandmark.PINKY_TIP];

  // MCP에서 TIP까지의 방향 벡터로 벌림 각도 계산
  const indexDir = getVector(indexMcp, indexTip);
  const middleDir = getVector(middleMcp, middleTip);
  const ringDir = getVector(ringMcp, ringTip);
  const pinkyDir = getVector(pinkyMcp, pinkyTip);

  return {
    indexMiddle: toDegrees(angleBetweenVectors(indexDir, middleDir)),
    middleRing: toDegrees(angleBetweenVectors(middleDir, ringDir)),
    ringPinky: toDegrees(angleBetweenVectors(ringDir, pinkyDir)),
  };
}

/**
 * 현재 손 제스처 감지
 */
export function detectHandGesture(landmarks: HandLandmarkPoint[]): HandGesture {
  const thumbExtended = isFingerExtended(landmarks, 'thumb', 140);
  const indexExtended = isFingerExtended(landmarks, 'index');
  const middleExtended = isFingerExtended(landmarks, 'middle');
  const ringExtended = isFingerExtended(landmarks, 'ring');
  const pinkyExtended = isFingerExtended(landmarks, 'pinky');

  const allExtended = indexExtended && middleExtended && ringExtended && pinkyExtended;

  // 손 펴기
  if (allExtended && thumbExtended) {
    return 'open';
  }

  // 힘줄 미끄럼 단계 감지 (주먹보다 먼저 체크해야 갈고리/테이블탑 등이 주먹으로 오인되지 않음)
  const tendonGlideGesture = detectTendonGlideGesture(landmarks);
  if (tendonGlideGesture !== 'unknown') {
    return tendonGlideGesture;
  }

  // 주먹 (힘줄 미끄럼이 아닌 경우에만)
  const allFlexed =
    isFingerFlexed(landmarks, 'index') &&
    isFingerFlexed(landmarks, 'middle') &&
    isFingerFlexed(landmarks, 'ring') &&
    isFingerFlexed(landmarks, 'pinky');
  if (allFlexed && !thumbExtended) {
    return 'fist';
  }

  // 검지 가리키기
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return 'pointing';
  }

  // 엄지척
  if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return 'thumbs_up';
  }

  // 엄지-검지 집기 (Pinch)
  const thumbIndexDist = calculateThumbToFingerDistance(landmarks, 'index');
  if (thumbIndexDist < 0.05 && !middleExtended && !ringExtended && !pinkyExtended) {
    return 'pinch';
  }

  return 'unknown';
}

/**
 * 힘줄 미끄럼 운동 제스처 감지
 * 여러 손가락의 평균을 사용하여 더 안정적인 감지
 */
function detectTendonGlideGesture(landmarks: HandLandmarkPoint[]): HandGesture {
  // 4개 손가락의 각도 평균 계산
  const fingers: FingerName[] = ['index', 'middle', 'ring', 'pinky'];
  let avgMcp = 0, avgPip = 0, avgDip = 0;

  fingers.forEach((finger) => {
    const angles = calculateFingerFlexion(landmarks, finger) as FingerAngles;
    avgMcp += angles.mcp;
    avgPip += angles.pip;
    avgDip += angles.dip;
  });

  avgMcp /= 4;
  avgPip /= 4;
  avgDip /= 4;

  // Hook (갈고리): MCP는 펴고, PIP/DIP는 굽히는 자세
  if (avgMcp > 140 && avgPip < 145 && avgDip < 155) {
    return 'hook';
  }

  // Table Top (테이블탑): MCP 굽힘, PIP/DIP 펴짐
  if (avgMcp < 130 && avgMcp > 50 && avgPip > 120 && avgPip > avgMcp + 10) {
    return 'table_top';
  }

  // Straight Fist (직선 주먹): MCP, PIP 굽힘, DIP는 상대적으로 펴짐
  if (avgMcp < 130 && avgPip < 140 && avgDip > avgPip + 15) {
    return 'straight_fist';
  }

  // Full Fist (완전 주먹): 모든 관절이 비슷하게 굽힘
  if (avgMcp < 130 && avgPip < 140 && avgDip < 150) {
    return 'full_fist';
  }

  return 'unknown';
}

/**
 * 디버그용 평균 관절 각도 계산
 */
export function getDebugAngles(landmarks: HandLandmarkPoint[]): {
  avgMcp: number;
  avgPip: number;
  avgDip: number;
} {
  const fingers: FingerName[] = ['index', 'middle', 'ring', 'pinky'];
  let avgMcp = 0, avgPip = 0, avgDip = 0;

  fingers.forEach((finger) => {
    const angles = calculateFingerFlexion(landmarks, finger) as FingerAngles;
    avgMcp += angles.mcp;
    avgPip += angles.pip;
    avgDip += angles.dip;
  });

  return {
    avgMcp: Math.round(avgMcp / 4),
    avgPip: Math.round(avgPip / 4),
    avgDip: Math.round(avgDip / 4),
  };
}

/**
 * 평균 손가락 굴곡 각도 계산
 */
export function calculateAverageFlexion(landmarks: HandLandmarkPoint[]): number {
  const fingers: FingerName[] = ['index', 'middle', 'ring', 'pinky'];
  let totalFlexion = 0;

  fingers.forEach((finger) => {
    const angles = calculateFingerFlexion(landmarks, finger) as FingerAngles;
    totalFlexion += angles.totalFlexion;
  });

  return totalFlexion / fingers.length;
}

/**
 * 손가락 각도를 퍼센트로 변환 (0=완전히 펴짐, 100=완전히 굽힘)
 */
export function flexionToPercent(totalFlexion: number): number {
  // 완전히 펴짐: ~540도 (180 * 3), 완전히 굽힘: ~270도 (90 * 3)
  const extended = 540;
  const flexed = 270;
  const percent = ((extended - totalFlexion) / (extended - flexed)) * 100;
  return Math.max(0, Math.min(100, percent));
}

/** 손바닥 방향 정보 */
export interface PalmOrientation {
  /** 손바닥 법선 벡터 (손바닥이 향하는 방향) */
  normal: Vector3D;
  /** 손바닥 회전 각도 (0~360, 시계방향) */
  rotationAngle: number;
  /** 손바닥이 위를 향하는지 (supination) */
  isPalmUp: boolean;
  /** 손바닥이 아래를 향하는지 (pronation) */
  isPalmDown: boolean;
}

/**
 * 벡터 외적 계산
 */
function crossProduct(v1: Vector3D, v2: Vector3D): Vector3D {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
}

/**
 * 벡터 정규화
 */
function normalize(v: Vector3D): Vector3D {
  const mag = magnitude(v);
  if (mag === 0) return { x: 0, y: 0, z: 0 };
  return {
    x: v.x / mag,
    y: v.y / mag,
    z: v.z / mag,
  };
}

/**
 * 손바닥 방향 계산
 * WRIST, INDEX_MCP, PINKY_MCP를 사용하여 손바닥 평면의 법선 벡터 계산
 */
export function calculatePalmOrientation(landmarks: HandLandmarkPoint[]): PalmOrientation {
  const wrist = landmarks[HandLandmark.WRIST];
  const indexMcp = landmarks[HandLandmark.INDEX_FINGER_MCP];
  const pinkyMcp = landmarks[HandLandmark.PINKY_MCP];
  const middleMcp = landmarks[HandLandmark.MIDDLE_FINGER_MCP];

  // 손바닥 평면을 정의하는 두 벡터
  const v1 = getVector(wrist, indexMcp);  // 손목 → 검지 MCP
  const v2 = getVector(wrist, pinkyMcp);  // 손목 → 새끼 MCP

  // 외적으로 법선 벡터 계산 (손바닥이 향하는 방향)
  const normal = normalize(crossProduct(v1, v2));

  // 회전 각도 계산 (XZ 평면에서의 각도, 손목 기준)
  let rotationAngle = toDegrees(Math.atan2(normal.x, normal.z));
  if (rotationAngle < 0) rotationAngle += 360;

  // 손바닥 방향 판단 (y 성분 기준)
  const isPalmUp = normal.y > 0.5;    // 손바닥이 위 (카메라 쪽)
  const isPalmDown = normal.y < -0.5;  // 손바닥이 아래

  return {
    normal,
    rotationAngle,
    isPalmUp,
    isPalmDown,
  };
}
