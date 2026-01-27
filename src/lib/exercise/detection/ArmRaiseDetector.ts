/**
 * 팔 들기 감지기 (ArmRaiseDetector)
 *
 * 대상 운동:
 * - arm_raise_front: 팔 앞으로 들기 (0° → 180°)
 * - shoulder_abduction: 어깨 벌리기 (0° → 90°)
 * - standing_arm_raise_core: 코어 유지하며 팔 들기 (0° → 180°)
 *
 * 측정 관절: 어깨 (엉덩이-어깨-팔꿈치 각도)
 * 모드: big_is_up (각도가 클수록 UP 상태)
 */

import type { Landmark } from '@/types/pose';
import { PoseLandmark } from '@/types/pose';
import type { ExerciseType } from '@/types/exercise';
import { BaseDetector, type ExercisePhase } from './BaseDetector';
import { calculateJointAngle, type JointIndices } from './utils';

// 운동별 기본 설정
interface ArmRaiseConfig {
  exerciseType: ExerciseType;
  startAngle: number;      // 시작 각도 (팔 내린 상태)
  targetAngle: number;     // 목표 각도 (팔 들어올린 상태)
  tolerance: number;       // 허용 오차
  holdTime: number;        // 홀드 시간 (초)
  checkCore?: boolean;     // 코어 안정성 체크 여부
}

const ARM_RAISE_CONFIGS: Record<string, ArmRaiseConfig> = {
  arm_raise_front: {
    exerciseType: 'arm_raise_front',
    startAngle: 20,
    targetAngle: 160,
    tolerance: 20,
    holdTime: 0.5,
  },
  shoulder_abduction: {
    exerciseType: 'shoulder_abduction',
    startAngle: 20,
    targetAngle: 90,
    tolerance: 15,
    holdTime: 0.5,
  },
  standing_arm_raise_core: {
    exerciseType: 'standing_arm_raise_core',
    startAngle: 20,
    targetAngle: 160,
    tolerance: 20,
    holdTime: 0.5,
    checkCore: true,
  },
};

export class ArmRaiseDetector extends BaseDetector {
  private config: ArmRaiseConfig;
  private useAverageBothArms = true;
  private previousSpineAngle: number = 0;  // 코어 체크용

  constructor(exerciseType: ExerciseType = 'arm_raise_front') {
    super(exerciseType, 'shoulder', {
      minCooldown: 500,
      maxCooldown: 1500,
      adaptiveScale: 0.4,
    });

    this.config = ARM_RAISE_CONFIGS[exerciseType] || ARM_RAISE_CONFIGS.arm_raise_front;

    // 임계값 설정 (big_is_up 모드: 값이 클수록 UP)
    this.thresholds = {
      startAngle: {
        center: this.config.startAngle,
        min: 0,
        max: this.config.startAngle + this.config.tolerance,
      },
      targetAngle: this.config.targetAngle,
      completionThreshold: {
        minAngle: this.config.targetAngle - this.config.tolerance,
        holdTime: this.config.holdTime,
      },
      returnThreshold: {
        maxAngle: this.config.startAngle + this.config.tolerance,
      },
      totalROM: this.config.targetAngle - this.config.startAngle,
      calculatedAt: new Date(),
    };
    this.requiredHoldTime = this.config.holdTime;
  }

  /**
   * 어깨 각도 계산 (엉덩이-어깨-팔꿈치)
   */
  protected calculateAngle(
    landmarks: Landmark[]
  ): { angle: number; confidence: number } | null {
    const leftArm = this.calculateShoulderAngle(landmarks, 'left');
    const rightArm = this.calculateShoulderAngle(landmarks, 'right');

    if (!leftArm && !rightArm) return null;

    // 코어 체크가 필요하면 척추 각도도 계산
    if (this.config.checkCore) {
      this.checkCoreStability(landmarks);
    }

    if (this.useAverageBothArms && leftArm && rightArm) {
      return {
        angle: (leftArm.angle + rightArm.angle) / 2,
        confidence: (leftArm.confidence + rightArm.confidence) / 2,
      };
    }

    return leftArm || rightArm || null;
  }

  private calculateShoulderAngle(
    landmarks: Landmark[],
    side: 'left' | 'right'
  ): { angle: number; confidence: number } | null {
    const indices: JointIndices =
      side === 'left'
        ? {
            p1: PoseLandmark.LEFT_HIP,
            p2: PoseLandmark.LEFT_SHOULDER,
            p3: PoseLandmark.LEFT_ELBOW,
          }
        : {
            p1: PoseLandmark.RIGHT_HIP,
            p2: PoseLandmark.RIGHT_SHOULDER,
            p3: PoseLandmark.RIGHT_ELBOW,
          };

    return calculateJointAngle(landmarks, indices);
  }

  /**
   * 코어 안정성 체크 (허리 움직임 모니터링)
   */
  private checkCoreStability(landmarks: Landmark[]): boolean {
    const indices: JointIndices = {
      p1: PoseLandmark.LEFT_SHOULDER,
      p2: PoseLandmark.LEFT_HIP,
      p3: PoseLandmark.LEFT_KNEE,
    };

    const result = calculateJointAngle(landmarks, indices);
    if (!result) return true;

    const spineDeviation = Math.abs(result.angle - this.previousSpineAngle);
    this.previousSpineAngle = result.angle;

    // 허리 움직임이 10도 이상이면 불안정
    return spineDeviation < 10;
  }

  /**
   * 시작 자세 체크 (팔 내린 상태)
   */
  protected isInStartPosition(angle: number): boolean {
    return angle <= this.thresholds.startAngle.max;
  }

  /**
   * 목표 방향 이동 체크 (팔 올리는 동작 = 각도 증가)
   * big_is_up 모드이므로 각도가 증가하면 UP으로 이동
   */
  protected isMovingTowardsTarget(angle: number): boolean {
    return angle > this.thresholds.startAngle.center + 15;
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
    // 목표 도달 전에 각도가 감소하면 조기 복귀
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
    const startAngle = this.config.startAngle;
    const targetAngle = this.config.targetAngle;

    // big_is_up: 시작 < 목표
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
      if (accuracy >= 90) return '완벽한 동작!';
      if (accuracy >= 70) return '좋아요!';
      return '조금 더 높이 들어보세요';
    }

    switch (this.currentPhase) {
      case 'IDLE':
        return '팔을 내리고 준비하세요';
      case 'READY':
        return '천천히 팔을 들어올리세요';
      case 'MOVING':
        if (progress < 0.3) return '더 올려주세요';
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

// 팩토리 함수들
const armRaiseDetectors: Map<ExerciseType, ArmRaiseDetector> = new Map();

export function getArmRaiseDetector(exerciseType: ExerciseType = 'arm_raise_front'): ArmRaiseDetector {
  if (!armRaiseDetectors.has(exerciseType)) {
    armRaiseDetectors.set(exerciseType, new ArmRaiseDetector(exerciseType));
  }
  return armRaiseDetectors.get(exerciseType)!;
}

export function resetArmRaiseDetector(exerciseType?: ExerciseType): void {
  if (exerciseType) {
    const detector = armRaiseDetectors.get(exerciseType);
    if (detector) {
      detector.reset();
    }
    armRaiseDetectors.delete(exerciseType);
  } else {
    armRaiseDetectors.forEach(detector => detector.reset());
    armRaiseDetectors.clear();
  }
}
