/**
 * 버티기 운동 감지기 (HoldDetector)
 *
 * 대상 운동:
 * - wall_squat: 벽 스쿼트 (30초 홀드)
 * - seated_core_hold: 앉아서 코어 버티기 (10초 홀드)
 * - standing_anti_extension_hold: 서서 허리 버티기 (10초 홀드)
 *
 * 특징: 타이머 기반 홀드 운동 (특정 자세 유지)
 * 모드: hold_mode
 */

import type { Landmark } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import type { ExerciseType } from '@/types/exercise';
import { BaseDetector, type ExercisePhase } from './BaseDetector';
import { calculateJointAngle, type JointIndices } from './utils';

// 운동별 기본 설정
interface HoldConfig {
  exerciseType: ExerciseType;
  targetAngle: number;      // 유지해야 할 각도
  tolerance: number;        // 허용 오차
  holdDuration: number;     // 홀드 시간 (초)
  jointType: 'knee' | 'spine';
  anglePoints: JointIndices;
}

const HOLD_CONFIGS: Record<string, HoldConfig> = {
  wall_squat: {
    exerciseType: 'wall_squat',
    targetAngle: 90,          // 무릎 90도
    tolerance: 15,
    holdDuration: 30,         // 30초 홀드
    jointType: 'knee',
    anglePoints: {
      p1: PoseLandmark.LEFT_HIP,
      p2: PoseLandmark.LEFT_KNEE,
      p3: PoseLandmark.LEFT_ANKLE,
    },
  },
  seated_core_hold: {
    exerciseType: 'seated_core_hold',
    targetAngle: 90,          // 척추 90도 (앉은 자세)
    tolerance: 15,
    holdDuration: 10,         // 10초 홀드
    jointType: 'spine',
    anglePoints: {
      p1: PoseLandmark.LEFT_SHOULDER,
      p2: PoseLandmark.LEFT_HIP,
      p3: PoseLandmark.LEFT_KNEE,
    },
  },
  standing_anti_extension_hold: {
    exerciseType: 'standing_anti_extension_hold',
    targetAngle: 175,         // 척추 직립 (거의 180도)
    tolerance: 10,
    holdDuration: 10,         // 10초 홀드
    jointType: 'spine',
    anglePoints: {
      p1: PoseLandmark.LEFT_SHOULDER,
      p2: PoseLandmark.LEFT_HIP,
      p3: PoseLandmark.LEFT_KNEE,
    },
  },
};

// 홀드 운동 전용 상태
type HoldPhase = 'WAITING' | 'POSITIONING' | 'HOLDING' | 'COMPLETED' | 'BROKEN';

export class HoldDetector extends BaseDetector {
  private config: HoldConfig;
  private holdPhase: HoldPhase = 'WAITING';
  // Note: holdStartTime is inherited from BaseDetector (protected)
  private currentHoldDuration: number = 0;
  private longestHold: number = 0;
  private holdBrokenCount: number = 0;

  constructor(exerciseType: ExerciseType = 'wall_squat') {
    super(exerciseType, 'knee', {
      minCooldown: 1000,
      maxCooldown: 3000,
      adaptiveScale: 0.3,
    });

    this.config = HOLD_CONFIGS[exerciseType] || HOLD_CONFIGS.wall_squat;
    this.requiredHoldTime = this.config.holdDuration;

    // 임계값 설정
    this.thresholds = {
      startAngle: {
        center: this.config.targetAngle,
        min: this.config.targetAngle - this.config.tolerance,
        max: this.config.targetAngle + this.config.tolerance,
      },
      targetAngle: this.config.targetAngle,
      completionThreshold: {
        minAngle: this.config.targetAngle - this.config.tolerance,
        holdTime: this.config.holdDuration,
      },
      returnThreshold: {
        maxAngle: this.config.targetAngle + this.config.tolerance,
      },
      totalROM: this.config.tolerance * 2,
      calculatedAt: new Date(),
    };
  }

  /**
   * 리셋
   */
  reset(): void {
    super.reset();
    this.holdPhase = 'WAITING';
    this.holdStartTime = 0;
    this.currentHoldDuration = 0;
    this.longestHold = 0;
    this.holdBrokenCount = 0;
  }

  /**
   * 관절 각도 계산
   */
  protected calculateAngle(
    landmarks: Landmark[]
  ): { angle: number; confidence: number } | null {
    // 좌우 평균
    const leftAngle = calculateJointAngle(landmarks, this.config.anglePoints);

    const rightIndices: JointIndices = {
      p1: this.config.anglePoints.p1 + 1,  // RIGHT variants
      p2: this.config.anglePoints.p2 + 1,
      p3: this.config.anglePoints.p3 + 1,
    };
    const rightAngle = calculateJointAngle(landmarks, rightIndices);

    if (!leftAngle && !rightAngle) return null;

    if (leftAngle && rightAngle) {
      return {
        angle: (leftAngle.angle + rightAngle.angle) / 2,
        confidence: (leftAngle.confidence + rightAngle.confidence) / 2,
      };
    }

    return leftAngle || rightAngle || null;
  }

