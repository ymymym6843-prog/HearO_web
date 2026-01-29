/**
 * 운동 감지 기본 템플릿 (BaseDetector)
 *
 * 기존 문제점 해결:
 * 1. 70%+ 코드 중복 → 공통 로직 추상화
 * 2. 상태 전환 불명확 → 명시적 상태 머신
 * 3. 100ms 쿨다운 → 동적 쿨다운 (최소 500ms)
 * 4. 캘리브레이션 미적용 → 임계값 자동 연동
 */

import type { Landmark } from '@/types/pose';
import type { ExerciseType, JointType } from '@/types/exercise';
import type { CalibrationResult, ThresholdResult } from '@/types/calibration';
import { createLogger } from '@/lib/logger';

// 타입과 유틸리티는 분리된 파일에서 import
import {
  type ExercisePhase,
  type PhaseTransition,
  type DetectionResult,
  type CooldownConfig,
  DEFAULT_COOLDOWN,
  DEFAULT_THRESHOLDS,
} from './types';

import {
  MovingAverageFilter,
  VISIBILITY_THRESHOLD,
  FRAME_HOLD_THRESHOLD,
} from './utils';

// ROM 디버그 로거
const romLogger = createLogger('ROM-Debug');
const ROM_DEBUG_LOG_INTERVAL = 30; // ~1초 간격 (30fps 기준)

// 기존 타입들 re-export (하위 호환성)
export type { ExercisePhase, PhaseTransition, DetectionResult, CooldownConfig };

/**
 * 추상 운동 감지기 클래스
 * 모든 운동 감지기는 이 클래스를 상속
 */
export abstract class BaseDetector {
  // 운동 정보
  protected exerciseType: ExerciseType;
  protected jointType: JointType;

  // 상태 관리
  protected currentPhase: ExercisePhase = 'IDLE';
  protected phaseStartTime: number = 0;
  protected repCount: number = 0;

  // 임계값 (캘리브레이션 결과 또는 기본값)
  protected thresholds: ThresholdResult;
  protected hasCalibration: boolean = false;

  // 쿨다운 관리
  protected cooldownConfig: CooldownConfig;
  protected lastRepCompletedAt: number = 0;
  protected lastRepDuration: number = 0;

  // 홀드 타이머
  protected holdStartTime: number = 0;
  protected requiredHoldTime: number = 0.5; // 초

  // 이전 각도 (변화 감지용)
  protected previousAngle: number = 0;
  protected angleVelocity: number = 0;

  // MVP 개선: 각도 스무딩 및 프레임 홀드
  protected angleFilter: MovingAverageFilter = new MovingAverageFilter();
  protected frameHoldCount: number = 0;
  protected pendingTransition: ExercisePhase | null = null;

  // 통계
  protected repAccuracies: number[] = [];

  // ROM 디버그 로깅
  protected _romDebugEnabled: boolean = false;
  protected _debugFrameCount: number = 0;

  constructor(
    exerciseType: ExerciseType,
    jointType: JointType,
    cooldownConfig: CooldownConfig = DEFAULT_COOLDOWN
  ) {
    this.exerciseType = exerciseType;
    this.jointType = jointType;
    this.cooldownConfig = cooldownConfig;
    this.thresholds = DEFAULT_THRESHOLDS;
  }

  /**
   * 캘리브레이션 결과 적용
   */
  applyCalibration(calibration: CalibrationResult): void {
    this.thresholds = calibration.thresholds;
    this.requiredHoldTime = calibration.settings.holdTime;
    this.hasCalibration = true;
    this._logConfigSnapshot('calibration-applied');
  }

  /**
   * 감지기 리셋
   */
  reset(): void {
    this.currentPhase = 'IDLE';
    this.phaseStartTime = Date.now();
    this.repCount = 0;
    this.holdStartTime = 0;
    this.previousAngle = 0;
    this.angleVelocity = 0;
    this.repAccuracies = [];
    this.lastRepCompletedAt = 0;
    this.lastRepDuration = 0;
    // MVP 개선 리셋
    this.angleFilter.reset();
    this.frameHoldCount = 0;
    this.pendingTransition = null;
    // ROM 디버그 리셋
    this._debugFrameCount = 0;
  }

