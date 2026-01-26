/**
 * HearO 디자인 시스템 (SSOT - Single Source of Truth)
 * HearO-v2 프로젝트와 동일한 디자인 토큰 사용
 */

import type { WorldviewType } from '@/types/vrm';
import type { WorldviewTheme, FontConfig, ColorPalette, UIStyleConfig } from '@/types/theme';

// 브랜드 컬러
export const BRAND_COLORS = {
  primary: '#e94560',
  primaryLight: '#ff6b8a',
  primaryDark: '#c73e54',
} as const;

// 배경 컬러 (다크 모드 기준)
export const BACKGROUND_COLORS = {
  primary: '#0A0A0F',
  secondary: '#1A1A22',
  tertiary: '#2A2A35',
  hover: '#3A3A45',
  divider: '#374151',
} as const;

// 텍스트 컬러 (WCAG AA 준수)
export const TEXT_COLORS = {
  primary: '#FFFFFF',      // 대비율 21:1
  secondary: '#E5E7EB',    // 대비율 12:1
  tertiary: '#B8BFC9',     // 대비율 8:1
  hint: '#9CA3AF',         // 대비율 5.5:1
  disabled: '#7B8494',     // 대비율 4.5:1
} as const;

// 상태 컬러
export const STATE_COLORS = {
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

// 등급 컬러
export const GRADE_COLORS = {
  S: '#FFD700',
  A: '#FF6B6B',
  B: '#4ECDC4',
  C: '#45B7D1',
  D: '#96CEB4',
} as const;

// 성공률 컬러
export const SUCCESS_RATE_COLORS = {
  excellent: '#10B981',  // 90% 이상
  good: '#FBBF24',       // 70-89%
  average: '#F59E0B',    // 50-69%
  poor: '#EF4444',       // 50% 미만
} as const;

// 세계관별 컬러 (HearO-v2와 동일)
export const WORLDVIEW_COLORS: Record<
  WorldviewType,
  {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  }
> = {
  fantasy: {
    primary: '#8B5CF6',      // Purple
    secondary: '#A78BFA',
    accent: '#F59E0B',       // Amber
    background: '#1F1B2E',
    surface: '#2D2640',
    text: '#F5F3FF',
  },
  sports: {
    primary: '#FBBF24',      // Yellow (노란색)
    secondary: '#FCD34D',
    accent: '#F97316',       // Orange
    background: '#1C1917',
    surface: '#292524',
    text: '#FEF2F2',
  },
  idol: {
    primary: '#EC4899',      // Pink
    secondary: '#F472B6',
    accent: '#A855F7',       // Purple
    background: '#1F1625',
    surface: '#2D1B3D',
    text: '#FDF2F8',
  },
  sf: {
    primary: '#06B6D4',      // Cyan
    secondary: '#22D3EE',
    accent: '#3B82F6',       // Blue
    background: '#0F1419',
    surface: '#1A1F2E',
    text: '#ECFEFF',
  },
  zombie: {
    primary: '#84CC16',      // Lime
    secondary: '#A3E635',
    accent: '#EF4444',       // Red
    background: '#1A1A1A',
    surface: '#262626',
    text: '#F7FEE7',
  },
  spy: {
    primary: '#1F2937',      // Gray (Dark)
    secondary: '#374151',
    accent: '#DC2626',       // Red
    background: '#0A0A0A',
    surface: '#171717',
    text: '#F9FAFB',
  },
};

// 세계관 정보
export const WORLDVIEW_INFO: Record<
  WorldviewType,
  {
    name: string;
    koreanName: string;
    description: string;
    icon: string;
    available: boolean;
  }
> = {
  fantasy: {
    name: 'Fantasy',
    koreanName: '판타지',
    description: '마법과 모험의 세계',
    icon: 'sparkles',
    available: true,
  },
  sports: {
    name: 'Sports',
    koreanName: '스포츠',
    description: '열정과 도전의 세계',
    icon: 'trophy',
    available: true,
  },
  idol: {
    name: 'Idol',
    koreanName: '아이돌',
    description: '꿈과 스타의 세계',
    icon: 'star',
    available: true,
  },
  sf: {
    name: 'Sci-Fi',
    koreanName: 'SF',
    description: '미래와 기술의 세계',
    icon: 'rocket',
    available: false, // 개발 중
  },
  zombie: {
    name: 'Zombie',
    koreanName: '좀비',
    description: '생존과 영웅의 세계',
    icon: 'shield',
    available: false, // 개발 중
  },
  spy: {
    name: 'Spy',
    koreanName: '스파이',
    description: '첩보와 액션의 세계',
    icon: 'eye',
    available: false, // 개발 중
  },
};

// 디자인 토큰
export const DESIGN_TOKENS = {
  // 터치 타겟 (WCAG AA)
  touchTargets: {
    minimum: 44,
    comfortable: 48,
    large: 56,
    accessibility: 64,
  },

  // 타이포그래피
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 44,
    '6xl': 56,
  },

  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // 스페이싱
  spacing: {
    '2xs': 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
    '5xl': 64,
  },

  // 테두리 반경
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    full: 9999,
  },

  // 애니메이션
  animation: {
    durationInstant: 100,
    durationFast: 150,
    durationNormal: 250,
    durationSlow: 350,
  },

  // 그림자
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 2px 4px rgba(0, 0, 0, 0.1)',
    lg: '0 4px 8px rgba(0, 0, 0, 0.15)',
    xl: '0 8px 16px rgba(0, 0, 0, 0.2)',
  },

  // 대비율 (WCAG)
  contrastRatio: {
    minimum: 4.5,
    enhanced: 7.0,
  },
} as const;

