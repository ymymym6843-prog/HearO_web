'use client';

/**
 * 운동 감지 커스텀 훅
 * 운동 페이지에서 사용하는 감지 로직을 재사용 가능하게 분리
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import {
  getDetectorForExercise,
  resetDetector,
  type ExercisePhase,
  type DetectionResult,
} from '@/lib/exercise/detection';
import { hapticService } from '@/services/hapticService';
import type { ExerciseType } from '@/types/exercise';
import type { Landmark } from '@/types/pose';

// 훅 옵션 타입
interface UseExerciseDetectionOptions {
  exerciseId: ExerciseType;
  targetReps: number;
  onRepComplete?: (count: number, accuracy: number) => void;
  onPhaseChange?: (phase: ExercisePhase, previousPhase: ExercisePhase) => void;
  onExerciseComplete?: (avgAccuracy: number, totalReps: number) => void;
  onProgress?: (progress: number) => void;
  enableHaptic?: boolean;
  throttleMs?: number;
}

// 훅 반환 타입
interface UseExerciseDetectionReturn {
  // 상태
  phase: ExercisePhase;
  repCount: number;
  accuracy: number;
  progress: number;
  feedback: string;
  currentAngle: number;
  holdProgress: number;
  isCompleted: boolean;
  avgAccuracy: number;

  // 액션
  processFrame: (landmarks: Landmark[]) => DetectionResult | null;
  reset: () => void;
}

/**
 * 운동 감지 훅
 *
 * 사용 예시:
 * ```tsx
 * const {
 *   phase, repCount, accuracy, feedback,
 *   processFrame, reset
 * } = useExerciseDetection({
 *   exerciseId: 'squat',
 *   targetReps: 10,
 *   onRepComplete: (count, acc) => console.log(`${count}회 완료! 정확도: ${acc}%`),
 *   onExerciseComplete: (avgAcc) => console.log(`운동 완료! 평균 정확도: ${avgAcc}%`),
 * });
 * ```
 */
export function useExerciseDetection({
  exerciseId,
  targetReps,
  onRepComplete,
  onPhaseChange,
  onExerciseComplete,
  onProgress,
  enableHaptic = true,
  throttleMs = 100,
}: UseExerciseDetectionOptions): UseExerciseDetectionReturn {
  // Detector ref
  const detectorRef = useRef<ReturnType<typeof getDetectorForExercise> | null>(null);

  // 상태 refs (스로틀링용)
  const lastUpdateRef = useRef<number>(0);
  const lastRepCountRef = useRef<number>(0);
  const lastPhaseRef = useRef<ExercisePhase>('IDLE');
  const accumulatedAccuracyRef = useRef<number[]>([]);

  // UI 상태
  const [phase, setPhase] = useState<ExercisePhase>('IDLE');
  const [repCount, setRepCount] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [currentAngle, setCurrentAngle] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [avgAccuracy, setAvgAccuracy] = useState(0);

  // Detector 초기화
  useEffect(() => {
    detectorRef.current = getDetectorForExercise(exerciseId);
    return () => {
      resetDetector(exerciseId);
      detectorRef.current = null;
    };
  }, [exerciseId]);

  // 프레임 처리
  const processFrame = useCallback((landmarks: Landmark[]): DetectionResult | null => {
    if (!detectorRef.current || !landmarks || isCompleted) {
      return null;
    }

    const now = Date.now();

    // 스로틀링
    if (now - lastUpdateRef.current < throttleMs) {
      return null;
    }
    lastUpdateRef.current = now;

    // 감지 수행
    const result = detectorRef.current.processFrame(landmarks);

    // Phase 변경 감지
    if (result.phase !== lastPhaseRef.current) {
      const previousPhase = lastPhaseRef.current;
      lastPhaseRef.current = result.phase;

      // 햅틱 피드백
      if (enableHaptic) {
        if (result.phase === 'HOLDING') {
          hapticService.holdStart();
        } else if (result.phase === 'COOLDOWN' && previousPhase === 'RETURNING') {
          hapticService.repComplete();
        }
      }

      // 콜백 호출
      onPhaseChange?.(result.phase, previousPhase);
      setPhase(result.phase);
    }

    // Rep 완료 감지
    const currentRepCount = detectorRef.current.getRepCount();
    if (currentRepCount > lastRepCountRef.current) {
      lastRepCountRef.current = currentRepCount;
      accumulatedAccuracyRef.current.push(result.accuracy);

      // 콜백 호출
      onRepComplete?.(currentRepCount, result.accuracy);
      setRepCount(currentRepCount);

      // 목표 달성 확인
      if (currentRepCount >= targetReps) {
        const totalAvgAccuracy = accumulatedAccuracyRef.current.reduce((a, b) => a + b, 0)
          / accumulatedAccuracyRef.current.length;

        if (enableHaptic) {
          hapticService.exerciseComplete();
        }

        setIsCompleted(true);
        setAvgAccuracy(totalAvgAccuracy);
        onExerciseComplete?.(totalAvgAccuracy, currentRepCount);
      }
    }

    // 진행률 콜백
    if (result.progress !== progress) {
      onProgress?.(result.progress);
    }

    // UI 상태 업데이트
    setAccuracy(result.accuracy);
    setProgress(result.progress);
    setFeedback(result.feedback);
    setCurrentAngle(result.currentAngle);
    setHoldProgress(result.holdProgress ?? 0);

    return result;
  }, [
    targetReps,
    throttleMs,
    enableHaptic,
    isCompleted,
    progress,
    onRepComplete,
    onPhaseChange,
    onExerciseComplete,
    onProgress,
  ]);

  // 리셋
  const reset = useCallback(() => {
    resetDetector(exerciseId);
    detectorRef.current = getDetectorForExercise(exerciseId);

    lastRepCountRef.current = 0;
    lastPhaseRef.current = 'IDLE';
    accumulatedAccuracyRef.current = [];

    setPhase('IDLE');
    setRepCount(0);
    setAccuracy(0);
    setProgress(0);
    setFeedback('');
    setCurrentAngle(0);
    setHoldProgress(0);
    setIsCompleted(false);
    setAvgAccuracy(0);
  }, [exerciseId]);

  return {
    // 상태
    phase,
    repCount,
    accuracy,
    progress,
    feedback,
    currentAngle,
    holdProgress,
    isCompleted,
    avgAccuracy,

    // 액션
    processFrame,
    reset,
  };
}