  /**
   * 프레임 처리 (메인 함수)
   * MVP 개선: 각도 스무딩, visibility 0.4, 프레임 홀드 2
   */
  processFrame(landmarks: Landmark[]): DetectionResult {
    // 1. 관절 각도 계산
    const angleResult = this.calculateAngle(landmarks);
    if (!angleResult) {
      return this.createResult({
        phase: this.currentPhase,
        feedback: '포즈를 감지할 수 없습니다',
        confidence: 0,
      });
    }

    const { angle: rawAngle, confidence } = angleResult;

    // 2. MVP: 각도 스무딩 (5프레임 이동 평균)
    const angle = this.angleFilter.add(rawAngle);

    // ROM 디버그 로깅
    this._debugFrameCount++;
    this._logFrameDebug(rawAngle, angle, confidence);

    // 3. 각도 속도 계산 (움직임 감지용)
    this.angleVelocity = angle - this.previousAngle;
    this.previousAngle = angle;

    // 4. 신뢰도가 낮아도 상태 머신은 계속 실행 (카운트 누락 방지)
    //    단, 피드백으로 자세 조정 안내
    const isLowConfidence = confidence < VISIBILITY_THRESHOLD;

    // 5. 상태 머신 처리 (프레임 홀드 적용)
    const transition = this.processStateMachineWithHold(angle, confidence);

    // 6. 결과 생성
    const result = this.createDetectionResult(angle, confidence, transition);

    // 저신뢰도일 때 피드백 보충 (카운트는 정상 진행)
    if (isLowConfidence && !transition) {
      result.feedback = result.feedback || '카메라를 향해 서주세요';
    }

    return result;
  }

  /**
   * MVP: 프레임 홀드가 적용된 상태 머신 처리
   * 상태 전환 전 N프레임 동안 조건 유지 필요
   */
  protected processStateMachineWithHold(
    angle: number,
    confidence: number
  ): PhaseTransition | null {
    // 원래 상태 머신 결과 확인
    const candidateTransition = this.processStateMachine(angle, confidence);

    if (!candidateTransition) {
      // 전환 없음 -> 프레임 홀드 카운터 리셋
      this.frameHoldCount = 0;
      this.pendingTransition = null;
      return null;
    }

    // 동일한 전환이 연속으로 요청되는지 확인
    if (this.pendingTransition === candidateTransition.to) {
      this.frameHoldCount++;
    } else {
      // 새로운 전환 -> 카운터 시작
      this.pendingTransition = candidateTransition.to;
      this.frameHoldCount = 1;
    }

    // COOLDOWN 전환은 즉시 허용 (반복 완료는 지연 없이)
    if (candidateTransition.to === 'COOLDOWN') {
      this.frameHoldCount = 0;
      this.pendingTransition = null;
      return candidateTransition;
    }

    // 프레임 홀드 조건 충족 확인
    if (this.frameHoldCount >= FRAME_HOLD_THRESHOLD) {
      this.frameHoldCount = 0;
      this.pendingTransition = null;
      return candidateTransition;
    }

    // 아직 프레임 홀드 조건 미충족
    return null;
  }

