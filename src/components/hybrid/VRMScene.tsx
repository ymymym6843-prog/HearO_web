'use client';

/**
 * VRMScene - 3D VRM 캐릭터 씬
 *
 * Phase 전환 시 등장/퇴장 애니메이션 지원
 * MediaPipe 연동은 외부에서 처리
 */

import React, { Suspense, useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { VRMCharacter } from '@/components/three/VRMCharacter';
import type { ExpressionState } from '@/services/vrmFeedbackService';

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
}: VRMSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [opacity, setOpacity] = useState(0);
  const { camera } = useThree();

  // 전환 애니메이션: 포탈 효과
  useEffect(() => {
    if (visible) {
      // 등장 애니메이션
      setOpacity(transitionProgress);
    } else {
      setOpacity(0);
    }
  }, [visible, transitionProgress]);

  // 스케일 및 위치 애니메이션
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

  // 카메라 전환 애니메이션
  useEffect(() => {
    if (visible && transitionProgress > 0.5) {
      // exercise 모드로 전환 시 카메라 조정
      const targetPosition = new THREE.Vector3(0, 1.5, 2.5);
      camera.position.lerp(targetPosition, 0.05);
    }
  }, [visible, transitionProgress, camera]);

  if (!visible && opacity <= 0.01) {
    return null;
  }

  return (
    <>
      {/* 조명 */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 2]} intensity={0.8} />
      <directionalLight position={[-1, 2, -1]} intensity={0.4} />
      <hemisphereLight args={['#ffffff', '#444444', 0.6]} />

      {/* 포탈 효과 (전환 중) */}
      {transitionProgress < 1 && transitionProgress > 0 && (
        <PortalEffect progress={transitionProgress} />
      )}

      {/* VRM 캐릭터 그룹 */}
      <group ref={groupRef}>
        <Suspense fallback={<LoadingPlaceholder />}>
          <VRMCharacter
            modelUrl={modelUrl}
            onLoaded={onLoaded}
            animationUrl={animationUrl}
            expression={expression}
          />
        </Suspense>
      </group>
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

/**
 * 포탈 파티클 (간소화된 버전)
 */
function PortalParticles({ progress }: { progress: number }) {
  const particlesRef = useRef<THREE.Points>(null);

  const particleCount = 50;
  const positions = new Float32Array(particleCount * 3);

  // 원형으로 파티클 배치
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const radius = 0.8 + Math.random() * 0.4;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }

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
