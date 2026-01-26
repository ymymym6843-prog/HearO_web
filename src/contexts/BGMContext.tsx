/**
 * BGMContext - 전역 BGM 관리 Context
 *
 * 기능:
 * - 프롤로그(비주얼노벨)부터 BGM 재생
 * - 화면 전환 시 크로스페이드로 자연스러운 전환
 * - 라우트 변경에도 BGM 유지
 * - Web Audio API 기반 고품질 오디오
 */

'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { WorldviewType } from '@/types';

// ============================================
// Types
// ============================================

export type BGMTrack = 'prologue_bgm' | 'exercise_bgm';

interface BGMState {
  currentTrack: BGMTrack | null;
  worldview: WorldviewType | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
}

interface BGMContextValue {
  state: BGMState;
  /** BGM 즉시 재생 */
  playBGM: (worldview: WorldviewType, track: BGMTrack) => Promise<void>;
  /** 크로스페이드로 BGM 전환 (끊김 없음) */
  crossFadeTo: (worldview: WorldviewType, track: BGMTrack, duration?: number) => Promise<void>;
  /** 페이드아웃 후 정지 */
  fadeOut: (duration?: number) => Promise<void>;
  /** 즉시 정지 */
  stop: () => void;
  /** 볼륨 설정 (0~1) */
  setVolume: (volume: number) => void;
  /** 음소거 토글 */
  toggleMute: () => void;
  /** 일시정지 */
  pause: () => void;
  /** 재개 */
  resume: () => Promise<void>;
  /** AudioContext 초기화 (사용자 인터랙션 후 호출) */
  init: () => Promise<void>;
}

// ============================================
// Context
// ============================================

const BGMContext = createContext<BGMContextValue | null>(null);

// ============================================
// Provider Component
// ============================================

interface BGMProviderProps {
  children: ReactNode;
  /** 초기 볼륨 (0~1) */
  initialVolume?: number;
}

