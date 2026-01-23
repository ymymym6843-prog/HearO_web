'use client';

/**
 * SkyboxBackground - 360도 스카이박스 배경
 *
 * 2:1 비율 Equirectangular 이미지를 구체에 매핑
 * Three.js SphereGeometry + BackSide 렌더링
 */

import React, { useRef, useEffect } from 'react';
import { useThree, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

interface SkyboxBackgroundProps {
  /** 스카이박스 이미지 URL (2:1 Equirectangular) */
  imageUrl: string;
  /** 가시성 */
  visible?: boolean;
  /** 구체 반지름 */
  radius?: number;
}

export function SkyboxBackground({
  imageUrl,
  visible = true,
  radius = 50,
}: SkyboxBackgroundProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { scene } = useThree();

  // 텍스처 로드
  const texture = useLoader(THREE.TextureLoader, imageUrl);

  useEffect(() => {
    if (texture) {
      // Equirectangular 매핑 설정
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;

      // 씬 배경으로도 설정 (옵션)
      // scene.background = texture;
    }
  }, [texture, scene]);

  if (!visible) return null;

  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]}>
      {/* 구체 지오메트리: 높은 세그먼트로 왜곡 최소화 */}
      <sphereGeometry args={[radius, 64, 32]} />

      {/* BackSide로 내부에서 보이도록 */}
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  );
}

export default SkyboxBackground;
