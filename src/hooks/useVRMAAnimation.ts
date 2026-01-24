/**
 * useVRMAAnimation - VRMA 애니메이션 로딩 및 제어 훅
 * Utonics 벤치마킹: @pixiv/three-vrm-animation 기반
 *
 * 운동 가이드 애니메이션, 캐릭터 감정 표현 등에 활용
 */

import { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM } from '@pixiv/three-vrm';
import {
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
  VRMAnimation,
} from '@pixiv/three-vrm-animation';

// ============================================================================
// 타입 정의
// ============================================================================

export interface VRMAAnimationInfo {
  name: string;
  url: string;
  duration?: number;
  isDefault?: boolean;
}

export interface UseVRMAAnimationReturn {
  // 상태
  currentAnimation: string | null;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  isFadingOut: boolean; // 페이드아웃 중 여부
  error: Error | null;
  isSupported: boolean;

  // 액션
  loadAnimation: (url: string, name?: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  fadeOut: (duration?: number) => void; // 부드러운 페이드아웃
  setLoop: (loop: boolean) => void;

  // Mixer 관련
  getMixer: () => THREE.AnimationMixer | null;
  update: (deltaTime: number) => void;

  // 초기화
  initialize: (vrm: VRM) => void;
  dispose: () => void;
}

// ============================================================================
// 메인 훅
// ============================================================================

// 기본 페이드아웃 시간 (초)
const DEFAULT_FADEOUT_DURATION = 0.6;

export function useVRMAAnimation(): UseVRMAAnimationReturn {
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const vrmRef = useRef<VRM | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const currentClipRef = useRef<THREE.AnimationClip | null>(null);
  const loaderRef = useRef<GLTFLoader | null>(null);
  const loopRef = useRef<boolean>(true);
  const fadeOutTimerRef = useRef<number | null>(null);

  // VRMA 지원 여부 (패키지 설치됨)
  const isSupported = true;

  // GLTFLoader with VRMA plugin 초기화
  const getLoader = useCallback(() => {
    if (!isSupported) return null;

    if (!loaderRef.current) {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
      loaderRef.current = loader;
    }
    return loaderRef.current;
  }, [isSupported]);

  // VRM 모델 초기화 (mixer 생성)
  const initialize = useCallback((vrm: VRM) => {
    // 기존 mixer 정리
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
    }

    vrmRef.current = vrm;
    mixerRef.current = new THREE.AnimationMixer(vrm.scene);

    console.log('[useVRMAAnimation] Initialized', { supported: isSupported });
  }, [isSupported]);

