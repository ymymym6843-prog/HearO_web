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

// 추적 모드 타입
// - 'animation': VRMA 애니메이션 우선 (프롤로그, 완료 화면)
// - 'pose': MediaPipe 포즈 추적 우선 (운동 중)
// - 'hybrid': 둘 다 블렌딩 (고급 - 미구현)
export type TrackingMode = 'animation' | 'pose' | 'hybrid';

// ========== 상수 ==========
// Idle 애니메이션 반복 횟수 (무한 루프 방지)
// ※ 유한 반복이므로 THREE.AnimationMixer가 finished 이벤트를 정상 발생시킴
const IDLE_REPEAT_COUNT = 2;

// 사용자 움직임 감지 임계값 (이 값 이상 변화 시 움직임으로 판정)
const MOTION_DETECTION_THRESHOLD = 0.03;

// 움직임 감지 연속 프레임 수 (이 수 이상 연속 감지 시 확정)
const MOTION_CONFIRM_FRAMES = 3;

// 애니메이션 프리셋 설정
export const ANIMATION_PRESETS: Record<AnimationPreset, {
  label: string;
  initial: string | null;  // 초기 등장 애니메이션 (1회)
  idle: string | null;     // Idle 애니메이션 (제한 반복)
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
  // 추적 모드 (포즈 vs 애니메이션)
  trackingMode?: TrackingMode; // 기본: 'animation'
}

