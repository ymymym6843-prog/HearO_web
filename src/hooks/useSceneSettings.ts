/**
 * 3D 씬 설정 관리 훅
 * Utonics 벤치마킹: 조명, 카메라, 헬퍼 상태 관리
 */

import { useState, useCallback, useMemo } from 'react';
import {
  type SceneSettings,
  type LightingSettings,
  type LightingPreset,
  type CameraAngle,
  type SceneHelpers,
  DEFAULT_SCENE_SETTINGS,
  LIGHTING_PRESETS,
  CAMERA_PRESETS,
} from '@/types/scene';

interface UseSceneSettingsReturn {
  // 현재 설정
  settings: SceneSettings;

  // 조명 제어
  lighting: LightingSettings;
  lightingPreset: LightingPreset;
  setLightingPreset: (preset: LightingPreset) => void;
  setAmbientIntensity: (value: number) => void;
  setDirectionalIntensity: (value: number) => void;
  setHemisphereIntensity: (value: number) => void;

  // 카메라 제어
  cameraAngle: CameraAngle;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  setCameraAngle: (angle: CameraAngle) => void;

  // 헬퍼 제어
  helpers: SceneHelpers;
  toggleGrid: () => void;
  toggleAxes: () => void;

  // 리셋
  resetToDefaults: () => void;
}

export function useSceneSettings(
  initialSettings: Partial<SceneSettings> = {}
): UseSceneSettingsReturn {
  const [settings, setSettings] = useState<SceneSettings>({
    ...DEFAULT_SCENE_SETTINGS,
    ...initialSettings,
  });

  // 조명 프리셋 설정
  const setLightingPreset = useCallback((preset: LightingPreset) => {
    if (preset === 'custom') return;

    setSettings(prev => ({
      ...prev,
      lighting: LIGHTING_PRESETS[preset],
      lightingPreset: preset,
    }));
  }, []);

  // 개별 조명 강도 설정
  const setAmbientIntensity = useCallback((value: number) => {
    setSettings(prev => ({
      ...prev,
      lighting: { ...prev.lighting, ambientIntensity: value },
      lightingPreset: 'custom',
    }));
  }, []);

  const setDirectionalIntensity = useCallback((value: number) => {
    setSettings(prev => ({
      ...prev,
      lighting: { ...prev.lighting, directionalIntensity: value },
      lightingPreset: 'custom',
    }));
  }, []);

  const setHemisphereIntensity = useCallback((value: number) => {
    setSettings(prev => ({
      ...prev,
      lighting: { ...prev.lighting, hemisphereIntensity: value },
      lightingPreset: 'custom',
    }));
  }, []);

  // 카메라 앵글 설정
  const setCameraAngle = useCallback((angle: CameraAngle) => {
    setSettings(prev => ({
      ...prev,
      cameraAngle: angle,
    }));
  }, []);

  // 카메라 위치/타겟 계산
  const { cameraPosition, cameraTarget } = useMemo(() => {
    if (settings.cameraAngle === 'custom') {
      return {
        cameraPosition: CAMERA_PRESETS.front.position,
        cameraTarget: CAMERA_PRESETS.front.target,
      };
    }
    const preset = CAMERA_PRESETS[settings.cameraAngle];
    return {
      cameraPosition: preset.position,
      cameraTarget: preset.target,
    };
  }, [settings.cameraAngle]);

  // 그리드 토글
  const toggleGrid = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      helpers: { ...prev.helpers, showGrid: !prev.helpers.showGrid },
    }));
  }, []);

  // 축 토글
  const toggleAxes = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      helpers: { ...prev.helpers, showAxes: !prev.helpers.showAxes },
    }));
  }, []);

  // 기본값으로 리셋
  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SCENE_SETTINGS);
  }, []);

  return {
    settings,
    lighting: settings.lighting,
    lightingPreset: settings.lightingPreset,
    setLightingPreset,
    setAmbientIntensity,
    setDirectionalIntensity,
    setHemisphereIntensity,
    cameraAngle: settings.cameraAngle,
    cameraPosition,
    cameraTarget,
    setCameraAngle,
    helpers: settings.helpers,
    toggleGrid,
    toggleAxes,
    resetToDefaults,
  };
}
