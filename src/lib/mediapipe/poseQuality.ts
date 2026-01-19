/**
 * 포즈 품질 검증 모듈
 * 조명, 가시성, 프레임 위치 등을 검증
 */

import type { Landmark } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';

// 품질 검증 결과
export interface QualityCheckResult {
  isGood: boolean;
  score: number; // 0-100
  issues: QualityIssue[];
  suggestions: string[];
}

// 품질 이슈 타입
export interface QualityIssue {
  type: QualityIssueType;
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedJoints?: number[];
}

export type QualityIssueType =
  | 'low_visibility'
  | 'out_of_frame'
  | 'too_close'
  | 'too_far'
  | 'poor_lighting'
  | 'occluded_joints'
  | 'unstable_pose';

// 주요 관절 그룹
const KEY_JOINT_GROUPS = {
  upper: [
    PoseLandmark.LEFT_SHOULDER,
    PoseLandmark.RIGHT_SHOULDER,
    PoseLandmark.LEFT_ELBOW,
    PoseLandmark.RIGHT_ELBOW,
  ],
  lower: [
    PoseLandmark.LEFT_HIP,
    PoseLandmark.RIGHT_HIP,
    PoseLandmark.LEFT_KNEE,
    PoseLandmark.RIGHT_KNEE,
    PoseLandmark.LEFT_ANKLE,
    PoseLandmark.RIGHT_ANKLE,
  ],
  core: [
    PoseLandmark.LEFT_SHOULDER,
    PoseLandmark.RIGHT_SHOULDER,
    PoseLandmark.LEFT_HIP,
    PoseLandmark.RIGHT_HIP,
  ],
};

// 검증 임계값
const THRESHOLDS = {
  minVisibility: 0.5,        // 최소 가시성
  minKeyJointVisibility: 0.6, // 주요 관절 최소 가시성
  minFrameMargin: 0.05,      // 프레임 가장자리 여백 (5%)
  maxFrameMargin: 0.95,      // 프레임 내 최대 범위 (95%)
  minBodyHeight: 0.3,        // 최소 바디 높이 (화면 대비)
  maxBodyHeight: 0.95,       // 최대 바디 높이 (너무 가까움)
  positionChangeThreshold: 0.1, // 위치 변화 임계값 (불안정)
};

/**
 * 포즈 품질 검증
 */
export function validatePoseQuality(
  landmarks: Landmark[],
  options?: {
    exerciseType?: 'upper' | 'lower' | 'full';
    previousLandmarks?: Landmark[];
  }
): QualityCheckResult {
  const issues: QualityIssue[] = [];
  const suggestions: string[] = [];
  let totalScore = 100;

  // 1. 전체 가시성 검사
  const visibilityResult = checkVisibility(landmarks);
  if (!visibilityResult.isGood) {
    issues.push(...visibilityResult.issues);
    suggestions.push(...visibilityResult.suggestions);
    totalScore -= visibilityResult.penalty;
  }

  // 2. 주요 관절 가시성 검사
  const keyJoints = options?.exerciseType
    ? getKeyJointsForExercise(options.exerciseType)
    : KEY_JOINT_GROUPS.core;

  const keyJointResult = checkKeyJointVisibility(landmarks, keyJoints);
  if (!keyJointResult.isGood) {
    issues.push(...keyJointResult.issues);
    suggestions.push(...keyJointResult.suggestions);
    totalScore -= keyJointResult.penalty;
  }

  // 3. 프레임 내 위치 검사
  const frameResult = checkFramePosition(landmarks);
  if (!frameResult.isGood) {
    issues.push(...frameResult.issues);
    suggestions.push(...frameResult.suggestions);
    totalScore -= frameResult.penalty;
  }

  // 4. 거리 검사 (너무 가깝거나 멀리)
  const distanceResult = checkDistance(landmarks);
  if (!distanceResult.isGood) {
    issues.push(...distanceResult.issues);
    suggestions.push(...distanceResult.suggestions);
    totalScore -= distanceResult.penalty;
  }

  // 5. 포즈 안정성 검사 (이전 프레임과 비교)
  if (options?.previousLandmarks) {
    const stabilityResult = checkStability(landmarks, options.previousLandmarks);
    if (!stabilityResult.isGood) {
      issues.push(...stabilityResult.issues);
      suggestions.push(...stabilityResult.suggestions);
      totalScore -= stabilityResult.penalty;
    }
  }

  // 점수 정규화
  totalScore = Math.max(0, Math.min(100, totalScore));

  // 중복 제거
  const uniqueSuggestions = [...new Set(suggestions)];

  return {
    isGood: issues.every((i) => i.severity !== 'high') && totalScore >= 60,
    score: totalScore,
    issues,
    suggestions: uniqueSuggestions.slice(0, 3), // 최대 3개 제안
  };
}

