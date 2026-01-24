/**
 * 세계관 정의 (Web)
 * 6개의 세계관과 관련 설정
 */

export type WorldviewId = 'fantasy' | 'sf' | 'zombie' | 'sports' | 'spy' | 'idol';

export interface Worldview {
  id: WorldviewId;
  name: string;
  subtitle: string;
  role: string;
  description: string;
  theme: string;
  iconName: string;
  colors: {
    primary: string;
    secondary: string;
    gradient: string[];
  };
  cardImage: string;
  /** 기존 배경 (하위 호환) */
  bgImages: string[];
  /** 파노라마 배경 이미지 (20개) */
  panoramaBgImages: string[];
  heroImages: {
    male: string;
    female: string;
  };
  available: boolean;
}

// 배경 이미지 배열 생성 헬퍼 함수
function generateBgImages(worldview: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    `/images/worldviews/backgrounds/${worldview}/${worldview}${String(i + 1).padStart(2, '0')}.png`
  );
}

// 활성화된 세계관 (v1.0)
export const ACTIVE_WORLDVIEW_IDS: WorldviewId[] = ['fantasy', 'sports', 'idol'];

// 비활성화된 세계관 (Coming Soon)
export const INACTIVE_WORLDVIEW_IDS: WorldviewId[] = ['sf', 'zombie', 'spy'];

export const WORLDVIEWS: Record<WorldviewId, Worldview> = {
  fantasy: {
    id: 'fantasy',
    name: '판타지 왕국',
    subtitle: 'Kingdom of Eldoria',
    role: '왕국의 기사',
    description: '마법과 검, 용과 기사가 있는 중세 판타지 세계에서 전설의 영웅이 되세요.',
    theme: '마법과 검의 세계에서 왕국을 지키는 영웅',
    iconName: 'shield',
    colors: {
      primary: '#8B5CF6',      // Purple (HearO-v2 동일)
      secondary: '#A78BFA',
      gradient: ['#1F1B2E', '#2D2640'],
    },
    cardImage: '/images/worldviews/fantasy_card.jpg',
    bgImages: [
      '/images/worldviews/fantasy01_bg.jpg',
      '/images/worldviews/fantasy02_bg.jpg',
      '/images/worldviews/fantasy03_bg.jpg',
      '/images/worldviews/fantasy04_bg.jpg',
      '/images/worldviews/fantasy05_bg.jpg',
    ],
    panoramaBgImages: generateBgImages('fantasy', 20),
    heroImages: {
      male: '/images/worldviews/hero/fantasy_hero_male.png',
      female: '/images/worldviews/hero/fantasy_hero_female.png',
    },
    available: true,
  },
  sf: {
    id: 'sf',
    name: 'SF 우주',
    subtitle: 'Galactic Federation',
    role: '우주선 대원',
    description: '광활한 우주를 배경으로 우주 비행사가 되어 미지의 행성을 탐험하세요.',
    theme: '은하계를 항해하는 우주 탐험가',
    iconName: 'rocket',
    colors: {
      primary: '#06B6D4',      // Cyan (HearO-v2 동일)
      secondary: '#22D3EE',
      gradient: ['#0F1419', '#1A1F2E'],
    },
    cardImage: '/images/worldviews/sf_card.jpg',
    bgImages: [
      '/images/worldviews/sf01_bg.jpg',
      '/images/worldviews/sf02_bg.jpg',
      '/images/worldviews/sf03_bg.jpg',
      '/images/worldviews/sf04_bg.jpg',
      '/images/worldviews/sf05_bg.jpg',
    ],
    panoramaBgImages: generateBgImages('sf', 20),
    heroImages: {
      male: '/images/worldviews/hero/sf_hero_male.png',
      female: '/images/worldviews/hero/sf_hero_female.png',
    },
    available: false,
  },
  zombie: {
    id: 'zombie',
    name: '좀비 서바이벌',
    subtitle: 'Last Survivor',
    role: '생존자',
    description: '좀비 아포칼립스에서 살아남아 생존자들을 이끄는 리더가 되세요.',
    theme: '좀비 아포칼립스에서 살아남는 서바이버',
    iconName: 'skull',
    colors: {
      primary: '#84CC16',      // Lime (HearO-v2 동일)
      secondary: '#A3E635',
      gradient: ['#1A1A1A', '#262626'],
    },
    cardImage: '/images/worldviews/zombie_card.jpg',
    bgImages: [
      '/images/worldviews/zombie01_bg.jpg',
      '/images/worldviews/zombie02_bg.jpg',
      '/images/worldviews/zombie03_bg.jpg',
      '/images/worldviews/zombie04_bg.jpg',
      '/images/worldviews/zombie05_bg.jpg',
    ],
    panoramaBgImages: generateBgImages('zombie', 20),
    heroImages: {
      male: '/images/worldviews/hero/zombie_hero_male.png',
      female: '/images/worldviews/hero/zombie_hero_female.png',
    },
    available: false,
  },
  sports: {
    id: 'sports',
    name: '스포츠 스타',
    subtitle: 'Champions League',
    role: '챔피언',
    description: '전국 대회를 목표로 하는 운동선수가 되어 영광의 정상에 오르세요.',
    theme: '정상을 향해 도전하는 운동선수',
    iconName: 'trophy',
    colors: {
      primary: '#F97316',      // Orange (HearO-v2 동일)
      secondary: '#FB923C',
      gradient: ['#1C1917', '#292524'],
    },
    cardImage: '/images/worldviews/sports_card.jpg',
    bgImages: [
      '/images/worldviews/sports01_bg.jpg',
      '/images/worldviews/sports02_bg.jpg',
      '/images/worldviews/sports03_bg.jpg',
      '/images/worldviews/sports04_bg.jpg',
      '/images/worldviews/sports05_bg.jpg',
    ],
    panoramaBgImages: generateBgImages('sports', 20),
    heroImages: {
      male: '/images/worldviews/hero/sports_hero_male.png',
      female: '/images/worldviews/hero/sports_hero_female.png',
    },
    available: true,
  },
  spy: {
    id: 'spy',
    name: '스파이 미션',
    subtitle: 'Shadow Protocol',
    role: '비밀 요원',
    description: '비밀 조직의 요원이 되어 세계를 위협하는 음모를 막으세요.',
    theme: '세계를 구하는 첩보원',
    iconName: 'eye',
    colors: {
      primary: '#1F2937',      // Dark Gray (HearO-v2 동일)
      secondary: '#374151',
      gradient: ['#0A0A0A', '#171717'],
    },
    cardImage: '/images/worldviews/spy_card.jpg',
    bgImages: [
      '/images/worldviews/spy01_bg.jpg',
      '/images/worldviews/spy02_bg.jpg',
      '/images/worldviews/spy03_bg.jpg',
      '/images/worldviews/spy04_bg.jpg',
      '/images/worldviews/spy05_bg.jpg',
    ],
    panoramaBgImages: generateBgImages('spy', 20),
    heroImages: {
      male: '/images/worldviews/hero/spy_hero_male.png',
      female: '/images/worldviews/hero/spy_hero_female.png',
    },
    available: false,
  },
  idol: {
    id: 'idol',
    name: '아이돌 스타',
    subtitle: 'Rising Star',
    role: '연습생',
    description: '연습생에서 시작해 최고의 아이돌 그룹 멤버가 되세요.',
    theme: '스타를 꿈꾸는 아이돌 연습생',
    iconName: 'star',
    colors: {
      primary: '#EC4899',      // Pink (HearO-v2 동일)
      secondary: '#F472B6',
      gradient: ['#1F1625', '#2D1B3D'],
    },
    cardImage: '/images/worldviews/idol_card.jpg',
    bgImages: [
      '/images/worldviews/idol01_bg.jpg',
      '/images/worldviews/idol02_bg.jpg',
      '/images/worldviews/idol03_bg.jpg',
      '/images/worldviews/idol04_bg.jpg',
      '/images/worldviews/idol05_bg.jpg',
    ],
    panoramaBgImages: generateBgImages('idol', 20),
    heroImages: {
      male: '/images/worldviews/hero/idol_hero_male.png',
      female: '/images/worldviews/hero/idol_hero_female.png',
    },
    available: true,
  },
};

