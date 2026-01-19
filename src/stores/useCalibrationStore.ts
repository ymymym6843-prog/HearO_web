/**
 * 캘리브레이션 상태 관리 스토어
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CalibrationResult,
  CalibrationSession,
  CalibrationStatus,
  CalibrationSettings,
  ThresholdResult,
  Side,
} from '@/types/calibration';
import type { ExerciseType, JointType } from '@/types/exercise';
import { DEFAULT_CALIBRATION_SETTINGS } from '@/types/calibration';

interface CalibrationState {
  // 저장된 캘리브레이션 결과
  results: Record<string, CalibrationResult>;

  // 현재 세션
  session: CalibrationSession | null;

  // 액션
  startCalibration: (
    exerciseType: ExerciseType,
    jointType: JointType,
    side?: Side | 'BOTH'
  ) => void;
  updateSession: (updates: Partial<CalibrationSession>) => void;
  addAngleSample: (angle: number, isResting: boolean) => void;
  setStatus: (status: CalibrationStatus) => void;
  completeCalibration: (userId: string) => CalibrationResult | null;
  cancelCalibration: () => void;

  // 결과 조회
  getCalibration: (
    userId: string,
    exerciseType: ExerciseType
  ) => CalibrationResult | null;
  isCalibrationValid: (
    userId: string,
    exerciseType: ExerciseType
  ) => boolean;
}

// 임계값 계산
function calculateThresholds(
  restingAngle: number,
  maxROMAngle: number,
  settings: CalibrationSettings
): ThresholdResult {
  const totalROM = Math.abs(maxROMAngle - restingAngle);
  const targetROM = totalROM * (settings.targetPercent / 100);

  // 목표 각도 계산 (굴곡의 경우 감소, 신전의 경우 증가)
  const isFlexion = maxROMAngle < restingAngle;
  const targetAngle = isFlexion
    ? restingAngle - targetROM
    : restingAngle + targetROM;

  const tolerance = totalROM * (settings.tolerancePercent / 100);

  return {
    startAngle: {
      center: restingAngle,
      min: restingAngle - tolerance,
      max: restingAngle + tolerance,
    },
    targetAngle,
    completionThreshold: {
      minAngle: isFlexion ? targetAngle + tolerance : targetAngle - tolerance,
      holdTime: settings.holdTime,
    },
    returnThreshold: {
      maxAngle: isFlexion ? restingAngle - tolerance : restingAngle + tolerance,
    },
    totalROM,
    calculatedAt: new Date(),
  };
}

export const useCalibrationStore = create<CalibrationState>()(
  persist(
    (set, get) => ({
      results: {},
      session: null,

      startCalibration: (exerciseType, jointType, side = 'BOTH') => {
        const session: CalibrationSession = {
          status: 'PREPARING',
          currentStep: 1,
          totalSteps: 3,
          jointType,
          exerciseType,
          side,
          restingAngleSamples: [],
          maxROMAngleSamples: [],
          currentAngle: 0,
          currentConfidence: 0,
          isStable: false,
          stabilityDuration: 0,
          currentInstruction: '카메라 앞에 서서 준비 자세를 취하세요',
        };
        set({ session });
      },

      updateSession: (updates) => {
        const { session } = get();
        if (session) {
          set({ session: { ...session, ...updates } });
        }
      },

      addAngleSample: (angle, isResting) => {
        const { session } = get();
        if (!session) return;

        if (isResting) {
          set({
            session: {
              ...session,
              restingAngleSamples: [...session.restingAngleSamples, angle],
              currentAngle: angle,
            },
          });
        } else {
          set({
            session: {
              ...session,
              maxROMAngleSamples: [...session.maxROMAngleSamples, angle],
              currentAngle: angle,
            },
          });
        }
      },

      setStatus: (status) => {
        const { session } = get();
        if (session) {
          let instruction = '';
          let step = session.currentStep;

          switch (status) {
            case 'RESTING':
              instruction = '편안한 자세로 서세요. 휴식 각도를 측정합니다.';
              step = 1;
              break;
            case 'MAX_ROM':
              instruction = '최대한 움직여 주세요. 최대 가동범위를 측정합니다.';
              step = 2;
              break;
            case 'CALCULATING':
              instruction = '임계값을 계산하고 있습니다...';
              step = 3;
              break;
            case 'COMPLETE':
              instruction = '캘리브레이션이 완료되었습니다!';
              break;
            case 'ERROR':
              instruction = '오류가 발생했습니다. 다시 시도해주세요.';
              break;
          }

          set({
            session: {
              ...session,
              status,
              currentStep: step,
              currentInstruction: instruction,
            },
          });
        }
      },

      completeCalibration: (userId) => {
        const { session, results } = get();
        if (!session) return null;

        const { restingAngleSamples, maxROMAngleSamples } = session;

        if (restingAngleSamples.length < 5 || maxROMAngleSamples.length < 5) {
          set({
            session: {
              ...session,
              status: 'ERROR',
              errorMessage: '충분한 샘플이 수집되지 않았습니다.',
            },
          });
          return null;
        }

        // 평균 계산
        const restingAngle =
          restingAngleSamples.reduce((a, b) => a + b, 0) / restingAngleSamples.length;
        const maxROMAngle =
          maxROMAngleSamples.reduce((a, b) => a + b, 0) / maxROMAngleSamples.length;

        // 임계값 계산
        const settings = DEFAULT_CALIBRATION_SETTINGS;
        const thresholds = calculateThresholds(restingAngle, maxROMAngle, settings);

        // 결과 생성
        const result: CalibrationResult = {
          id: `${userId}_${session.exerciseType}_${Date.now()}`,
          userId,
          exerciseType: session.exerciseType,
          jointType: session.jointType,
          movementType: 'flexion',
          side: session.side,
          restingAngle,
          maxROMAngle,
          thresholds,
          settings,
          confidence: 0.9,
          calibratedAt: new Date(),
          isValid: true,
          expiresAt: new Date(Date.now() + settings.validityDays * 24 * 60 * 60 * 1000),
        };

        // 저장
        const key = `${userId}_${session.exerciseType}`;
        set({
          results: { ...results, [key]: result },
          session: {
            ...session,
            status: 'COMPLETE',
            currentInstruction: '캘리브레이션이 완료되었습니다!',
          },
        });

        return result;
      },

      cancelCalibration: () => {
        set({ session: null });
      },

      getCalibration: (userId, exerciseType) => {
        const { results } = get();
        const key = `${userId}_${exerciseType}`;
        return results[key] || null;
      },

      isCalibrationValid: (userId, exerciseType) => {
        const result = get().getCalibration(userId, exerciseType);
        if (!result) return false;
        return result.isValid && new Date(result.expiresAt) > new Date();
      },
    }),
    {
      name: 'hearo-calibration-storage',
    }
  )
);
