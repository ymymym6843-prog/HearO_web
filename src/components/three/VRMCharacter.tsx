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

// 애니메이션 프리셋 타입
export type AnimationPreset = 'none' | 'A' | 'B';

// 애니메이션 프리셋 설정
export const ANIMATION_PRESETS: Record<AnimationPreset, {
  label: string;
  initial: string | null;  // 초기 등장 애니메이션 (1회)
  idle: string | null;     // Idle 애니메이션 (루프)
}> = {
  none: {
    label: '없음 (T-Pose)',
    initial: null,
    idle: null,
  },
  A: {
    label: 'A: 등장 → 대기',
    initial: '/animations/Appearing.vrma',
    idle: '/animations/Waiting.vrma',
  },
  B: {
    label: 'B: 인사 → 둘러보기',
    initial: '/animations/Greeting.vrma',
    idle: '/animations/LookAround.vrma',
  },
};

interface VRMCharacterProps {
  modelUrl: string;
  onLoaded?: (vrm: VRM) => void;
  onError?: (error: Error) => void;
  // VRMA 애니메이션 관련
  animationUrl?: string | null; // 재생할 VRMA URL
  onAnimationEnd?: () => void; // 애니메이션 종료 콜백
  // 초기/Idle 애니메이션
  animationPreset?: AnimationPreset; // 프리셋 선택
  // 표정 관련
  expression?: ExpressionState | null; // 설정할 표정
}

