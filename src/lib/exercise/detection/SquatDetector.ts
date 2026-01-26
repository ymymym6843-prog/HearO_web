/**
 * 스쿼트 감지기
 * BaseDetector 상속 예시
 *
 * 측정 관절: 무릎 (엉덩이-무릎-발목 각도)
 * 동작: 서있는 자세(약 170°) → 앉은 자세(약 90°) → 복귀
 */

import type { Landmark } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import { BaseDetector, type ExercisePhase } from './BaseDetector';
import { calculateHybridAngle } from '@/lib/calibration/depthCorrection';

// 스쿼트 기본 설정 (캘리브레이션 없을 때)
// 재활 운동 목적으로 완화된 임계값 사용
const SQUAT_DEFAULTS = {
  startAngle: 160,       // 시작 각도 (서있는 자세, 약간 완화)
  targetAngle: 100,      // 목표 각도 (재활용: 풀스쿼트 대신 하프스쿼트)
  completionTolerance: 30, // 목표 도달 허용 오차 (관대하게: 100+30=130 이하면 도달)
  returnTolerance: 25,    // 복귀 판정 허용 오차 (관대하게: 160-25=135 이상이면 복귀)
  holdTime: 0.5,         // 홀드 시간 (재활: 잠시 유지)
};

export class SquatDetector extends BaseDetector {
  // 좌우 무릎 평균 사용
  private useAverageBothKnees = true;

  constructor() {
    super('squat', 'knee', {
      minCooldown: 500,
      maxCooldown: 1500,
      adaptiveScale: 0.4,
    });

    // 기본 임계값 설정 (관대한 판정으로 카운트 누락 방지)
    this.thresholds = {
      startAngle: {
        center: SQUAT_DEFAULTS.startAngle,
        min: SQUAT_DEFAULTS.startAngle - SQUAT_DEFAULTS.returnTolerance,
        max: 180,
      },
      targetAngle: SQUAT_DEFAULTS.targetAngle,
      completionThreshold: {
        minAngle: SQUAT_DEFAULTS.targetAngle + SQUAT_DEFAULTS.completionTolerance, // 130 (was 120)
        holdTime: SQUAT_DEFAULTS.holdTime,
      },
      returnThreshold: {
        maxAngle: SQUAT_DEFAULTS.startAngle - SQUAT_DEFAULTS.returnTolerance, // 135 (was 140)
      },
      totalROM: SQUAT_DEFAULTS.startAngle - SQUAT_DEFAULTS.targetAngle,
      calculatedAt: new Date(),
    };
    this.requiredHoldTime = SQUAT_DEFAULTS.holdTime;
  }

  /**
   * 무릎 각도 계산 (좌우 평균)
   */
  protected calculateAngle(
    landmarks: Landmark[]
  ): { angle: number; confidence: number } | null {
    // 좌측 무릎 각도 (엉덩이-무릎-발목)
    const leftKnee = this.calculateKneeAngle(landmarks, 'left');

    // 우측 무릎 각도
    const rightKnee = this.calculateKneeAngle(landmarks, 'right');

    if (!leftKnee && !rightKnee) return null;

    if (this.useAverageBothKnees && leftKnee && rightKnee) {
      // 좌우 평균
      return {
        angle: (leftKnee.angle + rightKnee.angle) / 2,
        confidence: (leftKnee.confidence + rightKnee.confidence) / 2,
      };
    }

    // 하나만 있으면 그 값 사용
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

    // 하이브리드 각도 계산 (깊이 보정 포함)
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
    // 스쿼트는 굴곡 운동 (각도 감소)
    // 시작 위치보다 약간 낮아지면 움직임 시작
    return angle < this.thresholds.startAngle.center - 10;
  }

  /**
   * 목표 도달 체크
   */
  protected hasReachedTarget(angle: number): boolean {
    // 목표 각도 이하로 내려가면 도달
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

    // 스쿼트는 굴곡 (시작 > 목표)
    if (angle >= startAngle) return 0;
    if (angle <= targetAngle) return 1;

    return (startAngle - angle) / (startAngle - targetAngle);
  }

  /**
   * 추가 검증: 엉덩이 위치
   */
  validateHipPosition(landmarks: Landmark[]): {
    isValid: boolean;
    feedback: string;
  } {
    const leftHip = landmarks[PoseLandmark.LEFT_HIP];
    const rightHip = landmarks[PoseLandmark.RIGHT_HIP];
    const leftKnee = landmarks[PoseLandmark.LEFT_KNEE];
    const rightKnee = landmarks[PoseLandmark.RIGHT_KNEE];

    if (!leftHip || !rightHip || !leftKnee || !rightKnee) {
      return { isValid: false, feedback: '전신이 보이도록 서주세요' };
    }

    // 엉덩이가 무릎보다 너무 앞으로 나가면 안 됨
    const hipAvgX = (leftHip.x + rightHip.x) / 2;
    const kneeAvgX = (leftKnee.x + rightKnee.x) / 2;

    if (Math.abs(hipAvgX - kneeAvgX) > 0.15) {
      return { isValid: false, feedback: '무릎 위에 엉덩이가 오도록 앉으세요' };
    }

    return { isValid: true, feedback: '' };
  }

  /**
   * 피드백 커스터마이징 (스쿼트 특화)
   */
  protected generateFeedback(
    angle: number,
    progress: number,
    transition: { to: ExercisePhase } | null
  ): string {
    if (transition?.to === 'COOLDOWN') {
      const accuracy = this.repAccuracies[this.repAccuracies.length - 1] || 0;
      if (accuracy >= 90) return '완벽한 스쿼트!';
      if (accuracy >= 70) return '좋아요! 잘하고 있어요!';
      return '잘했어요! 조금만 더 내려가면 완벽해요!';
    }

    switch (this.currentPhase) {
      case 'IDLE':
        return '똑바로 서서 시작 준비';
      case 'READY':
        return '천천히 앉기 시작!';
      case 'MOVING':
        if (progress < 0.3) return '조금만 더 내려가 볼까요?';
        if (progress < 0.6) return '좋아요, 조금만 더!';
        if (progress < 0.9) return '거의 다 왔어요!';
        return '목표 도달!';
      case 'HOLDING':
        return '좋아요, 그 자세 유지!';
      case 'RETURNING':
        return '천천히 일어나세요';
      case 'COOLDOWN':
        return `${this.repCount}회 완료!`;
      default:
        return '';
    }
  }
}

// 싱글톤 인스턴스
let squatDetectorInstance: SquatDetector | null = null;

export function getSquatDetector(): SquatDetector {
  if (!squatDetectorInstance) {
    squatDetectorInstance = new SquatDetector();
  }
  return squatDetectorInstance;
}

export function resetSquatDetector(): void {
  if (squatDetectorInstance) {
    squatDetectorInstance.reset();
  }
  squatDetectorInstance = null;
}
