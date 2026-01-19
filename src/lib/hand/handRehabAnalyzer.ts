/**
 * 손 재활 운동 분석기
 * 각 재활 운동의 상태를 추적하고 피드백 제공
 */

import {
  type HandLandmarkPoint,
  type HandRehabExercise,
  type HandGesture,
  type FingerName,
  HAND_REHAB_DEFINITIONS,
} from '@/types/hand';

import {
  detectHandGesture,
  calculateThumbToFingerDistance,
  calculateAverageFlexion,
  flexionToPercent,
  calculateFingerSpread,
  isFingerExtended,
  getDebugAngles,
  calculatePalmOrientation,
} from './handAngleCalculator';

/** 운동 단계 */
export type HandExercisePhase =
  | 'ready'       // 준비
  | 'in_progress' // 진행 중
  | 'hold'        // 유지
  | 'transition'  // 전환
  | 'completed';  // 완료

/** 디버그용 각도 정보 */
export interface DebugAngles {
  avgMcp: number;
  avgPip: number;
  avgDip: number;
}

/** 운동별 측정 데이터 */
export interface ExerciseMeasurement {
  type: 'flexion' | 'angles' | 'distance' | 'spread';
  label: string;
  value: number;
  unit: string;
  target?: number;
  details?: Record<string, number>;
}

/** 재활 분석 결과 */
export interface HandRehabAnalysis {
  exercise: HandRehabExercise;
  phase: HandExercisePhase;
  currentStep: number;
  totalSteps: number;
  repCount: number;
  targetReps: number;
  currentGesture: HandGesture;
  isCorrectGesture: boolean;
  progress: number;          // 0-100
  holdTime: number;          // 현재 유지 시간 (ms)
  targetHoldTime: number;    // 목표 유지 시간 (ms)
  feedback: string;
  flexionPercent: number;    // 굴곡 퍼센트
  debugAngles?: DebugAngles; // 디버그용 각도 정보
  measurement?: ExerciseMeasurement;
}

/** 스무딩 설정 */
interface SmoothingConfig {
  windowSize: number;
  minHoldDuration: number;
  gestureStabilityFrames: number;
}

const DEFAULT_SMOOTHING: SmoothingConfig = {
  windowSize: 5,
  minHoldDuration: 500,
  gestureStabilityFrames: 3,
};

/**
 * 손 재활 운동 분석기
 */
export class HandRehabAnalyzer {
  private exercise: HandRehabExercise;
  private phase: HandExercisePhase = 'ready';
  private currentStep = 0;
  private repCount = 0;
  private holdStartTime: number | null = null;
  private gestureHistory: HandGesture[] = [];
  private flexionHistory: number[] = [];
  private config: SmoothingConfig;

  // 엄지-손가락 터치 운동용
  private currentTargetFinger: FingerName = 'index';
  private touchSequence: FingerName[] = ['index', 'middle', 'ring', 'pinky'];
  private touchIndex = 0;

  // 손목 회전 관련
  private wristRotationStartAngle: number | null = null;
  private wristRotationLastAngle: number | null = null;
  private wristRotationTotalDegrees = 0;
  private wristRotationDirection = 0;
  private wristRotationHistory: number[] = [];
  private wristRotationThreshold = 270;

  constructor(
    exercise: HandRehabExercise = 'finger_flexion',
    config: Partial<SmoothingConfig> = {}
  ) {
    this.exercise = exercise;
    this.config = { ...DEFAULT_SMOOTHING, ...config };
  }

  /**
   * 운동 설정
   */
  setExercise(exercise: HandRehabExercise): void {
    this.exercise = exercise;
    this.reset();
  }

  /**
   * 현재 운동 반환
   */
  getExercise(): HandRehabExercise {
    return this.exercise;
  }

  /**
   * 프레임 분석
   */
  analyze(landmarks: HandLandmarkPoint[]): HandRehabAnalysis {
    const gesture = this.getStableGesture(landmarks);
    const flexion = this.getSmoothedFlexion(landmarks);
    const definition = HAND_REHAB_DEFINITIONS[this.exercise];

    let result: HandRehabAnalysis;

    switch (this.exercise) {
      case 'finger_flexion':
        result = this.analyzeFingerFlexion(landmarks, gesture, flexion);
        break;
      case 'tendon_glide':
        result = this.analyzeTendonGlide(landmarks, gesture);
        break;
      case 'thumb_opposition':
        result = this.analyzeThumbOpposition(landmarks);
        break;
      case 'finger_spread':
        result = this.analyzeFingerSpread(landmarks);
        break;
      case 'grip_squeeze':
        result = this.analyzeFingerFlexion(landmarks, gesture, flexion);
        break;
      case 'wrist_rotation':
        result = this.analyzeWristRotation(landmarks);
        break;
      default:
        result = this.createDefaultResult(gesture, flexion);
    }

    return {
      ...result,
      targetReps: definition.repetitions,
      targetHoldTime: (definition.holdSeconds ?? 0) * 1000,
    };
  }

