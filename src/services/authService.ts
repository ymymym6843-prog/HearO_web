/**
 * 인증 서비스
 * Supabase Auth 기반
 */

import { supabase } from '@/lib/supabase/client';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import type { Profile, ProfileInsert } from '@/types/database';
import { getAuthCallbackUrl, getPasswordResetUrl } from '@/constants/urls';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AuthService');

// 인증 상태 타입
export interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  error: AuthError | null;
}

// 로그인 옵션
export interface LoginOptions {
  email: string;
  password: string;
}

// 회원가입 옵션
export interface SignUpOptions {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
}

// OAuth 제공자
export type OAuthProvider = 'google' | 'kakao' | 'apple';

// 입력 검증 유틸리티
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function validateEmail(email: string): { valid: boolean; message?: string } {
  if (!email || email.trim() === '') {
    return { valid: false, message: '이메일을 입력해주세요.' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, message: '유효한 이메일 주소를 입력해주세요.' };
  }
  return { valid: true };
}

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password) {
    return { valid: false, message: '비밀번호를 입력해주세요.' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, message: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` };
  }
  return { valid: true };
}

class AuthService {
  /**
   * 이메일/비밀번호 로그인
   */
  async signIn({ email, password }: LoginOptions): Promise<{
    user: User | null;
    session: Session | null;
    error: AuthError | null;
  }> {
    // 입력 검증
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return {
        user: null,
        session: null,
        error: { message: emailValidation.message, status: 400 } as AuthError,
      };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return {
        user: null,
        session: null,
        error: { message: passwordValidation.message, status: 400 } as AuthError,
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    return {
      user: data.user,
      session: data.session,
      error,
    };
  }

  /**
   * 이메일/비밀번호 회원가입
   */
  async signUp({ email, password, username, fullName }: SignUpOptions): Promise<{
    user: User | null;
    session: Session | null;
    error: AuthError | null;
  }> {
    // 입력 검증
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return {
        user: null,
        session: null,
        error: { message: emailValidation.message, status: 400 } as AuthError,
      };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return {
        user: null,
        session: null,
        error: { message: passwordValidation.message, status: 400 } as AuthError,
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          username: username?.trim(),
          full_name: fullName?.trim(),
        },
      },
    });

    // 프로필 생성
    if (data.user && !error) {
      await this.createProfile({
        id: data.user.id,
        username,
        full_name: fullName,
      });
    }

    return {
      user: data.user,
      session: data.session,
      error,
    };
  }

  /**
   * OAuth 로그인
   */
  async signInWithOAuth(provider: OAuthProvider): Promise<{
    error: AuthError | null;
  }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getAuthCallbackUrl(),
        },
      });

      if (error) {
        logger.error(`OAuth 로그인 실패 (${provider})`, error);
      }

      return { error };
    } catch (err) {
      logger.error(`OAuth 로그인 예외 발생 (${provider})`, err);
      return {
        error: {
          message: 'OAuth 로그인 중 오류가 발생했습니다.',
          status: 500,
        } as AuthError,
      };
    }
  }

  /**
   * 로그아웃
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  /**
   * 현재 세션 가져오기
   */
  async getSession(): Promise<{
    session: Session | null;
    error: AuthError | null;
  }> {
    const { data, error } = await supabase.auth.getSession();
    return {
      session: data.session,
      error,
    };
  }

  /**
   * 현재 사용자 가져오기
   */
  async getUser(): Promise<{
    user: User | null;
    error: AuthError | null;
  }> {
    const { data, error } = await supabase.auth.getUser();
    return {
      user: data.user,
      error,
    };
  }

  /**
   * 비밀번호 재설정 이메일 발송
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordResetUrl(),
      });

      if (error) {
        logger.error('비밀번호 재설정 이메일 발송 실패', error);
      }

      return { error };
    } catch (err) {
      logger.error('비밀번호 재설정 예외 발생', err);
      return {
        error: {
          message: '비밀번호 재설정 요청 중 오류가 발생했습니다.',
          status: 500,
        } as AuthError,
      };
    }
  }

  /**
   * 비밀번호 업데이트
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  }

  /**
   * 프로필 생성
   */
  async createProfile(profile: ProfileInsert): Promise<{
    profile: Profile | null;
    error: Error | null;
  }> {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single();

    return {
      profile: data,
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * 프로필 조회
   */
  async getProfile(userId: string): Promise<{
    profile: Profile | null;
    error: Error | null;
  }> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    return {
      profile: data,
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * 프로필 업데이트
   */
  async updateProfile(
    userId: string,
    updates: Partial<Profile>
  ): Promise<{
    profile: Profile | null;
    error: Error | null;
  }> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    return {
      profile: data,
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * 인증 상태 변화 구독
   */
  onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null, session);
    });
  }
}

// 싱글톤 인스턴스
export const authService = new AuthService();
export default authService;
