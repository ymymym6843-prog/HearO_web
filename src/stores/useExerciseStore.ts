/**
 * 운동 상태 관리 스토어
 */

import { create } from 'zustand';
import type { ExerciseType, ExercisePhase } from '@/types/exercise';

interface ExerciseState {
  // 현재 운동
  currentExercise: ExerciseType | null;

  // 진행 상태
  currentRep: number;
  targetReps: number;
  currentSet: number;
  targetSets: number;

  // 동작 상태
  phase: ExercisePhase;
  accuracy: number;
  progress: number; // 0-1: ROM 기반 실시간 이동률
  currentAngle: number;

  // 피드백
  feedback: string | null;

  // 세션 데이터
  isActive: boolean;
  startTime: number | null;

  // 액션
  setExercise: (exercise: ExerciseType) => void;
  startSession: (targetReps: number, targetSets: number) => void;
  endSession: () => void;

  incrementReps: () => void;
  incrementSets: () => void;
  setPhase: (phase: ExercisePhase) => void;
  updateAccuracy: (accuracy: number) => void;
  updateProgress: (progress: number) => void;
  updateAngle: (angle: number) => void;
  setFeedback: (feedback: string | null) => void;

  resetSession: () => void;
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  // 초기 상태
  currentExercise: null,
  currentRep: 0,
  targetReps: 10,
  currentSet: 1,
  targetSets: 3,
  phase: 'ready',
  accuracy: 0,
  progress: 0,
  currentAngle: 0,
  feedback: null,
  isActive: false,
  startTime: null,

  // 액션
  setExercise: (exercise) => set({ currentExercise: exercise }),

  startSession: (targetReps, targetSets) => set({
    isActive: true,
    startTime: Date.now(),
    currentRep: 0,
    currentSet: 1,
    targetReps,
    targetSets,
    phase: 'ready',
    accuracy: 0,
    progress: 0,
    feedback: null,
  }),

  endSession: () => set({
    isActive: false,
    phase: 'rest',
  }),

  incrementReps: () => {
    const state = get();
    const newRep = state.currentRep + 1;

    if (newRep >= state.targetReps) {
      // 세트 완료
      if (state.currentSet < state.targetSets) {
        set({
          currentRep: 0,
          currentSet: state.currentSet + 1,
          phase: 'rest',
          feedback: `세트 ${state.currentSet} 완료! 잠시 휴식하세요.`,
        });
      } else {
        // 모든 세트 완료
        set({
          currentRep: newRep,
          isActive: false,
          feedback: '운동 완료! 수고하셨습니다.',
        });
      }
    } else {
      set({ currentRep: newRep });
    }
  },

  incrementSets: () => set((state) => ({
    currentSet: Math.min(state.currentSet + 1, state.targetSets),
    currentRep: 0,
    phase: 'ready',
  })),

  setPhase: (phase) => set({ phase }),

  updateAccuracy: (accuracy) => set({ accuracy }),

  updateProgress: (progress) => set({ progress }),

  updateAngle: (angle) => set({ currentAngle: angle }),

  setFeedback: (feedback) => set({ feedback }),

  resetSession: () => set({
    currentRep: 0,
    currentSet: 1,
    phase: 'ready',
    accuracy: 0,
    progress: 0,
    currentAngle: 0,
    feedback: null,
    isActive: false,
    startTime: null,
  }),
}));