// 버튼 사이즈
export const BUTTON_SIZES = {
  sm: {
    paddingY: 8,
    paddingX: 16,
    borderRadius: 8,
    minHeight: 36,
    fontSize: 14,
  },
  md: {
    paddingY: 12,
    paddingX: 24,
    borderRadius: 12,
    minHeight: 44,
    fontSize: 16,
  },
  lg: {
    paddingY: 16,
    paddingX: 32,
    borderRadius: 16,
    minHeight: 52,
    fontSize: 18,
  },
  xl: {
    paddingY: 18,
    paddingX: 32,
    borderRadius: 16,
    minHeight: 56,
    fontSize: 18,
  },
} as const;

// 로고 사이즈
export const LOGO_SIZES = {
  xs: { width: 40, height: 40 },
  sm: { width: 80, height: 80 },
  md: { width: 120, height: 120 },
  lg: { width: 180, height: 180 },
  xl: { width: 240, height: 240 },
} as const;

// 아이콘 사이즈
export const ICON_SIZES = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
} as const;

// 세계관별 스켈레톤 스타일 (HearO-v2와 동일)
export interface SkeletonStyle {
  boneColor: string;       // 골격선 색상
  jointColor: string;      // 관절 색상
  jointRadius: number;     // 관절 크기
  boneWidth: number;       // 골격선 두께
  emphasisColor?: string;  // 강조 색상 (운동 부위 하이라이트)
  glowColor?: string;      // 발광 효과 색상
  glowEffect?: boolean;    // 발광 효과 여부
}

export const SKELETON_STYLES: Record<WorldviewType, SkeletonStyle> = {
  fantasy: {
    boneColor: '#f06c7a',      // 붉은 핑크
    jointColor: '#f5949f',
    jointRadius: 8,
    boneWidth: 6,
    emphasisColor: '#e94560',
    glowColor: '#ff8a9b',
    glowEffect: true,
  },
  sports: {
    boneColor: '#ffe033',      // 골드 옐로우
    jointColor: '#ffeb80',
    jointRadius: 9,
    boneWidth: 7,              // 가장 두꺼운 라인
    emphasisColor: '#ffd700',
    glowColor: '#fff176',
    glowEffect: true,
  },
  idol: {
    boneColor: '#ff8ac7',      // 핫 핑크
    jointColor: '#ffadd6',
    jointRadius: 8,
    boneWidth: 6,
    emphasisColor: '#ff69b4',
    glowColor: '#ffb6d9',
    glowEffect: true,
  },
  sf: {
    boneColor: '#33ddff',      // 사이버 블루
    jointColor: '#80eaff',
    jointRadius: 7,
    boneWidth: 5,
    emphasisColor: '#00d4ff',
    glowColor: '#66e5ff',
    glowEffect: true,
  },
  zombie: {
    boneColor: '#6cc96c',      // 독성 그린
    jointColor: '#8fd98f',
    jointRadius: 8,
    boneWidth: 6,
    emphasisColor: '#4caf50',
    glowColor: '#90ee90',
    glowEffect: true,
  },
  spy: {
    boneColor: '#b34fc7',      // 스텔스 퍼플
    jointColor: '#c980d6',
    jointRadius: 6,
    boneWidth: 4,              // 가장 얇은 라인
    emphasisColor: '#9c27b0',
    glowColor: '#ce93d8',
    glowEffect: true,
  },
};

