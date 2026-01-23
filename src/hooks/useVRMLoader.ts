/**
 * useVRMLoader - VRM 모델 로딩 및 분석 훅
 * Utonics 벤치마킹: 본 구조 분석, 메쉬 분석, 손가락 본 감지
 */

import { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM, VRMHumanBoneName } from '@pixiv/three-vrm';

// ============================================================================
// 타입 정의
// ============================================================================

export interface MeshInfo {
  name: string;
  type: string;
  visible: boolean;
  vertexCount: number;
  materialName: string;
  parentName: string;
}

export interface BoneAnalysis {
  totalBones: number;
  boneNames: string[];
  fingerBones: string[];
  hasFingerTracking: boolean;
}

export interface VRMMetaInfo {
  name: string;
  version: string | null;
  author: string | null;
  hasHumanoid: boolean;
}

export interface VRMAnalysis {
  meta: VRMMetaInfo;
  bones: BoneAnalysis;
  meshes: MeshInfo[];
  potentialClothing: string[];
  isSingleMesh: boolean;
}

export interface UseVRMLoaderOptions {
  modelPath: string;
  autoAnalyze?: boolean;
}

export interface UseVRMLoaderReturn {
  vrm: VRM | null;
  isLoading: boolean;
  loadProgress: number;
  error: Error | null;
  analysis: VRMAnalysis | null;
  reload: () => void;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * VRM 모델 분석
 */
function analyzeVRM(vrm: VRM): VRMAnalysis {
  // 메타 정보 추출
  const meta = vrm.meta as { name?: string; title?: string; metaVersion?: string; authors?: string[] } | undefined;
  const metaInfo: VRMMetaInfo = {
    name: meta?.name || meta?.title || 'Unknown',
    version: meta?.metaVersion || null,
    author: meta?.authors?.[0] || null,
    hasHumanoid: !!vrm.humanoid,
  };

  // 본 분석
  const boneNames: string[] = [];
  const fingerBones: string[] = [];

  if (vrm.humanoid?.normalizedHumanBones) {
    const bones = vrm.humanoid.normalizedHumanBones;

    // Map 또는 Object 형태 모두 지원
    const processBonesObject = (bones: Record<string, any>) => {
      Object.keys(bones).forEach((name) => {
        boneNames.push(name);
        if (
          name.includes('Thumb') ||
          name.includes('Index') ||
          name.includes('Middle') ||
          name.includes('Ring') ||
          name.includes('Little')
        ) {
          fingerBones.push(name);
        }
      });
    };

    if (bones instanceof Map) {
      bones.forEach((_, name) => {
        boneNames.push(name);
        if (
          name.includes('Thumb') ||
          name.includes('Index') ||
          name.includes('Middle') ||
          name.includes('Ring') ||
          name.includes('Little')
        ) {
          fingerBones.push(name);
        }
      });
    } else if (typeof bones === 'object') {
      processBonesObject(bones as Record<string, any>);
    }
  }

  const boneAnalysis: BoneAnalysis = {
    totalBones: boneNames.length,
    boneNames: boneNames.sort(),
    fingerBones: fingerBones.sort(),
    hasFingerTracking: fingerBones.length >= 10, // 최소 10개 손가락 본 필요
  };

  // 메쉬 구조 분석
  const meshes: MeshInfo[] = [];
  vrm.scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      const mesh = object as THREE.Mesh;
      const geometry = mesh.geometry as THREE.BufferGeometry;
      const material = mesh.material as THREE.Material;

      meshes.push({
        name: mesh.name || 'Unnamed',
        type: object.type,
        visible: mesh.visible,
        vertexCount: geometry.attributes.position?.count || 0,
        materialName: material.name || 'Unnamed Material',
        parentName: mesh.parent?.name || 'None',
      });
    }
  });

  // 의상/장식 분리 가능성 분석
  const clothingKeywords = [
    'cloth', 'hair', 'accessory', 'hat', 'glass', 'shoe',
    'jacket', 'shirt', 'pants', 'outfit', 'dress', 'coat',
    'glove', 'sock', 'belt', 'bag', 'watch', 'ring',
  ];

  const potentialClothing = meshes
    .filter((m) =>
      clothingKeywords.some((keyword) =>
        m.name.toLowerCase().includes(keyword)
      )
    )
    .map((m) => m.name);

  return {
    meta: metaInfo,
    bones: boneAnalysis,
    meshes,
    potentialClothing,
    isSingleMesh: meshes.length === 1,
  };
}

/**
 * 분석 결과 콘솔 출력
 */
