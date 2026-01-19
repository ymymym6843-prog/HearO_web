/**
 * 세계관 상태 관리 스토어
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorldviewType } from '@/types/vrm';

interface WorldState {
  // 현재 세계관
  currentWorldview: WorldviewType;

  // 액션
  setWorldview: (worldview: WorldviewType) => void;
}

export const useWorldStore = create<WorldState>()(
  persist(
    (set) => ({
      currentWorldview: 'fantasy',

      setWorldview: (worldview) => set({ currentWorldview: worldview }),
    }),
    {
      name: 'hearo-world-storage',
    }
  )
);
