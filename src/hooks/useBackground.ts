'use client';

/**
 * useBackground - 배경 이미지 관리 훅
 *
 * 기능:
 * - 세계관별 랜덤 배경 선택
 * - 사용자 배경 선호도 저장 (localStorage)
 * - 세션별 일관된 배경 유지
 * - 수동 배경 변경
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  WORLDVIEWS,
  PANORAMA_BG_COUNT,
  type WorldviewId,
} from '@/constants/worldviews';

// ============================================
// 타입 정의
// ============================================

export interface BackgroundPreference {
  worldviewId: WorldviewId;
  /** 선택된 배경 인덱스 (null이면 랜덤) */
  selectedIndex: number | null;
  /** 마지막 업데이트 시간 */
  updatedAt: number;
}

export interface UseBackgroundOptions {
  /** 세계관 ID */
  worldviewId: WorldviewId;
  /** 초기 배경 인덱스 (선택적) */
  initialIndex?: number;
  /** 세션별 일관된 배경 사용 여부 */
  useSessionSeed?: boolean;
  /** 사용자 선호도 저장 여부 */
  persistPreference?: boolean;
}

export interface UseBackgroundReturn {
  /** 현재 배경 이미지 URL */
  backgroundUrl: string;
  /** 현재 배경 인덱스 (0-19) */
  currentIndex: number;
  /** 전체 배경 이미지 목록 */
  allBackgrounds: string[];
  /** 배경 이미지 총 개수 */
  totalCount: number;
  /** 다음 배경으로 변경 */
  nextBackground: () => void;
  /** 이전 배경으로 변경 */
  prevBackground: () => void;
  /** 특정 인덱스의 배경으로 변경 */
  setBackground: (index: number) => void;
  /** 랜덤 배경으로 변경 */
  randomBackground: () => void;
  /** 사용자 선호도 초기화 (랜덤 모드로 전환) */
  resetPreference: () => void;
  /** 사용자가 직접 선택한 배경인지 여부 */
  isUserSelected: boolean;
}

// ============================================
// 상수
// ============================================

const STORAGE_KEY = 'hearo-background-preferences';

// ============================================
// 유틸리티
// ============================================

function getStoragePreferences(): Partial<Record<WorldviewId, BackgroundPreference>> {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveStoragePreference(worldviewId: WorldviewId, index: number | null): void {
  if (typeof window === 'undefined') return;

  try {
    const preferences = getStoragePreferences();
    preferences[worldviewId] = {
      worldviewId,
      selectedIndex: index,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // localStorage 오류 무시
  }
}

function getSessionSeed(): number {
  if (typeof window === 'undefined') return Date.now();

  const sessionKey = 'hearo-session-seed';
  let seed = sessionStorage.getItem(sessionKey);

  if (!seed) {
    seed = String(Date.now());
    sessionStorage.setItem(sessionKey, seed);
  }

  return parseInt(seed, 10);
}

// ============================================
// 메인 훅
// ============================================

export function useBackground({
  worldviewId,
  initialIndex,
  useSessionSeed = true,
  persistPreference = true,
}: UseBackgroundOptions): UseBackgroundReturn {
  // 세션 시드 (세션 동안 일관된 랜덤 배경)
  const sessionSeed = useMemo(() => getSessionSeed(), []);

  // 전체 배경 목록
  const allBackgrounds = useMemo(
    () => WORLDVIEWS[worldviewId].panoramaBgImages,
    [worldviewId]
  );

  // 초기 인덱스 결정
  const getInitialIndex = useCallback((): number => {
    // 1. 명시적 초기 인덱스
    if (initialIndex !== undefined) {
      return initialIndex;
    }

    // 2. 저장된 사용자 선호도
    if (persistPreference) {
      const preferences = getStoragePreferences();
      const pref = preferences[worldviewId];
      if (pref?.selectedIndex !== null && pref?.selectedIndex !== undefined) {
        return pref.selectedIndex;
      }
    }

    // 3. 세션 시드 기반 랜덤
    if (useSessionSeed) {
      return sessionSeed % PANORAMA_BG_COUNT;
    }

    // 4. 완전 랜덤
    return Math.floor(Math.random() * PANORAMA_BG_COUNT);
  }, [worldviewId, initialIndex, persistPreference, useSessionSeed, sessionSeed]);

  // 상태
  const [currentIndex, setCurrentIndex] = useState<number>(getInitialIndex);
  const [isUserSelected, setIsUserSelected] = useState<boolean>(() => {
    if (!persistPreference) return false;
    const preferences = getStoragePreferences();
    return preferences[worldviewId]?.selectedIndex !== null;
  });

  // 세계관 변경 시 인덱스 재설정
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentIndex(getInitialIndex());
    if (persistPreference) {
      const preferences = getStoragePreferences();
      setIsUserSelected(preferences[worldviewId]?.selectedIndex !== null);
    }
  }, [worldviewId, getInitialIndex, persistPreference]);

  // 현재 배경 URL
  const backgroundUrl = useMemo(
    () => allBackgrounds[currentIndex] || allBackgrounds[0],
    [allBackgrounds, currentIndex]
  );

  // 배경 변경 함수들
  const setBackground = useCallback(
    (index: number) => {
      const safeIndex = ((index % PANORAMA_BG_COUNT) + PANORAMA_BG_COUNT) % PANORAMA_BG_COUNT;
      setCurrentIndex(safeIndex);
      setIsUserSelected(true);

      if (persistPreference) {
        saveStoragePreference(worldviewId, safeIndex);
      }
    },
    [worldviewId, persistPreference]
  );

  const nextBackground = useCallback(() => {
    setBackground((currentIndex + 1) % PANORAMA_BG_COUNT);
  }, [currentIndex, setBackground]);

  const prevBackground = useCallback(() => {
    setBackground((currentIndex - 1 + PANORAMA_BG_COUNT) % PANORAMA_BG_COUNT);
  }, [currentIndex, setBackground]);

  const randomBackground = useCallback(() => {
    const newIndex = Math.floor(Math.random() * PANORAMA_BG_COUNT);
    setBackground(newIndex);
  }, [setBackground]);

  const resetPreference = useCallback(() => {
    setIsUserSelected(false);

    if (persistPreference) {
      saveStoragePreference(worldviewId, null);
    }

    // 세션 시드 기반으로 재설정
    const newIndex = useSessionSeed
      ? sessionSeed % PANORAMA_BG_COUNT
      : Math.floor(Math.random() * PANORAMA_BG_COUNT);
    setCurrentIndex(newIndex);
  }, [worldviewId, persistPreference, useSessionSeed, sessionSeed]);

  return {
    backgroundUrl,
    currentIndex,
    allBackgrounds,
    totalCount: PANORAMA_BG_COUNT,
    nextBackground,
    prevBackground,
    setBackground,
    randomBackground,
    resetPreference,
    isUserSelected,
  };
}

export default useBackground;
