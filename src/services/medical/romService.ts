/**
 * ROM (Range of Motion) 측정 서비스
 *
 * 2단계 재활 시스템:
 * - RECOVERY: ROM 0-70% (보호적 운동)
 * - STRENGTH: ROM 70%+ (근력 강화)
 *
 * AAOS 표준 ROM 범위 기반
 */

import { createLogger } from '@/lib/logger';
import { calibrationService, DEFAULT_ROM_RANGES } from '@/services/calibrationService';
import type { CalibrationJoint } from '@/components/calibration/CalibrationGuide';

const logger = createLogger('ROMService');

// ============================================================
// 타입 정의
// ============================================================

/** 재활 단계 (2단계 시스템) */
export type RehabPhase = 'RECOVERY' | 'STRENGTH';

/** 관절 타입 */
export type JointType =
  | 'shoulder'
  | 'elbow'
  | 'wrist'
  | 'hip'
  | 'knee'
  | 'ankle'
  | 'spine';

/** 움직임 타입 */
export type MovementType =
  | 'flexion'     // 굴곡
  | 'extension'   // 신전
  | 'abduction'   // 외전
  | 'adduction'   // 내전
  | 'rotation'    // 회전
  | 'lateral';    // 측굴

/** 측정 측면 */
export type Side = 'left' | 'right' | 'bilateral';

/** AAOS 표준 ROM 범위 */
export interface NormalROMRange {
  joint: JointType;
  movement: MovementType;
  min: number;  // 정상 최소값
  max: number;  // 정상 최대값
  unit: 'degrees';
}

/** ROM 측정 결과 */
export interface ROMMeasurement {
  id: string;
  jointType: JointType;
  movementType: MovementType;
  side: Side;
  angle: number;
  confidence: number;
  isValid: boolean;
  compensationDetected: boolean;
  measuredAt: Date;
  sessionId?: string;
}

/** ROM 평가 결과 */
export interface ROMAssessment {
  measurement: ROMMeasurement;
  normalRange: NormalROMRange;
  percentOfNormal: number;      // 정상 ROM 대비 비율
  phase: RehabPhase;            // 현재 재활 단계
  phaseProgress: number;        // 단계 내 진행률 (0-100)
  isWithinNormal: boolean;      // 정상 범위 내 여부
  asymmetryDegree?: number;     // 좌우 비대칭 정도 (있는 경우)
}

/** XP 보상 설정 */
export interface XPReward {
  baseXP: number;
  accuracyBonus: number;
  streakBonus: number;
  phaseBonus: number;
  total: number;
}

// ============================================================
// 상수 정의
// ============================================================

/** AAOS 표준 ROM 범위 (단위: degrees) */
export const AAOS_ROM_STANDARDS: NormalROMRange[] = [
  // 어깨
  { joint: 'shoulder', movement: 'flexion', min: 0, max: 180, unit: 'degrees' },
  { joint: 'shoulder', movement: 'extension', min: 0, max: 60, unit: 'degrees' },
  { joint: 'shoulder', movement: 'abduction', min: 0, max: 180, unit: 'degrees' },
  { joint: 'shoulder', movement: 'adduction', min: 0, max: 45, unit: 'degrees' },
  { joint: 'shoulder', movement: 'rotation', min: 0, max: 90, unit: 'degrees' },

  // 팔꿈치
  { joint: 'elbow', movement: 'flexion', min: 0, max: 150, unit: 'degrees' },
  { joint: 'elbow', movement: 'extension', min: 0, max: 0, unit: 'degrees' },

  // 손목
  { joint: 'wrist', movement: 'flexion', min: 0, max: 80, unit: 'degrees' },
  { joint: 'wrist', movement: 'extension', min: 0, max: 70, unit: 'degrees' },

  // 고관절
  { joint: 'hip', movement: 'flexion', min: 0, max: 120, unit: 'degrees' },
  { joint: 'hip', movement: 'extension', min: 0, max: 30, unit: 'degrees' },
  { joint: 'hip', movement: 'abduction', min: 0, max: 45, unit: 'degrees' },
  { joint: 'hip', movement: 'adduction', min: 0, max: 30, unit: 'degrees' },

  // 무릎
  { joint: 'knee', movement: 'flexion', min: 0, max: 135, unit: 'degrees' },
  { joint: 'knee', movement: 'extension', min: 0, max: 0, unit: 'degrees' },

  // 발목
  { joint: 'ankle', movement: 'flexion', min: 0, max: 50, unit: 'degrees' },
  { joint: 'ankle', movement: 'extension', min: 0, max: 20, unit: 'degrees' },

  // 척추
  { joint: 'spine', movement: 'flexion', min: 0, max: 90, unit: 'degrees' },
  { joint: 'spine', movement: 'extension', min: 0, max: 30, unit: 'degrees' },
  { joint: 'spine', movement: 'lateral', min: 0, max: 30, unit: 'degrees' },
  { joint: 'spine', movement: 'rotation', min: 0, max: 45, unit: 'degrees' },
];

