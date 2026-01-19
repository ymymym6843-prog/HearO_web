/**
 * 인증 상태 관리 스토어
 * Zustand 기반
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';
import { authService } from '@/services/authService';

interface AuthState {
  // 상태
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // 액션
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, username?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 초기 상태
      user: null,
      profile: null,
      session: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      /**
       * 초기화 - 앱 시작 시 호출
       */
      initialize: async () => {
        if (get().isInitialized) return;

        set({ isLoading: true });

        try {
          // 현재 세션 확인
          const { session, error } = await authService.getSession();

          if (error) {
            throw error;
          }

          if (session?.user) {
            // 프로필 가져오기
            const { profile } = await authService.getProfile(session.user.id);

            set({
              user: session.user,
              session,
              profile,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            set({
              user: null,
              session: null,
              profile: null,
              isLoading: false,
              isInitialized: true,
            });
          }

          // 인증 상태 변화 구독
          authService.onAuthStateChange(async (user, session) => {
            if (user) {
              const { profile } = await authService.getProfile(user.id);
              set({ user, session, profile });
            } else {
              set({ user: null, session: null, profile: null });
            }
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '초기화 실패',
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      /**
       * 로그인
       */
      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const { user, session, error } = await authService.signIn({
            email,
            password,
          });

          if (error) {
            throw error;
          }

          if (user) {
            const { profile } = await authService.getProfile(user.id);
            set({ user, session, profile, isLoading: false });
            return true;
          }

          set({ isLoading: false });
          return false;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '로그인 실패',
            isLoading: false,
          });
          return false;
        }
      },

      /**
       * 회원가입
       */
      signUp: async (email: string, password: string, username?: string) => {
        set({ isLoading: true, error: null });

        try {
          const { user, session, error } = await authService.signUp({
            email,
            password,
            username,
          });

          if (error) {
            throw error;
          }

          if (user) {
            const { profile } = await authService.getProfile(user.id);
            set({ user, session, profile, isLoading: false });
            return true;
          }

          set({ isLoading: false });
          return false;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '회원가입 실패',
            isLoading: false,
          });
          return false;
        }
      },

      /**
       * 로그아웃
       */
      signOut: async () => {
        set({ isLoading: true });

        try {
          await authService.signOut();
          set({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '로그아웃 실패',
            isLoading: false,
          });
        }
      },

      /**
       * 프로필 새로고침
       */
      refreshProfile: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const { profile } = await authService.getProfile(user.id);
          set({ profile });
        } catch (error) {
          console.error('Failed to refresh profile:', error);
        }
      },

      /**
       * 프로필 업데이트
       */
      updateProfile: async (updates: Partial<Profile>) => {
        const { user } = get();
        if (!user) return false;

        set({ isLoading: true });

        try {
          const { profile, error } = await authService.updateProfile(user.id, updates);

          if (error) {
            throw error;
          }

          set({ profile, isLoading: false });
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '프로필 업데이트 실패',
            isLoading: false,
          });
          return false;
        }
      },

      /**
       * 에러 초기화
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'hearo-auth',
      partialize: (state) => ({
        // 세션 정보는 Supabase가 관리하므로 저장하지 않음
        // 프로필 정보만 캐시
        profile: state.profile,
      }),
    }
  )
);

// 셀렉터
export const selectUser = (state: AuthState) => state.user;
export const selectProfile = (state: AuthState) => state.profile;
export const selectIsAuthenticated = (state: AuthState) => !!state.user;
export const selectIsLoading = (state: AuthState) => state.isLoading;
