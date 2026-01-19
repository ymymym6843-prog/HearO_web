/**
 * 하이니즈 감지기
 * BaseDetector 상속
 *
 * 측정: 무릎 높이 (서서 제자리 뛰기)
 * 동작: 무릎을 높이 들어 빠르게 교대
 * 특이사항: 속도 감지, 연속 동작
 */

import type { Landmark } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import { BaseDetector, type ExercisePhase } from './BaseDetector';
import { calculateHybridAngle } from '@/lib/calibration/depthCorrection';

// 하이니즈 기본 설정
const HIGH_KNEES_DEFAULTS = {
  startAngle: 170,       // 시작 (서있는 자세)
  targetAngle: 90,       // 목표 (무릎 90도 이상)
  tolerance: 15,
  holdTime: 0.1,         // 빠른 동작이므로 홀드 짧음
};

// MVP: 속도 제한 필터 (노이즈 방지)
const VELOCITY_LIMITS = {
  maxVelocity: 30,       // 프레임당 최대 각도 변화 (초당 ~180도)
  minVelocity: 3,        // 유효 움직임 최소 속도
};

export class HighKneesDetector extends BaseDetector {
  private currentSide: 'left' | 'right' = 'left';
  private sideReps: { left: number; right: number } = { left: 0, right: 0 };
  private lastKneeHeight: { left: number; right: number } = { left: 0, right: 0 };

  constructor() {
    super('high_knees', 'hip', {
      minCooldown: 100,  // 빠른 동작
      maxCooldown: 300,
      adaptiveScale: 0.2,
    });

    this.thresholds = {
      startAngle: {
        center: HIGH_KNEES_DEFAULTS.startAngle,
        min: HIGH_KNEES_DEFAULTS.startAngle - HIGH_KNEES_DEFAULTS.tolerance,
        max: 180,
      },
      targetAngle: HIGH_KNEES_DEFAULTS.targetAngle,
      completionThreshold: {
        minAngle: HIGH_KNEES_DEFAULTS.targetAngle + HIGH_KNEES_DEFAULTS.tolerance,
        holdTime: HIGH_KNEES_DEFAULTS.holdTime,
      },
      returnThreshold: {
        maxAngle: HIGH_KNEES_DEFAULTS.startAngle - 30, // 빠른 복귀
      },
      totalROM: HIGH_KNEES_DEFAULTS.startAngle - HIGH_KNEES_DEFAULTS.targetAngle,
      calculatedAt: new Date(),
    };
    this.requiredHoldTime = HIGH_KNEES_DEFAULTS.holdTime;
  }

  reset(): void {
    super.reset();
    this.currentSide = 'left';
    this.sideReps = { left: 0, right: 0 };
    this.lastKneeHeight = { left: 0, right: 0 };
  }

  protected calculateAngle(
    landmarks: Landmark[]
  ): { angle: number; confidence: number } | null {
    // 양쪽 무릎 각도 모두 계산
    const leftResult = this.calculateHipFlexion(landmarks, 'left');
    const rightResult = this.calculateHipFlexion(landmarks, 'right');

    if (!leftResult || !rightResult) {
      return leftResult || rightResult || null;
    }

    // 더 높이 든 쪽 감지
    if (leftResult.angle < rightResult.angle) {
      this.currentSide = 'left';
      return leftResult;
    } else {
      this.currentSide = 'right';
      return rightResult;
    }
  }

  private calculateHipFlexion(
    landmarks: Landmark[],
    side: 'left' | 'right'
  ): { angle: number; confidence: number } | null {
    const shoulder = landmarks[side === 'left' ? PoseLandmark.LEFT_SHOULDER : PoseLandmark.RIGHT_SHOULDER];
    const hip = landmarks[side === 'left' ? PoseLandmark.LEFT_HIP : PoseLandmark.RIGHT_HIP];
    const knee = landmarks[side === 'left' ? PoseLandmark.LEFT_KNEE : PoseLandmark.RIGHT_KNEE];

    if (!shoulder || !hip || !knee) return null;

    const result = calculateHybridAngle(shoulder, hip, knee);

    // 무릎 높이 기록
    this.lastKneeHeight[side] = 1 - knee.y; // y가 낮을수록 높이 들어올림

    return { angle: result.angle, confidence: result.confidence };
  }