/** 재활 단계 경계값 */
export const PHASE_THRESHOLDS = {
  RECOVERY: { minPercent: 0, maxPercent: 70 },
  STRENGTH: { minPercent: 70, maxPercent: 100 },
} as const;

/** XP 보상 설정 */
export const XP_CONFIG = {
  basePerRep: 10,
  accuracyMultiplier: 0.5,      // 정확도 80% = +40 XP
  streakMultiplier: 2,          // 스트릭당 +2 XP
  phaseBonus: {
    RECOVERY: 1.0,
    STRENGTH: 1.5,              // STRENGTH 단계 50% 추가 XP
  },
  perfectRepBonus: 25,          // 100% 정확도 보너스
  comboMultiplier: 0.1,         // 콤보당 10% 추가
} as const;

// ============================================================
// ROM 서비스 클래스
// ============================================================

class ROMService {
  private measurementHistory: ROMMeasurement[] = [];
  private currentStreak = 0;
  private currentCombo = 0;
  private totalXP = 0;

  /**
   * AAOS 표준 ROM 범위 조회
   */
  getNormalRange(joint: JointType, movement: MovementType): NormalROMRange | null {
    return AAOS_ROM_STANDARDS.find(
      (r) => r.joint === joint && r.movement === movement
    ) || null;
  }

  /**
   * ROM 측정 평가
   */
  assessROM(measurement: ROMMeasurement): ROMAssessment {
    const normalRange = this.getNormalRange(
      measurement.jointType,
      measurement.movementType
    );

    if (!normalRange) {
      throw new Error(`Unknown ROM range for ${measurement.jointType}/${measurement.movementType}`);
    }

    const maxNormal = normalRange.max;
    const percentOfNormal = maxNormal > 0
      ? Math.min(100, (measurement.angle / maxNormal) * 100)
      : 100;

    // 재활 단계 결정
    const phase = this.determinePhase(percentOfNormal);
    const phaseProgress = this.calculatePhaseProgress(percentOfNormal, phase);

    // 정상 범위 확인
    const isWithinNormal = measurement.angle >= normalRange.min &&
                           measurement.angle <= normalRange.max;

    return {
      measurement,
      normalRange,
      percentOfNormal: Math.round(percentOfNormal * 10) / 10,
      phase,
      phaseProgress: Math.round(phaseProgress),
      isWithinNormal,
    };
  }

  /**
   * 재활 단계 결정
   */
  determinePhase(percentOfNormal: number): RehabPhase {
    if (percentOfNormal < PHASE_THRESHOLDS.STRENGTH.minPercent) {
      return 'RECOVERY';
    }
    return 'STRENGTH';
  }

  /**
   * 단계 내 진행률 계산
   */
  calculatePhaseProgress(percentOfNormal: number, phase: RehabPhase): number {
    const threshold = PHASE_THRESHOLDS[phase];
    const range = threshold.maxPercent - threshold.minPercent;
    const progress = ((percentOfNormal - threshold.minPercent) / range) * 100;
    return Math.max(0, Math.min(100, progress));
  }

  /**
   * 좌우 비대칭 분석
   */
  analyzeAsymmetry(
    leftMeasurement: ROMMeasurement,
    rightMeasurement: ROMMeasurement
  ): { asymmetryDegree: number; isSignificant: boolean; affectedSide: Side } {
    const diff = Math.abs(leftMeasurement.angle - rightMeasurement.angle);
    const isSignificant = diff > 15; // 15도 이상 차이 = 유의미

    const affectedSide: Side = leftMeasurement.angle < rightMeasurement.angle
      ? 'left'
      : 'right';

    return {
      asymmetryDegree: diff,
      isSignificant,
      affectedSide,
    };
  }

