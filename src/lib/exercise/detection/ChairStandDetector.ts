/**
 * 의자 앉았다 일어나기 감지기 (ChairStandDetector)
 *
 * 대상 운동:
 * - chair_stand: 의자에서 앉았다 일어나기
 *
 * 측정 관절: 무릎 (엉덩이-무릎-발목 각도)
 * 모드: big_is_down (각도가 클수록 서있는 상태)
 * 특징: 스쿼트와 유사하지만 더 깊은 각도 (의자 높이까지)
 */

import type { Landmark } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import { BaseDetector, type ExercisePhase } from './BaseDetector';
import { calculateHybridAngle } from '@/lib/calibration/depthCorrection';

// 의자 앉았다 일어나기 기본 설정
const CHAIR_STAND_DEFAULTS = {
  startAngle: 165,         // 시작 각도 (서있는 자세)
  targetAngle: 90,         // 목표 각도 (앉은 자세, 의자 높이)
  tolerance: 15,           // 허용 오차
  holdTime: 0.3,           // 짧은 홀드 (의자에 완전히 앉았다 바로 일어남)
};

export class ChairStandDetector extends BaseDetector {
  private useAverageBothKnees = true;

  constructor() {
    super('chair_stand', 'knee', {
      minCooldown: 500,
      maxCooldown: 1500,
      adaptiveScale: 0.4,
    });

    // 임계값 설정 (big_is_down 모드)
    this.thresholds = {
      startAngle: {
        center: CHAIR_STAND_DEFAULTS.startAngle,
        min: CHAIR_STAND_DEFAULTS.startAngle - CHAIR_STAND_DEFAULTS.tolerance,
        max: 180,
      },
      targetAngle: CHAIR_STAND_DEFAULTS.targetAngle,
      completionThreshold: {
        minAngle: CHAIR_STAND_DEFAULTS.targetAngle + CHAIR_STAND_DEFAULTS.tolerance,
        holdTime: CHAIR_STAND_DEFAULTS.holdTime,
      },
      returnThreshold: {
        maxAngle: CHAIR_STAND_DEFAULTS.startAngle - CHAIR_STAND_DEFAULTS.tolerance,
      },
      totalROM: CHAIR_STAND_DEFAULTS.startAngle - CHAIR_STAND_DEFAULTS.targetAngle,
      calculatedAt: new Date(),
    };
    this.requiredHoldTime = CHAIR_STAND_DEFAULTS.holdTime;
  }

  /**
   * 무릎 각도 계산 (엉덩이-무릎-발목)
   */
  protected calculateAngle(
    landmarks: Landmark[]
  ): { angle: number; confidence: number } | null {
    const leftKnee = this.calculateKneeAngle(landmarks, 'left');
    const rightKnee = this.calculateKneeAngle(landmarks, 'right');

    if (!leftKnee && !rightKnee) return null;

    if (this.useAverageBothKnees && leftKnee && rightKnee) {
      return {
        angle: (leftKnee.angle + rightKnee.angle) / 2,
        confidence: (leftKnee.confidence + rightKnee.confidence) / 2,
      };
    }

    return leftKnee || rightKnee || null;
  }

  private calculateKneeAngle(
    landmarks: Landmark[],
    side: 'left' | 'right'
  ): { angle: number; confidence: number } | null {
    const indices =
      side === 'left'
        ? {
            p1: PoseLandmark.LEFT_HIP,
            p2: PoseLandmark.LEFT_KNEE,
            p3: PoseLandmark.LEFT_ANKLE,
          }
        : {
            p1: PoseLandmark.RIGHT_HIP,
            p2: PoseLandmark.RIGHT_KNEE,
            p3: PoseLandmark.RIGHT_ANKLE,
          };

    const p1 = landmarks[indices.p1];
    const p2 = landmarks[indices.p2];
    const p3 = landmarks[indices.p3];

    if (!p1 || !p2 || !p3) return null;

    const result = calculateHybridAngle(p1, p2, p3);
    return {
      angle: result.angle,
      confidence: result.confidence,
    };
  }

  /**
   * 시작 자세 체크 (서있는 자세)
   */
  protected isInStartPosition(angle: number): boolean {
    return angle >= this.thresholds.startAngle.min;
  }

  /**
   * 목표 방향 이동 체크 (앉는 동작 = 각도 감소)
   */
  protected isMovingTowardsTarget(angle: number): boolean {
    return angle < this.thresholds.startAngle.center - 15;
  }

  /**
   * 목표 도달 체크
   */
  protected hasReachedTarget(angle: number): boolean {
    return angle <= this.thresholds.completionThreshold.minAngle;
  }

  /**
   * 목표 근처 체크 (홀드용)
   */
  protected isNearTarget(angle: number): boolean {
    const tolerance = 20;
    return angle <= this.thresholds.targetAngle + tolerance;
  }

  /**
   * 조기 복귀 체크
   */
  protected isReturningBeforeTarget(angle: number): boolean {
    return this.angleVelocity > 5 && angle > this.thresholds.targetAngle + 30;
  }

  /**
   * 시작 위치 복귀 체크
   */
  protected hasReturnedToStart(angle: number): boolean {
    return angle >= this.thresholds.returnThreshold.maxAngle;
  }

  /**
   * 진행률 계산
   */
  protected calculateProgress(angle: number): number {
    const { center: startAngle } = this.thresholds.startAngle;
    const { targetAngle } = this.thresholds;

    if (angle >= startAngle) return 0;
    if (angle <= targetAngle) return 1;

    return (startAngle - angle) / (startAngle - targetAngle);
  }

  /**
   * 피드백 커스터마이징
   */
  protected generateFeedback(
    angle: number,
    progress: number,
    transition: { to: ExercisePhase } | null
  ): string {
    if (transition?.to === 'COOLDOWN') {
      const accuracy = this.repAccuracies[this.repAccuracies.length - 1] || 0;
      if (accuracy >= 90) return '완벽해요!';
      if (accuracy >= 70) return '좋아요!';
      return '의자에 완전히 앉으세요';
    }

    switch (this.currentPhase) {
      case 'IDLE':
        return '의자 앞에 서세요';
      case 'READY':
        return '천천히 앉으세요';
      case 'MOVING':
        if (progress < 0.3) return '더 앉아주세요';
        if (progress < 0.6) return '좋아요!';
        if (progress < 0.9) return '거의 다 왔어요!';
        return '의자에 앉았어요!';
      case 'HOLDING':
        return '잠시 유지!';
      case 'RETURNING':
        return '일어나세요';
      case 'COOLDOWN':
        return `${this.repCount}회 완료!`;
      default:
        return '';
    }
  }
}

// 싱글톤 인스턴스
let chairStandDetectorInstance: ChairStandDetector | null = null;

export function getChairStandDetector(): ChairStandDetector {
  if (!chairStandDetectorInstance) {
    chairStandDetectorInstance = new ChairStandDetector();
  }
  return chairStandDetectorInstance;
}

export function resetChairStandDetector(): void {
  if (chairStandDetectorInstance) {
    chairStandDetectorInstance.reset();
  }
  chairStandDetectorInstance = null;
}
