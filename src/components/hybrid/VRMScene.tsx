'use client';

/**
 * VRMScene - 3D VRM 캐릭터 씬
 *
 * Phase 전환 시 등장/퇴장 애니메이션 지원
 * MediaPipe 연동은 외부에서 처리
 */

import React, { Suspense, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { VRMCharacter, type AnimationPreset, type TrackingMode } from '@/components/three/VRMCharacter';
import type { ExpressionState } from '@/services/vrmFeedbackService';
import type { LightingSettings, CameraAngle, SceneHelpers } from '@/types/scene';
import { CAMERA_PRESETS, LIGHTING_PRESETS } from '@/types/scene';

interface VRMSceneProps {
  /** VRM 모델 URL */
  modelUrl: string;
  /** 가시성 */
  visible?: boolean;
  /** 로드 완료 콜백 */
  onLoaded?: () => void;
  /** 전환 진행률 (0-1) */
  transitionProgress?: number;
  /** VRMA 애니메이션 URL */
  animationUrl?: string | null;
  /** 표정 상태 */
  expression?: ExpressionState | null;
  /** 애니메이션 프리셋 (초기 등장 + Idle) */
  animationPreset?: AnimationPreset;
  /** 추적 모드 (애니메이션 vs 포즈) */
  trackingMode?: TrackingMode;
  /** 조명 설정 */
  lightingSettings?: LightingSettings;
  /** 카메라 앵글 */
  cameraAngle?: CameraAngle;
  /** 씬 헬퍼 (그리드, 축) */
  sceneHelpers?: SceneHelpers;
}

// 로딩 플레이스홀더
function LoadingPlaceholder() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 1, 0]}>
      <boxGeometry args={[0.3, 0.6, 0.2]} />
      <meshStandardMaterial color="#8B5CF6" wireframe />
    </mesh>
  );
}

