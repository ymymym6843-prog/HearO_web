/**
 * 세계관별 테마 타입 정의
 *
 * 6개 세계관 각각의 고유한 디자인 시스템:
 * - Fantasy: 양피지 느낌, 마법 파티클
 * - Sports: 스코어보드, 모션 블러
 * - Idol: 네온사인, 하트 파티클
 * - SF: 홀로그램, 글리치 효과
 * - Spy: 기밀 문서, 지문 인식
 * - Zombie: 거친 질감, 노이즈 효과
 */

import type { WorldviewId } from '../constants/worldviews';

// ============================================
// 폰트 타입
// ============================================

export type FontFamily =
  | 'Galmuri11'       // Fantasy, Idol, Zombie (픽셀/레트로)
  | 'Black Han Sans'  // Sports (굵은 한글)
  | 'Orbitron'        // SF (기계적 영문)
  | 'Bebas Neue';     // Spy (타이틀 영문)

export interface FontConfig {
  /** 주요 폰트 */
  primary: FontFamily;
  /** 본문 폰트 (한글) */
  body: string;
  /** 타이틀 폰트 */
  title: string;
  /** 숫자/스코어 폰트 */
  numeric: string;
  /** Google Fonts import URL */
  googleFontsUrl?: string;
}

// ============================================
// 컬러 타입
// ============================================

export interface ColorPalette {
  /** 주요 색상 */
  primary: string;
  /** 보조 색상 */
  secondary: string;
  /** 강조 색상 */
  accent: string;
  /** 배경 색상 */
  background: string;
  /** 배경 보조 */
  backgroundSecondary: string;
  /** 텍스트 색상 */
  text: string;
  /** 텍스트 보조 */
  textSecondary: string;
  /** 테두리 색상 */
  border: string;
  /** 성공 색상 */
  success: string;
  /** 경고 색상 */
  warning: string;
  /** 에러 색상 */
  error: string;
  /** 글로우 색상 */
  glow: string;
  /** 파티클 색상 배열 */
  particles: string[];
}

// ============================================
// UI 스타일 타입
// ============================================

export type DialogueBoxStyle =
  | 'parchment'    // Fantasy: 양피지
  | 'scoreboard'   // Sports: 스코어보드
  | 'neon'         // Idol: 네온사인
  | 'hologram'     // SF: 홀로그램
  | 'classified'   // Spy: 기밀 문서
  | 'distressed';  // Zombie: 거친 질감

export type ParticleEffect =
  | 'sparkle'      // Fantasy: 반짝이는 마법
  | 'motion-blur'  // Sports: 모션 블러
  | 'hearts'       // Idol: 하트
  | 'digital'      // SF: 디지털 비트
  | 'smoke'        // Spy: 연기
  | 'blood';       // Zombie: 피 튀김

export type AnimationEffect =
  | 'fade'         // 기본 페이드
  | 'bounce'       // 바운스
  | 'glitch'       // SF: 글리치
  | 'flicker'      // Zombie: 깜빡임
  | 'scan'         // Spy: 스캔 라인
  | 'spotlight';   // Idol: 스포트라이트

export interface UIStyleConfig {
  /** 대화창 스타일 */
  dialogueBox: DialogueBoxStyle;
  /** 파티클 효과 */
  particleEffect: ParticleEffect;
  /** 애니메이션 효과 */
  animation: AnimationEffect;
  /** 테두리 반경 */
  borderRadius: string;
  /** 그림자 스타일 */
  boxShadow: string;
  /** 배경 필터 (blur 등) */
  backdropFilter: string;
  /** 텍스트 그림자 */
  textShadow: string;
  /** 버튼 스타일 */
  buttonStyle: 'solid' | 'outline' | 'gradient' | 'neon';
}

// ============================================
// 전체 테마 타입
// ============================================

export interface WorldviewTheme {
  /** 세계관 ID */
  id: WorldviewId;
  /** 세계관 이름 */
  name: string;
  /** 폰트 설정 */
  fonts: FontConfig;
  /** 컬러 팔레트 */
  colors: ColorPalette;
  /** UI 스타일 */
  ui: UIStyleConfig;
  /** CSS 변수 객체 */
  cssVariables: Record<string, string>;
}

// ============================================
// 테마 컨텍스트 타입
// ============================================

export interface ThemeContextValue {
  /** 현재 테마 */
  theme: WorldviewTheme;
  /** 테마 변경 */
  setTheme: (worldviewId: WorldviewId) => void;
  /** 현재 세계관 ID */
  worldviewId: WorldviewId;
  /** 테마 전환 중 여부 */
  isTransitioning: boolean;
}

// ============================================
// CSS 변수 헬퍼 타입
// ============================================

export type CSSVariableName =
  | '--theme-primary'
  | '--theme-secondary'
  | '--theme-accent'
  | '--theme-background'
  | '--theme-background-secondary'
  | '--theme-text'
  | '--theme-text-secondary'
  | '--theme-border'
  | '--theme-glow'
  | '--theme-font-primary'
  | '--theme-font-body'
  | '--theme-font-title'
  | '--theme-border-radius'
  | '--theme-box-shadow'
  | '--theme-text-shadow';

export default WorldviewTheme;
