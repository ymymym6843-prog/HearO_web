/**
 * 세계관 상태 관리 스토어
 *
 * 세계관 식별자는 WorldviewType slug를 사용 (displayName과 분리).
 * 세계관 추가/이름 변경 시에도 데이터 호환성 유지.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorldviewType } from '@/types/vrm';

interface WorldState {
  // 현재 세계관
  currentWorldview: WorldviewType;

  // 방문한 세계관 (slug → boolean, O(1) 조회)
  visitedWorldviews: Partial<Record<WorldviewType, boolean>>;

  // 액션
  setWorldview: (worldview: WorldviewType) => void;
  markVisited: (worldview: WorldviewType) => void;
  isFirstVisit: (worldview: WorldviewType) => boolean;
}

export const useWorldStore = create<WorldState>()(
  persist(
    (set, get) => ({
      currentWorldview: 'fantasy',
      visitedWorldviews: {},

      setWorldview: (worldview) => set({ currentWorldview: worldview }),

      markVisited: (worldview) => {
        if (!get().visitedWorldviews[worldview]) {
          set((state) => ({
            visitedWorldviews: { ...state.visitedWorldviews, [worldview]: true },
          }));
        }
      },

      isFirstVisit: (worldview) => {
        return !get().visitedWorldviews[worldview];
      },
    }),
    {
      name: 'hearo-world-storage',
      version: 1,
      migrate: (persisted, version) => {
        try {
          const state = persisted as Record<string, unknown>;
          if (version === 0 || !version) {
            // v0 → v1: 배열 → Record 마이그레이션
            const oldArray = state.visitedWorldviews;
            if (Array.isArray(oldArray)) {
              const record: Partial<Record<WorldviewType, boolean>> = {};
              for (const wv of oldArray) {
                record[wv as WorldviewType] = true;
              }
              state.visitedWorldviews = record;
            }
          }
          return state as unknown as WorldState;
        } catch (err) {
          // 마이그레이션 실패 시 기본값으로 롤백 (앱 크래시 방지)
          console.error('[useWorldStore] Migration failed, resetting to defaults', err);
          const state = persisted as Record<string, unknown>;
          const safeWorldview = typeof state?.currentWorldview === 'string'
            ? state.currentWorldview as WorldviewType
            : 'fantasy';
          return { currentWorldview: safeWorldview, visitedWorldviews: {} } as unknown as WorldState;
        }
      },
    }
  )
);
