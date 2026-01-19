/**
 * 프론트엔드 타입 정의
 * camelCase 컨벤션 사용 (TypeScript 표준)
 * DB 타입(snake_case)과 분리하여 타입 안전성 보장
 */

import type { ExerciseType } from './exercise';

/**
 * 사용자 프로필 (Frontend)
 */
export interface UserProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  preferredWorldview: string | null;
}

/**
 * 운동 세션 (Frontend)
 */
export interface FrontendExerciseSession {
  id: string;
  userId: string;
  exerciseType: ExerciseType | string;
  worldview: string | null;
  startedAt: string;
  endedAt: string | null;
  totalReps: number;
  targetReps: number;
  averageAccuracy: number;
  durationSeconds: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
}

/**
 * 운동 반복 기록 (Frontend)
 */
export interface FrontendExerciseRep {
  id: string;
  sessionId: string;
  repNumber: number;
  accuracy: number;
  maxAngle: number;
  minAngle: number;
  holdTime: number | null;
  timestamp: string;
}

/**
 * 캘리브레이션 데이터 (Frontend)
 */
export interface FrontendCalibration {
  id: string;
  userId: string;
  jointType: string;
  startAngle: number;
  targetAngle: number;
  tolerance: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 사용자 설정 (Frontend)
 */
export interface FrontendUserSettings {
  id: string;
  userId: string;
  hapticEnabled: boolean;
  soundEnabled: boolean;
  ttsEnabled: boolean;
  accessibilityMode: boolean;
  preferredLanguage: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 운동 통계 (Frontend)
 */
export interface FrontendExerciseStats {
  totalSessions: number;
  totalReps: number;
  averageAccuracy: number;
  totalDuration: number;
  bestAccuracy: number;
  exerciseBreakdown: Record<string, number>;
}

/**
 * 세션 생성 요청
 */
export interface CreateSessionRequest {
  userId: string;
  exerciseType: ExerciseType;
  worldview?: string;
  targetReps: number;
}

/**
 * 세션 완료 요청
 */
export interface CompleteSessionRequest {
  sessionId: string;
  totalReps: number;
  averageAccuracy: number;
  durationSeconds: number;
}

/**
 * 반복 기록 요청
 */
export interface RecordRepRequest {
  sessionId: string;
  repNumber: number;
  accuracy: number;
  maxAngle?: number;
  minAngle?: number;
  holdTime?: number;
}

/**
 * API 응답 래퍼
 */
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

/**
 * 페이지네이션 옵션
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * 세션 필터 옵션
 */
export interface SessionFilterOptions extends PaginationOptions {
  exerciseType?: ExerciseType;
  status?: 'completed' | 'cancelled' | 'in_progress' | 'all';
  startDate?: Date;
  endDate?: Date;
}