  /**
   * 손가락 굴곡/신전 분석
   */
  private analyzeFingerFlexion(
    landmarks: HandLandmarkPoint[],
    gesture: HandGesture,
    flexion: number
  ): HandRehabAnalysis {
    const flexionPercent = flexionToPercent(flexion);
    const isOpen = gesture === 'open';
    const isFist = gesture === 'fist' || flexionPercent > 70;
    const now = Date.now();

    let feedback = '';
    let isCorrectGesture = false;

    if (this.phase === 'ready') {
      if (isOpen) {
        feedback = '손을 편 상태입니다. 주먹을 쥐세요.';
        this.phase = 'in_progress';
        this.currentStep = 0;
      } else {
        feedback = '손가락을 완전히 펴세요.';
      }
    } else if (this.phase === 'in_progress') {
      if (isFist) {
        feedback = '주먹을 쥐었습니다. 5초간 유지하세요.';
        this.phase = 'hold';
        this.holdStartTime = now;
        this.currentStep = 1;
        isCorrectGesture = true;
      } else {
        feedback = '천천히 주먹을 쥐세요.';
      }
    } else if (this.phase === 'hold') {
      const holdTime = this.holdStartTime ? now - this.holdStartTime : 0;

      if (!isFist) {
        if (holdTime >= this.config.minHoldDuration) {
          this.repCount++;
          feedback = `${this.repCount}회 완료! 다시 손을 펴세요.`;
          this.currentStep = 2;
        } else {
          feedback = '더 오래 유지하세요.';
        }
        this.phase = 'ready';
        this.holdStartTime = null;
      } else {
        const remainingTime = Math.max(0, 5000 - holdTime);
        feedback = `유지 중... ${(remainingTime / 1000).toFixed(1)}초 남음`;
        isCorrectGesture = true;
      }
    }

    return {
      exercise: this.exercise,
      phase: this.phase,
      currentStep: this.currentStep,
      totalSteps: 3,
      repCount: this.repCount,
      targetReps: HAND_REHAB_DEFINITIONS[this.exercise].repetitions,
      currentGesture: gesture,
      isCorrectGesture,
      progress: (this.repCount / HAND_REHAB_DEFINITIONS[this.exercise].repetitions) * 100,
      holdTime: this.holdStartTime ? now - this.holdStartTime : 0,
      targetHoldTime: 5000,
      feedback,
      flexionPercent,
      measurement: {
        type: 'flexion',
        label: '손가락 굴곡',
        value: Math.round(flexionPercent),
        unit: '%',
        target: isFist ? 70 : 30,
      },
    };
  }