export function BGMProvider({ children, initialVolume = 0.5 }: BGMProviderProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<{
    source: AudioBufferSourceNode;
    gainNode: GainNode;
    track: BGMTrack;
    worldview: WorldviewType;
  } | null>(null);
  const audioBufferCache = useRef<Map<string, AudioBuffer>>(new Map());
  const isInitializedRef = useRef(false);

  const [state, setState] = useState<BGMState>({
    currentTrack: null,
    worldview: null,
    isPlaying: false,
    volume: initialVolume,
    isMuted: false,
  });

  // AudioContext 초기화 (사용자 인터랙션 필요)
  const init = useCallback(async (): Promise<void> => {
    if (isInitializedRef.current && audioContextRef.current) {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      return;
    }

    try {
      audioContextRef.current = new AudioContext();
      isInitializedRef.current = true;
      console.log('[BGM] AudioContext initialized');
    } catch (error) {
      console.error('[BGM] Failed to initialize AudioContext:', error);
    }
  }, []);

  // AudioContext 가져오기 (필요시 초기화)
  const getAudioContext = useCallback(async (): Promise<AudioContext | null> => {
    if (!audioContextRef.current) {
      await init();
    }

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (error) {
        console.warn('[BGM] Failed to resume AudioContext:', error);
      }
    }

    return audioContextRef.current;
  }, [init]);

  // 오디오 버퍼 로드 (캐싱)
  const loadAudioBuffer = useCallback(
    async (url: string): Promise<AudioBuffer | null> => {
      // 캐시 확인
      if (audioBufferCache.current.has(url)) {
        return audioBufferCache.current.get(url)!;
      }

      const ctx = await getAudioContext();
      if (!ctx) return null;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`[BGM] Failed to fetch: ${url}`);
          return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        audioBufferCache.current.set(url, audioBuffer);
        console.log(`[BGM] Loaded and cached: ${url}`);
        return audioBuffer;
      } catch (error) {
        console.warn(`[BGM] Failed to load audio: ${url}`, error);
        return null;
      }
    },
    [getAudioContext]
  );

  // BGM 즉시 재생
  const playBGM = useCallback(
    async (worldview: WorldviewType, track: BGMTrack) => {
      if (!worldview) {
        console.error('[BGM] invalid world=undefined, skip');
        return;
      }

      // 중복 요청 방지: 동일 (worldview, track) 재생 중이면 무시
      if (
        currentSourceRef.current?.track === track &&
        currentSourceRef.current?.worldview === worldview
      ) {
        console.log(`[BGM] Already playing ${worldview}/${track}, skip`);
        return;
      }

      const ctx = await getAudioContext();
      if (!ctx) {
        console.warn('[BGM] AudioContext not available');
        return;
      }

      const url = `/assets/sounds/${worldview}/${track}.wav`;
      console.log(`[BGM][play] world=${worldview} track=${track} url=${url}`);
      const buffer = await loadAudioBuffer(url);

      if (!buffer) {
        console.warn(`[BGM] Buffer not loaded for: ${url}`);
        return;
      }

      // 기존 BGM 정지
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.source.stop();
        } catch {
          /* ignore - already stopped */
        }
      }

      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();

      source.buffer = buffer;
      source.loop = true;
      gainNode.gain.value = state.isMuted ? 0 : state.volume;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);

      currentSourceRef.current = { source, gainNode, track, worldview };
      setState((prev) => ({
        ...prev,
        currentTrack: track,
        worldview,
        isPlaying: true,
      }));

      console.log(`[BGM] Playing: ${worldview}/${track}`);
    },
    [getAudioContext, loadAudioBuffer, state.volume, state.isMuted]
  );

  // 크로스페이드 전환 (끊김 없이)
  const crossFadeTo = useCallback(
    async (worldview: WorldviewType, track: BGMTrack, duration: number = 1500) => {
      if (!worldview) {
        console.error('[BGM] crossFadeTo: invalid world=undefined, skip');
        return;
      }

      // 같은 트랙이면 무시
      if (
        currentSourceRef.current?.track === track &&
        currentSourceRef.current?.worldview === worldview
      ) {
        return;
      }

      const ctx = await getAudioContext();
      if (!ctx) return;

      const url = `/assets/sounds/${worldview}/${track}.wav`;
      console.log(`[BGM][crossFade] world=${worldview} track=${track} url=${url}`);
      const buffer = await loadAudioBuffer(url);

      if (!buffer) return;

      // 새 소스 준비
      const newSource = ctx.createBufferSource();
      const newGainNode = ctx.createGain();

      newSource.buffer = buffer;
      newSource.loop = true;
      newGainNode.gain.value = 0; // 시작 볼륨 0

      newSource.connect(newGainNode);
      newGainNode.connect(ctx.destination);

      const now = ctx.currentTime;
      const fadeTime = duration / 1000;
      const targetVolume = state.isMuted ? 0 : state.volume;

      // 기존 BGM 페이드아웃
      if (currentSourceRef.current) {
        const oldGain = currentSourceRef.current.gainNode;
        const oldSource = currentSourceRef.current.source;

        oldGain.gain.setValueAtTime(oldGain.gain.value, now);
        oldGain.gain.linearRampToValueAtTime(0, now + fadeTime);

        // 페이드 완료 후 정지
        setTimeout(() => {
          try {
            oldSource.stop();
          } catch {
            /* ignore */
          }
        }, duration + 100);
      }

      // 새 BGM 페이드인
      newSource.start(0);
      newGainNode.gain.setValueAtTime(0, now);
      newGainNode.gain.linearRampToValueAtTime(targetVolume, now + fadeTime);

      currentSourceRef.current = { source: newSource, gainNode: newGainNode, track, worldview };
      setState((prev) => ({
        ...prev,
        currentTrack: track,
        worldview,
        isPlaying: true,
      }));

      console.log(`[BGM] Crossfade to: ${worldview}/${track} (${duration}ms)`);
    },
    [getAudioContext, loadAudioBuffer, state.volume, state.isMuted]
  );

  // 페이드아웃
  const fadeOut = useCallback(
    async (duration: number = 1000) => {
      if (!currentSourceRef.current || !audioContextRef.current) return;

      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      const fadeTime = duration / 1000;

      const { gainNode, source } = currentSourceRef.current;
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0, now + fadeTime);

      setTimeout(() => {
        try {
          source.stop();
        } catch {
          /* ignore */
        }
        currentSourceRef.current = null;
        setState((prev) => ({
          ...prev,
          currentTrack: null,
          worldview: null,
          isPlaying: false,
        }));
      }, duration + 100);

      console.log(`[BGM] Fading out (${duration}ms)`);
    },
    []
  );

  // 즉시 정지
  const stop = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.source.stop();
      } catch {
        /* ignore */
      }
      currentSourceRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      currentTrack: null,
      worldview: null,
      isPlaying: false,
    }));
    console.log('[BGM] Stopped');
  }, []);

  // 볼륨 설정
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));

    if (currentSourceRef.current && !state.isMuted) {
      currentSourceRef.current.gainNode.gain.value = clampedVolume;
    }

    setState((prev) => ({ ...prev, volume: clampedVolume }));
  }, [state.isMuted]);

  // 음소거 토글
  const toggleMute = useCallback(() => {
    setState((prev) => {
      const newMuted = !prev.isMuted;

      if (currentSourceRef.current) {
        currentSourceRef.current.gainNode.gain.value = newMuted ? 0 : prev.volume;
      }

      return { ...prev, isMuted: newMuted };
    });
  }, []);

  // 일시정지
  const pause = useCallback(() => {
    audioContextRef.current?.suspend();
    setState((prev) => ({ ...prev, isPlaying: false }));
    console.log('[BGM] Paused');
  }, []);

  // 재개
  const resume = useCallback(async () => {
    await audioContextRef.current?.resume();
    if (currentSourceRef.current) {
      setState((prev) => ({ ...prev, isPlaying: true }));
      console.log('[BGM] Resumed');
    }
  }, []);

  // 페이지 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.source.stop();
        } catch {
          /* ignore */
        }
      }
      audioContextRef.current?.close();
    };
  }, []);

  // 페이지 가시성 변경 시 처리 (탭 전환)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 탭이 비활성화되면 일시정지 (선택적)
        // pause();
      } else {
        // 탭이 활성화되면 재개
        if (currentSourceRef.current && audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const contextValue: BGMContextValue = {
    state,
    playBGM,
    crossFadeTo,
    fadeOut,
    stop,
    setVolume,
    toggleMute,
    pause,
    resume,
    init,
  };

  return <BGMContext.Provider value={contextValue}>{children}</BGMContext.Provider>;
}

// ============================================
// Hook
// ============================================

export function useBGM(): BGMContextValue {
  const context = useContext(BGMContext);
  if (!context) {
    throw new Error('useBGM must be used within a BGMProvider');
  }
  return context;
}

export default BGMContext;
