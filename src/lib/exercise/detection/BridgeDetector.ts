/**
 * 브릿지 감지기 (BridgeDetector)
 *
 * 대상 운동:
 * - bridge: 누워서 엉덩이 들어올리기 (45° → 170°)
 *
 * 측정 관절: 엉덩이 (어깨-엉덩이-무릎 각도)
 * 모드: big_is_up (각도가 클수록 UP/엉덩이 들린 상태)
 */

import type { Landmark } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import { BaseDetector, type ExercisePhase } from './BaseDetector';
import { calculateJointAngle, type JointIndices } from './utils';

// 브릿지 기본 설정
const BRIDGE_DEFAULTS = {
  startAngle: 60,          // 시작 각도 (누운 상태)
  targetAngle: 165,        // 목표 각도 (엉덩이 들어올린 상태)
  tolerance: 15,           // 허용 오차
  holdTime: 0.5,           // 홀드 시간
};

export class BridgeDetector extends BaseDetector {
  constructor() {
    super('bridge', 'hip', {
      minCooldown: 500,
      maxCooldown: 1500,
      adaptiveScale: 0.4,
    });

    // 임계값 설정 (big_is_up 모드: 값이 클수록 UP)
    this.thresholds = {
      startAngle: {
        center: BRIDGE_DEFAULTS.startAngle,
        min: 30,
        max: BRIDGE_DEFAULTS.startAngle + BRIDGE_DEFAULTS.tolerance,
      },
      targetAngle: BRIDGE_DEFAULTS.targetAngle,
      completionThreshold: {
        minAngle: BRIDGE_DEFAULTS.targetAngle - BRIDGE_DEFAULTS.tolerance,
        holdTime: BRIDGE_DEFAULTS.holdTime,
      },
      returnThreshold: {
        maxAngle: BRIDGE_DEFAULTS.startAngle + BRIDGE_DEFAULTS.tolerance,
      },
      totalROM: BRIDGE_DEFAULTS.targetAngle - BRIDGE_DEFAULTS.startAngle,
      calculatedAt: new Date(),
    };
    this.requiredHoldTime = BRIDGE_DEFAULTS.holdTime;
  }

  /**
   * 엉덩이 각도 계산 (어깨-엉덩이-무릎)
   */
  protected calculateAngle(
    landmarks: Landmark[]
  ): { angle: number; confidence: number } | null {
    const leftHip = this.calculateHipAngle(landmarks, 'left');
    const rightHip = this.calculateHipAngle(landmarks, 'right');

    if (!leftHip && !rightHip) return null;

    if (leftHip && rightHip) {
      return {
        angle: (leftHip.angle + rightHip.angle) / 2,
        confidence: (leftHip.confidence + rightHip.confidence) / 2,
      };
    }

    return leftHip || rightHip || null;
  }

  private calculateHipAngle(
    landmarks: Landmark[],
    side: 'left' | 'right'
  ): { angle: number; confidence: number } | null {
    const indices: JointIndices =
      side === 'left'
        ? {
            p1: PoseLandmark.LEFT_SHOULDER,
            p2: PoseLandmark.LEFT_HIP,
            p3: PoseLandmark.LEFT_KNEE,
          }
        : {
            p1: PoseLandmark.RIGHT_SHOULDER,
            p2: PoseLandmark.RIGHT_HIP,
            p3: PoseLandmark.RIGHT_KNEE,
          };

    return calculateJointAngle(landmarks, indices);
  }

  /**
   * 시작 자세 체크 (누운 상태)
   */
  protected isInStartPosition(angle: number): boolean {
    return angle <= this.thresholds.startAngle.max;
  }

  /**
   * 목표 방향 이동 체크 (엉덩이 올리는 동작 = 각도 증가)
   */
  protected isMovingTowardsTarget(angle: number): boolean {
    return angle > this.thresholds.startAngle.center + 20;
  }

  /**
   * 목표 도달 체크
   */
  protected hasReachedTarget(angle: number): boolean {
    return angle >= this.thresholds.completionThreshold.minAngle;
  }

  /**
   * 목표 근처 체크 (홀드용)
   */
  protected isNearTarget(angle: number): boolean {
    const tolerance = 25;
    return angle >= this.thresholds.targetAngle - tolerance;
  }

  /**
   * 조기 복귀 체크
   */
  protected isReturningBeforeTarget(angle: number): boolean {
    return this.angleVelocity < -5 && angle < this.thresholds.targetAngle - 30;
  }

  /**
   * 시작 위치 복귀 체크
   */
  protected hasReturnedToStart(angle: number): boolean {
    return angle <= this.thresholds.returnThreshold.maxAngle;
  }

  /**
   * 진행률 계산
   */
  protected calculateProgress(angle: number): number {
    const startAngle = BRIDGE_DEFAULTS.startAngle;
    const targetAngle = BRIDGE_DEFAULTS.targetAngle;

    if (angle <= startAngle) return 0;
    if (angle >= targetAngle) return 1;

    return (angle - startAngle) / (targetAngle - startAngle);
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
      if (accuracy >= 90) return '완벽한 브릿지!';
      if (accuracy >= 70) return '좋아요!';
      return '더 높이 들어올려 보세요';
    }

    switch (this.currentPhase) {
      case 'IDLE':
        return '바닥에 누워 무릎을 세우세요';
      case 'READY':
        return '엉덩이를 들어올리세요';
      case 'MOVING':
        if (progress < 0.3) return '더 높이!';
        if (progress < 0.6) return '좋아요, 계속!';
        if (progress < 0.9) return '거의 다 왔어요!';
        return '목표 도달!';
      case 'HOLDING':
        return '잠시 유지!';
      case 'RETURNING':
        return '천천히 내려주세요';
      case 'COOLDOWN':
        return `${this.repCount}회 완료!`;
      default:
        return '';
    }
  }
}

// 싱글톤 인스턴스
let bridgeDetectorInstance: BridgeDetector | null = null;

export function getBridgeDetector(): BridgeDetector {
  if (!bridgeDetectorInstance) {
    bridgeDetectorInstance = new BridgeDetector();
  }
  return bridgeDetectorInstance;
}

export function resetBridgeDetector(): void {
  if (bridgeDetectorInstance) {
    bridgeDetectorInstance.reset();
  }
  bridgeDetectorInstance = null;
}