  /**
   * 힘줄 미끄럼 운동 분석
   */
  private analyzeTendonGlide(
    landmarks: HandLandmarkPoint[],
    gesture: HandGesture
  ): HandRehabAnalysis {
    const targetGestures: HandGesture[] = ['open', 'hook', 'table_top', 'straight_fist', 'full_fist'];
    const targetGesture = targetGestures[this.currentStep];
    const isCorrect = gesture === targetGesture;
    const now = Date.now();
    const debugAngles = getDebugAngles(landmarks);

    let feedback = '';

    const stepNames = ['손 펴기', '갈고리', '테이블탑', '직선 주먹', '완전 주먹'];

    if (isCorrect) {
      if (this.phase !== 'hold') {
        this.phase = 'hold';
        this.holdStartTime = now;
      }

      const holdTime = this.holdStartTime ? now - this.holdStartTime : 0;

      if (holdTime >= 3000) {
        this.currentStep++;
        this.holdStartTime = null;
        this.phase = 'transition';

        if (this.currentStep >= targetGestures.length) {
          this.repCount++;
          this.currentStep = 0;
          feedback = `${this.repCount}회 완료! 처음부터 다시 시작하세요.`;
        } else {
          feedback = `${stepNames[this.currentStep]} 자세를 취하세요.`;
        }
      } else {
        const remaining = (3000 - holdTime) / 1000;
        feedback = `${stepNames[this.currentStep]} 유지 중... ${remaining.toFixed(1)}초`;
      }
    } else {
      this.phase = 'in_progress';
      this.holdStartTime = null;
      feedback = `${stepNames[this.currentStep]} 자세를 취하세요.`;
    }

    return {
      exercise: this.exercise,
      phase: this.phase,
      currentStep: this.currentStep,
      totalSteps: 5,
      repCount: this.repCount,
      targetReps: HAND_REHAB_DEFINITIONS[this.exercise].repetitions,
      currentGesture: gesture,
      isCorrectGesture: isCorrect,
      progress: ((this.repCount * 5 + this.currentStep) / (HAND_REHAB_DEFINITIONS[this.exercise].repetitions * 5)) * 100,
      holdTime: this.holdStartTime ? now - this.holdStartTime : 0,
      targetHoldTime: 3000,
      feedback,
      debugAngles,
      flexionPercent: 0,
      measurement: {
        type: 'angles',
        label: '관절 각도',
        value: Math.round(debugAngles.avgPip),
        unit: '°',
        details: {
          MCP: Math.round(debugAngles.avgMcp),
          PIP: Math.round(debugAngles.avgPip),
          DIP: Math.round(debugAngles.avgDip),
        },
      },
    };
  }

  /**
   * 엄지-손가락 터치 분석
   */
  private analyzeThumbOpposition(landmarks: HandLandmarkPoint[]): HandRehabAnalysis {
    const distance = calculateThumbToFingerDistance(landmarks, this.currentTargetFinger);
    const isClose = distance < 0.05;
    const now = Date.now();

    let feedback = '';
    const fingerNames: Record<FingerName, string> = {
      thumb: '엄지',
      index: '검지',
      middle: '중지',
      ring: '약지',
      pinky: '새끼',
    };

    if (isClose) {
      if (this.phase !== 'hold') {
        this.phase = 'hold';
        this.holdStartTime = now;
      }

      const holdTime = this.holdStartTime ? now - this.holdStartTime : 0;

      if (holdTime >= 500) {
        this.touchIndex++;

        if (this.touchIndex >= this.touchSequence.length) {
          this.repCount++;
          this.touchIndex = 0;
          feedback = `${this.repCount}회 완료! 검지부터 다시 시작하세요.`;
        } else {
          feedback = `좋습니다! ${fingerNames[this.touchSequence[this.touchIndex]]}를 터치하세요.`;
        }

        this.currentTargetFinger = this.touchSequence[this.touchIndex];
        this.holdStartTime = null;
        this.phase = 'transition';
      } else {
        feedback = `${fingerNames[this.currentTargetFinger]} 터치 유지...`;
      }
    } else {
      this.phase = 'in_progress';
      this.holdStartTime = null;
      feedback = `엄지로 ${fingerNames[this.currentTargetFinger]}를 터치하세요.`;
    }

    return {
      exercise: this.exercise,
      phase: this.phase,
      currentStep: this.touchIndex,
      totalSteps: 4,
      repCount: this.repCount,
      targetReps: HAND_REHAB_DEFINITIONS[this.exercise].repetitions,
      currentGesture: 'unknown',
      isCorrectGesture: isClose,
      progress: ((this.repCount * 4 + this.touchIndex) / (HAND_REHAB_DEFINITIONS[this.exercise].repetitions * 4)) * 100,
      holdTime: this.holdStartTime ? now - this.holdStartTime : 0,
      targetHoldTime: 500,
      feedback,
      flexionPercent: 0,
      measurement: {
        type: 'distance',
        label: '터치 거리',
        value: Math.round(distance * 1000) / 10,
        unit: 'cm',
        target: 0,
      },
    };
  }

