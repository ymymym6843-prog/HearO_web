/**
 * 운동 감지 관련 타입 정의
 */

import type { ThresholdResult } from '@/types/calibration';

// 운동 상태
export type ExercisePhase =
  | 'IDLE'          // 대기 상태
  | 'READY'         // 시작 자세 감지
  | 'MOVING'        // 동작 중
  | 'HOLDING'       // 목표 위치 유지
  | 'RETURNING'     // 복귀 중
  | 'COOLDOWN';     // 쿨다운 (다음 반복 대기)

// 상태 전환 결과
export interface PhaseTransition {
  from: ExercisePhase;
  to: ExercisePhase;
  reason: string;
  timestamp: number;
}

// 감지 결과
export interface DetectionResult {
  phase: ExercisePhase;
  repCompleted: boolean;
  currentAngle: number;
  targetAngle: number;
  progress: number;        // 0-1 (목표 도달률)
  accuracy: number;        // 0-100 (자세 정확도)
  confidence: number;      // 0-1 (감지 신뢰도)
  feedback: string;        // 사용자 피드백
  holdProgress?: number;   // 홀드 진행률 (0-1)
}

// 쿨다운 설정
export interface CooldownConfig {
  minCooldown: number;     // 최소 쿨다운 (ms)
  maxCooldown: number;     // 최대 쿨다운 (ms)
  adaptiveScale: number;   // 적응형 스케일 (반복 시간 기반)
}

// 기본 쿨다운 설정
export const DEFAULT_COOLDOWN: CooldownConfig = {
  minCooldown: 500,
  maxCooldown: 2000,
  adaptiveScale: 0.5,
};

// 기본 임계값 (캘리브레이션 없을 때)
export const DEFAULT_THRESHOLDS: ThresholdResult = {
  startAngle: { center: 170, min: 160, max: 180 },
  targetAngle: 90,
  completionThreshold: { minAngle: 100, holdTime: 0.5 },
  returnThreshold: { maxAngle: 160 },
  totalROM: 80,
  calculatedAt: new Date(),
};
