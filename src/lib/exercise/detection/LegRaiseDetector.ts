/**
 * 다리 들기 감지기 (LegRaiseDetector)
 *
 * 대상 운동:
 * - straight_leg_raise: 누워서 다리 들기 (180° → 120°)
 * - seated_knee_lift: 앉아서 무릎 들기 (90° → 60°)
 *
 * 측정 관절: 엉덩이 (어깨-엉덩이-무릎 각도)
 * 모드: big_is_up (각도가 작아질수록 다리가 올라감)
 * 참고: 이 운동은 각도가 감소할수록 다리가 올라가므로 실제로는 "small_is_up" 방식
 */

import type { Landmark } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import type { ExerciseType } from '@/types/exercise';
import { BaseDetector, type ExercisePhase } from './BaseDetector';
import { calculateJointAngle, type JointIndices } from './utils';

// 운동별 기본 설정
interface LegRaiseConfig {
  exerciseType: ExerciseType;
  startAngle: number;      // 시작 각도
  targetAngle: number;     // 목표 각도
  tolerance: number;       // 허용 오차
  holdTime: number;        // 홀드 시간 (초)
  alternating: boolean;    // 좌우 교대 여부
}

const LEG_RAISE_CONFIGS: Record<string, LegRaiseConfig> = {
  straight_leg_raise: {
    exerciseType: 'straight_leg_raise',
    startAngle: 170,       // 바닥에 누운 상태
    targetAngle: 120,      // 다리 들어올린 상태
    tolerance: 15,
    holdTime: 0.5,
    alternating: true,
  },
  seated_knee_lift: {
    exerciseType: 'seated_knee_lift',
    startAngle: 95,        // 앉은 상태
    targetAngle: 60,       // 무릎 들어올린 상태
    tolerance: 10,
    holdTime: 0.5,
    alternating: true,
  },
};

export class LegRaiseDetector extends BaseDetector {
  private config: LegRaiseConfig;
  private currentSide: 'left' | 'right' = 'left';
  private sideRepCount: { left: number; right: number } = { left: 0, right: 0 };

  constructor(exerciseType: ExerciseType = 'straight_leg_raise') {
    super(exerciseType, 'hip', {
      minCooldown: 500,
      maxCooldown: 1500,
      adaptiveScale: 0.4,
    });

    this.config = LEG_RAISE_CONFIGS[exerciseType] || LEG_RAISE_CONFIGS.straight_leg_raise;

    // 임계값 설정
    // 다리 들기는 각도가 감소해야 UP으로 인식 (역방향)
    this.thresholds = {
      startAngle: {
        center: this.config.startAngle,
        min: this.config.startAngle - this.config.tolerance,
        max: 180,
      },
      targetAngle: this.config.targetAngle,
      completionThreshold: {
        minAngle: this.config.targetAngle + this.config.tolerance,
        holdTime: this.config.holdTime,
      },
      returnThreshold: {
        maxAngle: this.config.startAngle - this.config.tolerance,
      },
      totalROM: this.config.startAngle - this.config.targetAngle,
      calculatedAt: new Date(),
    };
    this.requiredHoldTime = this.config.holdTime;
  }

  /**
   * 리셋 (좌우 카운트 포함)
   */
  reset(): void {
    super.reset();
    this.currentSide = 'left';
    this.sideRepCount = { left: 0, right: 0 };
  }

