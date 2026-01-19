/**
 * 개선된 캘리브레이션 매니저
 *
 * 기존 문제점 해결:
 * 1. 캘리브레이션 결과가 운동 감지에 적용되지 않음 → 임계값 자동 연동
 * 2. 신뢰도 필터링 부재 → 낮은 신뢰도 샘플 자동 제외
 * 3. 단순 평균 사용 → 이상치 제거 후 중앙값 사용
 */

import type { Landmark } from '@/types/pose';
import type { ExerciseType, JointType } from '@/types/exercise';
import type {
  CalibrationResult,
  CalibrationSettings,
  ThresholdResult,
  Side,
} from '@/types/calibration';
import { DEFAULT_CALIBRATION_SETTINGS } from '@/types/calibration';
import { calculateHybridAngle } from './depthCorrection';

// 안정성 판단 파라미터
const STABILITY_PARAMS = {
  minSamples: 10,               // 최소 샘플 수
  maxStdDev: 3,                 // 최대 표준편차 (도)
  requiredStableFrames: 15,     // 안정 판정에 필요한 연속 프레임 수
  minConfidence: 0.7,           // 최소 신뢰도
  outlierThreshold: 2,          // 이상치 판단 기준 (표준편차 배수)
};

// 샘플 데이터 타입
interface AngleSample {
  angle: number;
  confidence: number;
  timestamp: number;
}

/**
 * 이상치 제거 후 중앙값 계산
 */
function calculateRobustMedian(samples: AngleSample[]): number {
  if (samples.length === 0) return 0;

  const angles = samples.map((s) => s.angle);
  const sorted = [...angles].sort((a, b) => a - b);

  // Q1, Q3 계산
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  // 이상치 범위
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  // 이상치 제거
  const filtered = sorted.filter((v) => v >= lowerBound && v <= upperBound);

  if (filtered.length === 0) return sorted[Math.floor(sorted.length / 2)];

  // 중앙값 반환
  const mid = Math.floor(filtered.length / 2);
  return filtered.length % 2 === 0
    ? (filtered[mid - 1] + filtered[mid]) / 2
    : filtered[mid];
}

/**
 * 표준편차 계산
 */
function calculateStdDev(samples: AngleSample[]): number {
  if (samples.length < 2) return Infinity;

  const angles = samples.map((s) => s.angle);
  const mean = angles.reduce((a, b) => a + b, 0) / angles.length;
  const variance = angles.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / angles.length;

  return Math.sqrt(variance);
}

/**
 * 개선된 임계값 계산
 */
function calculateImprovedThresholds(
  restingAngle: number,
  maxROMAngle: number,
  settings: CalibrationSettings
): ThresholdResult {
  const totalROM = Math.abs(maxROMAngle - restingAngle);

  // 목표 ROM (사용자 최대의 특정 비율)
  const targetROM = totalROM * (settings.targetPercent / 100);

  // 굴곡인지 신전인지 판단
  const isFlexion = maxROMAngle < restingAngle;

  // 목표 각도
  const targetAngle = isFlexion
    ? restingAngle - targetROM
    : restingAngle + targetROM;

  // 허용 오차 (동적으로 계산)
  // ROM이 작으면 허용 오차도 작게
  const baseTolerance = totalROM * (settings.tolerancePercent / 100);
  const minTolerance = 3; // 최소 3도 허용
  const tolerance = Math.max(minTolerance, baseTolerance);

  return {
    startAngle: {
      center: restingAngle,
      min: restingAngle - tolerance,
      max: restingAngle + tolerance,
    },
    targetAngle,
    completionThreshold: {
      // 목표 도달 판정: 목표의 90%까지 도달하면 완료로 인정
      minAngle: isFlexion
        ? targetAngle + tolerance * 0.5
        : targetAngle - tolerance * 0.5,
      holdTime: settings.holdTime,
    },
    returnThreshold: {
      // 복귀 판정: 시작 위치에서 tolerance 범위 내로 돌아와야 함
      maxAngle: isFlexion
        ? restingAngle - tolerance * 0.5
        : restingAngle + tolerance * 0.5,
    },
    totalROM,
    calculatedAt: new Date(),
  };
}

/**
 * 캘리브레이션 매니저 클래스
 */
export class CalibrationManager {
  private restingSamples: AngleSample[] = [];
  private maxROMSamples: AngleSample[] = [];
  private stableFrameCount = 0;
  private lastAngle = 0;
  private settings: CalibrationSettings;