  /**
   * 프레임 처리 (홀드 운동 특화)
   */
  processFrame(landmarks: Landmark[]): import('./types').DetectionResult {
    const angleResult = this.calculateAngle(landmarks);

    if (!angleResult) {
      return this.createResult({
        phase: this.currentPhase,
        feedback: '포즈를 감지할 수 없습니다',
        confidence: 0,
      });
    }

    const { angle, confidence } = angleResult;
    const smoothedAngle = this.angleFilter.add(angle);
    const now = Date.now();

    // 목표 자세 범위 내인지 확인
    const inTargetPosition = this.isInTargetRange(smoothedAngle);

    // 홀드 상태 머신 처리
    switch (this.holdPhase) {
      case 'WAITING':
        if (inTargetPosition) {
          this.holdPhase = 'POSITIONING';
          this.holdStartTime = now;
        }
        break;

      case 'POSITIONING':
        // 0.5초 이상 자세 유지하면 홀드 시작
        if (inTargetPosition && now - this.holdStartTime >= 500) {
          this.holdPhase = 'HOLDING';
          this.holdStartTime = now;
          this.currentPhase = 'HOLDING';
        } else if (!inTargetPosition) {
          this.holdPhase = 'WAITING';
        }
        break;

      case 'HOLDING':
        this.currentHoldDuration = (now - this.holdStartTime) / 1000;

        if (!inTargetPosition) {
          // 자세가 무너짐
          this.holdPhase = 'BROKEN';
          this.holdBrokenCount++;
          if (this.currentHoldDuration > this.longestHold) {
            this.longestHold = this.currentHoldDuration;
          }
        } else if (this.currentHoldDuration >= this.config.holdDuration) {
          // 홀드 완료!
          this.holdPhase = 'COMPLETED';
          this.repCount++;
          this.currentPhase = 'COOLDOWN';
        }
        break;

      case 'BROKEN':
        // 잠시 후 다시 시도 가능
        if (inTargetPosition) {
          this.holdPhase = 'POSITIONING';
          this.holdStartTime = now;
        }
        break;

      case 'COMPLETED':
        // 완료 후 쿨다운
        this.holdPhase = 'WAITING';
        this.currentHoldDuration = 0;
        break;
    }

    const progress = Math.min(1, this.currentHoldDuration / this.config.holdDuration);
    const feedback = this.generateHoldFeedback(smoothedAngle, inTargetPosition);

    return {
      phase: this.currentPhase,
      repCompleted: this.holdPhase === 'COMPLETED',
      currentAngle: smoothedAngle,
      targetAngle: this.config.targetAngle,
      progress,
      accuracy: inTargetPosition ? 100 : Math.max(0, 100 - Math.abs(smoothedAngle - this.config.targetAngle)),
      confidence,
      feedback,
      holdProgress: progress,
    };
  }

  /**
   * 목표 범위 내 체크
   */
  private isInTargetRange(angle: number): boolean {
    const min = this.config.targetAngle - this.config.tolerance;
    const max = this.config.targetAngle + this.config.tolerance;
    return angle >= min && angle <= max;
  }

  /**
   * 홀드 피드백 생성
   */
  private generateHoldFeedback(angle: number, inPosition: boolean): string {
    const timeLeft = Math.max(0, this.config.holdDuration - this.currentHoldDuration);
    const timeLeftFormatted = timeLeft.toFixed(1);

    switch (this.holdPhase) {
      case 'WAITING':
        return '목표 자세를 잡아주세요';
      case 'POSITIONING':
        return '좋아요! 자세 유지 준비...';
      case 'HOLDING':
        if (timeLeft <= 3) {
          return `거의 다 됐어요! ${timeLeftFormatted}초`;
        }
        return `유지하세요! 남은 시간: ${timeLeftFormatted}초`;
      case 'BROKEN':
        return '자세가 무너졌어요. 다시 자세를 잡아주세요';
      case 'COMPLETED':
        return `완벽해요! ${this.config.holdDuration}초 홀드 완료!`;
      default:
        return '';
    }
  }

  // BaseDetector 추상 메서드 구현 (홀드 운동에서는 크게 사용되지 않음)
  protected isInStartPosition(angle: number): boolean {
    return this.isInTargetRange(angle);
  }

  protected isMovingTowardsTarget(angle: number): boolean {
    return Math.abs(angle - this.config.targetAngle) < this.config.tolerance + 10;
  }

  protected hasReachedTarget(angle: number): boolean {
    return this.isInTargetRange(angle);
  }

  protected isNearTarget(angle: number): boolean {
    return this.isInTargetRange(angle);
  }

  protected isReturningBeforeTarget(angle: number): boolean {
    return !this.isInTargetRange(angle);
  }

  protected hasReturnedToStart(angle: number): boolean {
    return !this.isInTargetRange(angle);
  }

  protected calculateProgress(angle: number): number {
    return this.currentHoldDuration / this.config.holdDuration;
  }

  /**
   * 통계 반환
   */
  getHoldStats(): {
    currentDuration: number;
    longestHold: number;
    brokenCount: number;
    targetDuration: number;
  } {
    return {
      currentDuration: this.currentHoldDuration,
      longestHold: this.longestHold,
      brokenCount: this.holdBrokenCount,
      targetDuration: this.config.holdDuration,
    };
  }
}

// 팩토리 함수들
let holdDetectors: Map<ExerciseType, HoldDetector> = new Map();

export function getHoldDetector(exerciseType: ExerciseType = 'wall_squat'): HoldDetector {
  if (!holdDetectors.has(exerciseType)) {
    holdDetectors.set(exerciseType, new HoldDetector(exerciseType));
  }
  return holdDetectors.get(exerciseType)!;
}

export function resetHoldDetector(exerciseType?: ExerciseType): void {
  if (exerciseType) {
    const detector = holdDetectors.get(exerciseType);
    if (detector) {
      detector.reset();
    }
    holdDetectors.delete(exerciseType);
  } else {
    holdDetectors.forEach(detector => detector.reset());
    holdDetectors.clear();
  }
}
