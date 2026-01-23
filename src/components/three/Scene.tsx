'use client';

/**
 * Three.js Scene 컴포넌트
 * React Three Fiber 기반 3D 씬 설정
 * MediaErrorBoundary로 WebGL 오류 처리
 * WebGL 컨텍스트 손실 대응
 *
 * Utonics 벤치마킹: 조명/카메라/헬퍼 설정 지원
 */

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { VRMCharacter } from './VRMCharacter';
import { MediaErrorBoundary } from '@/components/common/ErrorBoundary';
import type { ExpressionState } from '@/services/vrmFeedbackService';
import type { LightingSettings, CameraAngle } from '@/types/scene';
import { CAMERA_PRESETS } from '@/types/scene';

interface SceneProps {
  modelUrl: string;
  showGrid?: boolean;
  showAxes?: boolean;
  enableControls?: boolean;
  backgroundColor?: string;
  onCharacterLoaded?: () => void;
  // VRMA 애니메이션 관련
  animationUrl?: string | null;
  onAnimationEnd?: () => void;
  // 표정 관련
  expression?: ExpressionState | null;
  // 조명 설정 (Utonics 벤치마킹)
  lighting?: LightingSettings;
  // 카메라 앵글 (Utonics 벤치마킹)
  cameraAngle?: CameraAngle;
  onCameraAngleChange?: (angle: CameraAngle) => void;
}

// 기본 조명 설정
const DEFAULT_LIGHTING: LightingSettings = {
  ambientIntensity: 0.7,
  directionalIntensity: 0.8,
  hemisphereIntensity: 0.6,
};

// 로딩 플레이스홀더
function LoadingPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 1.5, 0.3]} />
      <meshStandardMaterial color="#8B5CF6" wireframe />
    </mesh>
  );
}

// 축 헬퍼 컴포넌트
function AxesHelper({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <primitive object={new THREE.AxesHelper(2)} />;
}

// 카메라 컨트롤러 (앵글 변경 지원)
function CameraController({
  cameraAngle,
  enableControls,
}: {
  cameraAngle?: CameraAngle;
  enableControls: boolean;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // 카메라 앵글 변경 시 위치 업데이트
  useEffect(() => {
    if (cameraAngle && cameraAngle !== 'custom') {
      const preset = CAMERA_PRESETS[cameraAngle];
      camera.position.set(...preset.position);
      if (controlsRef.current) {
        controlsRef.current.target.set(...preset.target);
        controlsRef.current.update();
      }
    }
  }, [cameraAngle, camera]);

  if (!enableControls) return null;

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={true}
      enablePan={false}
      enableRotate={true}
      autoRotate={false}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 1.3}
      minDistance={1.5}
      maxDistance={6}
      target={[0, 1, 0]}
      enableDamping={true}
      dampingFactor={0.05}
    />
  );
}

// 내부 3D 씬 (Canvas 내부) - 경량화 버전
function SceneContent({
  modelUrl,
  showGrid,
  showAxes,
  enableControls,
  onCharacterLoaded,
  animationUrl,
  onAnimationEnd,
  expression,
  lighting = DEFAULT_LIGHTING,
  cameraAngle,
}: Omit<SceneProps, 'backgroundColor' | 'onCameraAngleChange'>) {
  return (
    <>
      {/* 조명 시스템 (Utonics 벤치마킹: 동적 조명 강도) */}
      <ambientLight intensity={lighting.ambientIntensity} />
      <directionalLight
        position={[2, 3, 2]}
        intensity={lighting.directionalIntensity}
        // castShadow 제거 - 성능 향상
      />
      <directionalLight
        position={[-1, 2, -1]}
        intensity={lighting.directionalIntensity * 0.5}
      />

      {/* 헤미스피어 라이트로 자연스러운 환경광 */}
      <hemisphereLight
        args={['#ffffff', '#444444', lighting.hemisphereIntensity]}
      />

      {/* VRM 캐릭터 */}
      <Suspense fallback={<LoadingPlaceholder />}>
        <VRMCharacter
          modelUrl={modelUrl}
          onLoaded={onCharacterLoaded}
          animationUrl={animationUrl}
          onAnimationEnd={onAnimationEnd}
          expression={expression}
        />
      </Suspense>

      {/* 그리드 (디버그용) */}
      {showGrid && (
        <Grid
          args={[10, 10]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#6b7280"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#9ca3af"
          fadeDistance={10}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={true}
        />
      )}

      {/* 축 헬퍼 (디버그용) */}
      <AxesHelper visible={showAxes ?? false} />

      {/* 카메라 컨트롤 */}
      <CameraController
        cameraAngle={cameraAngle}
        enableControls={enableControls ?? true}
      />
    </>
  );
}

export function Scene({
  modelUrl,
  showGrid = false,
  showAxes = false,
  enableControls = true,
  backgroundColor = '#1a1a2e',
  onCharacterLoaded,
  animationUrl,
  onAnimationEnd,
  expression,
  lighting,
  cameraAngle,
}: SceneProps) {
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);

  // WebGL 컨텍스트 손실 처리
  const handleContextLost = useCallback((event: Event) => {
    event.preventDefault();
    console.warn('WebGL context lost, attempting recovery...');
    setContextLost(true);
  }, []);

  const handleContextRestored = useCallback(() => {
    console.log('WebGL context restored');
    setContextLost(false);
    // Canvas 재생성을 위해 key 변경
    setCanvasKey(prev => prev + 1);
  }, []);

  // 컨텍스트 손실 시 자동 복구 시도
  useEffect(() => {
    if (contextLost) {
      const timer = setTimeout(() => {
        console.log('Attempting to restore WebGL context...');
        setCanvasKey(prev => prev + 1);
        setContextLost(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [contextLost]);

  if (contextLost) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ background: backgroundColor }}
      >
        <div className="text-white/60 text-sm">3D 복구 중...</div>
      </div>
    );
  }

  return (
    <MediaErrorBoundary>
      <Canvas
        key={canvasKey}
        camera={{ position: [0, 1.5, 3], fov: 50 }}
        style={{ background: backgroundColor }}
        gl={{
          powerPreference: 'low-power', // GPU 메모리 절약
          antialias: false, // 성능 향상
          alpha: true,
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false, // 소프트웨어 렌더링 허용
        }}
        dpr={[0.5, 1]} // 저해상도 렌더링으로 GPU 부담 감소
        onCreated={({ gl }) => {
          // 컨텍스트 손실 이벤트 리스너 등록
          gl.domElement.addEventListener('webglcontextlost', handleContextLost);
          gl.domElement.addEventListener('webglcontextrestored', handleContextRestored);
        }}
      >
        <SceneContent
          modelUrl={modelUrl}
          showGrid={showGrid}
          showAxes={showAxes}
          enableControls={enableControls}
          onCharacterLoaded={onCharacterLoaded}
          animationUrl={animationUrl}
          onAnimationEnd={onAnimationEnd}
          expression={expression}
          lighting={lighting}
          cameraAngle={cameraAngle}
        />
      </Canvas>
    </MediaErrorBoundary>
  );
}

export default Scene;