/**
 * 전체 가시성 검사
 */
function checkVisibility(landmarks: Landmark[]): {
  isGood: boolean;
  issues: QualityIssue[];
  suggestions: string[];
  penalty: number;
} {
  const issues: QualityIssue[] = [];
  const suggestions: string[] = [];
  let penalty = 0;

  // 평균 가시성 계산
  const avgVisibility =
    landmarks.reduce((sum, lm) => sum + (lm.visibility || 0), 0) / landmarks.length;

  if (avgVisibility < THRESHOLDS.minVisibility) {
    const severity = avgVisibility < 0.3 ? 'high' : 'medium';
    issues.push({
      type: 'low_visibility',
      severity,
      message: '전체적인 가시성이 낮습니다',
    });
    suggestions.push('조명이 밝은 곳으로 이동해주세요');
    penalty = severity === 'high' ? 30 : 15;
  }

  return {
    isGood: issues.length === 0,
    issues,
    suggestions,
    penalty,
  };
}

/**
 * 주요 관절 가시성 검사
 */
function checkKeyJointVisibility(
  landmarks: Landmark[],
  keyJoints: number[]
): {
  isGood: boolean;
  issues: QualityIssue[];
  suggestions: string[];
  penalty: number;
} {
  const issues: QualityIssue[] = [];
  const suggestions: string[] = [];
  let penalty = 0;

  const lowVisibilityJoints: number[] = [];

  keyJoints.forEach((jointIndex) => {
    const joint = landmarks[jointIndex];
    if (joint && (joint.visibility || 0) < THRESHOLDS.minKeyJointVisibility) {
      lowVisibilityJoints.push(jointIndex);
    }
  });

  if (lowVisibilityJoints.length > 0) {
    const ratio = lowVisibilityJoints.length / keyJoints.length;
    const severity = ratio > 0.5 ? 'high' : ratio > 0.25 ? 'medium' : 'low';

    issues.push({
      type: 'occluded_joints',
      severity,
      message: `${lowVisibilityJoints.length}개 관절이 잘 보이지 않습니다`,
      affectedJoints: lowVisibilityJoints,
    });

    suggestions.push('카메라가 전신을 비추도록 위치를 조정해주세요');
    penalty = severity === 'high' ? 25 : severity === 'medium' ? 15 : 5;
  }

  return {
    isGood: issues.length === 0,
    issues,
    suggestions,
    penalty,
  };
}

/**
 * 프레임 내 위치 검사
 */
function checkFramePosition(landmarks: Landmark[]): {
  isGood: boolean;
  issues: QualityIssue[];
  suggestions: string[];
  penalty: number;
} {
  const issues: QualityIssue[] = [];
  const suggestions: string[] = [];
  let penalty = 0;

  // 경계 값 계산
  const xValues = landmarks.map((lm) => lm.x).filter((x) => x >= 0 && x <= 1);
  const yValues = landmarks.map((lm) => lm.y).filter((y) => y >= 0 && y <= 1);

  if (xValues.length === 0 || yValues.length === 0) {
    issues.push({
      type: 'out_of_frame',
      severity: 'high',
      message: '포즈가 화면 밖에 있습니다',
    });
    suggestions.push('화면 중앙에 서주세요');
    return { isGood: false, issues, suggestions, penalty: 40 };
  }

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  // 프레임 가장자리 검사
  if (
    minX < THRESHOLDS.minFrameMargin ||
    maxX > THRESHOLDS.maxFrameMargin ||
    minY < THRESHOLDS.minFrameMargin ||
    maxY > THRESHOLDS.maxFrameMargin
  ) {
    issues.push({
      type: 'out_of_frame',
      severity: 'medium',
      message: '일부가 화면 밖으로 나갔습니다',
    });

    if (minX < THRESHOLDS.minFrameMargin) {
      suggestions.push('오른쪽으로 조금 이동해주세요');
    } else if (maxX > THRESHOLDS.maxFrameMargin) {
      suggestions.push('왼쪽으로 조금 이동해주세요');
    }

    if (minY < THRESHOLDS.minFrameMargin) {
      suggestions.push('카메라에서 조금 떨어져주세요');
    } else if (maxY > THRESHOLDS.maxFrameMargin) {
      suggestions.push('카메라를 조금 높여주세요');
    }

    penalty = 15;
  }

  return {
    isGood: issues.length === 0,
    issues,
    suggestions,
    penalty,
  };
}

/**
 * 거리 검사
 */
