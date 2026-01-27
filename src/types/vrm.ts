/**
 * VRM 캐릭터 관련 타입 정의
 * Three.js + @pixiv/three-vrm 기반
 */

import type { VRM } from '@pixiv/three-vrm';

// VRM 모델 정보
export interface VRMModelInfo {
  id: string;
  name: string;
  worldview: WorldviewType;
  modelUrl: string;
  thumbnailUrl?: string;
  description?: string;
}

// 세계관 타입
export type WorldviewType =
  | "fantasy"    // 판타지
  | "sports"     // 스포츠
  | "idol"       // 아이돌
  | "sf"         // SF
  | "zombie"     // 좀비
  | "spy";       // 스파이

// VRM 표정 타입
export type VRMExpressionType =
  | "happy"
  | "sad"
  | "angry"
  | "surprised"
  | "neutral"
  | "relaxed";

// VRM 캐릭터 상태
export interface VRMCharacterState {
  vrm: VRM | null;
  isLoaded: boolean;
  isAnimating: boolean;
  currentExpression: VRMExpressionType;
  modelInfo: VRMModelInfo | null;
}

// Kalidokit 리깅 결과 타입 (MediaPipe → VRM 변환용)
export interface KalidokitRigResult {
  // 상체
  Spine?: { x: number; y: number; z: number };
  Chest?: { x: number; y: number; z: number };
  Neck?: { x: number; y: number; z: number };
  Head?: { x: number; y: number; z: number };

  // 팔
  LeftUpperArm?: { x: number; y: number; z: number };
  LeftLowerArm?: { x: number; y: number; z: number };
  LeftHand?: { x: number; y: number; z: number };
  RightUpperArm?: { x: number; y: number; z: number };
  RightLowerArm?: { x: number; y: number; z: number };
  RightHand?: { x: number; y: number; z: number };

  // 다리
  LeftUpperLeg?: { x: number; y: number; z: number };
  LeftLowerLeg?: { x: number; y: number; z: number };
  LeftFoot?: { x: number; y: number; z: number };
  RightUpperLeg?: { x: number; y: number; z: number };
  RightLowerLeg?: { x: number; y: number; z: number };
  RightFoot?: { x: number; y: number; z: number };

  // 힙
  Hips?: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  };
}

// 손가락 리깅 결과
export interface HandRigResult {
  LeftThumb?: { x: number; y: number; z: number }[];
  LeftIndex?: { x: number; y: number; z: number }[];
  LeftMiddle?: { x: number; y: number; z: number }[];
  LeftRing?: { x: number; y: number; z: number }[];
  LeftPinky?: { x: number; y: number; z: number }[];
  RightThumb?: { x: number; y: number; z: number }[];
  RightIndex?: { x: number; y: number; z: number }[];
  RightMiddle?: { x: number; y: number; z: number }[];
  RightRing?: { x: number; y: number; z: number }[];
  RightPinky?: { x: number; y: number; z: number }[];
}

// 세계관별 VRM 모델 매핑
export const WORLDVIEW_MODELS: Record<WorldviewType, VRMModelInfo> = {
  fantasy: {
    id: 'fantasy_female',
    name: '힐러 요정',
    worldview: 'fantasy',
    modelUrl: '/models/fantasy_female.vrm',
    description: '판타지 세계의 치유사'
  },
  sports: {
    id: 'sports_female',
    name: '피트니스 코치',
    worldview: 'sports',
    modelUrl: '/models/sports_female.vrm',
    description: '스포츠 트레이너'
  },
  idol: {
    id: 'idol_female',
    name: '응원 아이돌',
    worldview: 'idol',
    modelUrl: '/models/idol_female.vrm',
    description: '에너지 넘치는 아이돌'
  },
  sf: {
    id: 'sf_female',
    name: '의료 AI',
    worldview: 'sf',
    modelUrl: '/models/sf_female.vrm',
    description: '미래의 의료 AI'
  },
  zombie: {
    id: 'zombie_female',
    name: '생존 의료관',
    worldview: 'zombie',
    modelUrl: '/models/zombie_female.vrm',
    description: '좀비 세계의 생존 전문가'
  },
  spy: {
    id: 'spy_female',
    name: '비밀 요원',
    worldview: 'spy',
    modelUrl: '/models/spy_female.vrm',
    description: '비밀 스파이 요원'
  }
};