  // VRMA 파일 로드
  const loadAnimation = useCallback(async (url: string, name?: string): Promise<void> => {
    if (!isSupported) {
      const err = new Error('VRMA not supported. Install @pixiv/three-vrm-animation.');
      setError(err);
      throw err;
    }

    if (!vrmRef.current || !mixerRef.current) {
      const err = new Error('VRM not initialized. Call initialize() first.');
      setError(err);
      throw err;
    }

    setIsLoading(true);
    setError(null);

    try {
      const loader = getLoader();
      if (!loader) throw new Error('Loader not available');

      const gltf = await new Promise<{ userData: { vrmAnimations?: VRMAnimation[] } }>((resolve, reject) => {
        loader.load(
          url,
          (gltf) => resolve(gltf),
          (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            console.log(`[useVRMAAnimation] Loading: ${percent.toFixed(1)}%`);
          },
          (error) => reject(error)
        );
      });

      const vrmAnimations = gltf.userData.vrmAnimations;
      if (!vrmAnimations || vrmAnimations.length === 0) {
        throw new Error('No VRM animations found in file');
      }

      // VRMAnimation을 THREE.AnimationClip으로 변환
      const clip = createVRMAnimationClip(vrmAnimations[0], vrmRef.current);
      currentClipRef.current = clip;

      // 기존 애니메이션 정지
      if (currentActionRef.current) {
        currentActionRef.current.stop();
      }

      // 새 애니메이션 액션 생성
      const action = mixerRef.current!.clipAction(clip);
      action.setLoop(loopRef.current ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      action.clampWhenFinished = true;
      currentActionRef.current = action;

      const animName = name || url.split('/').pop()?.replace('.vrma', '') || 'unknown';
      setCurrentAnimation(animName);
      setIsPlaying(false);
      setIsPaused(false);

      console.log(`[useVRMAAnimation] Loaded: ${animName} (duration: ${clip.duration.toFixed(2)}s)`);
    } catch (err) {
      console.error('[useVRMAAnimation] Load error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getLoader, isSupported]);

  // 재생
  const play = useCallback(() => {
    if (!currentActionRef.current) {
      console.warn('[useVRMAAnimation] No animation loaded');
      return;
    }

    if (isPaused) {
      currentActionRef.current.paused = false;
    } else {
      currentActionRef.current.reset();
      currentActionRef.current.play();
    }

    setIsPlaying(true);
    setIsPaused(false);
    console.log('[useVRMAAnimation] Play');
  }, [isPaused]);

  // 일시정지
  const pause = useCallback(() => {
    if (!currentActionRef.current) return;

    currentActionRef.current.paused = true;
    setIsPaused(true);
    console.log('[useVRMAAnimation] Paused');
  }, []);

  // 부드러운 페이드아웃 (애니메이션 → 자연스러운 포즈 전환)
  const fadeOut = useCallback((duration: number = DEFAULT_FADEOUT_DURATION) => {
    if (!currentActionRef.current || !mixerRef.current) {
      console.warn('[useVRMAAnimation] No animation to fade out');
      return;
    }

    // 이미 페이드아웃 중이면 스킵
    if (isFadingOut) return;

    setIsFadingOut(true);
    console.log(`[useVRMAAnimation] Fading out over ${duration}s`);

    // Three.js AnimationAction의 fadeOut 사용
    currentActionRef.current.fadeOut(duration);

    // 페이드아웃 완료 후 정리
    fadeOutTimerRef.current = window.setTimeout(() => {
      if (currentActionRef.current) {
        currentActionRef.current.stop();
      }
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }

      setIsPlaying(false);
      setIsPaused(false);
      setIsFadingOut(false);
      console.log('[useVRMAAnimation] Fade out complete');
    }, duration * 1000) as unknown as number;
  }, [isFadingOut]);

  // 즉시 정지 (바인드 포즈로 리셋) - 페이드아웃 없이
  const stop = useCallback(() => {
    // 페이드아웃 타이머 취소
    if (fadeOutTimerRef.current) {
      clearTimeout(fadeOutTimerRef.current);
      fadeOutTimerRef.current = null;
    }

    if (currentActionRef.current) {
      currentActionRef.current.stop();
    }

    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
    }

    // VRM을 바인드 포즈로 리셋
    if (vrmRef.current?.humanoid) {
      (vrmRef.current.humanoid as any).resetNormalizedPose?.();
    }

    setIsPlaying(false);
    setIsPaused(false);
    setIsFadingOut(false);
    console.log('[useVRMAAnimation] Stopped');
  }, []);

  // 루프 설정
  const setLoop = useCallback((loop: boolean) => {
    loopRef.current = loop;
    if (currentActionRef.current) {
      currentActionRef.current.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    }
    console.log(`[useVRMAAnimation] Loop: ${loop ? 'ON' : 'OFF'}`);
  }, []);

  // Mixer 업데이트 (애니메이션 루프에서 호출)
  // 페이드아웃 중에도 mixer 업데이트 필요 (부드러운 전환을 위해)
  const update = useCallback((deltaTime: number) => {
    if (mixerRef.current && (isPlaying || isFadingOut) && !isPaused) {
      mixerRef.current.update(deltaTime);
    }
  }, [isPlaying, isPaused, isFadingOut]);

  // Mixer 반환
  const getMixer = useCallback(() => mixerRef.current, []);

  // 정리
  const dispose = useCallback(() => {
    // 페이드아웃 타이머 취소
    if (fadeOutTimerRef.current) {
      clearTimeout(fadeOutTimerRef.current);
      fadeOutTimerRef.current = null;
    }

    if (currentActionRef.current) {
      currentActionRef.current.stop();
      currentActionRef.current = null;
    }

    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }

    currentClipRef.current = null;
    vrmRef.current = null;

    setCurrentAnimation(null);
    setIsPlaying(false);
    setIsPaused(false);
    setIsFadingOut(false);
    setError(null);

    console.log('[useVRMAAnimation] Disposed');
  }, []);

  return {
    currentAnimation,
    isPlaying,
    isPaused,
    isLoading,
    isFadingOut,
    error,
    isSupported,
    loadAnimation,
    play,
    pause,
    stop,
    fadeOut,
    setLoop,
    getMixer,
    update,
    initialize,
    dispose,
  };
}

// ============================================================================
// 기본 애니메이션 목록 (운동/재활 앱용)
// ============================================================================

export const DEFAULT_VRMA_ANIMATIONS: VRMAAnimationInfo[] = [
  // === Utonics 기본 애니메이션 ===
  // 감정 표현
  { name: 'Angry', url: '/animations/Angry.vrma', isDefault: true },
  { name: 'Blush', url: '/animations/Blush.vrma', isDefault: true },
  { name: 'Clapping', url: '/animations/Clapping.vrma', isDefault: true },
  { name: 'Sad', url: '/animations/Sad.vrma', isDefault: true },
  { name: 'Sleepy', url: '/animations/Sleepy.vrma', isDefault: true },
  { name: 'Surprised', url: '/animations/Surprised.vrma', isDefault: true },
  { name: 'Thinking', url: '/animations/Thinking.vrma', isDefault: true },

  // 인사/동작
  { name: 'Goodbye', url: '/animations/Goodbye.vrma', isDefault: true },
  { name: 'Jump', url: '/animations/Jump.vrma', isDefault: true },
  { name: 'LookAround', url: '/animations/LookAround.vrma', isDefault: true },
  { name: 'Relax', url: '/animations/Relax.vrma', isDefault: true },

  // === VRMA 모션팩 애니메이션 ===
  // 포즈/제스처
  { name: 'FullBody', url: '/animations/FullBody.vrma', isDefault: true },
  { name: 'Greeting', url: '/animations/Greeting.vrma', isDefault: true },
  { name: 'PeaceSign', url: '/animations/PeaceSign.vrma', isDefault: true },
  { name: 'Shoot', url: '/animations/Shoot.vrma', isDefault: true },
  { name: 'Spin', url: '/animations/Spin.vrma', isDefault: true },
  { name: 'ModelPose', url: '/animations/ModelPose.vrma', isDefault: true },

  // 운동 관련
  { name: 'Squat', url: '/animations/Squat.vrma', isDefault: true },

  // 상태 표현
  { name: 'Appearing', url: '/animations/Appearing.vrma', isDefault: true },
  { name: 'Liked', url: '/animations/Liked.vrma', isDefault: true },
  { name: 'Waiting', url: '/animations/Waiting.vrma', isDefault: true },
];

export default useVRMAAnimation;