  /**
   * 엉덩이 각도 계산 (어깨-엉덩이-무릎)
   * 교대 운동의 경우 현재 측면만 측정
   */
  protected calculateAngle(
    landmarks: Landmark[]
  ): { angle: number; confidence: number } | null {
    if (this.config.alternating) {
      // 교대 운동: 왼쪽/오른쪽 번갈아가며 측정
      const leftAngle = this.calculateHipAngle(landmarks, 'left');
      const rightAngle = this.calculateHipAngle(landmarks, 'right');

      if (!leftAngle && !rightAngle) return null;

      // 더 작은 각도(더 많이 올라간 다리)를 추적
      if (leftAngle && rightAngle) {
        // 현재 어느 쪽 다리가 더 올라갔는지 확인
        if (leftAngle.angle < rightAngle.angle) {
          this.currentSide = 'left';
          return leftAngle;
        } else {
          this.currentSide = 'right';
          return rightAngle;
        }
      }

      return leftAngle || rightAngle || null;
    } else {
      // 양쪽 평균
      const leftAngle = this.calculateHipAngle(landmarks, 'left');
      const rightAngle = this.calculateHipAngle(landmarks, 'right');

      if (!leftAngle && !rightAngle) return null;

      if (leftAngle && rightAngle) {
        return {
          angle: (leftAngle.angle + rightAngle.angle) / 2,
          confidence: (leftAngle.confidence + rightAngle.confidence) / 2,
        };
      }

      return leftAngle || rightAngle || null;
    }
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
   * 시작 자세 체크 (다리 내린 상태)
   */
  protected isInStartPosition(angle: number): boolean {
    return angle >= this.thresholds.startAngle.min;
  }

  /**
   * 목표 방향 이동 체크 (다리 올리는 동작 = 각도 감소)
   */
  protected isMovingTowardsTarget(angle: number): boolean {
    return angle < this.thresholds.startAngle.center - 10;
  }

  /**
   * 목표 도달 체크
   */
  protected hasReachedTarget(angle: number): boolean {
    // 다리 들기: 각도가 목표 이하로 내려가면 도달
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
    // 목표 도달 전에 각도가 증가하면 조기 복귀
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
    const startAngle = this.config.startAngle;
    const targetAngle = this.config.targetAngle;

    // 다리 들기: 시작 > 목표 (각도 감소)
    if (angle >= startAngle) return 0;
    if (angle <= targetAngle) return 1;

    return (startAngle - angle) / (startAngle - targetAngle);
  }

  /**
   * 반복 완료 처리 (교대 운동 카운트)
   */
  protected completeRep(angle: number, confidence: number): void {
    super.completeRep(angle, confidence);

    if (this.config.alternating) {
      this.sideRepCount[this.currentSide]++;
    }
  }

  /**
   * 피드백 커스터마이징
   */
  protected generateFeedback(
    angle: number,
    progress: number,
    transition: { to: ExercisePhase } | null
  ): string {
    const sideText = this.config.alternating
      ? `(${this.currentSide === 'left' ? '왼쪽' : '오른쪽'})`
      : '';

    if (transition?.to === 'COOLDOWN') {
      const accuracy = this.repAccuracies[this.repAccuracies.length - 1] || 0;
      if (accuracy >= 90) return `완벽해요! ${sideText}`;
      if (accuracy >= 70) return `좋아요! ${sideText}`;
      return `더 높이 들어보세요 ${sideText}`;
    }

    switch (this.currentPhase) {
      case 'IDLE':
        return '준비 자세를 잡아주세요';
      case 'READY':
        return `다리를 들어올리세요 ${sideText}`;
      case 'MOVING':
        if (progress < 0.3) return '더 높이 들어주세요';
        if (progress < 0.6) return '좋아요, 계속!';
        if (progress < 0.9) return '거의 다 왔어요!';
        return '목표 도달!';
      case 'HOLDING':
        return '잠시 유지!';
      case 'RETURNING':
        return '천천히 내려주세요';
      case 'COOLDOWN':
        return `${this.repCount}회 완료! ${sideText}`;
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
}

// 팩토리 함수들
const legRaiseDetectors: Map<ExerciseType, LegRaiseDetector> = new Map();

export function getLegRaiseDetector(exerciseType: ExerciseType = 'straight_leg_raise'): LegRaiseDetector {
  if (!legRaiseDetectors.has(exerciseType)) {
    legRaiseDetectors.set(exerciseType, new LegRaiseDetector(exerciseType));
  }
  return legRaiseDetectors.get(exerciseType)!;
}

export function resetLegRaiseDetector(exerciseType?: ExerciseType): void {
  if (exerciseType) {
    const detector = legRaiseDetectors.get(exerciseType);
    if (detector) {
      detector.reset();
    }
    legRaiseDetectors.delete(exerciseType);
  } else {
    legRaiseDetectors.forEach(detector => detector.reset());
    legRaiseDetectors.clear();
  }
}
