/**
 * ROM 보정 서비스
 * 사용자별 관절 가동 범위 저장 및 조회
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { createLogger } from '@/lib/logger';

const _logger = createLogger('CalibrationService');
import type { CalibrationJoint, CalibrationResult } from '@/components/calibration/CalibrationGuide';

// 로컬 스토리지 키
const LOCAL_STORAGE_KEY = 'hearo-calibration-data';

// 저장된 보정 데이터 타입
export interface StoredCalibration {
  id?: string;
  userId?: string;
  joint: CalibrationJoint;
  startAngle: number;
  targetAngle: number;
  tolerance: number; // 허용 오차 (기본 10도)
  createdAt: string;
  updatedAt: string;
}

// 기본 ROM 범위 (보정 전 사용)
export const DEFAULT_ROM_RANGES: Record<CalibrationJoint, { start: number; target: number }> = {
  shoulder_flexion: { start: 0, target: 180 },
  shoulder_abduction: { start: 0, target: 180 },
  elbow_flexion: { start: 180, target: 45 },
  knee_flexion: { start: 180, target: 45 },
  hip_flexion: { start: 180, target: 90 },
  hip_abduction: { start: 0, target: 45 },
};

class CalibrationService {
  /**
   * 보정 결과 저장
   */
  async saveCalibration(
    result: CalibrationResult,
    userId?: string
  ): Promise<{ success: boolean; error?: Error }> {
    const calibration: StoredCalibration = {
      userId,
      joint: result.joint,
      startAngle: result.startAngle,
      targetAngle: result.targetAngle,
      tolerance: 10, // 기본 10도
      createdAt: result.timestamp,
      updatedAt: result.timestamp,
    };

    // 로컬 저장
    this.saveToLocal(calibration);

    // Supabase 저장
    if (userId && isSupabaseConfigured) {
      try {
        // 기존 데이터 확인 (upsert)
        const { error } = await supabase
          .from('calibrations')
          .upsert(
            {
              user_id: userId,
              joint_type: calibration.joint,
              start_angle: calibration.startAngle,
              target_angle: calibration.targetAngle,
              tolerance: calibration.tolerance,
              updated_at: calibration.updatedAt,
            },
            {
              onConflict: 'user_id,joint_type',
            }
          );

        if (error) {
          console.error('Failed to save calibration to Supabase:', error);
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
  private saveToLocal(calibration: StoredCalibration): void {
    try {
      const stored = this.getAllLocalCalibrations();
      // 같은 관절 데이터 업데이트 또는 추가
      const existingIndex = stored.findIndex((c) => c.joint === calibration.joint);
      if (existingIndex >= 0) {
        stored[existingIndex] = calibration;
      } else {
        stored.push(calibration);
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  }

  /**
   * 모든 로컬 보정 데이터 조회
   */
  private getAllLocalCalibrations(): StoredCalibration[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * 특정 관절 보정 데이터 조회
   */
  async getCalibration(
    joint: CalibrationJoint,
    userId?: string
  ): Promise<StoredCalibration | null> {
    // Supabase에서 조회 시도
    if (userId && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('calibrations')
          .select('*')
          .eq('user_id', userId)
          .eq('joint_type', joint)
          .single();

        if (data && !error) {
          return {
            id: data.id,
            userId: data.user_id,
            joint: data.joint_type as CalibrationJoint,
            startAngle: data.start_angle,
            targetAngle: data.target_angle,
            tolerance: data.tolerance,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch (err) {
        console.error('Failed to fetch from Supabase:', err);
      }
    }

    // 로컬에서 조회
    const local = this.getAllLocalCalibrations();
    return local.find((c) => c.joint === joint) || null;
  }

  /**
   * 모든 보정 데이터 조회
   */
  async getAllCalibrations(userId?: string): Promise<StoredCalibration[]> {
    // Supabase에서 조회 시도
    if (userId && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('calibrations')
          .select('*')
          .eq('user_id', userId);

        if (data && !error) {
          return data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            joint: d.joint_type as CalibrationJoint,
            startAngle: d.start_angle,
            targetAngle: d.target_angle,
            tolerance: d.tolerance,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }
      } catch (err) {
        console.error('Failed to fetch from Supabase:', err);
      }
    }

    // 로컬에서 조회
    return this.getAllLocalCalibrations();
  }

  /**
   * 운동 유형에 맞는 ROM 범위 가져오기
   * 보정 데이터가 있으면 그것을 사용, 없으면 기본값
   */
  async getRomRange(
    joint: CalibrationJoint,
    userId?: string
  ): Promise<{ start: number; target: number; tolerance: number; isCalibrated: boolean }> {
    const calibration = await this.getCalibration(joint, userId);

    if (calibration) {
      return {
        start: calibration.startAngle,
        target: calibration.targetAngle,
        tolerance: calibration.tolerance,
        isCalibrated: true,
      };
    }

    const defaultRange = DEFAULT_ROM_RANGES[joint];
    return {
      start: defaultRange.start,
      target: defaultRange.target,
      tolerance: 15, // 보정 안 된 경우 더 넓은 허용 범위
      isCalibrated: false,
    };
  }

  /**
   * 보정 데이터 삭제
   */
  async deleteCalibration(
    joint: CalibrationJoint,
    userId?: string
  ): Promise<{ success: boolean; error?: Error }> {
    // 로컬에서 삭제
    try {
      const stored = this.getAllLocalCalibrations();
      const filtered = stored.filter((c) => c.joint !== joint);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.error('Failed to delete from localStorage:', err);
    }

    // Supabase에서 삭제
    if (userId && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('calibrations')
          .delete()
          .eq('user_id', userId)
          .eq('joint_type', joint);

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
   * 모든 보정 데이터 초기화
   */
  async resetAllCalibrations(userId?: string): Promise<{ success: boolean; error?: Error }> {
    // 로컬 초기화
    localStorage.removeItem(LOCAL_STORAGE_KEY);

    // Supabase에서 삭제
    if (userId && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('calibrations')
          .delete()
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
   * 정확도 계산 (보정 데이터 기반)
   */
  calculateAccuracy(
    currentAngle: number,
    startAngle: number,
    targetAngle: number,
    tolerance: number = 10
  ): number {
    const totalRange = Math.abs(targetAngle - startAngle);
    if (totalRange === 0) return 100;

    const currentProgress = Math.abs(currentAngle - startAngle);
    const progressRatio = Math.min(currentProgress / totalRange, 1);

    // 목표에 가까울수록 높은 점수
    // tolerance 범위 내에 있으면 100%
    const distanceFromTarget = Math.abs(currentAngle - targetAngle);
    if (distanceFromTarget <= tolerance) {
      return 100;
    }

    // tolerance를 넘으면 점수 감소
    const overTolerance = distanceFromTarget - tolerance;
    const penalty = Math.min(overTolerance / 20, 0.5); // 최대 50% 감점
    const accuracy = Math.max(0, (progressRatio - penalty) * 100);

    return Math.round(accuracy);
  }
}

// 싱글톤 인스턴스
export const calibrationService = new CalibrationService();
export default calibrationService;