// 부위별 선 두께 배율 (HearO-v2와 동일)
export type BodyPart = 'head' | 'torso' | 'thigh' | 'calf' | 'upperArm' | 'forearm';

export const BODY_PART_WIDTH_MULTIPLIERS: Record<BodyPart, number> = {
  head: 1.5,      // 머리/목
  torso: 2.2,     // 몸통 (가장 두껍게)
  thigh: 1.6,     // 허벅지
  calf: 1.2,      // 종아리
  upperArm: 1.0,  // 상완 (기본)
  forearm: 0.9,   // 팔뚝
};

// 연결선별 부위 매핑 (MediaPipe 연결 인덱스 기반)
export const CONNECTION_BODY_PARTS: Record<string, BodyPart> = {
  // 몸통
  '11-12': 'torso',  // 어깨-어깨
  '11-23': 'torso',  // 왼어깨-왼엉덩이
  '12-24': 'torso',  // 오른어깨-오른엉덩이
  '23-24': 'torso',  // 엉덩이-엉덩이
  // 허벅지
  '23-25': 'thigh',  // 왼엉덩이-왼무릎
  '24-26': 'thigh',  // 오른엉덩이-오른무릎
  // 종아리
  '25-27': 'calf',   // 왼무릎-왼발목
  '26-28': 'calf',   // 오른무릎-오른발목
  // 상완
  '11-13': 'upperArm', // 왼어깨-왼팔꿈치
  '12-14': 'upperArm', // 오른어깨-오른팔꿈치
  // 팔뚝
  '13-15': 'forearm',  // 왼팔꿈치-왼손목
  '14-16': 'forearm',  // 오른팔꿈치-오른손목
  // 머리/목
  '0-1': 'head',
  '0-4': 'head',
  '1-2': 'head',
  '2-3': 'head',
  '3-7': 'head',
  '4-5': 'head',
  '5-6': 'head',
  '6-8': 'head',
  '9-10': 'head',
};

// 기본 스켈레톤 스타일 (세계관 미지정 시)
export const DEFAULT_SKELETON_STYLE: SkeletonStyle = {
  boneColor: '#00FF00',
  jointColor: '#FFFF00',
  jointRadius: 7,
  boneWidth: 4,
};

// 세계관에 따른 스켈레톤 스타일 반환
export function getSkeletonStyle(worldview?: WorldviewType): SkeletonStyle {
  if (worldview && SKELETON_STYLES[worldview]) {
    return SKELETON_STYLES[worldview];
  }
  return DEFAULT_SKELETON_STYLE;
}

// 성공률에 따른 컬러 반환
export function getSuccessRateColor(rate: number): string {
  if (rate >= 90) return SUCCESS_RATE_COLORS.excellent;
  if (rate >= 70) return SUCCESS_RATE_COLORS.good;
  if (rate >= 50) return SUCCESS_RATE_COLORS.average;
  return SUCCESS_RATE_COLORS.poor;
}

// 등급에 따른 컬러 반환
export function getGradeColor(grade: keyof typeof GRADE_COLORS): string {
  return GRADE_COLORS[grade] || TEXT_COLORS.secondary;
}

// ============================================
// 세계관별 상세 테마 설정 (Master Prompt 기준)
// ============================================

/**
 * 세계관별 폰트 설정
 */
