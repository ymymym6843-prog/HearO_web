/**
 * 팔꿈치 굽히기 감지기 (ElbowFlexionDetector)
 *
 * 대상 운동:
 * - elbow_flexion: 팔꿈치 굽히기 (180° → 45°)
 *
 * 측정 관절: 팔꿈치 (어깨-팔꿈치-손목 각도)
 * 모드: big_is_down (각도가 클수록 DOWN/펴진 상태)
 */

import type { Landmark } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import { BaseDetector, type ExercisePhase } from './BaseDetector';
import { calculateJointAngle, type JointIndices } from './utils';

// 팔꿈치 굽히기 기본 설정
const ELBOW_FLEXION_DEFAULTS = {
  startAngle: 160,        // 시작 각도 (팔 펴진 상태)
  targetAngle: 50,        // 목표 각도 (팔 굽힌 상태)
  tolerance: 15,          // 허용 오차
  holdTime: 0.5,          // 홀드 시간
};

export class ElbowFlexionDetector extends BaseDetector {
  private useAverageBothArms = true;

  constructor() {
    super('elbow_flexion', 'elbow', {
      minCooldown: 500,
      maxCooldown: 1500,
      adaptiveScale: 0.4,
    });

    // 임계값 설정 (big_is_down 모드: 값이 클수록 DOWN/펴진 상태)
    this.thresholds = {
      startAngle: {
        center: ELBOW_FLEXION_DEFAULTS.startAngle,
        min: ELBOW_FLEXION_DEFAULTS.startAngle - ELBOW_FLEXION_DEFAULTS.tolerance,
        max: 180,
      },
      targetAngle: ELBOW_FLEXION_DEFAULTS.targetAngle,
      completionThreshold: {
        minAngle: ELBOW_FLEXION_DEFAULTS.targetAngle + ELBOW_FLEXION_DEFAULTS.tolerance,
        holdTime: ELBOW_FLEXION_DEFAULTS.holdTime,
      },
      returnThreshold: {
        maxAngle: ELBOW_FLEXION_DEFAULTS.startAngle - ELBOW_FLEXION_DEFAULTS.tolerance,
      },
      totalROM: ELBOW_FLEXION_DEFAULTS.startAngle - ELBOW_FLEXION_DEFAULTS.targetAngle,
      calculatedAt: new Date(),
    };
    this.requiredHoldTime = ELBOW_FLEXION_DEFAULTS.holdTime;
  }

  /**
   * 팔꿈치 각도 계산 (어깨-팔꿈치-손목)
   */
  protected calculateAngle(
    landmarks: Landmark[]
  ): { angle: number; confidence: number } | null {
    const leftElbow = this.calculateElbowAngle(landmarks, 'left');
    const rightElbow = this.calculateElbowAngle(landmarks, 'right');

    if (!leftElbow && !rightElbow) return null;

    if (this.useAverageBothArms && leftElbow && rightElbow) {
      return {
        angle: (leftElbow.angle + rightElbow.angle) / 2,
        confidence: (leftElbow.confidence + rightElbow.confidence) / 2,
      };
    }

    return leftElbow || rightElbow || null;
  }

  private calculateElbowAngle(
    landmarks: Landmark[],
    side: 'left' | 'right'
  ): { angle: number; confidence: number } | null {
    const indices: JointIndices =
      side === 'left'
        ? {
            p1: PoseLandmark.LEFT_SHOULDER,
            p2: PoseLandmark.LEFT_ELBOW,
            p3: PoseLandmark.LEFT_WRIST,
          }
        : {
            p1: PoseLandmark.RIGHT_SHOULDER,
            p2: PoseLandmark.RIGHT_ELBOW,
            p3: PoseLandmark.RIGHT_WRIST,
          };

    return calculateJointAngle(landmarks, indices);
  }

  /**
   * 시작 자세 체크 (팔 펴진 상태)
   */
  protected isInStartPosition(angle: number): boolean {
    return angle >= this.thresholds.startAngle.min;
  }

  /**
   * 목표 방향 이동 체크 (팔 굽히는 동작 = 각도 감소)
   * big_is_down 모드이므로 각도가 감소하면 목표로 이동
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
    // 목표 도달 전에 각도가 다시 증가하면 조기 복귀
    return this.angleVelocity > 5 && angle > this.thresholds.targetAngle + 40;
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

    // big_is_down: 시작 > 목표 (굴곡 운동)
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
      return '조금 더 굽혀보세요';
    }

    switch (this.currentPhase) {
      case 'IDLE':
        return '팔을 펴고 준비하세요';
      case 'READY':
        return '천천히 팔을 굽히세요';
      case 'MOVING':
        if (progress < 0.3) return '더 굽혀주세요';
        if (progress < 0.6) return '좋아요, 계속!';
        if (progress < 0.9) return '거의 다 왔어요!';
        return '목표 도달!';
      case 'HOLDING':
        return '잠시 유지!';
      case 'RETURNING':
        return '천천히 펴주세요';
      case 'COOLDOWN':
        return `${this.repCount}회 완료!`;
      default:
        return '';
    }
  }
}

// 싱글톤 인스턴스
let elbowFlexionDetectorInstance: ElbowFlexionDetector | null = null;

export function getElbowFlexionDetector(): ElbowFlexionDetector {
  if (!elbowFlexionDetectorInstance) {
    elbowFlexionDetectorInstance = new ElbowFlexionDetector();
  }
  return elbowFlexionDetectorInstance;
}

export function resetElbowFlexionDetector(): void {
  if (elbowFlexionDetectorInstance) {
    elbowFlexionDetectorInstance.reset();
  }
  elbowFlexionDetectorInstance = null;
}
