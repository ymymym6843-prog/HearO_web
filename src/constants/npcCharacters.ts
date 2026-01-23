/**
 * NPC 캐릭터 정의
 * 세계관별 NPC 캐릭터 정보
 */

import type { WorldviewType } from '@/types/vrm';

// NPC 감정 타입
export type NPCEmotion = 'normal' | 'happy' | 'serious' | 'surprised';

// NPC 캐릭터 정보
export interface NPCCharacter {
  id: string;
  name: string;
  title: string;
  color: string;
  description?: string;
}

// 세계관별 NPC 캐릭터 목록
export const NPC_CHARACTERS: Record<WorldviewType, Record<string, NPCCharacter>> = {
  fantasy: {
    elderlin: {
      id: 'elderlin',
      name: '엘더린',
      title: '대마법사',
      color: '#8B5CF6',
      description: '오래된 지혜를 가진 대마법사',
    },
    serena: {
      id: 'serena',
      name: '세레나',
      title: '성기사',
      color: '#F59E0B',
      description: '빛의 수호자',
    },
    kairon: {
      id: 'kairon',
      name: '카이론',
      title: '전사',
      color: '#EF4444',
      description: '용맹한 전사',
    },
    lunaria: {
      id: 'lunaria',
      name: '루나리아',
      title: '힐러',
      color: '#10B981',
      description: '생명의 치유사',
    },
    narrator: {
      id: 'narrator',
      name: '나레이터',
      title: '이야기꾼',
      color: '#6B7280',
    },
  },
  sports: {
    coach_park: {
      id: 'coach_park',
      name: '박 코치',
      title: '헤드 코치',
      color: '#F59E0B',
      description: '열정적인 헤드 코치',
    },
    jiyeon: {
      id: 'jiyeon',
      name: '지연',
      title: '팀 동료',
      color: '#EC4899',
      description: '밝은 성격의 팀 동료',
    },
    rival_kim: {
      id: 'rival_kim',
      name: '김 선수',
      title: '라이벌',
      color: '#EF4444',
      description: '강력한 라이벌',
    },
    physio_lee: {
      id: 'physio_lee',
      name: '이 물리치료사',
      title: '물리치료사',
      color: '#10B981',
      description: '팀 물리치료사',
    },
    narrator: {
      id: 'narrator',
      name: '나레이터',
      title: '해설자',
      color: '#6B7280',
    },
  },
  idol: {
    manager_sujin: {
      id: 'manager_sujin',
      name: '수진',
      title: '매니저',
      color: '#EC4899',
      description: '든든한 매니저',
    },
    haru: {
      id: 'haru',
      name: '하루',
      title: '선배 아이돌',
      color: '#A855F7',
      description: '인기 선배 아이돌',
    },
    producer_jang: {
      id: 'producer_jang',
      name: '장 프로듀서',
      title: '프로듀서',
      color: '#3B82F6',
      description: '유명 프로듀서',
    },
    vocal_trainer: {
      id: 'vocal_trainer',
      name: '보컬 트레이너',
      title: '보컬 트레이너',
      color: '#F59E0B',
      description: '실력있는 보컬 트레이너',
    },
    narrator: {
      id: 'narrator',
      name: '나레이터',
      title: '이야기꾼',
      color: '#6B7280',
    },
  },
  sf: {
    aria: {
      id: 'aria',
      name: '아리아',
      title: 'AI 어시스턴트',
      color: '#06B6D4',
      description: '고급 AI 시스템',
    },
    captain_han: {
      id: 'captain_han',
      name: '한 함장',
      title: '함장',
      color: '#3B82F6',
      description: '우주선 함장',
    },
    nova: {
      id: 'nova',
      name: '노바',
      title: '엔지니어',
      color: '#F59E0B',
      description: '천재 엔지니어',
    },
    dr_kim: {
      id: 'dr_kim',
      name: '김 박사',
      title: '과학자',
      color: '#10B981',
      description: '수석 과학자',
    },
    narrator: {
      id: 'narrator',
      name: '나레이터',
      title: '시스템',
      color: '#6B7280',
    },
  },
  spy: {
    handler_omega: {
      id: 'handler_omega',
      name: '오메가',
      title: '핸들러',
      color: '#6B7280',
      description: '비밀 지령 담당자',
    },
    agent_shadow: {
      id: 'agent_shadow',
      name: '섀도우',
      title: '선배 요원',
      color: '#1F2937',
      description: '베테랑 요원',
    },
    tech_genius: {
      id: 'tech_genius',
      name: 'Q',
      title: '기술 전문가',
      color: '#3B82F6',
      description: '장비 개발자',
    },
    director: {
      id: 'director',
      name: '국장',
      title: '국장',
      color: '#DC2626',
      description: '기관 최고 책임자',
    },
    narrator: {
      id: 'narrator',
      name: '나레이터',
      title: '보고서',
      color: '#6B7280',
    },
  },
  zombie: {
    dr_lee: {
      id: 'dr_lee',
      name: '이 박사',
      title: '의사',
      color: '#10B981',
      description: '생존자 캠프 의사',
    },
    jin: {
      id: 'jin',
      name: '진',
      title: '전투원',
      color: '#EF4444',
      description: '용감한 전투원',
    },
    chief_park: {
      id: 'chief_park',
      name: '박 대장',
      title: '대장',
      color: '#F59E0B',
      description: '생존자 그룹 리더',
    },
    mina: {
      id: 'mina',
      name: '미나',
      title: '정찰병',
      color: '#84CC16',
      description: '민첩한 정찰병',
    },
    narrator: {
      id: 'narrator',
      name: '나레이터',
      title: '생존 기록',
      color: '#6B7280',
    },
  },
};

// 세계관별 메인 NPC 반환
export function getMainNPC(worldview: WorldviewType): NPCCharacter {
  const mainNPCs: Record<WorldviewType, string> = {
    fantasy: 'elderlin',
    sports: 'coach_park',
    idol: 'manager_sujin',
    sf: 'aria',
    spy: 'handler_omega',
    zombie: 'dr_lee',
  };

  return NPC_CHARACTERS[worldview][mainNPCs[worldview]];
}

// NPC 이미지 경로 반환
export function getNPCImagePath(
  worldview: WorldviewType,
  npcId: string,
  emotion: NPCEmotion = 'normal'
): string {
  return `/assets/prerendered/npc/${worldview}/${npcId}/${emotion}.jpg`;
}

// 랜덤 NPC 반환 (나레이터 제외)
export function getRandomNPC(worldview: WorldviewType): NPCCharacter {
  const npcs = Object.values(NPC_CHARACTERS[worldview]).filter(
    (npc) => npc.id !== 'narrator'
  );
  return npcs[Math.floor(Math.random() * npcs.length)];
}
