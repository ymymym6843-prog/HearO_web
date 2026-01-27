/**
 * 운동 결과 저장 서비스
 * Supabase 연동
 */

import { supabase } from '@/lib/supabase/client';
import { createLogger } from '@/lib/logger';

const _logger = createLogger('ExerciseResultService');
import type {
  ExerciseSession,
  ExerciseSessionInsert,
  ExerciseRep,
  ExerciseRepInsert,
} from '@/types/database';
import type { ExerciseType } from '@/types/exercise';
import type { WorldviewType } from '@/types/vrm';

// 세션 생성 옵션
interface CreateSessionOptions {
  userId: string;
  exerciseType: ExerciseType;
  worldview?: WorldviewType;
  targetReps: number;
  chapterNumber?: number;
  episodeNumber?: number;
}

// 세션 완료 옵션
interface CompleteSessionOptions {
  sessionId: string;
  totalReps: number;
  averageAccuracy: number;
  durationSeconds: number;
}

// 반복 기록 옵션
interface RecordRepOptions {
  sessionId: string;
  repNumber: number;
  accuracy: number;
  maxAngle?: number;
  minAngle?: number;
  holdTime?: number;
}

// 통계 타입
interface ExerciseStats {
  totalSessions: number;
  totalReps: number;
  averageAccuracy: number;
  totalDuration: number; // 초
  bestAccuracy: number;
  exerciseBreakdown: Record<string, number>;
}

class ExerciseResultService {
  /**
   * 새 운동 세션 시작
   */
  async createSession(options: CreateSessionOptions): Promise<{
    session: ExerciseSession | null;
    error: Error | null;
  }> {
    const sessionData: ExerciseSessionInsert = {
      user_id: options.userId,
      exercise_type: options.exerciseType,
      worldview: options.worldview || null,
      target_reps: options.targetReps,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      total_reps: 0,
      average_accuracy: 0,
      duration_seconds: 0,
      ...(options.chapterNumber != null && { chapter_number: options.chapterNumber }),
      ...(options.episodeNumber != null && { episode_number: options.episodeNumber }),
    };

    const { data, error } = await supabase
      .from('exercise_sessions')
      .insert(sessionData)
      .select()
      .single();

    return {
      session: data,
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * 운동 세션 완료
   */
  async completeSession(options: CompleteSessionOptions): Promise<{
    session: ExerciseSession | null;
    error: Error | null;
  }> {
    const { data, error } = await supabase
      .from('exercise_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        total_reps: options.totalReps,
        average_accuracy: options.averageAccuracy,
        duration_seconds: options.durationSeconds,
      })
      .eq('id', options.sessionId)
      .select()
      .single();

    return {
      session: data,
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * 운동 세션 취소
   */
  async cancelSession(sessionId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
      .from('exercise_sessions')
      .update({
        status: 'cancelled',
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return {
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * 반복 기록 저장
   */
  async recordRep(options: RecordRepOptions): Promise<{
    rep: ExerciseRep | null;
    error: Error | null;
  }> {
    const repData: ExerciseRepInsert = {
      session_id: options.sessionId,
      rep_number: options.repNumber,
      accuracy: options.accuracy,
      max_angle: options.maxAngle || 0,
      min_angle: options.minAngle || 0,
      hold_time: options.holdTime || null,
      timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('exercise_reps')
      .insert(repData)
      .select()
      .single();

    return {
      rep: data,
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * 세션 조회
   */
  async getSession(sessionId: string): Promise<{
    session: ExerciseSession | null;
    error: Error | null;
  }> {
    const { data, error } = await supabase
      .from('exercise_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    return {
      session: data,
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * 세션의 반복 기록 조회
   */
  async getSessionReps(sessionId: string): Promise<{
    reps: ExerciseRep[];
    error: Error | null;
  }> {
    const { data, error } = await supabase
      .from('exercise_reps')
      .select('*')
      .eq('session_id', sessionId)
      .order('rep_number', { ascending: true });

    return {
      reps: data || [],
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * 사용자의 최근 세션 목록 조회
   */
  async getUserSessions(
    userId: string,
    options?: {
      limit?: number;
      exerciseType?: ExerciseType;
      status?: 'completed' | 'cancelled' | 'all';
    }
  ): Promise<{
    sessions: ExerciseSession[];
    error: Error | null;
  }> {
    let query = supabase
      .from('exercise_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (options?.exerciseType) {
      query = query.eq('exercise_type', options.exerciseType);
    }

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    return {
      sessions: data || [],
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * 사용자 통계 조회
   */
  async getUserStats(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    stats: ExerciseStats | null;
    error: Error | null;
  }> {
    try {
      let query = supabase
        .from('exercise_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (options?.startDate) {
        query = query.gte('started_at', options.startDate.toISOString());
      }

      if (options?.endDate) {
        query = query.lte('started_at', options.endDate.toISOString());
      }

      const { data: sessions, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      if (!sessions || sessions.length === 0) {
        return {
          stats: {
            totalSessions: 0,
            totalReps: 0,
            averageAccuracy: 0,
            totalDuration: 0,
            bestAccuracy: 0,
            exerciseBreakdown: {},
          },
          error: null,
        };
      }

      // 통계 계산
      const totalSessions = sessions.length;
      const totalReps = sessions.reduce((sum, s) => sum + s.total_reps, 0);
      const totalDuration = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
      const bestAccuracy = Math.max(...sessions.map((s) => s.average_accuracy));

      const totalAccuracy = sessions.reduce((sum, s) => sum + s.average_accuracy, 0);
      const averageAccuracy = totalAccuracy / totalSessions;

      // 운동별 분류
      const exerciseBreakdown: Record<string, number> = {};
      sessions.forEach((s) => {
        exerciseBreakdown[s.exercise_type] = (exerciseBreakdown[s.exercise_type] || 0) + 1;
      });

      return {
        stats: {
          totalSessions,
          totalReps,
          averageAccuracy: Math.round(averageAccuracy * 10) / 10,
          totalDuration,
          bestAccuracy: Math.round(bestAccuracy * 10) / 10,
          exerciseBreakdown,
        },
        error: null,
      };
    } catch (error) {
      return {
        stats: null,
        error: error instanceof Error ? error : new Error('통계 조회 실패'),
      };
    }
  }

  /**
   * 오늘의 운동 기록 조회
   */
  async getTodaysSessions(userId: string): Promise<{
    sessions: ExerciseSession[];
    error: Error | null;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('exercise_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('started_at', today.toISOString())
      .lt('started_at', tomorrow.toISOString())
      .order('started_at', { ascending: false });

    return {
      sessions: data || [],
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * 세션 삭제 (관리용)
   */
  async deleteSession(sessionId: string): Promise<{ error: Error | null }> {
    // 먼저 관련 반복 기록 삭제
    await supabase
      .from('exercise_reps')
      .delete()
      .eq('session_id', sessionId);

    // 세션 삭제
    const { error } = await supabase
      .from('exercise_sessions')
      .delete()
      .eq('id', sessionId);

    return {
      error: error ? new Error(error.message) : null,
    };
  }
}

// 싱글톤 인스턴스
export const exerciseResultService = new ExerciseResultService();
export default exerciseResultService;