export function VRMCharacter({
  modelUrl,
  onLoaded,
  onError,
  animationUrl,
  onAnimationEnd,
  animationPreset = 'A', // 기본값: A (등장 → 대기)
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

  // 초기 애니메이션 상태
  const [initialAnimationPhase, setInitialAnimationPhase] = useState<'pending' | 'initial' | 'idle' | 'complete'>('pending');
  const initialAnimationStartedRef = useRef(false);

  // 프리셋 애니메이션 재생 중 플래그 (animationUrl prop과 구분)
  const isPlayingPresetRef = useRef(false);

  // 애니메이션 시작 직후 플래그 (async state 동기화 대기용)
  const animationJustStartedRef = useRef(false);

  // 애니메이션 버전 카운터 (프리셋 빠른 변경 시 stale animation 무시용)
  const animationVersionRef = useRef(0);

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
  useKalidokit({
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
  const handlePlayAnimation = useCallback(async (
    url: string,
    loop: boolean = false,
    onFinished?: () => void
  ) => {
    if (!loadedVRM) return;

    // 현재 버전 캡처 (로딩 중 프리셋이 변경되면 무시)
    const currentVersion = animationVersionRef.current;

    try {
      // 애니메이션 시작 플래그 설정 (async state 동기화 대기용)
      animationJustStartedRef.current = true;
      setIsPlayingVRMA(true);
      setLoop(loop);
      await loadAnimation(url, undefined, {
        crossFadeDuration: 0.5, // 0.5초 크로스페이드
        onFinished: onFinished, // 애니메이션 종료 콜백
      });

      // 로딩 중 프리셋이 변경되었으면 무시
      if (animationVersionRef.current !== currentVersion) {
        console.log('[VRMCharacter] Animation load completed but version changed, ignoring');
        return;
      }

      playAnimation();
      console.log('[VRMCharacter] Playing animation:', url, loop ? '(loop)' : '(once)');
    } catch (error) {
      console.error('[VRMCharacter] Failed to play animation:', error);
      // 버전이 같을 때만 상태 리셋
      if (animationVersionRef.current === currentVersion) {
        animationJustStartedRef.current = false;
        setIsPlayingVRMA(false);
      }
    }
  }, [loadedVRM, loadAnimation, playAnimation, setLoop]);

  // 초기 애니메이션 시작
  const startInitialAnimation = useCallback(async () => {
    console.log('[VRMCharacter] startInitialAnimation called with preset:', animationPreset);

    if (initialAnimationStartedRef.current) {
      console.log('[VRMCharacter] Animation already started, skipping');
      return;
    }

    // 'none' 프리셋 또는 VRM 미로드 시 조기 종료
    if (!loadedVRM) {
      console.log('[VRMCharacter] VRM not loaded, skipping');
      return;
    }

    if (animationPreset === 'none') {
      console.log('[VRMCharacter] Preset is none, completing without animation');
      setInitialAnimationPhase('complete');
      isPlayingPresetRef.current = false;
      return;
    }

    const preset = ANIMATION_PRESETS[animationPreset];
    if (!preset) {
      console.error('[VRMCharacter] Invalid preset:', animationPreset);
      return;
    }

    initialAnimationStartedRef.current = true;
    isPlayingPresetRef.current = true; // 프리셋 애니메이션 시작

    if (preset.initial) {
      // 초기 등장 애니메이션 재생 (1회, 완료 시 idle로 전환)
      setInitialAnimationPhase('initial');
      console.log('[VRMCharacter] Starting initial animation:', preset.initial);
      await handlePlayAnimation(preset.initial, false, () => {
        // 초기 애니메이션 완료 콜백 - idle로 전환
        console.log('[VRMCharacter] Initial animation finished, transitioning to idle...');
        if (preset.idle) {
          setInitialAnimationPhase('idle');
          handlePlayAnimation(preset.idle, true); // idle은 루프
        } else {
          setInitialAnimationPhase('complete');
          isPlayingPresetRef.current = false;
          setIsPlayingVRMA(false);
        }
      });
    } else if (preset.idle) {
      // 바로 idle 애니메이션으로
      setInitialAnimationPhase('idle');
      console.log('[VRMCharacter] Starting idle animation:', preset.idle);
      await handlePlayAnimation(preset.idle, true);
    } else {
      setInitialAnimationPhase('complete');
      isPlayingPresetRef.current = false;
    }
  }, [loadedVRM, animationPreset, handlePlayAnimation]);

  // Idle 애니메이션 시작 (초기 애니메이션 완료 후) - 콜백 방식으로 변경되어 직접 호출하지 않음
  // startInitialAnimation에서 onFinished 콜백으로 처리

  // animationUrl prop 변경 감지 (외부에서 전달된 애니메이션만 처리)
  useEffect(() => {
    if (animationUrl && loadedVRM) {
      // 외부 애니메이션 요청 - 프리셋 애니메이션 중단
      isPlayingPresetRef.current = false;
      handlePlayAnimation(animationUrl);
    } else if (
      !animationUrl &&
      isPlayingVRMA &&
      !isAnimationFadingOut &&
      !isPlayingPresetRef.current &&
      !animationJustStartedRef.current // 새 애니메이션 시작 중이면 fadeOut 방지
    ) {
      // 외부 애니메이션 URL이 null로 변경되고, 프리셋이 아닌 경우만 페이드아웃
      console.log('[VRMCharacter] External animation URL cleared, fading out...');
      fadeOutAnimation(0.5);
    }
    // 프리셋 애니메이션 재생 중이면 animationUrl이 null이어도 페이드아웃하지 않음
  }, [animationUrl, loadedVRM, handlePlayAnimation, fadeOutAnimation, isPlayingVRMA, isAnimationFadingOut]);

  // 페이드아웃 완료 감지 (useFrame에서 처리하므로 제거)
  // Note: useFrame 콜백에서 animationJustStartedRef.current 체크와 함께 처리됨
  // 이 useEffect는 애니메이션 로딩 중에 조기 실행되어 race condition 발생
  // 따라서 useFrame에서만 상태 리셋 처리

  // 표정 변경 처리
  useEffect(() => {
    if (expression && loadedVRM) {
      setVRMExpression(loadedVRM, expression);
    }
  }, [expression, loadedVRM]);

  // VRM 로드 완료 시 초기 애니메이션 시작
  useEffect(() => {
    if (loadedVRM && !initialAnimationStartedRef.current) {
      // 약간의 딜레이 후 초기 애니메이션 시작 (로딩 완료 확인용)
      const timer = setTimeout(() => {
        startInitialAnimation();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loadedVRM, startInitialAnimation]);

  // 애니메이션 프리셋 변경 시 리셋
  useEffect(() => {
    if (loadedVRM && initialAnimationStartedRef.current) {
      console.log('[VRMCharacter] Preset changed to:', animationPreset, '- resetting animation');

      // 버전 증가 (진행 중인 애니메이션 로드 무효화)
      animationVersionRef.current++;

      // 프리셋 변경 시 초기 애니메이션 다시 시작
      initialAnimationStartedRef.current = false;
      setInitialAnimationPhase('pending');
      stopAnimation();

      // 'none' 프리셋은 애니메이션 없음 - 즉시 Kalidokit으로 전환
      if (animationPreset === 'none') {
        isPlayingPresetRef.current = false;
        animationJustStartedRef.current = false;
        setIsPlayingVRMA(false);
        setInitialAnimationPhase('complete');
        return;
      }

      // 다른 프리셋은 즉시 상태 설정하여 Kalidokit/fadeOut 간섭 방지
      // - isPlayingVRMA=true: Kalidokit 비활성화
      // - isPlayingPresetRef=true: animationUrl effect의 fadeOut 방지
      // - animationJustStartedRef=true: 조기 상태 리셋 방지
      isPlayingPresetRef.current = true;
      animationJustStartedRef.current = true;
      setIsPlayingVRMA(true);

      // 약간의 딜레이 후 새 애니메이션 시작
      const timer = setTimeout(() => {
        console.log('[VRMCharacter] Starting new preset animation:', animationPreset);
        startInitialAnimation();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [animationPreset, loadedVRM, stopAnimation, startInitialAnimation]);

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

  // 매 프레임마다 VRM 업데이트 (표정 + 애니메이션)
  useFrame((_, delta) => {
    // VRMA 애니메이션 업데이트 (재생 중이거나 페이드아웃 중일 때)
    if (isPlayingVRMA || isAnimationFadingOut) {
      updateAnimation(delta);

      // 애니메이션이 실제로 시작되면 플래그 해제
      if (animationJustStartedRef.current && isAnimationPlaying) {
        animationJustStartedRef.current = false;
      }

      // 페이드아웃이 완료되면 상태 리셋 (단, 방금 시작한 경우는 제외)
      if (isPlayingVRMA && !isAnimationPlaying && !isAnimationFadingOut && !animationJustStartedRef.current) {
        setIsPlayingVRMA(false);
      }
    }

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
