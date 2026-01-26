'use client';

/**
 * SkyboxBackground - 360도 스카이박스 배경
 *
 * 2:1 비율 Equirectangular 이미지를 구체에 매핑
 * Three.js SphereGeometry + BackSide 렌더링
 * 천천히 회전하여 몰입감 증가
 */

import React, { useRef, useMemo, Suspense } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
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

  // 텍스처 로드
  const rawTexture = useLoader(THREE.TextureLoader, imageUrl);

  // 텍스처 설정을 메모이제이션 (원본 수정 대신 설정 적용된 텍스처 반환)
  const texture = useMemo(() => {
    if (rawTexture) {
      // 텍스처 복제 후 설정 (원본 수정 방지)
      const clonedTexture = rawTexture.clone();
      clonedTexture.mapping = THREE.EquirectangularReflectionMapping;
      clonedTexture.colorSpace = THREE.SRGBColorSpace;
      clonedTexture.needsUpdate = true;
      return clonedTexture;
    }
    return rawTexture;
  }, [rawTexture]);

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
  rotationSpeed = 0.001,  // 기본: 천천히 회전 (이전 0.0005 → 0.001로 상향)
}: SkyboxBackgroundProps) {
  if (!visible) return null;

  // key를 사용하여 imageUrl 변경 시 컴포넌트 재마운트 (에러 상태 자동 리셋)
  return (
    <Suspense fallback={<SkyboxFallback radius={radius} />}>
      <SkyboxMesh
        key={imageUrl}
        imageUrl={imageUrl}
        radius={radius}
        rotationSpeed={rotationSpeed}
      />
    </Suspense>
  );
}

export default SkyboxBackground;
