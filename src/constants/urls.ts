/**
 * 애플리케이션 URL 상수
 */

// 인증 관련 URL
export const AUTH_URLS = {
  CALLBACK: '/auth/callback',
  RESET_PASSWORD: '/auth/reset-password',
  LOGIN: '/login',
  SIGNUP: '/signup',
} as const;

// 메인 페이지 URL
export const PAGE_URLS = {
  HOME: '/',
  EXERCISE: '/exercise',
  HISTORY: '/history',
  STATISTICS: '/statistics',
  ACHIEVEMENTS: '/achievements',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  CALIBRATION: '/calibration',
} as const;

// 외부 URL
export const EXTERNAL_URLS = {
  PRIVACY_POLICY: '/privacy',
  TERMS_OF_SERVICE: '/terms',
  SUPPORT: '/support',
} as const;

/**
 * 전체 URL 생성 헬퍼
 */
export function getFullUrl(path: string): string {
  if (typeof window === 'undefined') {
    return path;
  }
  return `${window.location.origin}${path}`;
}

/**
 * 인증 콜백 URL 생성
 */
export function getAuthCallbackUrl(): string {
  return getFullUrl(AUTH_URLS.CALLBACK);
}

/**
 * 비밀번호 재설정 URL 생성
 */
export function getPasswordResetUrl(): string {
  return getFullUrl(AUTH_URLS.RESET_PASSWORD);
}
