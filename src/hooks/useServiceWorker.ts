/**
 * useServiceWorker - Service Worker 관리 훅
 *
 * 기능:
 * - SW 등록/업데이트
 * - 프리렌더링 파일 사전 캐싱
 * - 캐시 상태 조회
 */

import { useEffect, useState, useCallback } from 'react';

// ============================================
// Types
// ============================================

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isReady: boolean;
  updateAvailable: boolean;
  error: string | null;
}

interface PrecacheProgress {
  cached: number;
  failed: number;
  total: number;
  inProgress: boolean;
}

// ============================================
// Hook
// ============================================

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isReady: false,
    updateAvailable: false,
    error: null,
  });

  const [precacheProgress, setPrecacheProgress] = useState<PrecacheProgress>({
    cached: 0,
    failed: 0,
    total: 0,
    inProgress: false,
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // SW 등록
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // SW 지원 확인
    if (!('serviceWorker' in navigator)) {
      setState((prev) => ({ ...prev, isSupported: false }));
      return;
    }

    setState((prev) => ({ ...prev, isSupported: true }));

    // SW 등록
    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setRegistration(reg);
        setState((prev) => ({
          ...prev,
          isRegistered: true,
          isReady: !!reg.active,
        }));

        // 업데이트 감지
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState((prev) => ({ ...prev, updateAvailable: true }));
              }
            });
          }
        });

        // 활성화 대기
        if (reg.waiting) {
          setState((prev) => ({ ...prev, updateAvailable: true }));
        }

        // 준비 완료 대기
        if (!reg.active) {
          await navigator.serviceWorker.ready;
          setState((prev) => ({ ...prev, isReady: true }));
        }

        console.log('[useServiceWorker] Registered:', reg.scope);
      } catch (error) {
        console.error('[useServiceWorker] Registration failed:', error);
        setState((prev) => ({
          ...prev,
          error: (error as Error).message,
        }));
      }
    };

    registerSW();

    // 메시지 리스너
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {};

      if (type === 'PRECACHE_COMPLETE') {
        setPrecacheProgress({
          ...payload,
          inProgress: false,
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  /**
   * SW 업데이트 적용
   */
  const applyUpdate = useCallback(() => {
    if (!registration?.waiting) return;

    // 새 SW 활성화
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // 페이지 새로고침
    window.location.reload();
  }, [registration]);

  /**
   * 프리렌더링 파일 사전 캐싱
   */
  const precacheFiles = useCallback(
    (urls: string[]) => {
      if (!state.isReady || !navigator.serviceWorker.controller) {
        console.warn('[useServiceWorker] SW not ready');
        return;
      }

      setPrecacheProgress({
        cached: 0,
        failed: 0,
        total: urls.length,
        inProgress: true,
      });

      navigator.serviceWorker.controller.postMessage({
        type: 'PRECACHE_PRERENDER',
        payload: { urls },
      });
    },
    [state.isReady]
  );

  /**
   * 프리렌더링 캐시 초기화
   */
  const clearPrerenderCache = useCallback(() => {
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_PRERENDER_CACHE',
    });
  }, []);

  /**
   * 세계관별 TTS 파일 URL 생성
   */
  const getWorldviewTTSUrls = useCallback(
    (worldview: string, exercises: string[], grades: string[] = ['perfect', 'good', 'normal']): string[] => {
      const urls: string[] = [];

      for (const exercise of exercises) {
        for (const grade of grades) {
          urls.push(`/assets/prerendered/tts/${worldview}/${exercise}_${grade}.wav`);
        }
      }

      return urls;
    },
    []
  );

  return {
    ...state,
    precacheProgress,
    applyUpdate,
    precacheFiles,
    clearPrerenderCache,
    getWorldviewTTSUrls,
  };
}

export default useServiceWorker;