  constructor(settings: CalibrationSettings = DEFAULT_CALIBRATION_SETTINGS) {
    this.settings = settings;
  }

  /**
   * 새 캘리브레이션 세션 시작
   */
  reset(): void {
    this.restingSamples = [];
    this.maxROMSamples = [];
    this.stableFrameCount = 0;
    this.lastAngle = 0;
  }

  /**
   * 휴식 각도 샘플 추가
   * @returns 안정성 상태 (안정 시 true)
   */
  addRestingSample(
    angle: number,
    confidence: number
  ): { isStable: boolean; progress: number; feedback: string } {
    // 신뢰도가 낮은 샘플 제외
    if (confidence < STABILITY_PARAMS.minConfidence) {
      return {
        isStable: false,
        progress: this.restingSamples.length / STABILITY_PARAMS.minSamples,
        feedback: '포즈가 명확하지 않습니다. 카메라를 향해 서주세요.',
      };
    }

    const sample: AngleSample = {
      angle,
      confidence,
      timestamp: Date.now(),
    };

    this.restingSamples.push(sample);

    // 안정성 체크
    const recentSamples = this.restingSamples.slice(-STABILITY_PARAMS.requiredStableFrames);
    const stdDev = calculateStdDev(recentSamples);

    const angleDiff = Math.abs(angle - this.lastAngle);
    this.lastAngle = angle;

    // 안정 판정
    if (stdDev < STABILITY_PARAMS.maxStdDev && angleDiff < 2) {
      this.stableFrameCount++;
    } else {
      this.stableFrameCount = Math.max(0, this.stableFrameCount - 2);
    }

    const isStable =
      this.stableFrameCount >= STABILITY_PARAMS.requiredStableFrames &&
      this.restingSamples.length >= STABILITY_PARAMS.minSamples;

    const progress = Math.min(
      1,
      this.stableFrameCount / STABILITY_PARAMS.requiredStableFrames
    );

    let feedback = '편안하게 서서 자세를 유지하세요';
    if (stdDev > STABILITY_PARAMS.maxStdDev * 2) {
      feedback = '움직임이 감지됩니다. 멈춰주세요.';
    } else if (progress > 0.5) {
      feedback = '좋습니다! 자세를 유지하세요...';
    }

    return { isStable, progress, feedback };
  }

  /**
   * 최대 ROM 샘플 추가
   */
  addMaxROMSample(
    angle: number,
    confidence: number
  ): { isComplete: boolean; progress: number; feedback: string } {
    if (confidence < STABILITY_PARAMS.minConfidence) {
      return {
        isComplete: false,
        progress: this.maxROMSamples.length / STABILITY_PARAMS.minSamples,
        feedback: '포즈가 명확하지 않습니다.',
      };
    }

    const sample: AngleSample = {
      angle,
      confidence,
      timestamp: Date.now(),
    };

    this.maxROMSamples.push(sample);

    // 안정성 체크
    const recentSamples = this.maxROMSamples.slice(-10);
    const stdDev = calculateStdDev(recentSamples);

    const angleDiff = Math.abs(angle - this.lastAngle);
    this.lastAngle = angle;

    if (stdDev < STABILITY_PARAMS.maxStdDev && angleDiff < 2) {
      this.stableFrameCount++;
    } else {
      this.stableFrameCount = Math.max(0, this.stableFrameCount - 1);
    }

    const isComplete =
      this.stableFrameCount >= 10 &&
      this.maxROMSamples.length >= STABILITY_PARAMS.minSamples;

    const progress = Math.min(1, this.maxROMSamples.length / STABILITY_PARAMS.minSamples);

    let feedback = '최대한 움직여 주세요';
    const restingMedian = calculateRobustMedian(this.restingSamples);
    const currentDiff = Math.abs(angle - restingMedian);

    if (currentDiff < 10) {
      feedback = '더 움직여 주세요!';
    } else if (progress > 0.7 && stdDev < STABILITY_PARAMS.maxStdDev) {
      feedback = '좋습니다! 최대 위치에서 유지하세요...';
    }

    return { isComplete, progress, feedback };
  }