  /**
   * 손가락 벌리기 분석
   */
  private analyzeFingerSpread(landmarks: HandLandmarkPoint[]): HandRehabAnalysis {
    const spread = calculateFingerSpread(landmarks);
    const avgSpread = (spread.indexMiddle + spread.middleRing + spread.ringPinky) / 3;

    const fingersExtended =
      isFingerExtended(landmarks, 'index', 150) &&
      isFingerExtended(landmarks, 'middle', 150) &&
      isFingerExtended(landmarks, 'ring', 150) &&
      isFingerExtended(landmarks, 'pinky', 150);

    const isSpread = fingersExtended && avgSpread > 15;
    const now = Date.now();

    let feedback = '';

    if (isSpread) {
      if (this.phase !== 'hold') {
        this.phase = 'hold';
        this.holdStartTime = now;
      }

      const holdTime = this.holdStartTime ? now - this.holdStartTime : 0;

      if (holdTime >= 5000) {
        this.repCount++;
        this.holdStartTime = null;
        this.phase = 'ready';
        feedback = `${this.repCount}회 완료! 손가락을 모으세요.`;
      } else {
        const remaining = (5000 - holdTime) / 1000;
        feedback = `손가락 벌리기 유지... ${remaining.toFixed(1)}초`;
      }
    } else {
      this.phase = 'in_progress';
      this.holdStartTime = null;
      if (!fingersExtended) {
        feedback = '먼저 손가락을 펴세요.';
      } else {
        feedback = '손가락을 최대한 벌리세요.';
      }
    }

    return {
      exercise: this.exercise,
      phase: this.phase,
      currentStep: isSpread ? 1 : 0,
      totalSteps: 2,
      repCount: this.repCount,
      targetReps: HAND_REHAB_DEFINITIONS[this.exercise].repetitions,
      currentGesture: isSpread ? 'open' : 'unknown',
      isCorrectGesture: isSpread,
      progress: (this.repCount / HAND_REHAB_DEFINITIONS[this.exercise].repetitions) * 100,
      holdTime: this.holdStartTime ? now - this.holdStartTime : 0,
      targetHoldTime: 5000,
      feedback,
      flexionPercent: 0,
      measurement: {
        type: 'spread',
        label: '벌림 각도',
        value: Math.round(avgSpread),
        unit: '°',
        target: 15,
        details: {
          '검지-중지': Math.round(spread.indexMiddle),
          '중지-약지': Math.round(spread.middleRing),
          '약지-새끼': Math.round(spread.ringPinky),
        },
      },
    };
  }

  /**
   * 손목 회전 분석
   */
  private analyzeWristRotation(landmarks: HandLandmarkPoint[]): HandRehabAnalysis {
    const palmOrientation = calculatePalmOrientation(landmarks);
    const currentAngle = palmOrientation.rotationAngle;

    this.wristRotationHistory.push(currentAngle);
    if (this.wristRotationHistory.length > 5) {
      this.wristRotationHistory.shift();
    }

    const smoothedAngle = this.wristRotationHistory.reduce((a, b) => a + b, 0) / this.wristRotationHistory.length;

    let feedback = '';
    let isRotating = false;

    if (this.wristRotationStartAngle === null) {
      this.wristRotationStartAngle = smoothedAngle;
      this.wristRotationLastAngle = smoothedAngle;
      this.wristRotationTotalDegrees = 0;
      this.phase = 'ready';
      feedback = '주먹을 쥐고 손목을 원형으로 돌리세요.';
    } else if (this.wristRotationLastAngle !== null) {
      let angleDiff = smoothedAngle - this.wristRotationLastAngle;

      if (angleDiff > 180) angleDiff -= 360;
      if (angleDiff < -180) angleDiff += 360;

      if (Math.abs(angleDiff) > 2 && Math.abs(angleDiff) < 60) {
        if (this.wristRotationDirection === 0) {
          this.wristRotationDirection = angleDiff > 0 ? 1 : -1;
        }

        if ((angleDiff > 0 && this.wristRotationDirection > 0) ||
            (angleDiff < 0 && this.wristRotationDirection < 0)) {
          this.wristRotationTotalDegrees += Math.abs(angleDiff);
          isRotating = true;
          this.phase = 'in_progress';
        }
      }

      this.wristRotationLastAngle = smoothedAngle;

      if (this.wristRotationTotalDegrees >= this.wristRotationThreshold) {
        this.repCount++;
        this.wristRotationTotalDegrees = 0;
        this.wristRotationDirection = 0;
        this.wristRotationStartAngle = smoothedAngle;
        this.phase = 'transition';
        feedback = `${this.repCount}회 완료! 반대 방향으로 돌리세요.`;
      } else {
        const direction = this.wristRotationDirection > 0 ? '시계방향' : this.wristRotationDirection < 0 ? '반시계방향' : '';
        if (isRotating) {
          feedback = `${direction} 회전 중... ${Math.round(this.wristRotationTotalDegrees)}° / ${this.wristRotationThreshold}°`;
        } else {
          feedback = '손목을 원형으로 돌리세요.';
        }
      }
    }

    return {
      exercise: this.exercise,
      phase: this.phase,
      currentStep: 0,
      totalSteps: 1,
      repCount: this.repCount,
      targetReps: HAND_REHAB_DEFINITIONS[this.exercise].repetitions,
      currentGesture: 'fist',
      isCorrectGesture: isRotating,
      progress: (this.repCount / HAND_REHAB_DEFINITIONS[this.exercise].repetitions) * 100,
      holdTime: this.wristRotationTotalDegrees,
      targetHoldTime: this.wristRotationThreshold,
      feedback,
      flexionPercent: 0,
      measurement: {
        type: 'angles',
        label: '회전 각도',
        value: Math.round(this.wristRotationTotalDegrees),
        unit: '°',
        target: this.wristRotationThreshold,
        details: {
          '현재': Math.round(smoothedAngle),
          '누적': Math.round(this.wristRotationTotalDegrees),
          '목표': this.wristRotationThreshold,
        },
      },
    };
  }

