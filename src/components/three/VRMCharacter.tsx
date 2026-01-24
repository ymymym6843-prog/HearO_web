'use client';

/**
 * VRM 캐릭터 컴포넌트
 * Three.js + @pixiv/three-vrm 기반 3D 캐릭터 렌더링
 *
 * Utonics 스타일 벤치마킹: useKalidokit 훅 사용
 * VRMA 애니메이션 + 표정 시스템 통합
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useKalidokit, resetVRMPose } from '@/hooks/useKalidokit';
import { useVRMAAnimation } from '@/hooks/useVRMAAnimation';
import { useCharacterStore } from '@/stores/useCharacterStore';
import { vrmFeedbackService, setVRMExpression, type ExpressionState } from '@/services/vrmFeedbackService';
import { Icon } from '@/components/ui/Icon';

interface VRMCharacterProps {
  modelUrl: string;
  onLoaded?: (vrm: VRM) => void;
  onError?: (error: Error) => void;
  // VRMA 애니메이션 관련
  animationUrl?: string | null; // 재생할 VRMA URL
  onAnimationEnd?: () => void; // 애니메이션 종료 콜백
  // 표정 관련
  expression?: ExpressionState | null; // 설정할 표정
}

export function VRMCharacter({
  modelUrl,
  onLoaded,
  onError,
  animationUrl,
  onAnimationEnd,
  expression,
}: VRMCharacterProps) {
  const { scene } = useThree();
  const {
    poseLandmarks,
    worldLandmarks,
    handLandmarks,
    setVRM,
    setLoaded,
    mirrorMode,
  } = useCharacterStore();

  // VRMA 애니메이션 훅
  const {
    isPlaying: isAnimationPlaying,
    isFadingOut: isAnimationFadingOut,
    loadAnimation,
    play: playAnimation,
    stop: stopAnimation,
    fadeOut: fadeOutAnimation,
    setLoop,
    update: updateAnimation,
    initialize: initializeAnimation,
    dispose: disposeAnimation,
  } = useVRMAAnimation();

  // 애니메이션 재생 중 여부 (포즈 동기화 비활성화용)
  const [isPlayingVRMA, setIsPlayingVRMA] = useState(false);

  // VRM을 state로 관리하여 변경 시 리렌더링 트리거
  const [loadedVRM, setLoadedVRM] = useState<VRM | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Scene에 추가된 VRM 추적 (cleanup용)
  const addedToSceneRef = useRef<VRM | null>(null);

  // 중복 로딩 방지 플래그
  const isLoadingRef = useRef(false);
  const loadedModelUrlRef = useRef<string | null>(null);

  // Utonics 스타일 Kalidokit 훅 사용
  // VRM이 로드된 후에만 활성화 (VRMA 애니메이션 재생 중에는 비활성화)
  const { isActive, frameCount, syncQuality, handSyncActive } = useKalidokit({
    vrm: loadedVRM,
    poseLandmarks,
    worldLandmarks,
    handLandmarks: {
      left: handLandmarks.left,
      right: handLandmarks.right,
    },
    enabled: loadedVRM !== null && !isPlayingVRMA, // 애니메이션 재생 중에는 포즈 동기화 비활성화
    mirror: mirrorMode,
  });

  // VRMA 애니메이션 로드 및 재생
  const handlePlayAnimation = useCallback(async (url: string) => {
    if (!loadedVRM) return;

    try {
      setIsPlayingVRMA(true);
      setLoop(false); // 완료 애니메이션은 1회만 재생
      await loadAnimation(url);
      playAnimation();
      console.log('[VRMCharacter] Playing animation:', url);
    } catch (error) {
      console.error('[VRMCharacter] Failed to play animation:', error);
      setIsPlayingVRMA(false);
    }
  }, [loadedVRM, loadAnimation, playAnimation, setLoop]);

  // animationUrl prop 변경 감지
  useEffect(() => {
    if (animationUrl && loadedVRM) {
      handlePlayAnimation(animationUrl);
    } else if (!animationUrl && isPlayingVRMA && !isAnimationFadingOut) {
      // 애니메이션 URL이 null로 변경되면 부드럽게 페이드아웃
      console.log('[VRMCharacter] Animation URL cleared, fading out...');
      fadeOutAnimation(0.5);
    }
  }, [animationUrl, loadedVRM, handlePlayAnimation, fadeOutAnimation, isPlayingVRMA, isAnimationFadingOut]);

  // 페이드아웃 완료 감지
  useEffect(() => {
    // 페이드아웃이 완료되었고 재생 중이 아니면 상태 리셋
    if (isPlayingVRMA && !isAnimationPlaying && !isAnimationFadingOut) {
      setIsPlayingVRMA(false);
    }
  }, [isPlayingVRMA, isAnimationPlaying, isAnimationFadingOut]);

  // 표정 변경 처리
  useEffect(() => {
    if (expression && loadedVRM) {
      setVRMExpression(loadedVRM, expression);
    }
  }, [expression, loadedVRM]);

  // VRM 모델 로드 (중복 로딩 방지)
  useEffect(() => {
    // 이미 같은 모델이 로드되었거나 로딩 중이면 스킵
    if (loadedModelUrlRef.current === modelUrl && loadedVRM) {
      console.log('[VRMCharacter] Already loaded, skipping:', modelUrl);
      return;
    }
    if (isLoadingRef.current) {
      console.log('[VRMCharacter] Already loading, skipping');
      return;
    }

    isLoadingRef.current = true;
    setLoadError(null);
    setIsLoading(true);
    setLoadProgress(0);
    setLoadedVRM(null);

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
        if (addedToSceneRef.current) {
          scene.remove(addedToSceneRef.current.scene);
          addedToSceneRef.current = null;
        }

        // 새 모델 추가
        scene.add(vrm.scene);
        addedToSceneRef.current = vrm;

        // 캐릭터 위치 설정
        vrm.scene.position.set(0, 0, 0);
        vrm.scene.rotation.set(0, 0, 0);

        // T-pose로 초기화
        resetVRMPose(vrm);

        // VRMA 애니메이션 시스템 초기화
        initializeAnimation(vrm);

        // vrmFeedbackService에 VRM 설정
        vrmFeedbackService.setVRM(vrm);

        // 상태 업데이트 (리렌더링 트리거)
        setLoadedVRM(vrm);
        setVRM(vrm);
        setLoaded(true);
        setIsLoading(false);
        setLoadProgress(100);

        // 로딩 완료 플래그 업데이트
        isLoadingRef.current = false;
        loadedModelUrlRef.current = modelUrl;

        console.log('[VRMCharacter] VRM loaded successfully (with animation support)');
        onLoaded?.(vrm);
      },
      (progress) => {
        const percent = progress.total > 0
          ? Math.round((progress.loaded / progress.total) * 100)
          : 0;
        setLoadProgress(percent);
      },
      (error) => {
        console.error('[VRMCharacter] VRM load failed:', error);
        const errorMessage = error instanceof Error
          ? error.message
          : '모델을 불러올 수 없습니다';
        setLoadError(errorMessage);
        setIsLoading(false);
        isLoadingRef.current = false;
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    );

    return () => {
      if (addedToSceneRef.current) {
        scene.remove(addedToSceneRef.current.scene);
        addedToSceneRef.current = null;
      }
      // 애니메이션 시스템 정리
      disposeAnimation();
      vrmFeedbackService.dispose();
      setVRM(null);
      setLoaded(false);
      setLoadedVRM(null);
      // 로딩 플래그 리셋
      isLoadingRef.current = false;
      loadedModelUrlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]); // modelUrl만 의존성으로 - 나머지는 안정적이므로 제외

  // 디버그 카운터
  const debugFrameRef = useRef(0);
  const prevAnimationPlayingRef = useRef(false);

  // 매 프레임마다 VRM 업데이트 (표정 + 애니메이션)
  useFrame((_, delta) => {
    debugFrameRef.current++;

    // 처음 몇 프레임만 디버그
    if (debugFrameRef.current <= 5 || debugFrameRef.current % 300 === 0) {
      console.log('[VRMCharacter] Frame', debugFrameRef.current, {
        vrmLoaded: !!loadedVRM,
        kalidokitActive: isActive,
        syncFrames: frameCount,
        syncQuality: syncQuality.toFixed(2),
        handSync: handSyncActive,
        poseLandmarks: poseLandmarks?.length ?? 'null',
        worldLandmarks: worldLandmarks?.length ?? 'null',
        animationPlaying: isAnimationPlaying,
      });
    }

    // VRMA 애니메이션 업데이트 (재생 중이거나 페이드아웃 중일 때)
    if (isPlayingVRMA || isAnimationFadingOut) {
      updateAnimation(delta);

      // 애니메이션 종료 감지 (isAnimationPlaying이 true→false로 변할 때)
      // 페이드아웃 중이 아닐 때만 페이드아웃 시작
      if (prevAnimationPlayingRef.current && !isAnimationPlaying && !isAnimationFadingOut) {
        console.log('[VRMCharacter] Animation ended, starting fadeOut...');
        fadeOutAnimation(0.5); // 0.5초 동안 부드럽게 페이드아웃
        onAnimationEnd?.();
      }

      // 페이드아웃이 완료되면 상태 리셋
      if (isPlayingVRMA && !isAnimationPlaying && !isAnimationFadingOut) {
        console.log('[VRMCharacter] FadeOut complete, returning to idle');
        setIsPlayingVRMA(false);
      }
    }
    prevAnimationPlayingRef.current = isAnimationPlaying;

    // VRM 업데이트 (표정 등)
    if (loadedVRM) {
      loadedVRM.update(delta);
    }
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
