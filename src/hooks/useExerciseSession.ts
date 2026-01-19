/**
 * 운동 세션 관리 훅
 * 세션 생성, 반복 기록, 완료 처리
 */

import { useState, useCallback, useRef } from 'react';
import { exerciseResultService } from '@/services/exerciseResultService';
import { useAuthStore } from '@/stores/useAuthStore';
import { createLogger } from '@/lib/logger';
import type { ExerciseType } from '@/types/exercise';
import type { WorldviewType } from '@/types/vrm';

const logger = createLogger('useExerciseSession');

interface RepData {
  repNumber: number;
  accuracy: number;
  maxAngle?: number;
  minAngle?: number;
  holdTime?: number;
}

interface SessionResult {
  sessionId: string;
  totalReps: number;
  averageAccuracy: number;
  durationSeconds: number;
  reps: RepData[];
}

interface UseExerciseSessionOptions {
  exerciseType: ExerciseType;
  targetReps: number;
  worldview?: WorldviewType;
  autoSave?: boolean; // 자동으로 DB에 저장할지
}

export function useExerciseSession(options: UseExerciseSessionOptions) {
  const { user } = useAuthStore();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [currentRep, setCurrentRep] = useState(0);
  const [reps, setReps] = useState<RepData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startTimeRef = useRef<number>(0);
  const repAccuraciesRef = useRef<number[]>([]);

  /**
   * 세션 시작
   */
  const startSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    startTimeRef.current = Date.now();
    repAccuraciesRef.current = [];

    try {
      // 로그인 상태이고 자동저장이 활성화된 경우 DB에 세션 생성
      if (user && options.autoSave !== false) {
        const { session, error: createError } = await exerciseResultService.createSession({
          userId: user.id,
          exerciseType: options.exerciseType,
          worldview: options.worldview,
          targetReps: options.targetReps,
        });

        if (createError) {
          throw createError;
        }

        if (session) {
          setSessionId(session.id);
        }
      }

      setIsActive(true);
      setCurrentRep(0);
      setReps([]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('세션 시작 실패'));
    } finally {
      setIsLoading(false);
    }
  }, [user, options]);

  /**
   * 반복 기록
   */
  const recordRep = useCallback(async (accuracy: number, angleData?: {
    maxAngle?: number;
    minAngle?: number;
    holdTime?: number;
  }) => {
    const newRepNumber = currentRep + 1;
    const repData: RepData = {
      repNumber: newRepNumber,
      accuracy,
      ...angleData,
    };

    setCurrentRep(newRepNumber);
    setReps(prev => [...prev, repData]);
    repAccuraciesRef.current.push(accuracy);

    // DB에 저장
    if (sessionId && user) {
      try {
        await exerciseResultService.recordRep({
          sessionId,
          repNumber: newRepNumber,
          accuracy,
          maxAngle: angleData?.maxAngle,
          minAngle: angleData?.minAngle,
          holdTime: angleData?.holdTime,
        });
      } catch (err) {
        logger.error('반복 기록 실패', err);
      }
    }

    return newRepNumber;
  }, [currentRep, sessionId, user]);

  /**
   * 세션 완료
   */
  const completeSession = useCallback(async (): Promise<SessionResult | null> => {
    if (!isActive) return null;

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const totalReps = repAccuraciesRef.current.length;
    const averageAccuracy = totalReps > 0
      ? repAccuraciesRef.current.reduce((a, b) => a + b, 0) / totalReps
      : 0;

    const result: SessionResult = {
      sessionId: sessionId || `local-${Date.now()}`,
      totalReps,
      averageAccuracy: Math.round(averageAccuracy * 10) / 10,
      durationSeconds,
      reps: [...reps],
    };

    // DB에 완료 처리
    if (sessionId && user) {
      try {
        await exerciseResultService.completeSession({
          sessionId,
          totalReps,
          averageAccuracy: result.averageAccuracy,
          durationSeconds,
        });
      } catch (err) {
        logger.error('세션 완료 처리 실패', err);
      }
    }

    setIsActive(false);
    return result;
  }, [isActive, sessionId, user, reps]);

  /**
   * 세션 취소
   */
  const cancelSession = useCallback(async () => {
    if (sessionId && user) {
      try {
        await exerciseResultService.cancelSession(sessionId);
      } catch (err) {
        logger.error('세션 취소 실패', err);
      }
    }

    setIsActive(false);
    setSessionId(null);
    setCurrentRep(0);
    setReps([]);
  }, [sessionId, user]);

  /**
   * 현재 평균 정확도
   */
  const currentAverageAccuracy = reps.length > 0
    ? reps.reduce((sum, r) => sum + r.accuracy, 0) / reps.length
    : 0;

  /**
   * 진행률
   */
  const progress = options.targetReps > 0
    ? (currentRep / options.targetReps) * 100
    : 0;

  return {
    // 상태
    sessionId,
    isActive,
    isLoading,
    error,
    currentRep,
    reps,
    currentAverageAccuracy,
    progress,
    targetReps: options.targetReps,

    // 액션
    startSession,
    recordRep,
    completeSession,
    cancelSession,
  };
}

export default useExerciseSession;
