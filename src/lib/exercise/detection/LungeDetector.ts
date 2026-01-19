/**
 * 런지 감지기
 * BaseDetector 상속
 *
 * 측정: 앞 무릎 각도
 * 동작: 한 발을 앞으로 내딛어 무릎을 굽힘
 * 특이사항: 앞쪽 다리 기준으로 측정
 */

import type { Landmark } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import { BaseDetector, type ExercisePhase } from './BaseDetector';
import { calculateHybridAngle } from '@/lib/calibration/depthCorrection';

// 런지 기본 설정
const LUNGE_DEFAULTS = {
  startAngle: 170,      // 서있는 자세
  targetAngle: 90,      // 무릎 90도
  tolerance: 15,
  holdTime: 0.3,
};

export class LungeDetector extends BaseDetector {
  private currentSide: 'left' | 'right' = 'left';

  constructor() {
    super('lunge', 'knee', {
      minCooldown: 500,
      maxCooldown: 1500,
      adaptiveScale: 0.3,
    });

    this.thresholds = {
      startAngle: {
        center: LUNGE_DEFAULTS.startAngle,
        min: LUNGE_DEFAULTS.startAngle - LUNGE_DEFAULTS.tolerance,
        max: 180,
      },
      targetAngle: LUNGE_DEFAULTS.targetAngle,
      completionThreshold: {
        minAngle: LUNGE_DEFAULTS.targetAngle + LUNGE_DEFAULTS.tolerance,
        holdTime: LUNGE_DEFAULTS.holdTime,
      },
      returnThreshold: {
        maxAngle: LUNGE_DEFAULTS.startAngle - 20,
      },
      totalROM: LUNGE_DEFAULTS.startAngle - LUNGE_DEFAULTS.targetAngle,
      calculatedAt: new Date(),
    };
    this.requiredHoldTime = LUNGE_DEFAULTS.holdTime;
  }

  reset(): void {
    super.reset();
    this.currentSide = 'left';
  }

  protected calculateAngle(
    landmarks: Landmark[]
  ): { angle: number; confidence: number } | null {
    // 양쪽 무릎 위치 확인하여 앞쪽 다리 판단
    const leftKnee = landmarks[PoseLandmark.LEFT_KNEE];
    const rightKnee = landmarks[PoseLandmark.RIGHT_KNEE];

    if (!leftKnee || !rightKnee) return null;

    // 더 앞에 있는 다리 선택 (y값이 더 큰 쪽이 카메라에 가까움)
    // 또는 z값이 더 작은 쪽
    if (leftKnee.z < rightKnee.z) {
      this.currentSide = 'left';
      return this.calculateKneeAngle(landmarks, 'left');
    } else {
      this.currentSide = 'right';
      return this.calculateKneeAngle(landmarks, 'right');
    }
  }

  private calculateKneeAngle(
    landmarks: Landmark[],
    side: 'left' | 'right'
  ): { angle: number; confidence: number } | null {
    const hip = landmarks[side === 'left' ? PoseLandmark.LEFT_HIP : PoseLandmark.RIGHT_HIP];
    const knee = landmarks[side === 'left' ? PoseLandmark.LEFT_KNEE : PoseLandmark.RIGHT_KNEE];
    const ankle = landmarks[side === 'left' ? PoseLandmark.LEFT_ANKLE : PoseLandmark.RIGHT_ANKLE];

    if (!hip || !knee || !ankle) return null;

    const result = calculateHybridAngle(hip, knee, ankle);
    return { angle: result.angle, confidence: result.confidence };
  }

  protected isInStartPosition(angle: number): boolean {
    return angle >= this.thresholds.startAngle.min;
  }

  protected isMovingTowardsTarget(angle: number): boolean {
    return angle < this.thresholds.startAngle.center - 15;
  }

  protected hasReachedTarget(angle: number): boolean {
    return angle <= this.thresholds.completionThreshold.minAngle;
  }

  protected isNearTarget(angle: number): boolean {
    return angle <= this.thresholds.targetAngle + 25;
  }

  protected isReturningBeforeTarget(angle: number): boolean {
    return this.angleVelocity > 5 && angle > this.thresholds.targetAngle + 30;
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
      const accuracy = this.repAccuracies[this.repAccuracies.length - 1] || 0;
      if (accuracy >= 90) return '완벽해요!';
      if (accuracy >= 70) return '좋아요!';
      return '더 깊게 내려가 보세요';
    }

    switch (this.currentPhase) {
      case 'IDLE':
        return '런지 시작 자세를 잡아주세요';
      case 'READY':
        return '한 발을 앞으로 내딛으세요';
      case 'MOVING':
        if (progress < 0.5) return '무릎을 더 굽히세요';
        return '거의 다 왔어요!';
      case 'HOLDING':
        return '유지하세요!';
      case 'RETURNING':
        return '천천히 일어나세요';
      case 'COOLDOWN':
        return '잠시 쉬세요';
      default:
        return '';
    }
  }

  getCurrentSide(): 'left' | 'right' {
    return this.currentSide;
  }
}

let lungeDetectorInstance: LungeDetector | null = null;

export function getLungeDetector(): LungeDetector {
  if (!lungeDetectorInstance) {
    lungeDetectorInstance = new LungeDetector();
  }
  return lungeDetectorInstance;
}

export function resetLungeDetector(): void {
  if (lungeDetectorInstance) {
    lungeDetectorInstance.reset();
  }
  lungeDetectorInstance = null;
}
