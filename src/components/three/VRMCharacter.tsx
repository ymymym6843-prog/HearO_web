'use client';

/**
 * VRM 캐릭터 컴포넌트
 * Three.js + @pixiv/three-vrm 기반 3D 캐릭터 렌더링
 */

import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyPoseToVRM, resetVRMPose } from '@/lib/kalidokit/vrmAnimator';
import { useCharacterStore } from '@/stores/useCharacterStore';
import { Icon } from '@/components/ui/Icon';

interface VRMCharacterProps {
  modelUrl: string;
  onLoaded?: (vrm: VRM) => void;
  onError?: (error: Error) => void;
}

export function VRMCharacter({ modelUrl, onLoaded, onError }: VRMCharacterProps) {
  const vrmRef = useRef<VRM | null>(null);
  const { scene } = useThree();
  const { poseLandmarks, worldLandmarks, handLandmarks, setVRM, setLoaded, mirrorMode, isCalibrated } = useCharacterStore();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // VRM 모델 로드
  useEffect(() => {
    setLoadError(null);
    setIsLoading(true);
    setLoadProgress(0);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      modelUrl,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;

        if (!vrm) {
          const error = new Error('VRM 데이터를 찾을 수 없습니다');
          setLoadError(error.message);
          setIsLoading(false);
          onError?.(error);
          return;
        }

        // 이전 모델 제거
        if (vrmRef.current) {
          scene.remove(vrmRef.current.scene);
        }

        vrmRef.current = vrm;
        scene.add(vrm.scene);

        // 캐릭터 위치 설정
        vrm.scene.position.set(0, 0, 0);
        vrm.scene.rotation.set(0, 0, 0); // 회전 초기화

        // T-pose로 초기화 (만세 포즈 방지)
        resetVRMPose(vrm);

        // 스토어 업데이트
        setVRM(vrm);
        setLoaded(true);
        setIsLoading(false);
        setLoadProgress(100);

        onLoaded?.(vrm);
      },
      (progress) => {
        // 로딩 진행률
        const percent = progress.total > 0
          ? Math.round((progress.loaded / progress.total) * 100)
          : 0;
        setLoadProgress(percent);
        console.log(`VRM Loading: ${percent}%`);
      },
      (error) => {
        console.error('VRM 로드 실패:', error);
        const errorMessage = error instanceof Error
          ? error.message
          : '모델을 불러올 수 없습니다';
        setLoadError(errorMessage);
        setIsLoading(false);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    );

    return () => {
      if (vrmRef.current) {
        scene.remove(vrmRef.current.scene);
        setVRM(null);
        setLoaded(false);
        vrmRef.current = null;
      }
    };
  }, [modelUrl, scene, setVRM, setLoaded, onLoaded, onError]);

  // 디버그 카운터
  const frameCountRef = useRef(0);

  // 매 프레임마다 포즈 업데이트
  useFrame((_, delta) => {
    frameCountRef.current++;

    // 처음 몇 프레임만 디버그 (더 자세하게)
    if (frameCountRef.current <= 10 || frameCountRef.current % 100 === 0) {
      console.log('[VRMCharacter] Frame', frameCountRef.current,
        'vrmRef:', !!vrmRef.current,
        'poseLandmarks:', poseLandmarks?.length ?? 'null',
        'worldLandmarks:', worldLandmarks?.length ?? 'null',
        'mirrorMode:', mirrorMode
      );
    }

    if (!vrmRef.current) return;

    // 포즈 적용 (캘리브레이션 건너뛰고 바로 테스트)
    // TODO: 테스트 완료 후 isCalibrated 체크 복원
    if (poseLandmarks) {
      applyPoseToVRM(
        vrmRef.current,
        poseLandmarks,
        {
          left: handLandmarks.left ?? undefined,
          right: handLandmarks.right ?? undefined,
        },
        {
          mirror: mirrorMode,
          worldLandmarks3D: worldLandmarks ?? undefined,
          imageSize: { width: 640, height: 480 },
          useWorldLandmarks3D: true,  // 3D 좌표 사용하여 정확한 팔 회전 계산
        }
      );
    }

    // VRM 업데이트 (표정 등)
    vrmRef.current.update(delta);
  });

  // 에러 발생 시 폴백 UI
  if (loadError) {
    return (
      <Html center>
        <div className="text-center p-6 bg-black/80 rounded-2xl backdrop-blur-sm max-w-sm">
          <div className="flex justify-center mb-4">
            <Icon name="warning-outline" size={40} color="#F59E0B" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">캐릭터 로드 실패</h3>
          <p className="text-gray-400 text-sm mb-4">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition-colors"
          >
            다시 시도
          </button>
        </div>
      </Html>
    );
  }

  // 로딩 중 표시
  if (isLoading) {
    return (
      <Html center>
        <div className="text-center p-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white text-sm">캐릭터 로딩 중...</p>
          <p className="text-gray-400 text-xs mt-1">{loadProgress}%</p>
        </div>
      </Html>
    );
  }

  return null; // 실제 렌더링은 VRM.scene에서 처리
}

export default VRMCharacter;