  /**
   * 기본 결과 생성
   */
  private createDefaultResult(gesture: HandGesture, flexion: number): HandRehabAnalysis {
    return {
      exercise: this.exercise,
      phase: this.phase,
      currentStep: this.currentStep,
      totalSteps: 1,
      repCount: this.repCount,
      targetReps: 10,
      currentGesture: gesture,
      isCorrectGesture: false,
      progress: 0,
      holdTime: 0,
      targetHoldTime: 0,
      feedback: '운동을 시작하세요.',
      flexionPercent: flexionToPercent(flexion),
    };
  }

  /**
   * 안정적인 제스처 감지 (노이즈 제거)
   */
  private getStableGesture(landmarks: HandLandmarkPoint[]): HandGesture {
    const currentGesture = detectHandGesture(landmarks);

    this.gestureHistory.push(currentGesture);
    if (this.gestureHistory.length > this.config.gestureStabilityFrames) {
      this.gestureHistory.shift();
    }

    const gestureCounts = new Map<HandGesture, number>();
    this.gestureHistory.forEach((g) => {
      gestureCounts.set(g, (gestureCounts.get(g) || 0) + 1);
    });

    let maxCount = 0;
    let stableGesture: HandGesture = currentGesture;
    gestureCounts.forEach((count, gesture) => {
      if (count > maxCount) {
        maxCount = count;
        stableGesture = gesture;
      }
    });

    return stableGesture;
  }

  /**
   * 스무딩된 굴곡 각도
   */
  private getSmoothedFlexion(landmarks: HandLandmarkPoint[]): number {
    const flexion = calculateAverageFlexion(landmarks);

    this.flexionHistory.push(flexion);
    if (this.flexionHistory.length > this.config.windowSize) {
      this.flexionHistory.shift();
    }

    const sum = this.flexionHistory.reduce((a, b) => a + b, 0);
    return sum / this.flexionHistory.length;
  }

  /**
   * 상태 초기화
   */
  reset(): void {
    this.phase = 'ready';
    this.currentStep = 0;
    this.repCount = 0;
    this.holdStartTime = null;
    this.gestureHistory = [];
    this.flexionHistory = [];
    this.touchIndex = 0;
    this.currentTargetFinger = 'index';
    this.wristRotationStartAngle = null;
    this.wristRotationLastAngle = null;
    this.wristRotationTotalDegrees = 0;
    this.wristRotationDirection = 0;
    this.wristRotationHistory = [];
  }

  /**
   * 현재 대상 손가락 (엄지-손가락 터치용)
   */
  get targetFinger(): FingerName {
    return this.currentTargetFinger;
  }

  /**
   * 현재 반복 횟수
   */
  get reps(): number {
    return this.repCount;
  }
}

// 싱글톤 인스턴스
let handRehabAnalyzerInstance: HandRehabAnalyzer | null = null;

export function getHandRehabAnalyzer(exercise?: HandRehabExercise): HandRehabAnalyzer {
  if (!handRehabAnalyzerInstance) {
    handRehabAnalyzerInstance = new HandRehabAnalyzer(exercise);
  } else if (exercise && exercise !== handRehabAnalyzerInstance.getExercise()) {
    handRehabAnalyzerInstance.setExercise(exercise);
  }
  return handRehabAnalyzerInstance;
}

export function resetHandRehabAnalyzer(): void {
  if (handRehabAnalyzerInstance) {
    handRehabAnalyzerInstance.reset();
  }
  handRehabAnalyzerInstance = null;
}
