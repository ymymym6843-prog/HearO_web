/**
 * Phase Store - 프로그램 워크플로우 상태 관리
 *
 * Phase 1: intro (2D NPC 대화)
 * Phase 2: transition (2D→3D 전환)
 * Phase 3: exercise (3D 운동)
 * Phase 4: epilogue (결과/스냅샷)
 */

import { create } from 'zustand';
import type {
  PhaseType,
  PhaseState,
  LayerVisibility,
  TransitionConfig,
  DialogueSequence,
  DialogueEntry,
  SnapshotResult,
  PhaseEvent,
} from '@/types/phase';
import {
  PHASE_LAYER_PRESETS,
  DEFAULT_TRANSITION_CONFIG,
} from '@/types/phase';

// ============================================
// Store 타입
// ============================================

interface PhaseStore extends PhaseState {
  // 레이어 가시성
  layers: LayerVisibility;

  // 대화 시퀀스
  dialogue: DialogueSequence | null;

  // 전환 설정
  transitionConfig: TransitionConfig;

  // 스냅샷 결과
  snapshot: SnapshotResult | null;

  // 이벤트 리스너
  eventListeners: Set<(event: PhaseEvent) => void>;

  // Actions
  setPhase: (phase: PhaseType) => void;
  startTransition: (targetPhase: PhaseType, config?: Partial<TransitionConfig>) => Promise<void>;
  updateTransitionProgress: (progress: number) => void;

  // 대화 관련
  startDialogue: (sequence: DialogueSequence) => void;
  advanceDialogue: () => DialogueEntry | null;
  skipDialogue: () => void;
  endDialogue: () => void;

  // 레이어 제어
  setLayerVisibility: (layer: keyof LayerVisibility, visible: boolean) => void;
  applyLayerPreset: (phase: PhaseType) => void;

  // 스냅샷
  setSnapshot: (result: SnapshotResult) => void;
  clearSnapshot: () => void;

  // 이벤트
  addEventListener: (listener: (event: PhaseEvent) => void) => () => void;
  emitEvent: (event: PhaseEvent) => void;

  // 리셋
  reset: () => void;
}

// ============================================
// 초기 상태
// ============================================

const initialState: Omit<PhaseStore, 'setPhase' | 'startTransition' | 'updateTransitionProgress' | 'startDialogue' | 'advanceDialogue' | 'skipDialogue' | 'endDialogue' | 'setLayerVisibility' | 'applyLayerPreset' | 'setSnapshot' | 'clearSnapshot' | 'addEventListener' | 'emitEvent' | 'reset'> = {
  current: 'intro',
  previous: null,
  transitionProgress: 0,
  isTransitioning: false,
  layers: PHASE_LAYER_PRESETS.intro,
  dialogue: null,
  transitionConfig: DEFAULT_TRANSITION_CONFIG,
  snapshot: null,
  eventListeners: new Set(),
};

// ============================================
// Store 생성
// ============================================