export const WORLDVIEW_IDS: WorldviewId[] = ['fantasy', 'sports', 'idol', 'sf', 'zombie', 'spy'];

export function isWorldviewActive(worldviewId: WorldviewId): boolean {
  return ACTIVE_WORLDVIEW_IDS.includes(worldviewId);
}

export function getActiveWorldviews(): Worldview[] {
  return ACTIVE_WORLDVIEW_IDS.map(id => WORLDVIEWS[id]);
}

export function getAllWorldviews(): Worldview[] {
  return WORLDVIEW_IDS.map(id => WORLDVIEWS[id]);
}

// ============================================
// 파노라마 배경 관련 유틸리티
// ============================================

/** 파노라마 배경 이미지 개수 */
export const PANORAMA_BG_COUNT = 20;

/**
 * 특정 세계관의 파노라마 배경 이미지 목록 가져오기
 */
export function getPanoramaBgImages(worldviewId: WorldviewId): string[] {
  return WORLDVIEWS[worldviewId].panoramaBgImages;
}

/**
 * 특정 세계관에서 랜덤 파노라마 배경 이미지 가져오기
 */
export function getRandomPanoramaBg(worldviewId: WorldviewId): string {
  const images = WORLDVIEWS[worldviewId].panoramaBgImages;
  const randomIndex = Math.floor(Math.random() * images.length);
  return images[randomIndex];
}

/**
 * 특정 세계관의 특정 인덱스 파노라마 배경 가져오기
 * @param worldviewId 세계관 ID
 * @param index 0-19 인덱스 (범위 초과 시 순환)
 */
export function getPanoramaBgByIndex(worldviewId: WorldviewId, index: number): string {
  const images = WORLDVIEWS[worldviewId].panoramaBgImages;
  const safeIndex = ((index % images.length) + images.length) % images.length;
  return images[safeIndex];
}

/**
 * 세션별 일관된 랜덤 배경 가져오기 (같은 세션에서는 같은 배경)
 * @param worldviewId 세계관 ID
 * @param sessionSeed 세션 시드 (예: Date.now() 또는 sessionId)
 */
export function getSeededRandomPanoramaBg(worldviewId: WorldviewId, sessionSeed: number): string {
  const images = WORLDVIEWS[worldviewId].panoramaBgImages;
  const seededIndex = sessionSeed % images.length;
  return images[seededIndex];
}
