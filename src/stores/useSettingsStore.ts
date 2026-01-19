/**
 * 앱 설정 관리 스토어
 * Zustand 기반, localStorage 동기화
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 설정 타입
export interface AppSettings {
  // 사운드/피드백
  soundEnabled: boolean;
  hapticEnabled: boolean;
  ttsEnabled: boolean;

  // 운동 설정
  defaultTargetReps: number;
  restTimerSeconds: number;
  autoStartNextSet: boolean;
  showRomValues: boolean;

  // 카메라/포즈
  cameraPosition: 'front' | 'back';
  showSkeleton: boolean;
  showAccuracyBar: boolean;
  poseQualityAlerts: boolean;

  // 3D 캐릭터 설정
  show3DCharacter: boolean;
  backgroundRemoval: boolean;
  customBackground: string | null; // null이면 기본 배경, URL이면 커스텀 이미지

  // 기타
  language: 'ko' | 'en';
  darkMode: boolean;
}

// 기본 설정
export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  hapticEnabled: true,
  ttsEnabled: true,
  defaultTargetReps: 10,
  restTimerSeconds: 30,
  autoStartNextSet: false,
  showRomValues: true,
  cameraPosition: 'front',
  showSkeleton: true,
  showAccuracyBar: true,
  poseQualityAlerts: true,
  show3DCharacter: false,
  backgroundRemoval: false,
  customBackground: null,
  language: 'ko',
  darkMode: true,
};

interface SettingsState extends AppSettings {
  // 액션
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      /**
       * 단일 설정 업데이트
       */
      updateSetting: (key, value) => {
        set({ [key]: value });
      },

      /**
       * 여러 설정 일괄 업데이트
       */
      updateSettings: (settings) => {
        set(settings);
      },

      /**
       * 설정 초기화
       */
      resetSettings: () => {
        set(DEFAULT_SETTINGS);
      },
    }),
    {
      name: 'hearo-app-settings',
    }
  )
);

// 편의 셀렉터
export const selectSoundEnabled = (state: SettingsState) => state.soundEnabled;
export const selectHapticEnabled = (state: SettingsState) => state.hapticEnabled;
export const selectTtsEnabled = (state: SettingsState) => state.ttsEnabled;
export const selectShowSkeleton = (state: SettingsState) => state.showSkeleton;
export const selectShowAccuracyBar = (state: SettingsState) => state.showAccuracyBar;
export const selectPoseQualityAlerts = (state: SettingsState) => state.poseQualityAlerts;
export const selectShowRomValues = (state: SettingsState) => state.showRomValues;
export const selectDefaultTargetReps = (state: SettingsState) => state.defaultTargetReps;
export const selectShow3DCharacter = (state: SettingsState) => state.show3DCharacter;
export const selectBackgroundRemoval = (state: SettingsState) => state.backgroundRemoval;
export const selectCustomBackground = (state: SettingsState) => state.customBackground;

export default useSettingsStore;