export const usePhaseStore = create<PhaseStore>((set, get) => ({
  ...initialState,

  /**
   * Phase 즉시 변경 (전환 효과 없이)
   */
  setPhase: (phase: PhaseType) => {
    const current = get().current;
    set({
      previous: current,
      current: phase,
      isTransitioning: false,
      transitionProgress: 1,
      layers: PHASE_LAYER_PRESETS[phase],
    });
  },

  /**
   * Phase 전환 (애니메이션 포함)
   */
  startTransition: async (targetPhase: PhaseType, config?: Partial<TransitionConfig>) => {
    const { current, transitionConfig, emitEvent } = get();

    // 이미 전환 중이면 무시
    if (get().isTransitioning) {
      console.warn('[PhaseStore] Transition already in progress');
      return;
    }

    const mergedConfig = { ...transitionConfig, ...config };

    set({
      previous: current,
      isTransitioning: true,
      transitionProgress: 0,
      transitionConfig: mergedConfig,
    });

    emitEvent({ type: 'TRANSITION_START' });

    // 전환 애니메이션 시뮬레이션
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / mergedConfig.duration, 1);

      set({ transitionProgress: progress });
      emitEvent({ type: 'TRANSITION_PROGRESS', progress });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 전환 완료
        set({
          current: targetPhase,
          isTransitioning: false,
          transitionProgress: 1,
          layers: PHASE_LAYER_PRESETS[targetPhase],
        });
        emitEvent({ type: 'TRANSITION_COMPLETE' });
      }
    };

    requestAnimationFrame(animate);
  },

  /**
   * 전환 진행률 수동 업데이트
   */
  updateTransitionProgress: (progress: number) => {
    set({ transitionProgress: Math.max(0, Math.min(1, progress)) });
  },

  /**
   * 대화 시퀀스 시작
   */
  startDialogue: (sequence: DialogueSequence) => {
    set({ dialogue: { ...sequence, currentIndex: 0 } });
    get().emitEvent({ type: 'DIALOGUE_START', sequence });
  },

  /**
   * 다음 대화로 진행
   */
  advanceDialogue: (): DialogueEntry | null => {
    const { dialogue, emitEvent } = get();
    if (!dialogue) return null;

    const nextIndex = dialogue.currentIndex + 1;

    if (nextIndex >= dialogue.entries.length) {
      // 대화 완료
      emitEvent({ type: 'DIALOGUE_COMPLETE' });
      return null;
    }

    set({
      dialogue: { ...dialogue, currentIndex: nextIndex },
    });
    emitEvent({ type: 'DIALOGUE_ADVANCE' });

    return dialogue.entries[nextIndex];
  },

  /**
   * 현재 대화 스킵 (전체 텍스트 즉시 표시)
   */
  skipDialogue: () => {
    // 외부에서 처리 (VN UI 컴포넌트에서)
  },

  /**
   * 대화 시퀀스 종료
   */
  endDialogue: () => {
    set({ dialogue: null });
  },

  /**
   * 개별 레이어 가시성 설정
   */
  setLayerVisibility: (layer: keyof LayerVisibility, visible: boolean) => {
    set((state) => ({
      layers: { ...state.layers, [layer]: visible },
    }));
  },

  /**
   * Phase 프리셋 적용
   */
  applyLayerPreset: (phase: PhaseType) => {
    set({ layers: PHASE_LAYER_PRESETS[phase] });
  },

  /**
   * 스냅샷 결과 저장
   */
  setSnapshot: (result: SnapshotResult) => {
    set({ snapshot: result });
    get().emitEvent({ type: 'EPILOGUE_START', result });
  },

  /**
   * 스냅샷 초기화
   */
  clearSnapshot: () => {
    set({ snapshot: null });
  },

  /**
   * 이벤트 리스너 등록
   */
  addEventListener: (listener: (event: PhaseEvent) => void) => {
    get().eventListeners.add(listener);
    return () => {
      get().eventListeners.delete(listener);
    };
  },

  /**
   * 이벤트 발생
   */
  emitEvent: (event: PhaseEvent) => {
    get().eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[PhaseStore] Event listener error:', error);
      }
    });
  },

  /**
   * 상태 초기화
   */
  reset: () => {
    set({
      ...initialState,
      eventListeners: get().eventListeners, // 리스너는 유지
    });
  },
}));

// ============================================
// Selector Hooks
// ============================================

export const useCurrentPhase = () => usePhaseStore((state) => state.current);
export const useIsTransitioning = () => usePhaseStore((state) => state.isTransitioning);
export const useTransitionProgress = () => usePhaseStore((state) => state.transitionProgress);
export const useLayerVisibility = () => usePhaseStore((state) => state.layers);
export const useDialogue = () => usePhaseStore((state) => state.dialogue);
export const useSnapshot = () => usePhaseStore((state) => state.snapshot);

export default usePhaseStore;
