/**
 * 암레이즈 감지기 (Arm Raise / Shoulder Flexion)
 * BaseDetector 상속
 *
 * 측정: 어깨 굴곡 각도 (Shoulder Flexion)
 * 동작: 팔을 앞으로 들어올림 (시상면, Sagittal Plane)
 * 특이사항: 정면/측면 카메라 모두 가능, 팔꿈치 펴고 유지
 */

import type { Landmark } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import { BaseDetector, type ExercisePhase } from './BaseDetector';
import { calculateHybridAngle } from '@/lib/calibration/depthCorrection';

// 암레이즈 기본 설정
const ARM_RAISE_DEFAULTS = {
  startAngle: 20,       // 팔을 내리고 있을 때 (체간 옆)
  targetAngle: 150,     // 팔을 완전히 들어올렸을 때
  tolerance: 15,
  holdTime: 0.3,
};

export class ArmRaiseDetector extends BaseDetector {
  private currentSide: 'left' | 'right' | 'both' = 'both';

  constructor() {
    super('arm_raise', 'shoulder', {
      minCooldown: 400,
      maxCooldown: 1000,
      adaptiveScale: 0.3,
    });

    this.thresholds = {
      startAngle: {
        center: ARM_RAISE_DEFAULTS.startAngle,
        min: 0,
        max: ARM_RAISE_DEFAULTS.startAngle + ARM_RAISE_DEFAULTS.tolerance,
      },
      targetAngle: ARM_RAISE_DEFAULTS.targetAngle,
      completionThreshold: {
        minAngle: ARM_RAISE_DEFAULTS.targetAngle - ARM_RAISE_DEFAULTS.tolerance,
        holdTime: ARM_RAISE_DEFAULTS.holdTime,
      },
      returnThreshold: {
        maxAngle: ARM_RAISE_DEFAULTS.startAngle + 30,
      },
      totalROM: ARM_RAISE_DEFAULTS.targetAngle - ARM_RAISE_DEFAULTS.startAngle,
      calculatedAt: new Date(),
    };
    this.requiredHoldTime = ARM_RAISE_DEFAULTS.holdTime;
  }

  protected calculateAngle(
    landmarks: Landmark[]
  ): { angle: number; confidence: number } | null {
    // 양쪽 어깨 굴곡 각도 모두 계산
    const leftResult = this.calculateShoulderFlexionAngle(landmarks, 'left');
    const rightResult = this.calculateShoulderFlexionAngle(landmarks, 'right');

    if (!leftResult && !rightResult) return null;

    // 양쪽 모두 있으면 평균, 아니면 있는 쪽 사용
    if (leftResult && rightResult) {
      this.currentSide = 'both';
      return {
        angle: (leftResult.angle + rightResult.angle) / 2,
        confidence: Math.min(leftResult.confidence, rightResult.confidence),
      };
    }

    if (leftResult) {
      this.currentSide = 'left';
      return leftResult;
    }

    this.currentSide = 'right';
    return rightResult!;
  }

  /**
   * 어깨 굴곡 각도 계산
   * 고관절-어깨-손목 각도로 측정 (팔의 들어올림 정도)
   */
  private calculateShoulderFlexionAngle(
    landmarks: Landmark[],
    side: 'left' | 'right'
  ): { angle: number; confidence: number } | null {
    const hip = landmarks[side === 'left' ? PoseLandmark.LEFT_HIP : PoseLandmark.RIGHT_HIP];
    const shoulder = landmarks[side === 'left' ? PoseLandmark.LEFT_SHOULDER : PoseLandmark.RIGHT_SHOULDER];
    const wrist = landmarks[side === 'left' ? PoseLandmark.LEFT_WRIST : PoseLandmark.RIGHT_WRIST];

    if (!hip || !shoulder || !wrist) return null;

    // 고관절-어깨-손목 각도 계산
    // 팔이 아래에 있을 때: ~20도
    // 팔이 앞으로 뻗었을 때: ~90도
    // 팔이 위로 들렸을 때: ~150도+
    const result = calculateHybridAngle(hip, shoulder, wrist);
    return { angle: result.angle, confidence: result.confidence };
  }

  protected isInStartPosition(angle: number): boolean {
    // 팔이 아래에 있을 때 (0~35도)
    return angle <= this.thresholds.startAngle.max;
  }

  protected isMovingTowardsTarget(angle: number): boolean {
    // 팔이 들어올려지기 시작할 때
    return angle > this.thresholds.startAngle.max + 10;
  }

  protected hasReachedTarget(angle: number): boolean {
    // 목표 각도에 도달 (팔이 충분히 올라갔을 때)
    return angle >= this.thresholds.completionThreshold.minAngle;
  }

  protected isNearTarget(angle: number): boolean {
    // 목표 근처에 있을 때
    return angle >= this.thresholds.targetAngle - 25;
  }

  protected isReturningBeforeTarget(angle: number): boolean {
    // 목표 도달 전에 내려가기 시작
    return this.angleVelocity < -8 && angle < this.thresholds.targetAngle - 40;
  }

  protected hasReturnedToStart(angle: number): boolean {
    // 시작 위치로 복귀 (팔이 다시 내려왔을 때)
    return angle <= this.thresholds.returnThreshold.maxAngle;
  }

  protected calculateProgress(angle: number): number {
    const { center: startAngle } = this.thresholds.startAngle;
    const { targetAngle } = this.thresholds;

    if (angle <= startAngle) return 0;
    if (angle >= targetAngle) return 1;

    return (angle - startAngle) / (targetAngle - startAngle);
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
      return '팔을 더 높이 들어보세요';
    }

    switch (this.currentPhase) {
      case 'IDLE':
        return '팔을 내리고 준비하세요';
      case 'READY':
        return '팔꿈치를 펴고 들어올리세요';
      case 'MOVING':
        if (progress < 0.5) return '더 들어올리세요';
        return '거의 다 왔어요!';
      case 'HOLDING':
        return '잠깐 유지!';
      case 'RETURNING':
        return '천천히 내리세요';
      case 'COOLDOWN':
        return '좋아요!';
      default:
        return '';
    }
  }

  getCurrentSide(): 'left' | 'right' | 'both' {
    return this.currentSide;
  }
}

let armRaiseDetectorInstance: ArmRaiseDetector | null = null;

export function getArmRaiseDetector(): ArmRaiseDetector {
  if (!armRaiseDetectorInstance) {
    armRaiseDetectorInstance = new ArmRaiseDetector();
  }
  return armRaiseDetectorInstance;
}

export function resetArmRaiseDetector(): void {
  if (armRaiseDetectorInstance) {
    armRaiseDetectorInstance.reset();
  }
  armRaiseDetectorInstance = null;
}