export const WORLDVIEW_FONTS: Record<WorldviewType, FontConfig> = {
  fantasy: {
    primary: 'Galmuri11',
    body: 'Galmuri11, "Noto Sans KR", sans-serif',
    title: 'Galmuri11, "Noto Sans KR", sans-serif',
    numeric: 'Galmuri11, monospace',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap',
  },
  sports: {
    primary: 'Black Han Sans',
    body: '"Noto Sans KR", sans-serif',
    title: '"Black Han Sans", "Noto Sans KR", sans-serif',
    numeric: '"Black Han Sans", "Bebas Neue", sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;700&display=swap',
  },
  idol: {
    primary: 'Galmuri11',
    body: 'Galmuri11, "Noto Sans KR", sans-serif',
    title: 'Galmuri11, "Noto Sans KR", sans-serif',
    numeric: 'Galmuri11, monospace',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap',
  },
  sf: {
    primary: 'Orbitron',
    body: '"Noto Sans KR", sans-serif',
    title: 'Orbitron, "Noto Sans KR", sans-serif',
    numeric: 'Orbitron, monospace',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Noto+Sans+KR:wght@400;700&display=swap',
  },
  zombie: {
    primary: 'Galmuri11',
    body: 'Galmuri11, "Noto Sans KR", sans-serif',
    title: 'Galmuri11, "Noto Sans KR", sans-serif',
    numeric: 'Galmuri11, monospace',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap',
  },
  spy: {
    primary: 'Bebas Neue',
    body: '"Noto Sans KR", sans-serif',
    title: '"Bebas Neue", "Noto Sans KR", sans-serif',
    numeric: '"Bebas Neue", monospace',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Sans+KR:wght@400;700&display=swap',
  },
};

/**
 * 세계관별 확장 컬러 팔레트 (Master Prompt 기준)
 */
export const WORLDVIEW_EXTENDED_COLORS: Record<WorldviewType, ColorPalette> = {
  fantasy: {
    primary: '#FFD700',           // Gold
    secondary: '#8B5CF6',         // Purple
    accent: '#F59E0B',            // Amber
    background: '#1F1B2E',
    backgroundSecondary: '#2D2640',
    text: '#F5F3FF',
    textSecondary: '#C4B5FD',
    border: '#4C3D6E',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    glow: 'rgba(255, 215, 0, 0.6)',
    particles: ['#FFD700', '#F59E0B', '#8B5CF6', '#F472B6'],
  },
  sports: {
    primary: '#00E5FF',           // Neon Blue
    secondary: '#FBBF24',         // Yellow
    accent: '#F97316',            // Orange
    background: '#1C1917',
    backgroundSecondary: '#292524',
    text: '#FFFFFF',
    textSecondary: '#FEF2F2',
    border: '#44403C',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    glow: 'rgba(0, 229, 255, 0.7)',
    particles: ['#00E5FF', '#FBBF24', '#F97316', '#FFFFFF'],
  },
  idol: {
    primary: '#FF69B4',           // Vivid Pink
    secondary: '#EC4899',
    accent: '#A855F7',            // Purple
    background: '#1F1625',
    backgroundSecondary: '#2D1B3D',
    text: '#FDF2F8',
    textSecondary: '#FBCFE8',
    border: '#4C1D4C',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    glow: 'rgba(255, 105, 180, 0.7)',
    particles: ['#FF69B4', '#FF1493', '#FF69B4', '#FFFFFF', '#FFB6C1'],
  },
  sf: {
    primary: '#00FFFF',           // Cyber Cyan
    secondary: '#06B6D4',
    accent: '#3B82F6',            // Blue
    background: '#0F1419',
    backgroundSecondary: '#1A1F2E',
    text: '#ECFEFF',
    textSecondary: '#A5F3FC',
    border: '#164E63',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    glow: 'rgba(0, 255, 255, 0.8)',
    particles: ['#00FFFF', '#00D4FF', '#3B82F6', '#10B981'],
  },
  zombie: {
    primary: '#8B0000',           // Blood Red
    secondary: '#84CC16',         // Lime (toxic)
    accent: '#EF4444',
    background: '#1A1A1A',
    backgroundSecondary: '#262626',
    text: '#F7FEE7',
    textSecondary: '#D9F99D',
    border: '#3F3F46',
    success: '#84CC16',
    warning: '#F59E0B',
    error: '#DC2626',
    glow: 'rgba(139, 0, 0, 0.6)',
    particles: ['#8B0000', '#DC2626', '#84CC16', '#4B5563'],
  },
  spy: {
    primary: '#9C27B0',           // Stealth Purple
    secondary: '#374151',         // Gray
    accent: '#DC2626',            // Red
    background: '#0A0A0A',
    backgroundSecondary: '#171717',
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    border: '#27272A',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#DC2626',
    glow: 'rgba(156, 39, 176, 0.5)',
    particles: ['#9C27B0', '#374151', '#DC2626', '#FFFFFF'],
  },
};

