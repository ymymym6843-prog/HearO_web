/**
 * 통증 추적 서비스
 * 로컬 스토리지 및 Supabase 연동
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { createLogger } from '@/lib/logger';

const _logger = createLogger('PainTrackingService');
import type { PainRecord, BodyPart, PainLevel } from '@/components/pain/PainTracker';

// 로컬 스토리지 키
const LOCAL_STORAGE_KEY = 'hearo-pain-records';

// 통증 추세 분석 결과
export interface PainTrend {
  bodyPart: BodyPart;
  averageLevel: number;
  trend: 'improving' | 'stable' | 'worsening';
  recordCount: number;
  lastRecord: PainRecord;
}

// 통증 요약
export interface PainSummary {
  totalRecords: number;
  averageLevel: number;
  mostAffectedPart: BodyPart | null;
  trends: PainTrend[];
  recentRecords: PainRecord[];
}

class PainTrackingService {
  /**
   * 통증 기록 저장
   */
  async recordPain(
    record: PainRecord,
    userId?: string
  ): Promise<{ success: boolean; error?: Error }> {
    // 로컬 저장 (항상 수행)
    this.saveToLocal(record);

    // Supabase 저장 (로그인 상태일 때)
    if (userId && isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('pain_records').insert({
          user_id: userId,
          body_part: record.bodyPart,
          pain_level: record.painLevel,
          pain_type: record.painType,
          timing: record.timing,
          notes: record.notes,
          session_id: record.sessionId,
          timestamp: record.timestamp,
        });

        if (error) {
          console.error('Failed to save pain record to Supabase:', error);
          // 로컬 저장은 성공했으므로 에러를 반환하지 않음
        }
      } catch (err) {
        console.error('Supabase error:', err);
      }
    }

    return { success: true };
  }

  /**
   * 로컬 스토리지에 저장
   */
  private saveToLocal(record: PainRecord): void {
    try {
      const records = this.getLocalRecords();
      const newRecord = {
        ...record,
        id: record.id || `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      records.unshift(newRecord);
      // 최대 1000개 유지
      const trimmed = records.slice(0, 1000);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  }

  /**
   * 로컬 기록 조회
   */
  private getLocalRecords(): PainRecord[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * 통증 기록 조회
   */
  async getPainRecords(
    userId?: string,
    options?: {
      limit?: number;
      bodyPart?: BodyPart;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ records: PainRecord[]; error?: Error }> {
    // Supabase에서 조회 시도
    if (userId && isSupabaseConfigured) {
      try {
        let query = supabase
          .from('pain_records')
          .select('*')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false });

        if (options?.bodyPart) {
          query = query.eq('body_part', options.bodyPart);
        }

        if (options?.startDate) {
          query = query.gte('timestamp', options.startDate.toISOString());
        }

        if (options?.endDate) {
          query = query.lte('timestamp', options.endDate.toISOString());
        }

        if (options?.limit) {
          query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) {
          throw new Error(error.message);
        }

        // DB 형식을 앱 형식으로 변환
        const records: PainRecord[] = (data || []).map((r) => ({
          id: r.id,
          bodyPart: r.body_part as BodyPart,
          painLevel: r.pain_level as PainLevel,
          painType: (r.pain_type || 'other') as PainRecord['painType'],
          timing: (r.timing || 'during') as PainRecord['timing'],
          notes: r.notes ?? undefined,
          sessionId: r.session_id ?? undefined,
          timestamp: r.timestamp,
        }));

        return { records };
      } catch (err) {
        console.error('Failed to fetch from Supabase:', err);
        // 실패 시 로컬에서 조회
      }
    }

    // 로컬에서 조회
    let records = this.getLocalRecords();

    if (options?.bodyPart) {
      records = records.filter((r) => r.bodyPart === options.bodyPart);
    }

    if (options?.startDate) {
      records = records.filter((r) => new Date(r.timestamp) >= options.startDate!);
    }

    if (options?.endDate) {
      records = records.filter((r) => new Date(r.timestamp) <= options.endDate!);
    }

    if (options?.limit) {
      records = records.slice(0, options.limit);
    }

    return { records };
  }

  /**
   * 세션별 통증 기록 조회
   */
  async getSessionPainRecords(sessionId: string): Promise<{
    before?: PainRecord;
    during?: PainRecord;
    after?: PainRecord;
  }> {
    const { records } = await this.getPainRecords(undefined, { limit: 100 });
    const sessionRecords = records.filter((r) => r.sessionId === sessionId);

    return {
      before: sessionRecords.find((r) => r.timing === 'before'),
      during: sessionRecords.find((r) => r.timing === 'during'),
      after: sessionRecords.find((r) => r.timing === 'after'),
    };
  }

  /**
   * 통증 추세 분석
   */
  async analyzePainTrends(
    userId?: string,
    days: number = 30
  ): Promise<{ trends: PainTrend[]; error?: Error }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { records, error } = await this.getPainRecords(userId, { startDate });

    if (error) {
      return { trends: [], error };
    }

    // 부위별 그룹화
    const byBodyPart = new Map<BodyPart, PainRecord[]>();
    records.forEach((record) => {
      const existing = byBodyPart.get(record.bodyPart) || [];
      existing.push(record);
      byBodyPart.set(record.bodyPart, existing);
    });

    // 추세 계산
    const trends: PainTrend[] = [];

    byBodyPart.forEach((partRecords, bodyPart) => {
      if (partRecords.length < 2) {
        // 데이터가 부족하면 stable로 처리
        trends.push({
          bodyPart,
          averageLevel: partRecords[0]?.painLevel || 0,
          trend: 'stable',
          recordCount: partRecords.length,
          lastRecord: partRecords[0],
        });
        return;
      }

      // 시간순 정렬
      const sorted = [...partRecords].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const avgLevel =
        sorted.reduce((sum, r) => sum + r.painLevel, 0) / sorted.length;

      // 추세 계산 (처음 절반 vs 나중 절반)
      const midpoint = Math.floor(sorted.length / 2);
      const firstHalf = sorted.slice(0, midpoint);
      const secondHalf = sorted.slice(midpoint);

      const firstAvg =
        firstHalf.reduce((sum, r) => sum + r.painLevel, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, r) => sum + r.painLevel, 0) / secondHalf.length;

      let trend: 'improving' | 'stable' | 'worsening' = 'stable';
      const diff = secondAvg - firstAvg;

      if (diff < -0.5) {
        trend = 'improving';
      } else if (diff > 0.5) {
        trend = 'worsening';
      }

      trends.push({
        bodyPart,
        averageLevel: Math.round(avgLevel * 10) / 10,
        trend,
        recordCount: partRecords.length,
        lastRecord: sorted[sorted.length - 1],
      });
    });

    // 평균 통증 레벨 순으로 정렬
    trends.sort((a, b) => b.averageLevel - a.averageLevel);

    return { trends };
  }

  /**
   * 통증 요약 조회
   */
  async getPainSummary(userId?: string): Promise<{
    summary: PainSummary;
    error?: Error;
  }> {
    const { records, error } = await this.getPainRecords(userId, { limit: 100 });

    if (error) {
      return {
        summary: {
          totalRecords: 0,
          averageLevel: 0,
          mostAffectedPart: null,
          trends: [],
          recentRecords: [],
        },
        error,
      };
    }

    const { trends } = await this.analyzePainTrends(userId, 30);

    // 평균 통증 레벨
    const avgLevel =
      records.length > 0
        ? records.reduce((sum, r) => sum + r.painLevel, 0) / records.length
        : 0;

    // 가장 영향받은 부위
    const partCounts = new Map<BodyPart, number>();
    records.forEach((r) => {
      partCounts.set(r.bodyPart, (partCounts.get(r.bodyPart) || 0) + 1);
    });

    let mostAffected: BodyPart | null = null;
    let maxCount = 0;
    partCounts.forEach((count, part) => {
      if (count > maxCount) {
        maxCount = count;
        mostAffected = part;
      }
    });

    return {
      summary: {
        totalRecords: records.length,
        averageLevel: Math.round(avgLevel * 10) / 10,
        mostAffectedPart: mostAffected,
        trends,
        recentRecords: records.slice(0, 5),
      },
    };
  }

  /**
   * 통증 기록 삭제
   */
  async deletePainRecord(
    recordId: string,
    userId?: string
  ): Promise<{ success: boolean; error?: Error }> {
    // 로컬에서 삭제
    try {
      const records = this.getLocalRecords();
      const filtered = records.filter((r) => r.id !== recordId);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.error('Failed to delete from localStorage:', err);
    }

    // Supabase에서 삭제
    if (userId && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('pain_records')
          .delete()
          .eq('id', recordId)
          .eq('user_id', userId);

        if (error) {
          return { success: false, error: new Error(error.message) };
        }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err : new Error('Unknown error') };
      }
    }

    return { success: true };
  }

  /**
   * 모든 로컬 기록 삭제
   */
  clearLocalRecords(): void {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

// 싱글톤 인스턴스
export const painTrackingService = new PainTrackingService();
export default painTrackingService;
