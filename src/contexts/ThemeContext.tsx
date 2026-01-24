/**
 * ThemeContext - 세계관별 테마 관리
 *
 * 기능:
 * - 세계관에 따른 테마 자동 적용
 * - CSS 변수 동적 업데이트
 * - 테마 전환 애니메이션
 * - 폰트 프리로딩
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { WorldviewId } from '@/constants/worldviews';
import type { WorldviewTheme, ThemeContextValue } from '@/types/theme';
import {
  WORLDVIEW_THEMES,
  generateCSSVariables,
} from '@/constants/themes';

// ============================================
// Context
// ============================================

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ============================================
// Provider Props
// ============================================

interface ThemeProviderProps {
  children: ReactNode;
  /** 초기 세계관 ID */
  initialWorldview?: WorldviewId;
  /** 테마 전환 시 콜백 */
  onThemeChange?: (worldviewId: WorldviewId) => void;
}

// ============================================
// Provider Component
// ============================================

export function ThemeProvider({
  children,
  initialWorldview = 'fantasy',
  onThemeChange,
}: ThemeProviderProps) {
  const [worldviewId, setWorldviewId] = useState<WorldviewId>(initialWorldview);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [_fontsLoaded, setFontsLoaded] = useState(false);

  // 현재 테마
  const theme = useMemo<WorldviewTheme>(() => {
    return WORLDVIEW_THEMES[worldviewId];
  }, [worldviewId]);

  // CSS 변수 적용
  useEffect(() => {
    const cssVariables = generateCSSVariables(worldviewId);
    const root = document.documentElement;

    // CSS 변수 설정
    Object.entries(cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // 테마 클래스 설정
    const themeClasses = ['theme-fantasy', 'theme-sports', 'theme-idol', 'theme-sf', 'theme-zombie', 'theme-spy'];
    themeClasses.forEach((cls) => root.classList.remove(cls));
    root.classList.add(`theme-${worldviewId}`);

    console.log(`[ThemeProvider] Applied theme: ${worldviewId}`);
  }, [worldviewId]);

  // 폰트 프리로딩
  useEffect(() => {
    const loadFonts = async () => {
      try {
        // document.fonts API 사용
        if ('fonts' in document) {
          await document.fonts.ready;
          setFontsLoaded(true);
          console.log('[ThemeProvider] Fonts loaded');
        }
      } catch (error) {
        console.warn('[ThemeProvider] Font loading failed:', error);
        setFontsLoaded(true); // 실패해도 계속 진행
      }
    };

    loadFonts();
  }, []);

  // 테마 변경 함수
  const setTheme = useCallback(
    (newWorldviewId: WorldviewId) => {
      if (newWorldviewId === worldviewId) return;

      setIsTransitioning(true);

      // 전환 애니메이션 시작
      requestAnimationFrame(() => {
        setWorldviewId(newWorldviewId);
        onThemeChange?.(newWorldviewId);

        // 전환 완료
        setTimeout(() => {
          setIsTransitioning(false);
        }, 300); // CSS transition 시간과 맞춤
      });
    },
    [worldviewId, onThemeChange]
  );

  // Context 값
  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      worldviewId,
      isTransitioning,
    }),
    [theme, setTheme, worldviewId, isTransitioning]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {/* 테마 전환 오버레이 */}
      {isTransitioning && (
        <div
          className="fixed inset-0 z-[9999] pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${theme.colors.primary}20, transparent)`,
            animation: 'fade-in 0.3s ease-out',
          }}
        />
      )}
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

// ============================================
// 유틸리티 훅
// ============================================

/**
 * 현재 테마의 특정 색상 반환
 * particles는 string[]이므로 별도 처리 필요
 */
export function useThemeColor<K extends keyof WorldviewTheme['colors']>(
  colorKey: K
): WorldviewTheme['colors'][K] {
  const { theme } = useTheme();
  return theme.colors[colorKey];
}

/**
 * 현재 테마의 폰트 설정 반환
 */
export function useThemeFont() {
  const { theme } = useTheme();
  return theme.fonts;
}

/**
 * 현재 테마의 UI 스타일 반환
 */
export function useThemeUI() {
  const { theme } = useTheme();
  return theme.ui;
}

/**
 * 대화창 스타일 클래스 반환
 */
export function useDialogueBoxClass(): string {
  const { theme } = useTheme();

  const dialogueClassMap: Record<string, string> = {
    parchment: 'dialogue-parchment',
    scoreboard: 'dialogue-scoreboard',
    neon: 'dialogue-neon',
    hologram: 'dialogue-hologram',
    classified: 'dialogue-classified',
    distressed: 'dialogue-distressed',
  };

  return dialogueClassMap[theme.ui.dialogueBox] || '';
}

/**
 * 버튼 스타일 클래스 반환
 */
export function useButtonClass(): string {
  const { worldviewId } = useTheme();

  const buttonClassMap: Record<WorldviewId, string> = {
    fantasy: 'btn-fantasy',
    sports: 'btn-sports',
    idol: 'btn-idol',
    sf: 'btn-sf',
    zombie: 'btn-zombie',
    spy: 'btn-spy',
  };

  return buttonClassMap[worldviewId];
}

/**
 * 애니메이션 클래스 반환
 */
export function useAnimationClass(): string {
  const { theme } = useTheme();

  const animationClassMap: Record<string, string> = {
    fade: 'animate-fade-in',
    bounce: 'animate-bounce',
    glitch: 'animate-glitch',
    flicker: 'animate-flicker',
    scan: 'scan-line',
    spotlight: 'animate-spotlight',
  };

  return animationClassMap[theme.ui.animation] || 'animate-fade-in';
}

export default ThemeProvider;
