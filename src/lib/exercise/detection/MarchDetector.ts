/**
 * 행진 감지기 (MarchDetector)
 *
 * 대상 운동:
 * - standing_march_slow: 서서 천천히 행진 (좌우 교대)
 *
 * 측정 관절: 엉덩이 (어깨-엉덩이-무릎 각도)
 * 모드: alternating (좌우 교대)
 * 특징: 왼쪽/오른쪽 무릎 들기 번갈아 감지
 */

import type { Landmark } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import { BaseDetector, type ExercisePhase } from './BaseDetector';
import { calculateJointAngle, type JointIndices } from './utils';

// 행진 기본 설정
const MARCH_DEFAULTS = {
  startAngle: 170,          // 시작 각도 (선 자세)
  targetAngle: 110,         // 목표 각도 (무릎 들어올린 상태)
  tolerance: 15,            // 허용 오차
  holdTime: 0.3,            // 짧은 홀드
};

export class MarchDetector extends BaseDetector {
  private currentSide: 'left' | 'right' = 'left';
  private lastLiftedSide: 'left' | 'right' | null = null;
  private sideRepCount: { left: number; right: number } = { left: 0, right: 0 };
  private consecutiveSameSide: number = 0;

  constructor() {
    super('standing_march_slow', 'hip', {
      minCooldown: 300,      // 빠른 교대를 위해 짧은 쿨다운
      maxCooldown: 800,
      adaptiveScale: 0.3,
    });

    this.thresholds = {
      startAngle: {
        center: MARCH_DEFAULTS.startAngle,
        min: MARCH_DEFAULTS.startAngle - MARCH_DEFAULTS.tolerance,
        max: 180,
      },
      targetAngle: MARCH_DEFAULTS.targetAngle,
      completionThreshold: {
        minAngle: MARCH_DEFAULTS.targetAngle + MARCH_DEFAULTS.tolerance,
        holdTime: MARCH_DEFAULTS.holdTime,
      },
      returnThreshold: {
        maxAngle: MARCH_DEFAULTS.startAngle - MARCH_DEFAULTS.tolerance,
      },
      totalROM: MARCH_DEFAULTS.startAngle - MARCH_DEFAULTS.targetAngle,
      calculatedAt: new Date(),
    };
    this.requiredHoldTime = MARCH_DEFAULTS.holdTime;
  }

  /**
   * 리셋
   */
  reset(): void {
    super.reset();
    this.currentSide = 'left';
    this.lastLiftedSide = null;
    this.sideRepCount = { left: 0, right: 0 };
    this.consecutiveSameSide = 0;
  }

  /**
   * 엉덩이 각도 계산 - 좌우 중 더 작은 각도(더 많이 들어올린 쪽)를 추적
   */
  protected calculateAngle(
    landmarks: Landmark[]
  ): { angle: number; confidence: number } | null {
    const leftAngle = this.calculateHipAngle(landmarks, 'left');
    const rightAngle = this.calculateHipAngle(landmarks, 'right');

    if (!leftAngle && !rightAngle) return null;

    // 양쪽 다 감지되면, 더 많이 들어올린 쪽을 추적
    if (leftAngle && rightAngle) {
      if (leftAngle.angle < rightAngle.angle) {
        this.currentSide = 'left';
        return leftAngle;
      } else {
        this.currentSide = 'right';
        return rightAngle;
      }
    }

    // 한쪽만 감지
    if (leftAngle) {
      this.currentSide = 'left';
      return leftAngle;
    }

    this.currentSide = 'right';
    return rightAngle;
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
   * 시작 자세 체크 (선 자세)
   */
  protected isInStartPosition(angle: number): boolean {
    return angle >= this.thresholds.startAngle.min;
  }

  /**
   * 목표 방향 이동 체크 (무릎 올리는 동작 = 각도 감소)
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
    const startAngle = MARCH_DEFAULTS.startAngle;
    const targetAngle = MARCH_DEFAULTS.targetAngle;

    if (angle >= startAngle) return 0;
    if (angle <= targetAngle) return 1;

    return (startAngle - angle) / (startAngle - targetAngle);
  }

  /**
   * 반복 완료 처리 (교대 카운트)
   */
  protected completeRep(angle: number, confidence: number): void {
    // 같은 쪽 연속 감지 체크 (3번 이상이면 경고)
    if (this.currentSide === this.lastLiftedSide) {
      this.consecutiveSameSide++;
    } else {
      this.consecutiveSameSide = 1;
    }

    this.sideRepCount[this.currentSide]++;
    this.lastLiftedSide = this.currentSide;

    super.completeRep(angle, confidence);
  }

  /**
   * 피드백 커스터마이징
   */
  protected generateFeedback(
    angle: number,
    progress: number,
    transition: { to: ExercisePhase } | null
  ): string {
    const sideText = this.currentSide === 'left' ? '왼쪽' : '오른쪽';

    if (transition?.to === 'COOLDOWN') {
      // 교대 알림
      if (this.consecutiveSameSide >= 2) {
        const nextSide = this.currentSide === 'left' ? '오른쪽' : '왼쪽';
        return `좋아요! 이제 ${nextSide}!`;
      }
      return `${sideText} 완료! (${this.repCount}회)`;
    }

    switch (this.currentPhase) {
      case 'IDLE':
        return '똑바로 서서 준비하세요';
      case 'READY':
        return `${sideText} 무릎을 들어주세요`;
      case 'MOVING':
        if (progress < 0.5) return '더 높이!';
        return '좋아요!';
      case 'HOLDING':
        return '잠시 유지!';
      case 'RETURNING':
        return '내려주세요';
      case 'COOLDOWN':
        return '반대쪽 준비!';
      default:
        return '';
    }
  }

  /**
   * 좌우별 횟수 반환
   */
  getSideRepCount(): { left: number; right: number } {
    return { ...this.sideRepCount };
  }

  /**
   * 현재 추적 중인 측면
   */
  getCurrentSide(): 'left' | 'right' {
    return this.currentSide;
  }
}

// 싱글톤 인스턴스
let marchDetectorInstance: MarchDetector | null = null;

export function getMarchDetector(): MarchDetector {
  if (!marchDetectorInstance) {
    marchDetectorInstance = new MarchDetector();
  }
  return marchDetectorInstance;
}

export function resetMarchDetector(): void {
  if (marchDetectorInstance) {
    marchDetectorInstance.reset();
  }
  marchDetectorInstance = null;
}