/**
 * 세계관별 UI 스타일 설정
 */
export const WORLDVIEW_UI_STYLES: Record<WorldviewType, UIStyleConfig> = {
  fantasy: {
    dialogueBox: 'parchment',
    particleEffect: 'sparkle',
    animation: 'fade',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3), inset 0 0 20px rgba(139, 92, 246, 0.1)',
    backdropFilter: 'blur(8px)',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
    buttonStyle: 'gradient',
  },
  sports: {
    dialogueBox: 'scoreboard',
    particleEffect: 'motion-blur',
    animation: 'bounce',
    borderRadius: '4px',
    boxShadow: '0 4px 20px rgba(0, 229, 255, 0.4), 0 0 40px rgba(0, 229, 255, 0.2)',
    backdropFilter: 'blur(4px)',
    textShadow: '2px 2px 0 #000, -2px -2px 0 #000',
    buttonStyle: 'solid',
  },
  idol: {
    dialogueBox: 'neon',
    particleEffect: 'hearts',
    animation: 'spotlight',
    borderRadius: '16px',
    boxShadow: '0 0 30px rgba(255, 105, 180, 0.5), 0 0 60px rgba(255, 105, 180, 0.3)',
    backdropFilter: 'blur(12px)',
    textShadow: '0 0 10px rgba(255, 105, 180, 0.8)',
    buttonStyle: 'neon',
  },
  sf: {
    dialogueBox: 'hologram',
    particleEffect: 'digital',
    animation: 'glitch',
    borderRadius: '2px',
    boxShadow: '0 0 20px rgba(0, 255, 255, 0.5), inset 0 0 30px rgba(0, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    textShadow: '0 0 5px #00FFFF, 0 0 10px #00FFFF',
    buttonStyle: 'outline',
  },
  zombie: {
    dialogueBox: 'distressed',
    particleEffect: 'blood',
    animation: 'flicker',
    borderRadius: '0px',
    boxShadow: '0 4px 20px rgba(139, 0, 0, 0.4)',
    backdropFilter: 'blur(2px)',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
    buttonStyle: 'solid',
  },
  spy: {
    dialogueBox: 'classified',
    particleEffect: 'smoke',
    animation: 'scan',
    borderRadius: '0px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(6px)',
    textShadow: 'none',
    buttonStyle: 'outline',
  },
};

/**
 * 통합 타이핑 설정 (v2 - 세계관 분리 제거)
 * 빠르고 리듬감 있는 타이핑으로 UX 몰입도 향상
 */
export const TYPING_CONFIG = {
  // 기본 속도 (ms per character) - 빠르고 리듬감 있게
  baseSpeed: 25,

  // 구두점별 추가 딜레이 (자연스러운 리듬)
  punctuationDelay: {
    '.': 150,    // 마침표
    '!': 150,    // 느낌표
    '?': 150,    // 물음표
    ',': 80,     // 쉼표
    ':': 80,     // 콜론
    ';': 80,     // 세미콜론
    '…': 200,   // 말줄임표
    '—': 100,   // 대시
    '\n': 100,  // 줄바꿈
  } as Record<string, number>,

  // 이징 함수 타입
  easing: 'easeOut' as 'linear' | 'easeOut' | 'easeInOut',

  // 가속 설정 (이징 적용 시)
  acceleration: {
    startMultiplier: 0.7,   // 초반 속도 배율 (빠름)
    endMultiplier: 1.1,     // 후반 속도 배율 (약간 느림)
  },
} as const;

/**
 * 세계관별 타이핑 속도 (ms per character)
 * @deprecated TYPING_CONFIG.baseSpeed를 사용하세요 - 통합 속도로 변경됨
 */
export const WORLDVIEW_TYPING_SPEEDS: Record<WorldviewType, number> = {
  fantasy: TYPING_CONFIG.baseSpeed,
  sports: TYPING_CONFIG.baseSpeed,
  idol: TYPING_CONFIG.baseSpeed,
  sf: TYPING_CONFIG.baseSpeed,
  zombie: TYPING_CONFIG.baseSpeed,
  spy: TYPING_CONFIG.baseSpeed,
};