function checkDistance(landmarks: Landmark[]): {
  isGood: boolean;
  issues: QualityIssue[];
  suggestions: string[];
  penalty: number;
} {
  const issues: QualityIssue[] = [];
  const suggestions: string[] = [];
  let penalty = 0;

  // 어깨와 발목 y 좌표로 높이 추정
  const shoulders = [
    landmarks[PoseLandmark.LEFT_SHOULDER],
    landmarks[PoseLandmark.RIGHT_SHOULDER],
  ];
  const ankles = [
    landmarks[PoseLandmark.LEFT_ANKLE],
    landmarks[PoseLandmark.RIGHT_ANKLE],
  ];

  const validShoulders = shoulders.filter((s) => s && (s.visibility || 0) > 0.5);
  const validAnkles = ankles.filter((a) => a && (a.visibility || 0) > 0.5);

  if (validShoulders.length > 0 && validAnkles.length > 0) {
    const avgShoulderY =
      validShoulders.reduce((sum, s) => sum + s.y, 0) / validShoulders.length;
    const avgAnkleY = validAnkles.reduce((sum, a) => sum + a.y, 0) / validAnkles.length;

    const bodyHeight = avgAnkleY - avgShoulderY;

    if (bodyHeight > THRESHOLDS.maxBodyHeight) {
      issues.push({
        type: 'too_close',
        severity: 'medium',
        message: '카메라에 너무 가깝습니다',
      });
      suggestions.push('카메라에서 한두 걸음 뒤로 물러나주세요');
      penalty = 15;
    } else if (bodyHeight < THRESHOLDS.minBodyHeight) {
      issues.push({
        type: 'too_far',
        severity: 'medium',
        message: '카메라에서 너무 멀리 있습니다',
      });
      suggestions.push('카메라에 조금 더 가까이 와주세요');
      penalty = 15;
    }
  }

  return {
    isGood: issues.length === 0,
    issues,
    suggestions,
    penalty,
  };
}

/**
 * 포즈 안정성 검사
 */
function checkStability(
  currentLandmarks: Landmark[],
  previousLandmarks: Landmark[]
): {
  isGood: boolean;
  issues: QualityIssue[];
  suggestions: string[];
  penalty: number;
} {
  const issues: QualityIssue[] = [];
  const suggestions: string[] = [];
  let penalty = 0;

  // 주요 관절의 위치 변화 계산
  const keyJoints = KEY_JOINT_GROUPS.core;
  let totalChange = 0;
  let validComparisons = 0;

  keyJoints.forEach((jointIndex) => {
    const current = currentLandmarks[jointIndex];
    const previous = previousLandmarks[jointIndex];

    if (
      current &&
      previous &&
      (current.visibility || 0) > 0.5 &&
      (previous.visibility || 0) > 0.5
    ) {
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      const change = Math.sqrt(dx * dx + dy * dy);
      totalChange += change;
      validComparisons++;
    }
  });

  if (validComparisons > 0) {
    const avgChange = totalChange / validComparisons;

    if (avgChange > THRESHOLDS.positionChangeThreshold) {
      issues.push({
        type: 'unstable_pose',
        severity: 'low',
        message: '포즈가 불안정합니다',
      });
      suggestions.push('움직임을 줄이고 안정적인 자세를 유지해주세요');
      penalty = 10;
    }
  }

  return {
    isGood: issues.length === 0,
    issues,
    suggestions,
    penalty,
  };
}

/**
 * 운동 유형에 맞는 주요 관절 반환
 */
function getKeyJointsForExercise(exerciseType: 'upper' | 'lower' | 'full'): number[] {
  switch (exerciseType) {
    case 'upper':
      return KEY_JOINT_GROUPS.upper;
    case 'lower':
      return KEY_JOINT_GROUPS.lower;
    case 'full':
    default:
      return [...KEY_JOINT_GROUPS.upper, ...KEY_JOINT_GROUPS.lower];
  }
}

/**
 * 간단한 품질 점수 계산 (빠른 검사용)
 */
export function getQuickQualityScore(landmarks: Landmark[]): number {
  // 핵심 관절의 평균 가시성
  const coreJoints = KEY_JOINT_GROUPS.core;
  const avgVisibility =
    coreJoints.reduce((sum, i) => sum + (landmarks[i]?.visibility || 0), 0) /
    coreJoints.length;

  return Math.round(avgVisibility * 100);
}

/**
 * 품질 상태 텍스트 반환
 */
export function getQualityStatusText(score: number): {
  text: string;
  color: string;
} {
  if (score >= 80) {
    return { text: '매우 좋음', color: '#10B981' };
  } else if (score >= 60) {
    return { text: '양호', color: '#F59E0B' };
  } else if (score >= 40) {
    return { text: '보통', color: '#F97316' };
  } else {
    return { text: '개선 필요', color: '#EF4444' };
  }
}
