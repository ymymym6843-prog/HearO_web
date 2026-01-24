'use client';

/**
 * SkyboxBackground - 360도 스카이박스 배경
 *
 * 2:1 비율 Equirectangular 이미지를 구체에 매핑
 * Three.js SphereGeometry + BackSide 렌더링
 * 천천히 회전하여 몰입감 증가
 */

import React, { useRef, useEffect, useState, Suspense } from 'react';
import { useThree, useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SkyboxBackgroundProps {
  /** 스카이박스 이미지 URL (2:1 Equirectangular) */
  imageUrl: string;
  /** 가시성 */
  visible?: boolean;
  /** 구체 반지름 */
  radius?: number;
  /** 회전 속도 (기본: 0.0003, 0이면 회전 안함) */
  rotationSpeed?: number;
}

// 내부 스카이박스 컴포넌트 (텍스처 로딩 + 부드러운 회전)
function SkyboxMesh({
  imageUrl,
  radius,
  rotationSpeed
}: {
  imageUrl: string;
  radius: number;
  rotationSpeed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetRotationRef = useRef(0);
  const { scene } = useThree();

  // 텍스처 로드
  const texture = useLoader(THREE.TextureLoader, imageUrl);

  useEffect(() => {
    if (texture) {
      // Equirectangular 매핑 설정
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
    }
  }, [texture, scene]);

  // 스카이박스 부드러운 회전 애니메이션
  useFrame(() => {
    if (meshRef.current && rotationSpeed > 0) {
      // 목표 회전값을 일정하게 증가
      targetRotationRef.current += rotationSpeed;

      // lerp로 부드럽게 현재 회전값을 목표값에 근접
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        targetRotationRef.current,
        0.05  // 부드러운 보간 계수 (낮을수록 더 부드러움)
      );
    }
  });

  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]}>
      <sphereGeometry args={[radius, 64, 32]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  );
}

// 로딩 중 fallback (단색 스카이박스)
function SkyboxFallback({ radius, color = '#1a1a2e' }: { radius: number; color?: string }) {
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[radius, 32, 16]} />
      <meshBasicMaterial color={color} side={THREE.BackSide} />
    </mesh>
  );
}

export function SkyboxBackground({
  imageUrl,
  visible = true,
  radius = 50,
  rotationSpeed = 0.0005,  // 기본: 천천히 회전 (운동 중 방해 안됨)
}: SkyboxBackgroundProps) {
  const [hasError, setHasError] = useState(false);

  // 이미지 URL 변경 시 에러 상태 리셋
  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  if (!visible) return null;

  // 에러 발생 시 fallback 표시
  if (hasError) {
    return <SkyboxFallback radius={radius} />;
  }

  return (
    <Suspense fallback={<SkyboxFallback radius={radius} />}>
      <SkyboxMesh
        imageUrl={imageUrl}
        radius={radius}
        rotationSpeed={rotationSpeed}
      />
    </Suspense>
  );
}

export default SkyboxBackground;
