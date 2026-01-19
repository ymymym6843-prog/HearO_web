/**
 * 3D 캐릭터 상태 관리 스토어
 * MediaPipe → VRM 애니메이션을 위한 포즈 데이터 관리
 */

import { create } from 'zustand';
import type { VRM } from '@pixiv/three-vrm';
import type { Landmark } from '@/types/pose';
import type { VRMExpressionType } from '@/types/vrm';

// 디버그용 프레임 카운터
let debugStoreFrameCount = 0;

interface CharacterState {
  // VRM 모델
  vrm: VRM | null;
  isLoaded: boolean;
  isAnimating: boolean;

  // 캘리브레이션 상태
  isCalibrating: boolean;
  isCalibrated: boolean;
  calibrationProgress: number; // 0~100
  baselinePose: Landmark[] | null; // T-pose 기준점

  // 미러링 설정
  mirrorMode: boolean;

  // 포즈 데이터 (MediaPipe에서 수신)
  poseLandmarks: Landmark[] | null;      // 2D 정규화 좌표
  worldLandmarks: Landmark[] | null;     // 3D 월드 좌표 (Kalidokit용)
  handLandmarks: {
    left: Landmark[] | null;
    right: Landmark[] | null;
  };

  // 표정
  currentExpression: VRMExpressionType;

  // 액션
  setVRM: (vrm: VRM | null) => void;
  setLoaded: (loaded: boolean) => void;
  setAnimating: (animating: boolean) => void;

  // 캘리브레이션 액션
  startCalibration: () => void;
  updateCalibrationProgress: (progress: number) => void;
  completeCalibration: (baselinePose: Landmark[]) => void;
  resetCalibration: () => void;
  setMirrorMode: (enabled: boolean) => void;

  setPoseLandmarks: (landmarks: Landmark[] | null, worldLandmarks?: Landmark[] | null) => void;
  setHandLandmarks: (side: 'left' | 'right', landmarks: Landmark[] | null) => void;
  clearLandmarks: () => void;

  setExpression: (expression: VRMExpressionType) => void;

  reset: () => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  // 초기 상태
  vrm: null,
  isLoaded: false,
  isAnimating: false,

  // 캘리브레이션 초기 상태
  isCalibrating: false,
  isCalibrated: false,
  calibrationProgress: 0,
  baselinePose: null,
  mirrorMode: true, // 기본적으로 미러링 활성화

  poseLandmarks: null,
  worldLandmarks: null,
  handLandmarks: {
    left: null,
    right: null,
  },
  currentExpression: 'neutral',

  // 액션
  setVRM: (vrm) => set({ vrm, isLoaded: vrm !== null }),

  setLoaded: (loaded) => set({ isLoaded: loaded }),

  setAnimating: (animating) => set({ isAnimating: animating }),

  // 캘리브레이션 액션
  startCalibration: () => set({
    isCalibrating: true,
    isCalibrated: false,
    calibrationProgress: 0,
    baselinePose: null,
  }),

  updateCalibrationProgress: (progress) => set({ calibrationProgress: progress }),

  completeCalibration: (baselinePose) => set({
    isCalibrating: false,
    isCalibrated: true,
    calibrationProgress: 100,
    baselinePose,
  }),

  resetCalibration: () => set({
    isCalibrating: false,
    isCalibrated: false,
    calibrationProgress: 0,
    baselinePose: null,
  }),

  setMirrorMode: (enabled) => set({ mirrorMode: enabled }),

  setPoseLandmarks: (landmarks, worldLandmarks) => {
    // 디버그: 스토어에 데이터가 올바르게 전달되는지 확인
    if (debugStoreFrameCount < 3) {
      console.log('[CharacterStore] setPoseLandmarks called',
        'landmarks:', landmarks?.length ?? 'null',
        'worldLandmarks:', worldLandmarks?.length ?? 'null'
      );
      debugStoreFrameCount++;
    }
    return set({
      poseLandmarks: landmarks,
      worldLandmarks: worldLandmarks ?? null,
    });
  },

  setHandLandmarks: (side, landmarks) => set((state) => ({
    handLandmarks: {
      ...state.handLandmarks,
      [side]: landmarks,
    },
  })),

  clearLandmarks: () => set({
    poseLandmarks: null,
    worldLandmarks: null,
    handLandmarks: { left: null, right: null },
  }),

  setExpression: (expression) => set({ currentExpression: expression }),

  reset: () => set({
    vrm: null,
    isLoaded: false,
    isAnimating: false,
    isCalibrating: false,
    isCalibrated: false,
    calibrationProgress: 0,
    baselinePose: null,
    mirrorMode: true,
    poseLandmarks: null,
    worldLandmarks: null,
    handLandmarks: { left: null, right: null },
    currentExpression: 'neutral',
  }),
}));