export function VRMCharacter({
  modelUrl,
  onLoaded,
  onError,
  animationUrl,
  onAnimationEnd: _onAnimationEnd,
  animationPreset = 'A', // 기본값: A (등장 → 대기)
  expression,
  trackingMode = 'animation', // 기본값: 애니메이션 모드
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

  // 초기 애니메이션 상태 (향후 애니메이션 시퀀스 관리에서 사용 예정)
  const [_initialAnimationPhase, setInitialAnimationPhase] = useState<'pending' | 'initial' | 'idle' | 'complete'>('pending');
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

  // ========== 사용자 움직임 감지 ==========
  // 이전 프레임 랜드마크 (움직임 비교용)
  const prevLandmarksRef = useRef<{ x: number; y: number; z: number }[] | null>(null);
  // 움직임 감지 연속 프레임 카운터
  const motionFrameCountRef = useRef(0);

  // Kalidokit 활성화 조건 계산
  // trackingMode에 따라 포즈 추적 활성화 여부 결정
  const isKalidokitEnabled = (() => {
    if (!loadedVRM) return false;

    switch (trackingMode) {
      case 'pose':
        // 포즈 모드: 항상 Kalidokit 활성화 (운동 중)
        return true;
      case 'hybrid':
        // 하이브리드: 항상 활성화 (향후 블렌딩 구현 시 사용)
        return true;
      case 'animation':
      default:
        // 애니메이션 모드: VRMA 재생 중에는 비활성화 (프롤로그)
        return !isPlayingVRMA;
    }
  })();

  // Utonics 스타일 Kalidokit 훅 사용
  useKalidokit({
    vrm: loadedVRM,
    poseLandmarks,
    worldLandmarks,
    handLandmarks: {
      left: handLandmarks.left,
      right: handLandmarks.right,
    },
    enabled: isKalidokitEnabled,
    mirror: mirrorMode,
  });

  // trackingMode 변경 시 처리
  // pose 모드로 전환 시: 애니메이션 중지 + VRM 리셋
  useEffect(() => {
    if (trackingMode === 'pose' && loadedVRM) {
      // 포즈 추적 모드 진입 시 VRMA 애니메이션 페이드아웃
      if (isPlayingVRMA || isAnimationPlaying) {
        fadeOutAnimation(300);
        setIsPlayingVRMA(false);
        isPlayingPresetRef.current = false;
        console.log('[VRMCharacter] Pose mode: Stopping VRMA animation');
      }

      // VRM을 T-Pose로 초기화 (깨끗한 상태에서 포즈 시작)
      resetVRMPose(loadedVRM);
      console.log('[VRMCharacter] Pose mode: VRM reset to T-Pose');
    }
  }, [trackingMode, loadedVRM, isPlayingVRMA, isAnimationPlaying, fadeOutAnimation]);

  // ========== 사용자 움직임 감지 → 애니메이션 자동 중단 ==========
  // MediaPipe 랜드마크 변화량을 추적하여 사용자가 움직이면
  // VRMA 애니메이션을 중단하고 Kalidokit 포즈 추적 모드로 전환
  useEffect(() => {
    // 애니메이션 재생 중이 아니거나, 랜드마크가 없으면 스킵
    if (!isPlayingVRMA || !poseLandmarks || poseLandmarks.length < 33) {
      prevLandmarksRef.current = null;
      motionFrameCountRef.current = 0;
      return;
    }

    // 이전 프레임 랜드마크가 없으면 현재 값 저장하고 리턴
    if (!prevLandmarksRef.current) {
      prevLandmarksRef.current = poseLandmarks.map(lm => ({ x: lm.x, y: lm.y, z: lm.z }));
      return;
    }

    // 주요 관절 인덱스 (어깨, 엉덩이, 손목 - 움직임 감지에 가장 효과적)
    // MediaPipe Pose: 11=왼쪽어깨, 12=오른쪽어깨, 15=왼쪽손목, 16=오른쪽손목, 23=왼쪽엉덩이, 24=오른쪽엉덩이
    const keyJoints = [11, 12, 15, 16, 23, 24];
    let totalDelta = 0;

    for (const idx of keyJoints) {
      const prev = prevLandmarksRef.current[idx];
      const curr = poseLandmarks[idx];
      if (!prev || !curr) continue;

      // 유클리드 거리로 변화량 계산
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dz = curr.z - prev.z;
      totalDelta += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // 평균 변화량
    const avgDelta = totalDelta / keyJoints.length;

    // 현재 랜드마크 저장 (다음 프레임 비교용)
    prevLandmarksRef.current = poseLandmarks.map(lm => ({ x: lm.x, y: lm.y, z: lm.z }));

    // 임계값 초과 시 움직임 프레임 카운터 증가
    if (avgDelta > MOTION_DETECTION_THRESHOLD) {
      motionFrameCountRef.current++;
    } else {
      motionFrameCountRef.current = 0; // 리셋
    }

    // 연속 MOTION_CONFIRM_FRAMES 이상 감지 시 → 애니메이션 중단
    if (motionFrameCountRef.current >= MOTION_CONFIRM_FRAMES) {
      console.log('[VRMCharacter] 사용자 움직임 감지! 애니메이션 중단 → 포즈 추적 전환');
      console.log(`[VRMCharacter] Motion delta: ${avgDelta.toFixed(4)}, frames: ${motionFrameCountRef.current}`);

      // 애니메이션 페이드아웃 (0.3초에 걸쳐 자연스럽게)
      fadeOutAnimation(0.3);
      setIsPlayingVRMA(false);
      isPlayingPresetRef.current = false;
      setInitialAnimationPhase('complete');

      // 카운터 리셋
      motionFrameCountRef.current = 0;
      prevLandmarksRef.current = null;
    }
  }, [poseLandmarks, isPlayingVRMA, fadeOutAnimation]);

  // VRMA 애니메이션 로드 및 재생
  // repeatCount: 반복 횟수 (loop=true일 때만 의미 있음. 기본 Infinity)
  const handlePlayAnimation = useCallback(async (
    url: string,
    loop: boolean = false,
    onFinished?: () => void,
    repeatCount: number = Infinity
  ) => {
    if (!loadedVRM) return;

    // 현재 버전 캡처 (로딩 중 프리셋이 변경되면 무시)
    const currentVersion = animationVersionRef.current;

    try {
      // 애니메이션 시작 플래그 설정 (async state 동기화 대기용)
      animationJustStartedRef.current = true;
      setIsPlayingVRMA(true);
      // ※ setLoop에 반복 횟수 전달 (유한 반복 시 finished 이벤트 발생)
      setLoop(loop, repeatCount);
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
      const repeatInfo = loop ? `(repeat ${repeatCount === Infinity ? '∞' : repeatCount})` : '(once)';
      console.log('[VRMCharacter] Playing animation:', url, repeatInfo);
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
    console.log('[VRMCharacter] startInitialAnimation called with preset:', animationPreset, 'trackingMode:', trackingMode);

    if (initialAnimationStartedRef.current) {
      console.log('[VRMCharacter] Animation already started, skipping');
      return;
    }

    // 'none' 프리셋 또는 VRM 미로드 시 조기 종료
    if (!loadedVRM) {
      console.log('[VRMCharacter] VRM not loaded, skipping');
      return;
    }

    // pose 모드에서는 애니메이션 스킵 (사용자 포즈 추적 우선)
    if (trackingMode === 'pose') {
      console.log('[VRMCharacter] Pose mode active, skipping animation for user tracking');
      setInitialAnimationPhase('complete');
      isPlayingPresetRef.current = false;
      initialAnimationStartedRef.current = true; // 다시 시도 방지
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
        // 초기 애니메이션 완료 콜백 → idle 전환
        console.log('[VRMCharacter] Initial animation finished, transitioning to idle...');
        if (preset.idle) {
          setInitialAnimationPhase('idle');
          // ※ idle 애니메이션: IDLE_REPEAT_COUNT회만 반복 (무한 루프 방지)
          //   반복 완료 시 onFinished 콜백으로 애니메이션 종료 → Kalidokit 활성화
          handlePlayAnimation(preset.idle, true, () => {
            // idle 애니메이션 반복 완료 → 프리셋 애니메이션 종료
            console.log('[VRMCharacter] Idle animation completed after', IDLE_REPEAT_COUNT, 'repeats');
            setInitialAnimationPhase('complete');
            isPlayingPresetRef.current = false;
            setIsPlayingVRMA(false);
          }, IDLE_REPEAT_COUNT);
        } else {
          setInitialAnimationPhase('complete');
          isPlayingPresetRef.current = false;
          setIsPlayingVRMA(false);
        }
      });
    } else if (preset.idle) {
      // 바로 idle 애니메이션으로 (IDLE_REPEAT_COUNT회 반복)
      setInitialAnimationPhase('idle');
      console.log('[VRMCharacter] Starting idle animation:', preset.idle);
      await handlePlayAnimation(preset.idle, true, () => {
        console.log('[VRMCharacter] Idle animation completed');
        setInitialAnimationPhase('complete');
        isPlayingPresetRef.current = false;
        setIsPlayingVRMA(false);
      }, IDLE_REPEAT_COUNT);
    } else {
      setInitialAnimationPhase('complete');
      isPlayingPresetRef.current = false;
    }
  }, [loadedVRM, animationPreset, trackingMode, handlePlayAnimation]);

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

      // 'none' 프리셋 또는 pose 모드는 애니메이션 없음 - 즉시 Kalidokit으로 전환
      if (animationPreset === 'none' || trackingMode === 'pose') {
        isPlayingPresetRef.current = false;
        animationJustStartedRef.current = false;
        setIsPlayingVRMA(false);
        setInitialAnimationPhase('complete');
        console.log('[VRMCharacter] Skipping animation:', animationPreset === 'none' ? 'preset is none' : 'pose mode active');
        return;
      }

      // 다른 프리셋 + 애니메이션 모드는 즉시 상태 설정하여 Kalidokit/fadeOut 간섭 방지
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
  }, [animationPreset, trackingMode, loadedVRM, stopAnimation, startInitialAnimation]);

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
    // pose 모드에서는 VRMA 애니메이션 업데이트 스킵 (Kalidokit이 직접 제어)
    if (trackingMode !== 'pose') {
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
    }

    // VRM 업데이트 (표정 등) - 항상 실행
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
