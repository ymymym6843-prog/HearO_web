'use client';

/**
 * Three.js Scene 컴포넌트
 * React Three Fiber 기반 3D 씬 설정
 * MediaErrorBoundary로 WebGL 오류 처리
 * WebGL 컨텍스트 손실 대응
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Suspense, useState, useCallback, useEffect } from 'react';
import { VRMCharacter } from './VRMCharacter';
import { MediaErrorBoundary } from '@/components/common/ErrorBoundary';

interface SceneProps {
  modelUrl: string;
  showGrid?: boolean;
  enableControls?: boolean;
  backgroundColor?: string;
  onCharacterLoaded?: () => void;
}

// 로딩 플레이스홀더
function LoadingPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 1.5, 0.3]} />
      <meshStandardMaterial color="#8B5CF6" wireframe />
    </mesh>
  );
}

// 내부 3D 씬 (Canvas 내부) - 경량화 버전
function SceneContent({
  modelUrl,
  showGrid,
  enableControls,
  onCharacterLoaded,
}: Omit<SceneProps, 'backgroundColor'>) {
  return (
    <>
      {/* 간소화된 조명 (GPU 부담 감소) */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[2, 3, 2]}
        intensity={0.8}
        // castShadow 제거 - 성능 향상
      />
      <directionalLight position={[-1, 2, -1]} intensity={0.4} />

      {/* 헤미스피어 라이트로 자연스러운 환경광 (Environment 대체) */}
      <hemisphereLight
        args={['#ffffff', '#444444', 0.6]}
      />

      {/* VRM 캐릭터 */}
      <Suspense fallback={<LoadingPlaceholder />}>
        <VRMCharacter
          modelUrl={modelUrl}
          onLoaded={onCharacterLoaded}
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

      {/* 카메라 컨트롤 */}
      {enableControls && (
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          enableRotate={true}
          autoRotate={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.5}
          minDistance={1.5}
          maxDistance={5}
          target={[0, 1, 0]}
        />
      )}
    </>
  );
}

export function Scene({
  modelUrl,
  showGrid = false,
  enableControls = true,
  backgroundColor = '#1a1a2e',
  onCharacterLoaded,
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
          enableControls={enableControls}
          onCharacterLoaded={onCharacterLoaded}
        />
      </Canvas>
    </MediaErrorBoundary>
  );
}

export default Scene;