  /**
   * 상태 머신 처리
   */
  protected processStateMachine(
    angle: number,
    confidence: number
  ): PhaseTransition | null {
    const now = Date.now();
    let transition: PhaseTransition | null = null;

    switch (this.currentPhase) {
      case 'IDLE':
        // 시작 자세 감지
        if (this.isInStartPosition(angle)) {
          transition = this.transitionTo('READY', '시작 자세 감지');
        }
        break;

      case 'READY':
        // 움직임 시작 감지
        if (this.isMovingTowardsTarget(angle)) {
          transition = this.transitionTo('MOVING', '동작 시작');
        } else if (!this.isInStartPosition(angle)) {
          // 시작 자세 벗어남
          transition = this.transitionTo('IDLE', '시작 자세 이탈');
        }
        break;

      case 'MOVING':
        // 목표 도달 감지
        if (this.hasReachedTarget(angle)) {
          this.holdStartTime = now;
          transition = this.transitionTo('HOLDING', '목표 도달');
        } else if (this.isReturningBeforeTarget(angle)) {
          // 목표 도달 전 복귀 (불완전 반복)
          transition = this.transitionTo('RETURNING', '조기 복귀');
        }
        break;

      case 'HOLDING':
        // 홀드 시간 체크
        const holdDuration = (now - this.holdStartTime) / 1000;
        if (holdDuration >= this.requiredHoldTime) {
          // 홀드 완료 → 복귀 시작
          transition = this.transitionTo('RETURNING', '홀드 완료');
        } else if (!this.isNearTarget(angle)) {
          // 목표 위치 이탈
          transition = this.transitionTo('MOVING', '목표 위치 이탈');
        }
        break;

      case 'RETURNING':
        // 시작 위치 복귀 감지
        if (this.hasReturnedToStart(angle)) {
          // 반복 완료!
          this.completeRep(angle, confidence);
          transition = this.transitionTo('COOLDOWN', '반복 완료');
        }
        break;

      case 'COOLDOWN':
        // 쿨다운 완료 체크
        const cooldownTime = this.calculateAdaptiveCooldown();
        if (now - this.lastRepCompletedAt >= cooldownTime) {
          // 다음 반복 준비
          if (this.isInStartPosition(angle)) {
            transition = this.transitionTo('READY', '다음 반복 준비');
          } else {
            transition = this.transitionTo('IDLE', '쿨다운 완료');
          }
        }
        break;
    }

    return transition;
  }

  /**
   * 상태 전환
   */
  protected transitionTo(newPhase: ExercisePhase, reason: string): PhaseTransition {
    const transition: PhaseTransition = {
      from: this.currentPhase,
      to: newPhase,
      reason,
      timestamp: Date.now(),
    };

    this.currentPhase = newPhase;
    this.phaseStartTime = Date.now();

    // ROM 디버그 로깅
    this._logTransitionDebug(transition);

    return transition;
  }

  /**
   * 반복 완료 처리
   */
  protected completeRep(angle: number, confidence: number): void {
    const now = Date.now();

    // 정확도 계산
    const accuracy = this.calculateRepAccuracy(angle, confidence);
    this.repAccuracies.push(accuracy);

    // 반복 시간 기록
    this.lastRepDuration = now - this.phaseStartTime;
    this.lastRepCompletedAt = now;

    // 카운트 증가
    this.repCount++;

    // ROM 디버그 로깅
    this._logRepCompleteDebug(angle, confidence, accuracy);
  }

  /**
   * 적응형 쿨다운 계산
   */
  protected calculateAdaptiveCooldown(): number {
    const { minCooldown, maxCooldown, adaptiveScale } = this.cooldownConfig;

    if (this.lastRepDuration === 0) {
      return minCooldown;
    }

    // 반복 시간에 비례한 쿨다운
    const adaptiveCooldown = this.lastRepDuration * adaptiveScale;

    return Math.min(maxCooldown, Math.max(minCooldown, adaptiveCooldown));
  }

  /**
   * 반복 정확도 계산
   * progress 중심 + formScore (실제 ROM / 목표 ROM)
   * 동작 완료 시 최소 60% 보장
   */
  protected calculateRepAccuracy(angle: number, _confidence: number): number {
    // 목표 도달률
    const progress = this.calculateProgress(angle);

    // formScore: 실제 ROM 대비 목표 ROM 비율
    const totalROM = this.thresholds.totalROM || 1;
    const actualROM = Math.abs(angle - this.thresholds.startAngle.center);
    const formScore = Math.min(1, actualROM / totalROM);

    // 종합 정확도 (progress 70% + formScore 30%)
    const rawAccuracy = (progress * 0.7 + formScore * 0.3) * 100;

    // 동작을 완료했으면 최소 60% 보장
    if (progress >= 0.8) {
      return Math.max(60, Math.min(100, rawAccuracy));
    }

    return Math.min(100, rawAccuracy);
  }

