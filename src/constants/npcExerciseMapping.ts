/**
 * NPC 운동 매핑 시스템
 *
 * 운동 유형/카테고리에 따라 적합한 NPC를 매핑
 * 세계관별로 다른 NPC가 운동을 지도
 */

import type { WorldviewType } from '@/types/vrm';

// ============================================
// Types
// ============================================

/** 운동 카테고리 */
export type ExerciseCategory =
  | 'rehabilitation'  // 재활 운동
  | 'strength'        // 근력 운동
  | 'flexibility'     // 유연성 운동
  | 'cardio'          // 유산소 운동
  | 'balance'         // 균형 운동
  | 'hand'            // 손 재활
  | 'shoulder'        // 어깨 재활
  | 'general';        // 일반

/** NPC 역할 */
export type NPCRole =
  | 'main'            // 메인 코치/가이드
  | 'healer'          // 치료사/힐러
  | 'warrior'         // 전사/근력 전문가
  | 'supporter'       // 응원/서포터
  | 'expert';         // 전문가

// ============================================
// 세계관별 NPC 역할 매핑
// ============================================

/**
 * 세계관별 NPC 역할 정의
 * 각 역할에 해당하는 NPC ID
 */
export const NPC_ROLES: Record<WorldviewType, Record<NPCRole, string>> = {
  fantasy: {
    main: 'elderlin',      // 엘더린 - 메인 가이드
    healer: 'lunaria',     // 루나리아 - 힐러 (재활)
    warrior: 'kairon',     // 카이론 - 전사 (근력)
    supporter: 'serena',   // 세레나 - 성기사 (응원)
    expert: 'elderlin',    // 엘더린 - 전문 지식
  },
  sports: {
    main: 'coach_park',    // 박 코치 - 헤드 코치
    healer: 'physio_lee',  // 이 물리치료사 - 재활
    warrior: 'rival_kim',  // 김 선수 - 근력 도전
    supporter: 'jiyeon',   // 지연 - 팀 동료 응원
    expert: 'coach_park',  // 박 코치 - 기술 지도
  },
  idol: {
    main: 'manager_sujin', // 수진 - 매니저
    healer: 'vocal_trainer', // 보컬 트레이너 - 컨디션 관리
    warrior: 'haru',       // 하루 - 선배 아이돌
    supporter: 'manager_sujin', // 수진 - 응원
    expert: 'producer_jang', // 장 프로듀서 - 전문가
  },
  sf: {
    main: 'aria',          // 아리아 - AI 어시스턴트
    healer: 'dr_kim',      // 김 박사 - 의료
    warrior: 'captain_han', // 한 함장 - 훈련
    supporter: 'nova',     // 노바 - 기술 서포트
    expert: 'aria',        // 아리아 - 데이터 분석
  },
  spy: {
    main: 'handler_omega', // 오메가 - 핸들러
    healer: 'tech_genius', // Q - 장비/의료
    warrior: 'agent_shadow', // 섀도우 - 전투 훈련
    supporter: 'handler_omega', // 오메가 - 미션 지원
    expert: 'director',    // 국장 - 전략
  },
  zombie: {
    main: 'dr_lee',        // 이 박사 - 의사
    healer: 'dr_lee',      // 이 박사 - 의료
    warrior: 'jin',        // 진 - 전투원
    supporter: 'mina',     // 미나 - 정찰병 응원
    expert: 'chief_park',  // 박 대장 - 생존 전문가
  },
};

// ============================================
// 운동 카테고리별 NPC 역할 매핑
// ============================================

/**
 * 운동 카테고리에 적합한 NPC 역할
 */
export const EXERCISE_CATEGORY_ROLES: Record<ExerciseCategory, NPCRole> = {
  rehabilitation: 'healer',   // 재활 → 힐러/치료사
  strength: 'warrior',        // 근력 → 전사/코치
  flexibility: 'healer',      // 유연성 → 힐러
  cardio: 'warrior',          // 유산소 → 전사
  balance: 'main',            // 균형 → 메인
  hand: 'healer',             // 손 재활 → 힐러
  shoulder: 'healer',         // 어깨 재활 → 힐러
  general: 'main',            // 일반 → 메인
};

// ============================================
// 운동 ID → 카테고리 매핑
// ============================================

/**
 * 운동 ID에서 카테고리 추출
 */
export function getExerciseCategory(exerciseId: string): ExerciseCategory {
  const id = exerciseId.toLowerCase();

  // 손 재활
  if (id.includes('finger') || id.includes('wrist') || id.includes('grip') || id.includes('hand')) {
    return 'hand';
  }

  // 어깨 재활
  if (id.includes('shoulder')) {
    return 'shoulder';
  }

  // 근력 운동
  if (id.includes('squat') || id.includes('lunge') || id.includes('push') || id.includes('pull')) {
    return 'strength';
  }

  // 유연성
  if (id.includes('stretch') || id.includes('flexibility') || id.includes('yoga')) {
    return 'flexibility';
  }

  // 균형
  if (id.includes('balance') || id.includes('stand')) {
    return 'balance';
  }

  // 유산소
  if (id.includes('jump') || id.includes('run') || id.includes('cardio')) {
    return 'cardio';
  }

  // 재활 (ROM 관련)
  if (id.includes('rom') || id.includes('abduction') || id.includes('flexion') || id.includes('extension')) {
    return 'rehabilitation';
  }

  return 'general';
}