  /**
   * 캘리브레이션 완료 및 결과 계산
   */
  complete(
    userId: string,
    exerciseType: ExerciseType,
    jointType: JointType,
    side: Side | 'BOTH' = 'BOTH'
  ): CalibrationResult | null {
    if (
      this.restingSamples.length < STABILITY_PARAMS.minSamples ||
      this.maxROMSamples.length < STABILITY_PARAMS.minSamples
    ) {
      return null;
    }

    // 이상치 제거 후 중앙값 계산
    const restingAngle = calculateRobustMedian(this.restingSamples);
    const maxROMAngle = calculateRobustMedian(this.maxROMSamples);

    // ROM이 너무 작으면 실패
    const totalROM = Math.abs(maxROMAngle - restingAngle);
    if (totalROM < 10) {
      console.warn('캘리브레이션 실패: ROM이 너무 작음', { restingAngle, maxROMAngle });
      return null;
    }

    // 임계값 계산
    const thresholds = calculateImprovedThresholds(
      restingAngle,
      maxROMAngle,
      this.settings
    );

    // 신뢰도 계산 (샘플들의 평균 신뢰도와 안정성 기반)
    const avgConfidence =
      [...this.restingSamples, ...this.maxROMSamples].reduce(
        (sum, s) => sum + s.confidence,
        0
      ) / (this.restingSamples.length + this.maxROMSamples.length);

    const restingStdDev = calculateStdDev(this.restingSamples);
    const maxROMStdDev = calculateStdDev(this.maxROMSamples);
    const stabilityScore = 1 - (restingStdDev + maxROMStdDev) / 20;

    const confidence = Math.min(1, (avgConfidence + stabilityScore) / 2);

    // 결과 생성
    const result: CalibrationResult = {
      id: `${userId}_${exerciseType}_${Date.now()}`,
      userId,
      exerciseType,
      jointType,
      movementType: maxROMAngle < restingAngle ? 'flexion' : 'extension',
      side,
      restingAngle,
      maxROMAngle,
      thresholds,
      settings: this.settings,
      confidence,
      calibratedAt: new Date(),
      isValid: true,
      expiresAt: new Date(
        Date.now() + this.settings.validityDays * 24 * 60 * 60 * 1000
      ),
    };

    return result;
  }

  /**
   * 현재 상태 조회
   */
  getStatus(): {
    restingSampleCount: number;
    maxROMSampleCount: number;
    stableFrameCount: number;
    isReadyForMaxROM: boolean;
  } {
    return {
      restingSampleCount: this.restingSamples.length,
      maxROMSampleCount: this.maxROMSamples.length,
      stableFrameCount: this.stableFrameCount,
      isReadyForMaxROM: this.restingSamples.length >= STABILITY_PARAMS.minSamples,
    };
  }
}

/**
 * 관절별 각도 계산 유틸리티
 */
export function calculateJointAngleForCalibration(
  landmarks: Landmark[],
  jointType: JointType
): { angle: number; confidence: number } | null {
  // 관절별 랜드마크 인덱스 매핑
  const jointConfig: Record<
    JointType,
    { p1: number; p2: number; p3: number } | null
  > = {
    knee: { p1: 23, p2: 25, p3: 27 }, // 왼쪽 엉덩이-무릎-발목
    hip: { p1: 11, p2: 23, p3: 25 }, // 어깨-엉덩이-무릎
    shoulder: { p1: 13, p2: 11, p3: 23 }, // 팔꿈치-어깨-엉덩이
    elbow: { p1: 11, p2: 13, p3: 15 }, // 어깨-팔꿈치-손목
    spine: { p1: 11, p2: 23, p3: 25 }, // 어깨-엉덩이-무릎 (척추 굴곡)
    ankle: { p1: 25, p2: 27, p3: 31 }, // 무릎-발목-발끝
    wrist: null, // 손목은 별도 처리 필요
    neck: { p1: 7, p2: 11, p3: 12 }, // 귀-어깨중앙 (대략적)
  };

  const config = jointConfig[jointType];
  if (!config) return null;

  const p1 = landmarks[config.p1];
  const p2 = landmarks[config.p2];
  const p3 = landmarks[config.p3];

  if (!p1 || !p2 || !p3) return null;

  // 하이브리드 각도 계산 (2D + 3D)
  const result = calculateHybridAngle(p1, p2, p3);

  return {
    angle: result.angle,
    confidence: result.confidence,
  };
}

// 싱글톤 인스턴스
let calibrationManagerInstance: CalibrationManager | null = null;

export function getCalibrationManager(
  settings?: CalibrationSettings
): CalibrationManager {
  if (!calibrationManagerInstance || settings) {
    calibrationManagerInstance = new CalibrationManager(settings);
  }
  return calibrationManagerInstance;
}

export function resetCalibrationManager(): void {
  calibrationManagerInstance = null;
}
