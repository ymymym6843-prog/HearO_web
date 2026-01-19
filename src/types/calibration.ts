/**
 * 캘리브레이션 타입 정의
 * 사용자별 ROM 측정 및 임계값 자동 설정
 */

import type { ExerciseType, JointType } from './exercise';

// 신체 측면 (좌/우)
export type Side = 'LEFT' | 'RIGHT';

// 동작 유형
export type MovementType =
  | 'flexion'      // 굴곡
  | 'extension'    // 신전
  | 'abduction'    // 외전
  | 'adduction'    // 내전
  | 'rotation'     // 회전
  | 'lateral';     // 측굴

// 캘리브레이션 상태
export type CalibrationStatus =
  | 'IDLE'        // 대기
  | 'PREPARING'   // 준비 중
  | 'RESTING'     // 휴식 자세 측정
  | 'MAX_ROM'     // 최대 ROM 측정
  | 'CALCULATING' // 계산 중
  | 'COMPLETE'    // 완료
  | 'ERROR';      // 오류

// 캘리브레이션 설정
export interface CalibrationSettings {
  targetPercent: number;          // 최대 ROM의 몇 %를 목표로 (0-100)
  tolerancePercent: number;       // 허용 오차 범위 %
  holdTime: number;               // 목표 도달 후 유지 시간 (초)
  minRepDuration: number;         // 최소 1회 소요 시간 (초)
  cooldownTime: number;           // 반복 완료 후 쿨다운 (초)
  minAccuracy: number;            // 최소 정확도 (0-100)
  validityDays: number;           // 유효 기간 (일)
}

// 임계값 결과
export interface ThresholdResult {
  startAngle: {
    center: number;
    min: number;
    max: number;
  };
  targetAngle: number;
  completionThreshold: {
    minAngle: number;
    holdTime: number;
  };
  returnThreshold: {
    maxAngle: number;
  };
  totalROM: number;
  calculatedAt: Date;
}

// 캘리브레이션 결과 (저장용)
export interface CalibrationResult {
  id: string;
  userId: string;
  exerciseType: ExerciseType;
  jointType: JointType;
  movementType: MovementType;
  side: Side | 'BOTH';

  // 측정값
  restingAngle: number;
  maxROMAngle: number;

  // 임계값
  thresholds: ThresholdResult;
  settings: CalibrationSettings;

  // 신뢰도
  confidence: number;

  // 메타
  calibratedAt: Date;
  isValid: boolean;
  expiresAt: Date;
}

// 캘리브레이션 세션 상태
export interface CalibrationSession {
  status: CalibrationStatus;
  currentStep: number;
  totalSteps: number;
  jointType: JointType;
  exerciseType: ExerciseType;
  side: Side | 'BOTH';

  // 측정 데이터
  restingAngleSamples: number[];
  maxROMAngleSamples: number[];
  currentAngle: number;
  currentConfidence: number;

  // 안정성
  isStable: boolean;
  stabilityDuration: number;

  // 가이드
  currentInstruction: string;
  feedbackMessage?: string;
  errorMessage?: string;
}

// 기본 캘리브레이션 설정
export const DEFAULT_CALIBRATION_SETTINGS: CalibrationSettings = {
  targetPercent: 80,
  tolerancePercent: 10,
  holdTime: 1,
  minRepDuration: 2,
  cooldownTime: 0.5,
  minAccuracy: 70,
  validityDays: 30,
};
