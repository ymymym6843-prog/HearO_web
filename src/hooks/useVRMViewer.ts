/**
 * useVRMViewer - VRM 뷰어 제어 훅
 * Utonics 벤치마킹: 카메라 앵글, 조명 제어, 스크린샷 기능
 */

import { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============================================================================
// 타입 정의
// ============================================================================

export type CameraAngle = 'front' | 'back' | 'left' | 'right' | 'top' | 'custom';

export interface CameraPosition {
  x: number;
  y: number;
  z: number;
}

export interface LightingSettings {
  ambientIntensity: number;   // 0-2, 기본 0.6
  directionalIntensity: number; // 0-2, 기본 0.8
  shadowEnabled: boolean;
}

export interface ViewerSettings {
  showGrid: boolean;
  showAxes: boolean;
  backgroundColor: string;
  lighting: LightingSettings;
}

export interface UseVRMViewerReturn {
  // 상태
  currentAngle: CameraAngle;
  settings: ViewerSettings;

  // 카메라 제어
  setCameraAngle: (angle: CameraAngle) => void;
  setCameraPosition: (position: CameraPosition) => void;
  resetCamera: () => void;

  // 조명 제어
  setAmbientIntensity: (intensity: number) => void;
  setDirectionalIntensity: (intensity: number) => void;
  setShadowEnabled: (enabled: boolean) => void;

  // 뷰어 설정
  setShowGrid: (show: boolean) => void;
  setShowAxes: (show: boolean) => void;
  setBackgroundColor: (color: string) => void;

  // 유틸리티
  takeScreenshot: () => void;

  // Refs 연결
  bindCamera: (camera: THREE.PerspectiveCamera) => void;
  bindControls: (controls: OrbitControls) => void;
  bindRenderer: (renderer: THREE.WebGLRenderer) => void;
  bindScene: (scene: THREE.Scene) => void;
  bindLights: (ambient: THREE.AmbientLight, directional: THREE.DirectionalLight) => void;
}

// ============================================================================
// 상수 정의
// ============================================================================

// 카메라 앵글 프리셋 (Utonics 방식)
const CAMERA_PRESETS: Record<CameraAngle, CameraPosition> = {
  front: { x: 0, y: 1.2, z: 3 },
  back: { x: 0, y: 1.2, z: -3 },
  left: { x: -3, y: 1.2, z: 0 },
  right: { x: 3, y: 1.2, z: 0 },
  top: { x: 0, y: 4.2, z: 0.5 },
  custom: { x: 0, y: 1.5, z: 3 }, // 기본값
};

// 기본 설정
const DEFAULT_SETTINGS: ViewerSettings = {
  showGrid: true,
  showAxes: false,
  backgroundColor: '#1a1a1a',
  lighting: {
    ambientIntensity: 0.6,
    directionalIntensity: 0.8,
    shadowEnabled: true,
  },
};

// ============================================================================
// 메인 훅
// ============================================================================

export function useVRMViewer(): UseVRMViewerReturn {
  const [currentAngle, setCurrentAngle] = useState<CameraAngle>('front');
  const [settings, setSettings] = useState<ViewerSettings>(DEFAULT_SETTINGS);

  // Three.js 객체 refs
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Refs 바인딩
  const bindCamera = useCallback((camera: THREE.PerspectiveCamera) => {
    cameraRef.current = camera;
  }, []);

  const bindControls = useCallback((controls: OrbitControls) => {
    controlsRef.current = controls;
  }, []);

  const bindRenderer = useCallback((renderer: THREE.WebGLRenderer) => {
    rendererRef.current = renderer;
  }, []);

  const bindScene = useCallback((scene: THREE.Scene) => {
    sceneRef.current = scene;
  }, []);

  const bindLights = useCallback((ambient: THREE.AmbientLight, directional: THREE.DirectionalLight) => {
    ambientLightRef.current = ambient;
    directionalLightRef.current = directional;
  }, []);

  // 카메라 앵글 설정
  const setCameraAngle = useCallback((angle: CameraAngle) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (!camera || !controls) {
      console.warn('[useVRMViewer] Camera or controls not bound');
      return;
    }

    const preset = CAMERA_PRESETS[angle];
    camera.position.set(preset.x, preset.y, preset.z);
    controls.target.set(0, 1, 0);
    controls.update();

    setCurrentAngle(angle);
    console.log(`[useVRMViewer] Camera angle: ${angle}`);
  }, []);

  // 커스텀 카메라 위치
  const setCameraPosition = useCallback((position: CameraPosition) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (!camera || !controls) return;

    camera.position.set(position.x, position.y, position.z);
    controls.update();

    setCurrentAngle('custom');
  }, []);

  // 카메라 리셋
  const resetCamera = useCallback(() => {
    setCameraAngle('front');
  }, [setCameraAngle]);

  // 조명 강도 설정
  const setAmbientIntensity = useCallback((intensity: number) => {
    const light = ambientLightRef.current;
    if (light) {
      light.intensity = Math.max(0, Math.min(2, intensity));
    }
    setSettings((prev) => ({
      ...prev,
      lighting: { ...prev.lighting, ambientIntensity: intensity },
    }));
  }, []);

  const setDirectionalIntensity = useCallback((intensity: number) => {
    const light = directionalLightRef.current;
    if (light) {
      light.intensity = Math.max(0, Math.min(2, intensity));
    }
    setSettings((prev) => ({
      ...prev,
      lighting: { ...prev.lighting, directionalIntensity: intensity },
    }));
  }, []);

  const setShadowEnabled = useCallback((enabled: boolean) => {
    const light = directionalLightRef.current;
    const renderer = rendererRef.current;

    if (light) {
      light.castShadow = enabled;
    }
    if (renderer) {
      renderer.shadowMap.enabled = enabled;
    }
    setSettings((prev) => ({
      ...prev,
      lighting: { ...prev.lighting, shadowEnabled: enabled },
    }));
  }, []);

  // 그리드/축 표시 설정
  const setShowGrid = useCallback((show: boolean) => {
    setSettings((prev) => ({ ...prev, showGrid: show }));
    // 실제 그리드 토글은 컴포넌트에서 처리
  }, []);

  const setShowAxes = useCallback((show: boolean) => {
    setSettings((prev) => ({ ...prev, showAxes: show }));
  }, []);

  // 배경색 설정
  const setBackgroundColor = useCallback((color: string) => {
    const scene = sceneRef.current;
    if (scene) {
      scene.background = new THREE.Color(color);
    }
    setSettings((prev) => ({ ...prev, backgroundColor: color }));
  }, []);

  // 스크린샷 촬영
  const takeScreenshot = useCallback(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    if (!renderer || !scene || !camera) {
      console.warn('[useVRMViewer] Cannot take screenshot: renderer not ready');
      return;
    }

    // 현재 프레임 렌더링
    renderer.render(scene, camera);

    // Canvas를 이미지로 변환
    const dataURL = renderer.domElement.toDataURL('image/png');

    // 다운로드 링크 생성
    const link = document.createElement('a');
    link.download = `vrm-screenshot-${Date.now()}.png`;
    link.href = dataURL;
    link.click();

    console.log('[useVRMViewer] Screenshot saved');
  }, []);

  return {
    currentAngle,
    settings,
    setCameraAngle,
    setCameraPosition,
    resetCamera,
    setAmbientIntensity,
    setDirectionalIntensity,
    setShadowEnabled,
    setShowGrid,
    setShowAxes,
    setBackgroundColor,
    takeScreenshot,
    bindCamera,
    bindControls,
    bindRenderer,
    bindScene,
    bindLights,
  };
}

// ============================================================================
// 유틸리티: 카메라 앵글 버튼 목록
// ============================================================================

export const CAMERA_ANGLE_OPTIONS: { angle: CameraAngle; label: string; icon: string }[] = [
  { angle: 'front', label: '정면', icon: '👤' },
  { angle: 'back', label: '후면', icon: '🔙' },
  { angle: 'left', label: '좌측', icon: '◀️' },
  { angle: 'right', label: '우측', icon: '▶️' },
  { angle: 'top', label: '상단', icon: '🔝' },
];

export default useVRMViewer;