export function VRMScene({
  modelUrl,
  visible = true,
  onLoaded,
  transitionProgress = 1,
  animationUrl,
  expression,
  animationPreset = 'A',
  trackingMode = 'animation',
  lightingSettings,
  cameraAngle,
  sceneHelpers,
}: VRMSceneProps) {
  // 조명 설정 (기본값 또는 커스텀)
  const lighting = lightingSettings || LIGHTING_PRESETS.default;
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // VRM이 한 번이라도 visible 되었는지 추적 (한 번 true가 되면 계속 마운트 유지)
  // useState의 lazy initializer로 초기 visible 상태 캡처
  const [shouldMount, setShouldMount] = useState(() => visible);

  // visible이 true가 되면 마운트 활성화 (이후 계속 유지, false로 되돌리지 않음)
  // VRM 모델 재로딩 방지를 위한 필수 latching 패턴
  useEffect(() => {
    if (visible && !shouldMount) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldMount(true);
      console.log('[VRMScene] VRM mount activated (first visible)');
    }
  }, [visible, shouldMount]);

  // 전환 애니메이션: 포탈 효과 - props에서 직접 계산 (향후 material opacity에 사용 예정)
  const _opacity = visible ? transitionProgress : 0;

  // 스케일 및 위치 애니메이션 (VRM 등장/퇴장)
  useFrame(() => {
    if (groupRef.current) {
      // 포탈 등장 효과: 작은 상태에서 커지면서 나타남
      const targetScale = visible ? 1 : 0.01;
      const currentScale = groupRef.current.scale.x;
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
      groupRef.current.scale.setScalar(Math.max(0.01, newScale));

      // Y 위치 애니메이션 (아래에서 위로)
      const targetY = visible ? 0 : -0.5;
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        targetY,
        0.1
      );
    }
  });

  // 카메라 앵글 변경 시 위치 전환
  const targetCameraRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 }>({
    position: new THREE.Vector3(0, 0.9, 2.8),
    target: new THREE.Vector3(0, 1.0, 0),
  });

  // cameraAngle prop에 따른 카메라 위치 업데이트
  useEffect(() => {
    if (cameraAngle && cameraAngle !== 'custom') {
      const preset = CAMERA_PRESETS[cameraAngle];
      if (preset) {
        targetCameraRef.current = {
          position: new THREE.Vector3(...preset.position),
          target: new THREE.Vector3(...preset.target),
        };
        console.log(`[VRMScene] Camera angle changed to: ${cameraAngle}`, preset.position);
      }
    }
  }, [cameraAngle]);

  // 카메라 전환 애니메이션 (매 프레임)
  useFrame(() => {
    if (visible && transitionProgress > 0.5) {
      // 목표 위치로 부드럽게 이동
      camera.position.lerp(targetCameraRef.current.position, 0.05);
      // 목표 지점 바라보기
      camera.lookAt(targetCameraRef.current.target);
    }
  });

  // 초기 애니메이션은 VRMCharacter에서 animationPreset으로 처리
  // animationUrl prop은 완료 애니메이션 등 일회성 애니메이션용

  // visible=false여도 VRMCharacter를 언마운트하지 않음 (로딩 반복 방지)
  // 대신 그룹의 visible 속성으로 숨김 처리

  return (
    <>
      {/* 조명 - 항상 렌더링 (설정 반영) */}
      <ambientLight intensity={lighting.ambientIntensity} />
      <directionalLight position={[2, 3, 2]} intensity={lighting.directionalIntensity} />
      <directionalLight position={[-1, 2, -1]} intensity={lighting.directionalIntensity * 0.5} />
      <hemisphereLight args={['#ffffff', '#444444', lighting.hemisphereIntensity]} />

      {/* 씬 헬퍼 (그리드, 축) */}
      {sceneHelpers?.showGrid && (
        <gridHelper args={[10, 10, '#888888', '#444444']} position={[0, 0, 0]} />
      )}
      {sceneHelpers?.showAxes && (
        <axesHelper args={[2]} />
      )}

      {/* 포탈 효과 (전환 중) */}
      {transitionProgress < 1 && transitionProgress > 0 && visible && (
        <PortalEffect progress={transitionProgress} />
      )}

      {/* VRM 캐릭터 그룹 - 한 번 visible되면 계속 마운트 유지 */}
      {shouldMount && (
        <group ref={groupRef} visible={visible}>
          <Suspense fallback={<LoadingPlaceholder />}>
            <VRMCharacter
              modelUrl={modelUrl}
              onLoaded={onLoaded}
              animationUrl={animationUrl}
              animationPreset={animationPreset}
              trackingMode={trackingMode}
              expression={expression}
            />
          </Suspense>
        </group>
      )}
    </>
  );
}

/**
 * 포탈 효과 컴포넌트
 */
function PortalEffect({ progress }: { progress: number }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = clock.elapsedTime * 2;
    }
  });

  // 진행률에 따른 링 크기
  const scale = 0.5 + progress * 1.5;
  const opacity = progress < 0.5 ? progress * 2 : (1 - progress) * 2;

  return (
    <group position={[0, 1, 0]}>
      {/* 외부 링 */}
      <mesh ref={ringRef} scale={[scale, scale, 1]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial
          color="#8B5CF6"
          transparent
          opacity={opacity * 0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 내부 글로우 */}
      <mesh scale={[scale * 0.9, scale * 0.9, 1]}>
        <circleGeometry args={[0.8, 32]} />
        <meshBasicMaterial
          color="#A78BFA"
          transparent
          opacity={opacity * 0.4}
        />
      </mesh>

      {/* 파티클 효과 (간소화) */}
      <PortalParticles progress={progress} />
    </group>
  );
}

// 파티클 위치 생성 함수 (컴포넌트 외부)
function createParticlePositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 0.8 + Math.random() * 0.4;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }
  return positions;
}

/**
 * 포탈 파티클 (간소화된 버전)
 */
function PortalParticles({ progress }: { progress: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 50;

  // 파티클 위치를 한 번만 생성 (useState lazy init)
  const [positions] = useState<Float32Array>(() => createParticlePositions(particleCount));

  useFrame(({ clock }) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.z = clock.elapsedTime;
    }
  });

  const opacity = progress < 0.5 ? progress * 2 : (1 - progress) * 2;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#E9D5FF"
        size={0.05}
        transparent
        opacity={opacity}
        sizeAttenuation
      />
    </points>
  );
}

export default VRMScene;
