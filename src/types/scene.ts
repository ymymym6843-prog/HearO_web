/**
 * 3D 씬 설정 타입 정의
 * Utonics 벤치마킹: 조명, 카메라, 헬퍼 설정
 */

// 조명 설정
export interface LightingSettings {
  ambientIntensity: number;      // 0~2, 기본 0.7
  directionalIntensity: number;  // 0~2, 기본 0.8
  hemisphereIntensity: number;   // 0~2, 기본 0.6
}

// 조명 프리셋
export type LightingPreset = 'dark' | 'default' | 'bright' | 'custom';

export const LIGHTING_PRESETS: Record<Exclude<LightingPreset, 'custom'>, LightingSettings> = {
  dark: {
    ambientIntensity: 0.3,
    directionalIntensity: 0.4,
    hemisphereIntensity: 0.3,
  },
  default: {
    ambientIntensity: 0.7,
    directionalIntensity: 0.8,
    hemisphereIntensity: 0.6,
  },
  bright: {
    ambientIntensity: 1.0,
    directionalIntensity: 1.2,
    hemisphereIntensity: 0.8,
  },
};

// 카메라 앵글 프리셋
export type CameraAngle = 'front' | 'left' | 'right' | 'back' | 'top' | 'custom';

export interface CameraPosition {
  position: [number, number, number];
  target: [number, number, number];
  label: string;
}

export const CAMERA_PRESETS: Record<Exclude<CameraAngle, 'custom'>, CameraPosition> = {
  front: {
    position: [0, 1.5, 3],
    target: [0, 1, 0],
    label: '정면',
  },
  left: {
    position: [-3, 1.5, 0],
    target: [0, 1, 0],
    label: '좌측',
  },
  right: {
    position: [3, 1.5, 0],
    target: [0, 1, 0],
    label: '우측',
  },
  back: {
    position: [0, 1.5, -3],
    target: [0, 1, 0],
    label: '후면',
  },
  top: {
    position: [0, 4, 0.5],
    target: [0, 1, 0],
    label: '위',
  },
};

// 씬 헬퍼 설정
export interface SceneHelpers {
  showGrid: boolean;
  showAxes: boolean;
}

// 전체 씬 설정
export interface SceneSettings {
  lighting: LightingSettings;
  lightingPreset: LightingPreset;
  cameraAngle: CameraAngle;
  helpers: SceneHelpers;
}

// 기본 씬 설정
export const DEFAULT_SCENE_SETTINGS: SceneSettings = {
  lighting: LIGHTING_PRESETS.default,
  lightingPreset: 'default',
  cameraAngle: 'front',
  helpers: {
    showGrid: false,
    showAxes: false,
  },
};