  protected completeRep(angle: number, confidence: number): void {
    super.completeRep(angle, confidence);
    this.sideReps[this.currentSide]++;
  }

  protected isInStartPosition(angle: number): boolean {
    return angle >= this.thresholds.startAngle.min - 20;
  }

  protected isMovingTowardsTarget(angle: number): boolean {
    // MVP: 속도 제한 필터 - 너무 빠른 움직임은 노이즈로 간주
    const velocity = Math.abs(this.angleVelocity);
    if (velocity > VELOCITY_LIMITS.maxVelocity) {
      return false; // 노이즈 무시
    }
    return angle < this.thresholds.startAngle.center - 20;
  }

  protected hasReachedTarget(angle: number): boolean {
    // MVP: 속도 제한 필터 - 너무 빠른 움직임은 노이즈로 간주
    const velocity = Math.abs(this.angleVelocity);
    if (velocity > VELOCITY_LIMITS.maxVelocity) {
      return false; // 노이즈 무시
    }
    return angle <= this.thresholds.completionThreshold.minAngle;
  }

  protected isNearTarget(angle: number): boolean {
    return angle <= this.thresholds.targetAngle + 30;
  }

  protected isReturningBeforeTarget(angle: number): boolean {
    return this.angleVelocity > 10 && angle > this.thresholds.targetAngle + 40;
  }

  protected hasReturnedToStart(angle: number): boolean {
    return angle >= this.thresholds.returnThreshold.maxAngle;
  }

  protected calculateProgress(angle: number): number {
    const { center: startAngle } = this.thresholds.startAngle;
    const { targetAngle } = this.thresholds;

    if (angle >= startAngle) return 0;
    if (angle <= targetAngle) return 1;

    return (startAngle - angle) / (startAngle - targetAngle);
  }

  protected generateFeedback(
    angle: number,
    progress: number,
    transition: { to: ExercisePhase } | null
  ): string {
    if (transition?.to === 'COOLDOWN') {
      return '좋아요! 계속!';
    }

    switch (this.currentPhase) {
      case 'IDLE':
        return '제자리에서 뛰기 준비';
      case 'READY':
        return '무릎을 높이 들어요!';
      case 'MOVING':
        if (progress < 0.5) return '더 높이!';
        return '좋아요!';
      case 'HOLDING':
        return '유지!';
      case 'RETURNING':
        return '빠르게!';
      case 'COOLDOWN':
        return `${this.repCount}회!`;
      default:
        return '';
    }
  }

  getCurrentSide(): 'left' | 'right' {
    return this.currentSide;
  }

  getSideReps(): { left: number; right: number } {
    return { ...this.sideReps };
  }

  /**
   * 페이스 계산 (분당 횟수 추정)
   */
  calculatePace(): number {
    if (this.repAccuracies.length < 2) return 0;

    // 최근 n회의 평균 시간으로 페이스 추정
    const _maxRepsForAverage = Math.min(10, this.repAccuracies.length); // 향후 평균 계산용
    const avgRepTime = this.lastRepDuration / 1000; // 초
    if (avgRepTime <= 0) return 0;

    return Math.round(60 / avgRepTime);
  }
}

let highKneesDetectorInstance: HighKneesDetector | null = null;

export function getHighKneesDetector(): HighKneesDetector {
  if (!highKneesDetectorInstance) {
    highKneesDetectorInstance = new HighKneesDetector();
  }
  return highKneesDetectorInstance;
}

export function resetHighKneesDetector(): void {
  if (highKneesDetectorInstance) {
    highKneesDetectorInstance.reset();
  }
  highKneesDetectorInstance = null;
}