  /**
   * 결과 생성 헬퍼
   */
  protected createResult(partial: Partial<DetectionResult>): DetectionResult {
    return {
      phase: this.currentPhase,
      repCompleted: false,
      currentAngle: 0,
      targetAngle: this.thresholds.targetAngle,
      progress: 0,
      accuracy: 0,
      confidence: 0,
      feedback: '',
      ...partial,
    };
  }

  /**
   * 감지 결과 생성
   */
  protected createDetectionResult(
    angle: number,
    confidence: number,
    transition: PhaseTransition | null
  ): DetectionResult {
    const progress = this.calculateProgress(angle);
    const repCompleted = transition?.to === 'COOLDOWN' && transition?.from === 'RETURNING';

    let holdProgress: number | undefined;
    if (this.currentPhase === 'HOLDING') {
      const holdDuration = (Date.now() - this.holdStartTime) / 1000;
      holdProgress = Math.min(1, holdDuration / this.requiredHoldTime);
    }

    const feedback = this.generateFeedback(angle, progress, transition);

    return {
      phase: this.currentPhase,
      repCompleted,
      currentAngle: angle,
      targetAngle: this.thresholds.targetAngle,
      progress,
      accuracy: repCompleted
        ? this.repAccuracies[this.repAccuracies.length - 1] || 0
        : this.calculateRepAccuracy(angle, confidence),
      confidence,
      feedback,
      holdProgress,
    };
  }

  /**
   * 피드백 메시지 생성
   */
  protected generateFeedback(
    angle: number,
    progress: number,
    transition: PhaseTransition | null
  ): string {
    if (transition?.to === 'COOLDOWN') {
      const accuracy = this.repAccuracies[this.repAccuracies.length - 1] || 0;
      if (accuracy >= 90) return '완벽해요!';
      if (accuracy >= 70) return '좋아요!';
      return '잘했어요! 다음엔 조금만 더!';
    }

    switch (this.currentPhase) {
      case 'IDLE':
        return '시작 자세를 잡아주세요';
      case 'READY':
        return '준비 완료! 동작을 시작하세요';
      case 'MOVING':
        if (progress < 0.5) return '조금만 더 움직여주세요';
        if (progress < 0.8) return '거의 다 왔어요!';
        return '목표에 가까워요!';
      case 'HOLDING':
        return '좋아요, 그 자세 유지!';
      case 'RETURNING':
        return '천천히 돌아오세요';
      case 'COOLDOWN':
        return '잠시 쉬세요';
      default:
        return '';
    }
  }

  // ============ 추상 메서드 (하위 클래스에서 구현) ============

  /**
   * 관절 각도 계산 (운동별 다름)
   */
  protected abstract calculateAngle(
    landmarks: Landmark[]
  ): { angle: number; confidence: number } | null;

  /**
   * 시작 자세 체크
   */
  protected abstract isInStartPosition(angle: number): boolean;

  /**
   * 목표 방향 이동 체크
   */
  protected abstract isMovingTowardsTarget(angle: number): boolean;

  /**
   * 목표 도달 체크
   */
  protected abstract hasReachedTarget(angle: number): boolean;

  /**
   * 목표 근처 체크 (홀드용)
   */
  protected abstract isNearTarget(angle: number): boolean;

  /**
   * 조기 복귀 체크
   */
  protected abstract isReturningBeforeTarget(angle: number): boolean;

  /**
   * 시작 위치 복귀 체크
   */
  protected abstract hasReturnedToStart(angle: number): boolean;

  /**
   * 진행률 계산
   */
  protected abstract calculateProgress(angle: number): number;

  // ============ 공통 유틸리티 ============

  /**
   * 현재 반복 횟수
   */
  getRepCount(): number {
    return this.repCount;
  }

  /**
   * 평균 정확도
   */
  getAverageAccuracy(): number {
    if (this.repAccuracies.length === 0) return 0;
    return this.repAccuracies.reduce((a, b) => a + b, 0) / this.repAccuracies.length;
  }

  /**
   * 현재 상태
   */
  getCurrentPhase(): ExercisePhase {
    return this.currentPhase;
  }

  /**
   * 캘리브레이션 적용 여부
   */
  hasCalibrationApplied(): boolean {
    return this.hasCalibration;
  }

  // ============ ROM 디버그 API ============