// ============================================
// 메인 API
// ============================================

/**
 * 운동에 적합한 NPC ID 반환
 *
 * @param worldview 세계관
 * @param exerciseId 운동 ID
 * @returns NPC ID
 */
export function getNPCForExercise(worldview: WorldviewType, exerciseId: string): string {
  const category = getExerciseCategory(exerciseId);
  const role = EXERCISE_CATEGORY_ROLES[category];
  return NPC_ROLES[worldview][role];
}

/**
 * 역할에 맞는 NPC ID 반환
 *
 * @param worldview 세계관
 * @param role NPC 역할
 * @returns NPC ID
 */
export function getNPCByRole(worldview: WorldviewType, role: NPCRole): string {
  return NPC_ROLES[worldview][role];
}

/**
 * 랜덤 응원 NPC 반환 (메인, 서포터 중 랜덤)
 */
export function getRandomEncouragerNPC(worldview: WorldviewType): string {
  const roles: NPCRole[] = ['main', 'supporter'];
  const randomRole = roles[Math.floor(Math.random() * roles.length)];
  return NPC_ROLES[worldview][randomRole];
}

// ============================================
// NPC별 격려 메시지 템플릿
// ============================================

export const NPC_ENCOURAGEMENT_MESSAGES: Record<WorldviewType, Record<string, string[]>> = {
  fantasy: {
    elderlin: [
      '마법의 힘이 느껴지는군!',
      '자네의 성장이 눈에 보이네.',
      '훌륭하네, 계속 정진하게!',
    ],
    lunaria: [
      '생명의 기운이 회복되고 있어요!',
      '부드럽게, 천천히... 잘하고 있어요.',
      '치유의 빛이 당신과 함께해요.',
    ],
    kairon: [
      '좋아! 전사의 기백이 느껴진다!',
      '더 강하게! 넌 할 수 있어!',
      '포기하지 마! 승리가 코앞이야!',
    ],
    serena: [
      '빛이 당신을 인도하고 있어요!',
      '믿음을 가지세요, 해낼 수 있어요!',
      '성스러운 축복이 함께합니다!',
    ],
  },
  sports: {
    coach_park: [
      '좋아! 그 자세 유지해!',
      '파이팅! 넌 최고의 선수야!',
      '완벽해! 계속 가자!',
    ],
    physio_lee: [
      '무리하지 말고 천천히.',
      '관절 각도 좋아요, 계속!',
      '회복이 빠르네요, 잘하고 있어요.',
    ],
    jiyeon: [
      '오빠/언니 화이팅!',
      '우와~ 대박! 잘한다!',
      '나도 따라할래! 같이 하자!',
    ],
  },
  idol: {
    manager_sujin: [
      '오늘도 컨디션 최고네요!',
      '무대 위에서 빛날 거예요!',
      '완벽해요, 그대로!',
    ],
    haru: [
      '선배로서 인정해! 잘하고 있어!',
      '그 느낌 좋아~ 계속!',
      '데뷔 때 생각나네, 열정 좋아!',
    ],
  },
  sf: {
    aria: [
      '생체 신호 안정적. 지속하세요.',
      '효율 95% 이상. 최적 상태입니다.',
      '목표 달성률 상승 중. 우수합니다.',
    ],
    dr_kim: [
      '신체 반응 양호합니다.',
      '과학적으로 완벽한 자세예요.',
      '데이터가 증명합니다, 잘하고 있어요.',
    ],
  },
  spy: {
    handler_omega: [
      '미션 진행 상황 양호.',
      '에이전트, 컨디션 유지 바랍니다.',
      '본부에서 주시하고 있습니다. 계속.',
    ],
    agent_shadow: [
      '좋은 움직임이야, 루키.',
      '그 정도면 현장에서 살아남겠어.',
      '훈련은 거짓말하지 않아. 계속해.',
    ],
  },
  zombie: {
    dr_lee: [
      '체력 회복 중입니다. 무리하지 마세요.',
      '좋아요, 생존 확률이 올라가고 있어요.',
      '면역력 강화에 도움이 됩니다.',
    ],
    jin: [
      '좋아! 좀비 때려잡을 수 있겠어!',
      '그 기세야! 살아남자!',
      '포기하면 좀비 밥이야! 힘내!',
    ],
  },
};

/**
 * NPC별 랜덤 격려 메시지 반환
 */
export function getRandomEncouragement(worldview: WorldviewType, npcId: string): string {
  const messages = NPC_ENCOURAGEMENT_MESSAGES[worldview]?.[npcId];
  if (!messages || messages.length === 0) {
    return '잘하고 있어요!';
  }
  return messages[Math.floor(Math.random() * messages.length)];
}