function logAnalysis(analysis: VRMAnalysis): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ VRM 모델 분석 결과');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log(`📋 메타 정보:`);
  console.log(`   이름: ${analysis.meta.name}`);
  console.log(`   버전: ${analysis.meta.version || 'N/A'}`);
  console.log(`   Humanoid: ${analysis.meta.hasHumanoid ? '✅' : '❌'}`);

  console.log(`\n🦴 본 구조:`);
  console.log(`   총 본 수: ${analysis.bones.totalBones}`);
  console.log(`   손가락 본: ${analysis.bones.fingerBones.length}개`);
  console.log(`   손가락 추적: ${analysis.bones.hasFingerTracking ? '✅ 지원' : '❌ 미지원'}`);

  if (analysis.bones.fingerBones.length > 0) {
    console.log(`   🖐️ 손가락 본: ${analysis.bones.fingerBones.join(', ')}`);
  }

  console.log(`\n🎨 메쉬 구조:`);
  console.log(`   총 메쉬: ${analysis.meshes.length}개`);
  console.log(`   단일 메쉬: ${analysis.isSingleMesh ? '⚠️ 예 (의상 분리 불가)' : '✅ 아니오'}`);

  if (analysis.potentialClothing.length > 0) {
    console.log(`   👕 의상/장식 메쉬: ${analysis.potentialClothing.join(', ')}`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// ============================================================================
// 메인 훅
// ============================================================================

export function useVRMLoader(options: UseVRMLoaderOptions): UseVRMLoaderReturn {
  const { modelPath, autoAnalyze = true } = options;

  const [vrm, setVrm] = useState<VRM | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [analysis, setAnalysis] = useState<VRMAnalysis | null>(null);

  const loadVRM = useCallback(() => {
    if (!modelPath) return;

    setIsLoading(true);
    setError(null);
    setLoadProgress(0);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      modelPath,
      (gltf) => {
        const loadedVRM = gltf.userData.vrm as VRM;

        if (!loadedVRM) {
          setError(new Error('VRM not found in loaded file'));
          setIsLoading(false);
          return;
        }

        // 분석 실행
        if (autoAnalyze) {
          const vrmAnalysis = analyzeVRM(loadedVRM);
          setAnalysis(vrmAnalysis);
          logAnalysis(vrmAnalysis);
        }

        setVrm(loadedVRM);
        setIsLoading(false);
        setLoadProgress(100);
      },
      (progress) => {
        const percent = progress.total > 0
          ? Math.round((progress.loaded / progress.total) * 100)
          : 0;
        setLoadProgress(percent);
      },
      (err) => {
        console.error('[useVRMLoader] Load error:', err);
        setError(err as Error);
        setIsLoading(false);
      }
    );
  }, [modelPath, autoAnalyze]);

  // 초기 로드
  useEffect(() => {
    loadVRM();
  }, [loadVRM]);

  // 리로드 함수
  const reload = useCallback(() => {
    setVrm(null);
    setAnalysis(null);
    loadVRM();
  }, [loadVRM]);

  return {
    vrm,
    isLoading,
    loadProgress,
    error,
    analysis,
    reload,
  };
}

// ============================================================================
// 유틸리티: 본 지원 여부 확인
// ============================================================================

/**
 * 특정 본이 VRM에 존재하는지 확인
 */
export function hasBone(vrm: VRM, boneName: VRMHumanBoneName): boolean {
  return vrm.humanoid?.getNormalizedBoneNode(boneName) !== null;
}

/**
 * 손가락 추적 지원 여부 확인
 */
export function supportsFingerTracking(vrm: VRM): boolean {
  const requiredFingerBones: VRMHumanBoneName[] = [
    VRMHumanBoneName.LeftThumbProximal,
    VRMHumanBoneName.LeftIndexProximal,
    VRMHumanBoneName.RightThumbProximal,
    VRMHumanBoneName.RightIndexProximal,
  ];

  return requiredFingerBones.every((bone) => hasBone(vrm, bone));
}

/**
 * 다리 추적 지원 여부 확인
 */
export function supportsLegTracking(vrm: VRM): boolean {
  const requiredLegBones: VRMHumanBoneName[] = [
    VRMHumanBoneName.LeftUpperLeg,
    VRMHumanBoneName.LeftLowerLeg,
    VRMHumanBoneName.RightUpperLeg,
    VRMHumanBoneName.RightLowerLeg,
  ];

  return requiredLegBones.every((bone) => hasBone(vrm, bone));
}

export default useVRMLoader;