  /**
   * XP 보상 계산
   */
  calculateXPReward(
    accuracy: number,
    combo: number = 0,
    phase: RehabPhase = 'RECOVERY'
  ): XPReward {
    // 기본 XP
    const baseXP = XP_CONFIG.basePerRep;

    // 정확도 보너스 (0-100%)
    const accuracyBonus = Math.round(accuracy * XP_CONFIG.accuracyMultiplier);

    // 스트릭 보너스
    const streakBonus = this.currentStreak * XP_CONFIG.streakMultiplier;

    // 단계 보너스
    const phaseMultiplier = XP_CONFIG.phaseBonus[phase];

    // 콤보 보너스
    const comboBonus = Math.round(baseXP * combo * XP_CONFIG.comboMultiplier);

    // 퍼펙트 보너스
    const perfectBonus = accuracy >= 100 ? XP_CONFIG.perfectRepBonus : 0;

    // 총 XP
    const subtotal = baseXP + accuracyBonus + streakBonus + comboBonus + perfectBonus;
    const total = Math.round(subtotal * phaseMultiplier);

    return {
      baseXP,
      accuracyBonus,
      streakBonus,
      phaseBonus: Math.round(subtotal * (phaseMultiplier - 1)),
      total,
    };
  }

  /**
   * 운동 반복 기록 (XP 및 콤보 업데이트)
   */
  recordRep(accuracy: number, phase: RehabPhase = 'RECOVERY'): XPReward {
    // 콤보 업데이트 (80% 이상 정확도 시 유지)
    if (accuracy >= 80) {
      this.currentCombo++;
    } else {
      this.currentCombo = 0;
    }

    // XP 계산 및 적립
    const reward = this.calculateXPReward(accuracy, this.currentCombo, phase);
    this.totalXP += reward.total;

    logger.debug('Rep recorded', {
      accuracy,
      combo: this.currentCombo,
      xpEarned: reward.total,
      totalXP: this.totalXP,
    });

    return reward;
  }

  /**
   * 콤보 리셋
   */
  resetCombo(): void {
    this.currentCombo = 0;
  }

  /**
   * 현재 콤보 조회
   */
  getCurrentCombo(): number {
    return this.currentCombo;
  }

  /**
   * 총 XP 조회
   */
  getTotalXP(): number {
    return this.totalXP;
  }

  /**
   * 레벨 계산 (100 XP = 1 레벨)
   */
  getLevel(): { level: number; currentXP: number; requiredXP: number; progress: number } {
    const xpPerLevel = 100;
    const level = Math.floor(this.totalXP / xpPerLevel) + 1;
    const currentXP = this.totalXP % xpPerLevel;
    const progress = (currentXP / xpPerLevel) * 100;

    return {
      level,
      currentXP,
      requiredXP: xpPerLevel,
      progress: Math.round(progress),
    };
  }

  /**
   * 스트릭 업데이트
   */
  updateStreak(exercisedToday: boolean): void {
    if (exercisedToday) {
      this.currentStreak++;
    } else {
      this.currentStreak = 0;
    }
  }

  /**
   * 현재 스트릭 조회
   */
  getCurrentStreak(): number {
    return this.currentStreak;
  }

  /**
   * 측정 기록 추가
   */
  addMeasurement(measurement: ROMMeasurement): void {
    this.measurementHistory.unshift(measurement);
    // 최대 100개 유지
    if (this.measurementHistory.length > 100) {
      this.measurementHistory = this.measurementHistory.slice(0, 100);
    }
  }

  /**
   * 측정 기록 조회
   */
  getMeasurementHistory(options?: {
    joint?: JointType;
    movement?: MovementType;
    side?: Side;
    limit?: number;
  }): ROMMeasurement[] {
    let results = [...this.measurementHistory];

    if (options?.joint) {
      results = results.filter((m) => m.jointType === options.joint);
    }
    if (options?.movement) {
      results = results.filter((m) => m.movementType === options.movement);
    }
    if (options?.side) {
      results = results.filter((m) => m.side === options.side);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * CalibrationJoint를 JointType/MovementType으로 변환
   */
  parseCalibrationJoint(joint: CalibrationJoint): {
    jointType: JointType;
    movementType: MovementType
  } | null {
    const mapping: Record<string, { jointType: JointType; movementType: MovementType }> = {
      shoulder_flexion: { jointType: 'shoulder', movementType: 'flexion' },
      shoulder_abduction: { jointType: 'shoulder', movementType: 'abduction' },
      elbow_flexion: { jointType: 'elbow', movementType: 'flexion' },
      knee_flexion: { jointType: 'knee', movementType: 'flexion' },
      hip_flexion: { jointType: 'hip', movementType: 'flexion' },
      hip_abduction: { jointType: 'hip', movementType: 'abduction' },
    };

    return mapping[joint] || null;
  }

  /**
   * 상태 초기화
   */
  reset(): void {
    this.measurementHistory = [];
    this.currentStreak = 0;
    this.currentCombo = 0;
    this.totalXP = 0;
  }
}

// ============================================================
// 싱글톤 인스턴스
// ============================================================

export const romService = new ROMService();
export default romService;
