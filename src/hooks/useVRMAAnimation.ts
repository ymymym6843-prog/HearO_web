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
  loadAnimation: (url: string, name?: string, options?: LoadAnimationOptions) => Promise<void>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  fadeOut: (duration?: number) => void; // 부드러운 페이드아웃
  setLoop: (loop: boolean, repeatCount?: number) => void;

  // Mixer 관련
  getMixer: () => THREE.AnimationMixer | null;
  update: (deltaTime: number) => void;

  // 초기화
  initialize: (vrm: VRM) => void;
  dispose: () => void;
}

// 애니메이션 로드 옵션
export interface LoadAnimationOptions {
  crossFadeDuration?: number;  // 크로스페이드 시간 (초), 기본 0.5
  onFinished?: () => void;     // 애니메이션 완료 콜백 (루프가 아닌 경우)
}

// ============================================================================
// 메인 훅
// ============================================================================

// 기본 페이드아웃 시간 (초)
const DEFAULT_FADEOUT_DURATION = 0.6;
const DEFAULT_CROSSFADE_DURATION = 0.5;

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
  const previousActionRef = useRef<THREE.AnimationAction | null>(null); // 크로스페이드용
  const currentClipRef = useRef<THREE.AnimationClip | null>(null);
  const loaderRef = useRef<GLTFLoader | null>(null);
  const loopRef = useRef<boolean>(true);
  const repeatCountRef = useRef<number>(Infinity); // 반복 횟수 (기본: 무한)
  const fadeOutTimerRef = useRef<number | null>(null);
  const onFinishedCallbackRef = useRef<(() => void) | null>(null);
  const expectedActionRef = useRef<THREE.AnimationAction | null>(null); // 콜백 대기 중인 액션
  const animationStartTimeRef = useRef<number>(0); // 애니메이션 시작 시간

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

  // 애니메이션 종료 이벤트 핸들러 (initialize보다 먼저 정의)
  // THREE.AnimationMixer 'finished' 이벤트 타입
  const handleAnimationFinished = useCallback((event: { action: THREE.AnimationAction; direction: number }) => {
    const finishedAction = event.action as THREE.AnimationAction;
    const clip = finishedAction.getClip();
    const elapsed = (Date.now() - animationStartTimeRef.current) / 1000;

    console.log('[useVRMAAnimation] Animation finished event:', {
      clipName: clip.name,
      clipDuration: clip.duration.toFixed(2),
      elapsedTime: elapsed.toFixed(2),
      isExpectedAction: finishedAction === expectedActionRef.current,
    });

    // 콜백 대기 중인 액션이 아니면 무시 (크로스페이드 중 이전 액션의 이벤트 무시)
    if (finishedAction !== expectedActionRef.current) {
      console.log('[useVRMAAnimation] Ignoring finished event from non-expected action');
      return;
    }

    // 콜백 실행
    if (onFinishedCallbackRef.current) {
      const callback = onFinishedCallbackRef.current;
      onFinishedCallbackRef.current = null; // 1회만 실행
      expectedActionRef.current = null;
      console.log('[useVRMAAnimation] Executing onFinished callback');
      callback();
    }
  }, []);

  // VRM 모델 초기화 (mixer 생성)
  const initialize = useCallback((vrm: VRM) => {
    // 기존 mixer 정리
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current.removeEventListener('finished', handleAnimationFinished);
    }

    vrmRef.current = vrm;
    mixerRef.current = new THREE.AnimationMixer(vrm.scene);

    // 애니메이션 종료 이벤트 리스너 등록
    mixerRef.current.addEventListener('finished', handleAnimationFinished);

    console.log('[useVRMAAnimation] Initialized', { supported: isSupported });
  }, [isSupported, handleAnimationFinished]);

  // VRMA 파일 로드
  const loadAnimation = useCallback(async (
    url: string,
    name?: string,
    options?: LoadAnimationOptions
  ): Promise<void> => {
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

    const crossFadeDuration = options?.crossFadeDuration ?? DEFAULT_CROSSFADE_DURATION;

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

      console.log(`[useVRMAAnimation] Clip info:`, {
        name: clip.name,
        duration: clip.duration,
        tracks: clip.tracks.length,
      });

      // 기존 액션 캐시 제거 (새로운 액션 생성 보장)
      mixerRef.current!.uncacheClip(clip);

      // 새 애니메이션 액션 생성
      const newAction = mixerRef.current!.clipAction(clip);
      // ※ 루프 설정: repeatCountRef로 반복 횟수 제한 (유한하면 finished 이벤트 발생)
      if (loopRef.current) {
        newAction.setLoop(THREE.LoopRepeat, repeatCountRef.current);
      } else {
        newAction.setLoop(THREE.LoopOnce, 1);
      }
      newAction.clampWhenFinished = true; // 애니메이션 종료 시 마지막 프레임 유지
      newAction.timeScale = 1.0; // 정상 속도 보장

      // onFinished 콜백 저장
      // ※ 1회 재생(LoopOnce) 또는 유한 반복(LoopRepeat + repeatCount < Infinity)일 때
      //    THREE.AnimationMixer가 finished 이벤트를 발생시키므로 콜백 등록 가능
      const isFinite = !loopRef.current || repeatCountRef.current < Infinity;
      if (options?.onFinished && isFinite) {
        onFinishedCallbackRef.current = options.onFinished;
        expectedActionRef.current = newAction; // 이 액션이 끝날 때 콜백 실행
        console.log('[useVRMAAnimation] Callback registered for action, duration:', clip.duration, 'repeat:', repeatCountRef.current);
      } else {
        onFinishedCallbackRef.current = null;
        expectedActionRef.current = null;
      }

      // 이전 애니메이션 처리
      const hadPreviousAnimation = currentActionRef.current && currentActionRef.current.isRunning();

      if (hadPreviousAnimation) {
        console.log(`[useVRMAAnimation] CrossFading from previous animation over ${crossFadeDuration}s`);

        // 이전 액션 저장 (크로스페이드용)
        previousActionRef.current = currentActionRef.current;

        // 크로스페이드: 이전 액션을 fadeOut하면서 새 액션을 fadeIn
        // 새 액션은 play() 호출 시 시작됨 (여기서는 시작하지 않음)
      } else {
        // 기존 애니메이션이 없으면 정리
        if (currentActionRef.current) {
          currentActionRef.current.stop();
        }
        previousActionRef.current = null;
      }

      currentActionRef.current = newAction;

      const animName = name || url.split('/').pop()?.replace('.vrma', '') || 'unknown';
      setCurrentAnimation(animName);
      // isPlaying 상태는 play() 호출 시 설정 (크로스페이드 중에는 유지)
      if (!previousActionRef.current) {
        setIsPlaying(false);
      }
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
  const play = useCallback((crossFadeDuration: number = DEFAULT_CROSSFADE_DURATION) => {
    if (!currentActionRef.current) {
      console.warn('[useVRMAAnimation] No animation loaded');
      return;
    }

    const clip = currentActionRef.current.getClip();

    if (isPaused) {
      // 일시정지에서 재개
      currentActionRef.current.paused = false;
    } else if (previousActionRef.current) {
      // 크로스페이드: 이전 애니메이션에서 부드럽게 전환
      console.log('[useVRMAAnimation] Starting crossfade play');
      currentActionRef.current.reset();
      currentActionRef.current.setEffectiveWeight(1);
      currentActionRef.current.play();
      previousActionRef.current.crossFadeTo(currentActionRef.current, crossFadeDuration, false);
      previousActionRef.current = null; // 크로스페이드 시작 후 참조 해제
    } else {
      // 새로운 재생
      currentActionRef.current.reset();
      currentActionRef.current.play();
    }

    // 시작 시간 기록 (디버깅용)
    animationStartTimeRef.current = Date.now();

    setIsPlaying(true);
    setIsPaused(false);

    console.log('[useVRMAAnimation] Play:', {
      clipName: clip.name,
      duration: clip.duration.toFixed(2),
      loop: loopRef.current,
      timeScale: currentActionRef.current.timeScale,
      hasCrossfade: !!previousActionRef.current,
    });
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

    // 콜백 refs 정리 (stale callback 방지)
    onFinishedCallbackRef.current = null;
    expectedActionRef.current = null;

    // VRM을 바인드 포즈로 리셋
    if (vrmRef.current?.humanoid) {
      // VRM 1.0 humanoid의 resetNormalizedPose 메서드 (타입 정의에 없을 수 있음)
      const humanoid = vrmRef.current.humanoid as { resetNormalizedPose?: () => void };
      humanoid.resetNormalizedPose?.();
    }

    setIsPlaying(false);
    setIsPaused(false);
    setIsFadingOut(false);
    console.log('[useVRMAAnimation] Stopped');
  }, []);

  // 루프 설정
  // repeatCount: 반복 횟수 (기본: Infinity = 무한, 1~N = 유한 반복)
  // ※ 유한 반복 시 THREE.AnimationMixer가 finished 이벤트를 정상 발생시킴
  const setLoop = useCallback((loop: boolean, repeatCount: number = Infinity) => {
    loopRef.current = loop;
    repeatCountRef.current = repeatCount; // 다음 loadAnimation에서도 적용되도록 저장
    if (currentActionRef.current) {
      if (loop) {
        // 루프 모드: 지정된 횟수만큼 반복 (Infinity면 무한)
        currentActionRef.current.setLoop(THREE.LoopRepeat, repeatCount);
        console.log(`[useVRMAAnimation] Loop: ON (repeat ${repeatCount === Infinity ? '∞' : repeatCount} times)`);
      } else {
        // 1회 재생 모드
        currentActionRef.current.setLoop(THREE.LoopOnce, 1);
        console.log('[useVRMAAnimation] Loop: OFF (play once)');
      }
    }
  }, []);

  // Mixer 업데이트 (애니메이션 루프에서 호출)
  // 호출자(VRMCharacter)가 언제 호출할지 결정하므로, 내부에서는 mixer만 업데이트
  // 이전에는 isPlaying 체크가 있었지만, setState 비동기 문제로 제거
  const update = useCallback((deltaTime: number) => {
    if (mixerRef.current) {
      mixerRef.current.update(deltaTime);
    }
  }, []);

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

    if (previousActionRef.current) {
      previousActionRef.current.stop();
      previousActionRef.current = null;
    }

    if (mixerRef.current) {
      mixerRef.current.removeEventListener('finished', handleAnimationFinished);
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }

    currentClipRef.current = null;
    vrmRef.current = null;
    onFinishedCallbackRef.current = null;
    expectedActionRef.current = null;
    animationStartTimeRef.current = 0;

    setCurrentAnimation(null);
    setIsPlaying(false);
    setIsPaused(false);
    setIsFadingOut(false);
    setError(null);

    console.log('[useVRMAAnimation] Disposed');
  }, [handleAnimationFinished]);

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