  /**
   * ROM 디버그 모드 설정
   * 활성화 시 설정 스냅샷 자동 출력
   */
  setDebugMode(enabled: boolean): void {
    this._romDebugEnabled = enabled;
    if (enabled) {
      this._logConfigSnapshot('debug-enabled');
    }
  }

  /**
   * ROM 디버그 모드 상태 확인
   */
  isDebugMode(): boolean {
    return this._romDebugEnabled;
  }

  // ============ ROM 디버그 로깅 헬퍼 ============

  /**
   * 프레임 디버그 로깅 (스로틀링 적용)
   */
  protected _logFrameDebug(rawAngle: number, smoothedAngle: number, confidence: number): void {
    if (!this._romDebugEnabled) return;
    if (this._debugFrameCount % ROM_DEBUG_LOG_INTERVAL !== 0) return;

    const progress = this.calculateProgress(smoothedAngle);
    romLogger.debug('[ROM:Frame]', {
      exercise: this.exerciseType,
      joint: this.jointType,
      raw: parseFloat(rawAngle.toFixed(1)),
      smoothed: parseFloat(smoothedAngle.toFixed(1)),
      phase: this.currentPhase,
      confidence: parseFloat(confidence.toFixed(2)),
      progress: parseFloat(progress.toFixed(2)),
      calibrated: this.hasCalibration,
      frame: this._debugFrameCount,
    });
  }

  /**
   * 상태 전환 디버그 로깅
   */
  protected _logTransitionDebug(transition: PhaseTransition): void {
    if (!this._romDebugEnabled) return;

    romLogger.debug('[ROM:Transition]', {
      exercise: this.exerciseType,
      from: transition.from,
      to: transition.to,
      reason: transition.reason,
      angle: parseFloat(this.previousAngle.toFixed(1)),
      frame: this._debugFrameCount,
    });
  }

  /**
   * 반복 완료 디버그 로깅 (ROM 검증 포함)
   */
  protected _logRepCompleteDebug(angle: number, _confidence: number, accuracy: number): void {
    if (!this._romDebugEnabled) return;

    const startAngle = this.thresholds.startAngle.center;
    const targetAngle = this.thresholds.targetAngle;
    const totalROM = this.thresholds.totalROM || Math.abs(targetAngle - startAngle);
    const actualROM = Math.abs(angle - startAngle);
    const romRatio = totalROM > 0 ? actualROM / totalROM : 0;
    const progress = this.calculateProgress(angle);
    const romPass = progress >= 0.8;

    const rationale = romPass
      ? `PASS: progress=${progress.toFixed(2)}>=0.8, accuracy=${accuracy.toFixed(1)}%`
      : `FAIL: progress=${progress.toFixed(2)}<0.8`;

    romLogger.debug('[ROM:Rep]', {
      exercise: this.exerciseType,
      joint: this.jointType,
      rep: this.repCount,
      accuracy: parseFloat(accuracy.toFixed(1)),
      actualROM: parseFloat(actualROM.toFixed(1)),
      targetROM: parseFloat(totalROM.toFixed(1)),
      romRatio: parseFloat(romRatio.toFixed(2)),
      startAngle: parseFloat(startAngle.toFixed(1)),
      targetAngle: parseFloat(targetAngle.toFixed(1)),
      romPass,
      rationale,
      calibrated: this.hasCalibration,
    });
  }

  /**
   * 설정 스냅샷 디버그 로깅
   */
  protected _logConfigSnapshot(trigger: string): void {
    if (!this._romDebugEnabled) return;

    romLogger.debug('[ROM:Config]', {
      trigger,
      exercise: this.exerciseType,
      joint: this.jointType,
      calibrated: this.hasCalibration,
      thresholds: {
        startAngle: this.thresholds.startAngle,
        targetAngle: this.thresholds.targetAngle,
        completionThreshold: this.thresholds.completionThreshold,
        returnThreshold: this.thresholds.returnThreshold,
        totalROM: this.thresholds.totalROM,
      },
      requiredHoldTime: this.requiredHoldTime,
    });
  }
}

// 유틸리티 함수 re-export (하위 호환성)
export { calculateJointAngle } from './utils';
