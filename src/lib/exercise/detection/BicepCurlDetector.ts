/**
 * 바이셉 컬 감지기
 * BaseDetector 상속
 *
 * 측정: 팔꿈치 각도
 * 동작: 팔을 굽혀 이두근 수축
 * 특이사항: 팔꿈치를 몸에 붙이고 고정
 */

import type { Landmark } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import { BaseDetector, type ExercisePhase } from './BaseDetector';
import { calculateHybridAngle } from '@/lib/calibration/depthCorrection';

// 바이셉 컬 기본 설정
const BICEP_CURL_DEFAULTS = {
  startAngle: 160,      // 팔을 펴고 있을 때
  targetAngle: 50,      // 팔을 완전히 굽혔을 때
  tolerance: 15,
  holdTime: 0.2,
};

export class BicepCurlDetector extends BaseDetector {
  private currentSide: 'left' | 'right' | 'both' = 'both';

  constructor() {
    super('bicep_curl', 'elbow', {
      minCooldown: 300,
      maxCooldown: 800,
      adaptiveScale: 0.25,
    });

    this.thresholds = {
      startAngle: {
        center: BICEP_CURL_DEFAULTS.startAngle,
        min: BICEP_CURL_DEFAULTS.startAngle - BICEP_CURL_DEFAULTS.tolerance,
        max: 180,
      },
      targetAngle: BICEP_CURL_DEFAULTS.targetAngle,
      completionThreshold: {
        minAngle: BICEP_CURL_DEFAULTS.targetAngle + BICEP_CURL_DEFAULTS.tolerance,
        holdTime: BICEP_CURL_DEFAULTS.holdTime,
      },
      returnThreshold: {
        maxAngle: BICEP_CURL_DEFAULTS.startAngle - 20,
      },
      totalROM: BICEP_CURL_DEFAULTS.startAngle - BICEP_CURL_DEFAULTS.targetAngle,
      calculatedAt: new Date(),
    };
    this.requiredHoldTime = BICEP_CURL_DEFAULTS.holdTime;
  }

  protected calculateAngle(
    landmarks: Landmark[]
  ): { angle: number; confidence: number } | null {
    // 양쪽 팔꿈치 각도 모두 계산
    const leftResult = this.calculateElbowAngle(landmarks, 'left');
    const rightResult = this.calculateElbowAngle(landmarks, 'right');

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

  private calculateElbowAngle(
    landmarks: Landmark[],
    side: 'left' | 'right'
  ): { angle: number; confidence: number } | null {
    const shoulder = landmarks[side === 'left' ? PoseLandmark.LEFT_SHOULDER : PoseLandmark.RIGHT_SHOULDER];
    const elbow = landmarks[side === 'left' ? PoseLandmark.LEFT_ELBOW : PoseLandmark.RIGHT_ELBOW];
    const wrist = landmarks[side === 'left' ? PoseLandmark.LEFT_WRIST : PoseLandmark.RIGHT_WRIST];

    if (!shoulder || !elbow || !wrist) return null;

    const result = calculateHybridAngle(shoulder, elbow, wrist);
    return { angle: result.angle, confidence: result.confidence };
  }

  protected isInStartPosition(angle: number): boolean {
    return angle >= this.thresholds.startAngle.min - 10;
  }

  protected isMovingTowardsTarget(angle: number): boolean {
    return angle < this.thresholds.startAngle.center - 20;
  }

  protected hasReachedTarget(angle: number): boolean {
    return angle <= this.thresholds.completionThreshold.minAngle;
  }

  protected isNearTarget(angle: number): boolean {
    return angle <= this.thresholds.targetAngle + 20;
  }

  protected isReturningBeforeTarget(angle: number): boolean {
    return this.angleVelocity > 8 && angle > this.thresholds.targetAngle + 40;
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
      return '팔을 더 굽혀보세요';
    }

    switch (this.currentPhase) {
      case 'IDLE':
        return '팔을 펴고 덤벨을 잡으세요';
      case 'READY':
        return '팔꿈치를 고정하고 굽히세요';
      case 'MOVING':
        if (progress < 0.5) return '더 굽히세요';
        return '이두근을 수축하세요';
      case 'HOLDING':
        return '잠깐 유지!';
      case 'RETURNING':
        return '천천히 펴세요';
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

let bicepCurlDetectorInstance: BicepCurlDetector | null = null;

export function getBicepCurlDetector(): BicepCurlDetector {
  if (!bicepCurlDetectorInstance) {
    bicepCurlDetectorInstance = new BicepCurlDetector();
  }
  return bicepCurlDetectorInstance;
}

export function resetBicepCurlDetector(): void {
  if (bicepCurlDetectorInstance) {
    bicepCurlDetectorInstance.reset();
  }
  bicepCurlDetectorInstance = null;
}
