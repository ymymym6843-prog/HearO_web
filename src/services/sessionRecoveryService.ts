/**
 * 세션 복구 서비스
 * 중단된 운동 세션을 복구하고 재개할 수 있도록 지원
 */

import { createLogger } from '@/lib/logger';
import type { ExerciseType } from '@/types/exercise';

const logger = createLogger('SessionRecoveryService');
import type { WorldviewType } from '@/types/vrm';

// 저장되는 세션 상태
export interface SavedSessionState {
  id: string;
  exerciseType: ExerciseType;
  worldview?: WorldviewType;
  targetReps: number;
  currentRep: number;
  completedReps: number[];
  elapsedSeconds: number;
  startedAt: string;
  lastUpdatedAt: string;
  status: 'in_progress' | 'paused';
  repData: Array<{
    repNumber: number;
    accuracy: number;
    maxAngle?: number;
    minAngle?: number;
    holdTime?: number;
  }>;
}

// 복구 가능한 세션 정보
export interface RecoverableSession {
  sessionState: SavedSessionState;
  canRecover: boolean;
  reason?: string;
  timeSinceLastUpdate: number; // 분
}

// 로컬 스토리지 키
const STORAGE_KEY = 'hearo-session-recovery';
const MAX_RECOVERY_TIME_MINUTES = 60; // 1시간 이내만 복구 가능

class SessionRecoveryService {
  private autoSaveInterval: NodeJS.Timeout | null = null;

  /**
   * 세션 상태 저장
   */
  saveSessionState(state: SavedSessionState): void {
    try {
      const stateToSave = {
        ...state,
        lastUpdatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save session state:', error);
    }
  }

  /**
   * 저장된 세션 상태 조회
   */
  getSavedSessionState(): SavedSessionState | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      return JSON.parse(saved) as SavedSessionState;
    } catch (error) {
      console.error('Failed to get saved session state:', error);
      return null;
    }
  }

  /**
   * 복구 가능한 세션 확인
   */
  checkRecoverableSession(): RecoverableSession | null {
    const savedState = this.getSavedSessionState();
    if (!savedState) return null;

    const lastUpdated = new Date(savedState.lastUpdatedAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);

    // 복구 가능 여부 확인
    if (diffMinutes > MAX_RECOVERY_TIME_MINUTES) {
      return {
        sessionState: savedState,
        canRecover: false,
        reason: '세션이 너무 오래되어 복구할 수 없습니다 (1시간 초과)',
        timeSinceLastUpdate: Math.round(diffMinutes),
      };
    }

    // 이미 완료된 세션인지 확인
    if (savedState.currentRep >= savedState.targetReps) {
      return {
        sessionState: savedState,
        canRecover: false,
        reason: '이미 완료된 세션입니다',
        timeSinceLastUpdate: Math.round(diffMinutes),
      };
    }

    return {
      sessionState: savedState,
      canRecover: true,
      timeSinceLastUpdate: Math.round(diffMinutes),
    };
  }

  /**
   * 세션 상태 삭제 (완료 또는 취소 시)
   */
  clearSessionState(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear session state:', error);
    }
  }

  /**
   * 자동 저장 시작
   */
  startAutoSave(
    getState: () => SavedSessionState,
    intervalMs: number = 5000
  ): void {
    this.stopAutoSave();

    this.autoSaveInterval = setInterval(() => {
      const state = getState();
      if (state.status === 'in_progress') {
        this.saveSessionState(state);
      }
    }, intervalMs);

    // 초기 저장
    this.saveSessionState(getState());
  }

  /**
   * 자동 저장 중지
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * 세션 복구 데이터 생성
   */
  createRecoveryState(
    exerciseType: ExerciseType,
    targetReps: number,
    worldview?: WorldviewType
  ): SavedSessionState {
    return {
      id: `session-${Date.now()}`,
      exerciseType,
      worldview,
      targetReps,
      currentRep: 0,
      completedReps: [],
      elapsedSeconds: 0,
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      status: 'in_progress',
      repData: [],
    };
  }

  /**
   * 복구된 세션의 경과 시간 계산
   */
  calculateElapsedTime(savedState: SavedSessionState): number {
    // 저장된 경과 시간 + 마지막 업데이트 이후 시간(최대 5초)
    // 실제로는 저장된 시간만 반환 (마지막 업데이트 이후 시간은 무시)
    return savedState.elapsedSeconds;
  }

  /**
   * 세션 일시정지
   */
  pauseSession(currentState: SavedSessionState): void {
    this.saveSessionState({
      ...currentState,
      status: 'paused',
    });
  }

  /**
   * 세션 재개
   */
  resumeSession(currentState: SavedSessionState): void {
    this.saveSessionState({
      ...currentState,
      status: 'in_progress',
    });
  }
}

// 싱글톤 인스턴스
export const sessionRecoveryService = new SessionRecoveryService();
export default sessionRecoveryService;
