/**
 * 플랭크 홀드 감지기
 * BaseDetector 상속
 *
 * 측정: 몸통 정렬 (등척성 운동)
 * 동작: 플랭크 자세 유지
 * 특이사항: 타이머 기반 (홀드 시간 측정)
 */

import type { Landmark } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import { BaseDetector, type ExercisePhase } from './BaseDetector';
import { calculateHybridAngle } from '@/lib/calibration/depthCorrection';

// 플랭크 기본 설정
const PLANK_DEFAULTS = {
  targetAngle: 170,      // 몸통 일직선 (160-180도)
  tolerance: 15,
  holdTime: 30,          // 기본 30초 홀드
  minAlignmentAngle: 155, // 최소 정렬 각도
};

export class PlankHoldDetector extends BaseDetector {
  private totalHoldTime: number = 0;
  private targetHoldTime: number = PLANK_DEFAULTS.holdTime;
  private isHolding: boolean = false;
  private holdingStartTime: number = 0;

  constructor() {
    super('plank_hold', 'spine', {
      minCooldown: 1000,
      maxCooldown: 3000,
      adaptiveScale: 0.3,
    });

    this.thresholds = {
      startAngle: {
        center: PLANK_DEFAULTS.targetAngle,
        min: PLANK_DEFAULTS.minAlignmentAngle,
        max: 180,
      },
      targetAngle: PLANK_DEFAULTS.targetAngle,
      completionThreshold: {
        minAngle: PLANK_DEFAULTS.minAlignmentAngle,
        holdTime: PLANK_DEFAULTS.holdTime,
      },
      returnThreshold: {
        maxAngle: PLANK_DEFAULTS.minAlignmentAngle - 10,
      },
      totalROM: 20, // 플랭크는 ROM이 작음
      calculatedAt: new Date(),
    };
    this.requiredHoldTime = PLANK_DEFAULTS.holdTime;
  }

  reset(): void {
    super.reset();
    this.totalHoldTime = 0;
    this.isHolding = false;
    this.holdingStartTime = 0;
  }

  setTargetHoldTime(seconds: number): void {
    this.targetHoldTime = seconds;
    this.requiredHoldTime = seconds;
  }

  /**
   * 몸통 정렬 각도 계산 (어깨-엉덩이-발목)
   */
  protected calculateAngle(
    landmarks: Landmark[]
  ): { angle: number; confidence: number } | null {
    // 좌우 평균
    const leftResult = this.calculateBodyAlignment(landmarks, 'left');
    const rightResult = this.calculateBodyAlignment(landmarks, 'right');

    if (!leftResult && !rightResult) return null;

    if (leftResult && rightResult) {
      return {
        angle: (leftResult.angle + rightResult.angle) / 2,
        confidence: (leftResult.confidence + rightResult.confidence) / 2,
      };
    }

    return leftResult || rightResult || null;
  }

  private calculateBodyAlignment(
    landmarks: Landmark[],
    side: 'left' | 'right'
  ): { angle: number; confidence: number } | null {
    const shoulder = landmarks[side === 'left' ? PoseLandmark.LEFT_SHOULDER : PoseLandmark.RIGHT_SHOULDER];
    const hip = landmarks[side === 'left' ? PoseLandmark.LEFT_HIP : PoseLandmark.RIGHT_HIP];
    const ankle = landmarks[side === 'left' ? PoseLandmark.LEFT_ANKLE : PoseLandmark.RIGHT_ANKLE];

    if (!shoulder || !hip || !ankle) return null;

    const result = calculateHybridAngle(shoulder, hip, ankle);
    return { angle: result.angle, confidence: result.confidence };
  }

  /**
   * 플랭크 상태 머신 (타이머 기반)
   */
  processFrame(landmarks: Landmark[]): ReturnType<BaseDetector['processFrame']> {
    const result = super.processFrame(landmarks);
    const now = Date.now();

    // 플랭크 유지 시간 계산
    if (this.currentPhase === 'HOLDING' && this.isGoodAlignment(result.currentAngle)) {
      if (!this.isHolding) {
        this.isHolding = true;
        this.holdingStartTime = now;
      }
      this.totalHoldTime = (now - this.holdingStartTime) / 1000;
    } else {
      this.isHolding = false;
    }

    // 목표 시간 도달 시 완료
    if (this.totalHoldTime >= this.targetHoldTime && this.currentPhase === 'HOLDING') {
      this.repCount++;
      this.totalHoldTime = 0;
      this.isHolding = false;
      this.holdingStartTime = 0; // 홀드 시작 시간도 리셋
    }

    return {
      ...result,
      holdProgress: Math.min(1, this.totalHoldTime / this.targetHoldTime),
    };
  }

  private isGoodAlignment(angle: number): boolean {
    return angle >= PLANK_DEFAULTS.minAlignmentAngle;
  }

  protected isInStartPosition(angle: number): boolean {
    return angle >= this.thresholds.startAngle.min;
  }

  protected isMovingTowardsTarget(angle: number): boolean {
    return angle >= PLANK_DEFAULTS.minAlignmentAngle;
  }

  protected hasReachedTarget(angle: number): boolean {
    return angle >= this.thresholds.completionThreshold.minAngle;
  }

  protected isNearTarget(angle: number): boolean {
    return angle >= PLANK_DEFAULTS.minAlignmentAngle - 10;
  }

  protected isReturningBeforeTarget(angle: number): boolean {
    return angle < PLANK_DEFAULTS.minAlignmentAngle - 20;
  }

  protected hasReturnedToStart(angle: number): boolean {
    // 플랭크는 복귀 개념이 다름 - 자세 무너짐
    return angle < this.thresholds.returnThreshold.maxAngle;
  }

  protected calculateProgress(_angle: number): number {
    // 플랭크 진행률은 시간 기반 (angle은 부모 클래스 시그니처 유지용)
    return Math.min(1, this.totalHoldTime / this.targetHoldTime);
  }

  protected generateFeedback(
    angle: number,
    _progress: number,
    _transition: { to: ExercisePhase } | null
  ): string {
    const remainingTime = Math.max(0, this.targetHoldTime - this.totalHoldTime);

    if (this.totalHoldTime >= this.targetHoldTime) {
      return '목표 달성!';
    }

    if (!this.isGoodAlignment(angle)) {
      if (angle < 140) {
        return '엉덩이를 내리세요!';
      } else if (angle > 180) {
        return '엉덩이를 올리세요!';
      }
      return '자세를 바르게!';
    }

    switch (this.currentPhase) {
      case 'IDLE':
        return '플랭크 자세를 잡으세요';
      case 'READY':
        return '좋아요! 유지하세요';
      case 'HOLDING':
        if (remainingTime > 20) return `${Math.ceil(remainingTime)}초 남음`;
        if (remainingTime > 10) return '절반 지났어요! 힘내세요!';
        return `${Math.ceil(remainingTime)}초! 거의 다 됐어요!`;
      default:
        return '플랭크 자세 유지';
    }
  }

  getTotalHoldTime(): number {
    return this.totalHoldTime;
  }

  getTargetHoldTime(): number {
    return this.targetHoldTime;
  }
}

let plankHoldDetectorInstance: PlankHoldDetector | null = null;

export function getPlankHoldDetector(): PlankHoldDetector {
  if (!plankHoldDetectorInstance) {
    plankHoldDetectorInstance = new PlankHoldDetector();
  }
  return plankHoldDetectorInstance;
}

export function resetPlankHoldDetector(): void {
  if (plankHoldDetectorInstance) {
    plankHoldDetectorInstance.reset();
  }
  plankHoldDetectorInstance = null;
}