/**
 * 세계관별 NPC 등장 딜레이 (ms)
 */
export const WORLDVIEW_NPC_ENTRANCE_DELAY: Record<WorldviewType, number> = {
  fantasy: 500,
  sports: 300,
  idol: 400,
  sf: 200,
  zombie: 800,
  spy: 600,
};

/**
 * CSS 변수 생성 함수
 */
export function generateCSSVariables(worldview: WorldviewType): Record<string, string> {
  const colors = WORLDVIEW_EXTENDED_COLORS[worldview];
  const fonts = WORLDVIEW_FONTS[worldview];
  const ui = WORLDVIEW_UI_STYLES[worldview];

  return {
    // 컬러
    '--theme-primary': colors.primary,
    '--theme-secondary': colors.secondary,
    '--theme-accent': colors.accent,
    '--theme-background': colors.background,
    '--theme-background-secondary': colors.backgroundSecondary,
    '--theme-text': colors.text,
    '--theme-text-secondary': colors.textSecondary,
    '--theme-border': colors.border,
    '--theme-glow': colors.glow,
    '--theme-success': colors.success,
    '--theme-warning': colors.warning,
    '--theme-error': colors.error,

    // 폰트
    '--theme-font-primary': fonts.primary,
    '--theme-font-body': fonts.body,
    '--theme-font-title': fonts.title,
    '--theme-font-numeric': fonts.numeric,

    // UI
    '--theme-border-radius': ui.borderRadius,
    '--theme-box-shadow': ui.boxShadow,
    '--theme-backdrop-filter': ui.backdropFilter,
    '--theme-text-shadow': ui.textShadow,
  };
}

/**
 * 전체 WorldviewTheme 객체 생성
 */
export function getWorldviewTheme(worldview: WorldviewType): WorldviewTheme {
  return {
    id: worldview,
    name: WORLDVIEW_INFO[worldview].koreanName,
    fonts: WORLDVIEW_FONTS[worldview],
    colors: WORLDVIEW_EXTENDED_COLORS[worldview],
    ui: WORLDVIEW_UI_STYLES[worldview],
    cssVariables: generateCSSVariables(worldview),
  };
}

/**
 * 모든 세계관 테마 맵
 */
export const WORLDVIEW_THEMES: Record<WorldviewType, WorldviewTheme> = {
  fantasy: getWorldviewTheme('fantasy'),
  sports: getWorldviewTheme('sports'),
  idol: getWorldviewTheme('idol'),
  sf: getWorldviewTheme('sf'),
  zombie: getWorldviewTheme('zombie'),
  spy: getWorldviewTheme('spy'),
};

/**
 * Google Fonts + Galmuri 로드 URL
 */
export const FONT_LOAD_URLS = {
  // Google Fonts
  googleFonts: 'https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Bebas+Neue&family=Orbitron:wght@400;700;900&family=Noto+Sans+KR:wght@400;500;700&display=swap',
  // Galmuri (직접 호스팅 필요 또는 CDN)
  galmuri: '/fonts/galmuri.css',
};

/**
 * 애니메이션 키프레임 정의 (CSS-in-JS용)
 */
export const THEME_ANIMATIONS = {
  glitch: `
    @keyframes glitch {
      0% { transform: translate(0); }
      20% { transform: translate(-2px, 2px); }
      40% { transform: translate(-2px, -2px); }
      60% { transform: translate(2px, 2px); }
      80% { transform: translate(2px, -2px); }
      100% { transform: translate(0); }
    }
  `,
  flicker: `
    @keyframes flicker {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
      75% { opacity: 0.9; }
      90% { opacity: 0.7; }
    }
  `,
  scan: `
    @keyframes scan {
      0% { background-position: 0 0; }
      100% { background-position: 0 100%; }
    }
  `,
  spotlight: `
    @keyframes spotlight {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.2); }
    }
  `,
  neonPulse: `
    @keyframes neonPulse {
      0%, 100% { box-shadow: 0 0 10px currentColor, 0 0 20px currentColor; }
      50% { box-shadow: 0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor; }
    }
  `,
  hologram: `
    @keyframes hologram {
      0% { opacity: 0.9; transform: translateY(0); }
      50% { opacity: 1; transform: translateY(-2px); }
      100% { opacity: 0.9; transform: translateY(0); }
    }
  `,
};