/**
 * 홀드 운동용 특화 훅
 * 플랭크, 사이드 플랭크 등 지속 시간 측정 운동에 사용
 */
interface UseHoldExerciseOptions {
  exerciseId: ExerciseType;
  targetTime: number; // 초
  onTimeUpdate?: (currentTime: number) => void;
  onComplete?: (accuracy: number) => void;
  enableHaptic?: boolean;
}

export function useHoldExercise({
  exerciseId,
  targetTime,
  onTimeUpdate,
  onComplete,
  enableHaptic = true,
}: UseHoldExerciseOptions) {
  const detectorRef = useRef<ReturnType<typeof getDetectorForExercise> | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [accuracy, setAccuracy] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    detectorRef.current = getDetectorForExercise(exerciseId);
    return () => {
      resetDetector(exerciseId);
      detectorRef.current = null;
    };
  }, [exerciseId]);

  const processFrame = useCallback((landmarks: Landmark[]) => {
    if (!detectorRef.current || !landmarks || isCompleted) {
      return null;
    }

    const result = detectorRef.current.processFrame(landmarks);

    // 홀드 상태 업데이트
    const holding = result.phase === 'HOLDING';
    if (holding !== isHolding) {
      setIsHolding(holding);
      if (enableHaptic) {
        if (holding) {
          hapticService.holdStart();
        } else {
          hapticService.holdEnd();
        }
      }
    }

    // 시간 업데이트
    if (result.holdProgress !== undefined) {
      const time = result.holdProgress * targetTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);

      // 완료 체크
      if (time >= targetTime && !isCompleted) {
        setIsCompleted(true);
        setAccuracy(result.accuracy);
        if (enableHaptic) {
          hapticService.exerciseComplete();
        }
        onComplete?.(result.accuracy);
      }
    }

    setFeedback(result.feedback);
    setAccuracy(result.accuracy);

    return result;
  }, [targetTime, isHolding, isCompleted, enableHaptic, onTimeUpdate, onComplete]);

  const reset = useCallback(() => {
    resetDetector(exerciseId);
    detectorRef.current = getDetectorForExercise(exerciseId);
    setCurrentTime(0);
    setIsHolding(false);
    setIsCompleted(false);
    setAccuracy(0);
    setFeedback('');
  }, [exerciseId]);

  return {
    currentTime,
    targetTime,
    isHolding,
    isCompleted,
    accuracy,
    feedback,
    progress: currentTime / targetTime,
    processFrame,
    reset,
  };
}
