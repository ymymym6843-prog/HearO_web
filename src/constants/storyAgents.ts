/**
 * Story Agents Configuration - 세계관별 스토리 에이전트 설정
 * HearO-v2와 통일된 멘토 NPC, 테마, 음성 설정
 */

import type {
  WorldViewInfo,
  MentorNpcInfo,
  StoryAgentTheme,
  TTSVoiceConfig,
} from '@/types/story';
import type { WorldviewType } from '@/types/vrm';

// ============================================================
// 세계관별 멘토 NPC 설정
// HearO-v2와 동일한 멘토 캐릭터 사용
// ============================================================

export const WORLDVIEW_MENTORS: Record<WorldviewType, MentorNpcInfo> = {
  fantasy: {
    id: 'elderlin',
    name: '현자 엘더린',
    role: '왕국의 수석 현자',
    voiceStyle: '지혜롭고 따뜻한 목소리',
    personality: '온화하고 격려하는 성격, 고대 지식에 해박함',
  },
  sports: {
    id: 'coach_park',
    name: '코치 박',
    role: '재활 트레이너',
    voiceStyle: '열정적이고 힘찬 목소리',
    personality: '활기차고 동기부여하는 성격, 운동선수 출신',
  },
  idol: {
    id: 'manager_sujin',
    name: '매니저 수진',
    role: '아이돌 매니저',
    voiceStyle: '밝고 친근한 언니 목소리',
    personality: '친절하고 응원하는 성격, 섬세한 케어',
  },
  sf: {
    id: 'aria',
    name: 'AI 아리아',
    role: '의료 AI 시스템',
    voiceStyle: '차분하고 미래적인 음성',
    personality: '논리적이고 정확한 분석, 따뜻한 감성',
  },
  zombie: {
    id: 'dr_lee',
    name: '닥터 리',
    role: '생존자 캠프 의료관',
    voiceStyle: '긴박하면서도 든든한 목소리',
    personality: '냉철하지만 생존자를 돌보는 따뜻함',
  },
  spy: {
    id: 'handler_omega',
    name: '핸들러 오메가',
    role: '비밀 작전 지휘관',
    voiceStyle: '냉철하고 전문적인 음성',
    personality: '침착하고 정확한 지시, 에이전트를 신뢰함',
  },
};

// ============================================================
// 세계관별 테마 색상
// ============================================================

export const WORLDVIEW_THEMES: Record<WorldviewType, StoryAgentTheme> = {
  fantasy: {
    primary: '#8B5CF6',    // 보라색 (마법)
    secondary: '#A78BFA',
    accent: '#C4B5FD',
    background: '#1E1B2E',
  },
  sports: {
    primary: '#F97316',    // 오렌지 (에너지)
    secondary: '#FB923C',
    accent: '#FDBA74',
    background: '#1C1917',
  },
  idol: {
    primary: '#EC4899',    // 핑크 (화려함)
    secondary: '#F472B6',
    accent: '#F9A8D4',
    background: '#1F1B24',
  },
  sf: {
    primary: '#06B6D4',    // 시안 (미래)
    secondary: '#22D3EE',
    accent: '#67E8F9',
    background: '#0F172A',
  },
  zombie: {
    primary: '#84CC16',    // 라임 (생존)
    secondary: '#A3E635',
    accent: '#BEF264',
    background: '#1A1A1A',
  },
  spy: {
    primary: '#64748B',    // 슬레이트 (비밀)
    secondary: '#94A3B8',
    accent: '#CBD5E1',
    background: '#0F172A',
  },
};

// ============================================================
// 세계관 정보 통합
// ============================================================

export const WORLDVIEW_INFO: Record<WorldviewType, WorldViewInfo> = {
  fantasy: {
    id: 'fantasy',
    name: '아르카디아 왕국',
    iconName: 'sparkles',
    title: '마법 기사 수련생',
    description: '마법과 기사도가 공존하는 판타지 왕국에서 영웅이 되세요.',
    theme: WORLDVIEW_THEMES.fantasy,
    mentor: WORLDVIEW_MENTORS.fantasy,
  },
  sports: {
    id: 'sports',
    name: '챔피언 스포츠',
    iconName: 'trophy',
    title: '컴백 선수',
    description: '부상에서 회복하여 다시 필드로 돌아가는 선수의 이야기.',
    theme: WORLDVIEW_THEMES.sports,
    mentor: WORLDVIEW_MENTORS.sports,
  },
  idol: {
    id: 'idol',
    name: '스타라이트 엔터',
    iconName: 'star',
    title: '데뷔 연습생',
    description: '무대 위 스타를 꿈꾸는 연습생의 도전기.',
    theme: WORLDVIEW_THEMES.idol,
    mentor: WORLDVIEW_MENTORS.idol,
  },
  sf: {
    id: 'sf',
    name: '네오 의료 센터',
    iconName: 'cpu',
    title: '재활 파일럿',
    description: '미래 우주 정거장에서 AI와 함께하는 재활 프로그램.',
    theme: WORLDVIEW_THEMES.sf,
    mentor: WORLDVIEW_MENTORS.sf,
  },
  zombie: {
    id: 'zombie',
    name: '라스트 셸터',
    iconName: 'shield',
    title: '생존자',
    description: '좀비 아포칼립스에서 살아남기 위한 체력 훈련.',
    theme: WORLDVIEW_THEMES.zombie,
    mentor: WORLDVIEW_MENTORS.zombie,
  },
  spy: {
    id: 'spy',
    name: '섀도우 에이전시',
    iconName: 'eye',
    title: '복귀 요원',
    description: '부상 회복 후 현장 복귀를 준비하는 스파이.',
    theme: WORLDVIEW_THEMES.spy,
    mentor: WORLDVIEW_MENTORS.spy,
  },
};

// ============================================================
// TTS 음성 설정 (프리렌더링용)
// HearO-v2와 동일 - Gemini TTS 사용
// ============================================================

/** Gemini TTS 음성 스타일 */
export type GeminiVoiceStyle = 'neutral' | 'expressive' | 'dramatic' | 'gentle' | 'energetic';

/** Gemini TTS 설정 타입 */
export interface GeminiTTSConfig {
  worldviewId: WorldviewType;
  voiceName: string;         // Gemini 음성 이름 (Kore, Zubenelgenubi, etc.)
  characterName: string;     // 캐릭터 이름
  language: 'ko-KR';
  baseRate: number;          // 기본 속도
  gradeStyles: {
    perfect: { style: GeminiVoiceStyle; rate: number; description: string };
    good: { style: GeminiVoiceStyle; rate: number; description: string };
    normal: { style: GeminiVoiceStyle; rate: number; description: string };
  };
}

/** Gemini TTS 스타일 접두사 */
export const GEMINI_STYLE_PREFIXES: Record<GeminiVoiceStyle, string> = {
  neutral: '',
  expressive: '[Expressive, emotive tone] ',
  dramatic: '[Dramatic, theatrical delivery] ',
  gentle: '[Soft, gentle voice] ',
  energetic: '[Energetic, upbeat tone] ',
};

/** 세계관별 Gemini TTS 설정 (HearO-v2와 동일) */
export const GEMINI_TTS_CONFIGS: Record<WorldviewType, GeminiTTSConfig> = {
  fantasy: {
    worldviewId: 'fantasy',
    voiceName: 'Zubenelgenubi',  // 중후한 남성 음성
    characterName: '현자 엘더린',
    language: 'ko-KR',
    baseRate: 0.85,
    gradeStyles: {
      perfect: { style: 'dramatic', rate: 0.8, description: '위대한 영웅을 축하하는 장엄한 예언' },
      good: { style: 'gentle', rate: 0.85, description: '따뜻하게 격려하는 현자의 축복' },
      normal: { style: 'expressive', rate: 0.88, description: '희망을 전하는 자애로운 조언' },
    },
  },
  sports: {
    worldviewId: 'sports',
    voiceName: 'Algieba',  // 활기찬 남성 음성
    characterName: '코치 박',
    language: 'ko-KR',
    baseRate: 1.05,
    gradeStyles: {
      perfect: { style: 'energetic', rate: 1.1, description: '챔피언의 승리를 축하하는 환호' },
      good: { style: 'expressive', rate: 1.05, description: '성과를 인정하는 열정적 격려' },
      normal: { style: 'energetic', rate: 1.08, description: '다음 도전을 응원하는 파이팅' },
    },
  },
  idol: {
    worldviewId: 'idol',
    voiceName: 'Achernar',  // 밝은 여성 음성
    characterName: '매니저 수진',
    language: 'ko-KR',
    baseRate: 1.0,
    gradeStyles: {
      perfect: { style: 'expressive', rate: 1.05, description: '데뷔 성공을 축하하는 감격' },
      good: { style: 'gentle', rate: 1.0, description: '따뜻하게 칭찬하는 언니 톤' },
      normal: { style: 'expressive', rate: 1.02, description: '꿈을 응원하는 친근한 격려' },
    },
  },
  sf: {
    worldviewId: 'sf',
    voiceName: 'Autonoe',  // 차분한 여성 음성
    characterName: 'AI 아리아',
    language: 'ko-KR',
    baseRate: 1.05,
    gradeStyles: {
      perfect: { style: 'expressive', rate: 1.0, description: '감정을 배운 AI의 기쁨' },
      good: { style: 'neutral', rate: 1.05, description: '차분한 분석과 인정' },
      normal: { style: 'gentle', rate: 1.02, description: '인간적 따뜻함을 담은 격려' },
    },
  },
  zombie: {
    worldviewId: 'zombie',
    voiceName: 'Enceladus',  // 신뢰감 있는 남성 음성
    characterName: '닥터 리',
    language: 'ko-KR',
    baseRate: 1.08,
    gradeStyles: {
      perfect: { style: 'expressive', rate: 1.05, description: '생존 성공의 안도' },
      good: { style: 'neutral', rate: 1.08, description: '차분한 의료인 격려' },
      normal: { style: 'expressive', rate: 1.1, description: '희망을 전하는 생존자' },
    },
  },
  spy: {
    worldviewId: 'spy',
    voiceName: 'Charon',  // 낮고 차분한 남성 음성
    characterName: '핸들러 오메가',
    language: 'ko-KR',
    baseRate: 0.88,
    gradeStyles: {
      perfect: { style: 'dramatic', rate: 0.85, description: '임무 완수를 인정하는 절제된 칭찬' },
      good: { style: 'neutral', rate: 0.88, description: '냉철하지만 인정하는' },
      normal: { style: 'gentle', rate: 0.9, description: '다음 임무를 위한 격려' },
    },
  },
};

// 레거시 호환용 (기존 코드 지원)
export const TTS_VOICE_CONFIGS: Record<WorldviewType, TTSVoiceConfig> = {
  fantasy: {
    worldviewId: 'fantasy',
    voiceId: 'Zubenelgenubi',
    voiceName: '현자 엘더린',
    language: 'ko-KR',
    style: 'warm',
    pitch: 1.0,
    speed: 0.85,
    description: '지혜롭고 따뜻한 현자의 목소리 (Gemini TTS)',
  },
  sports: {
    worldviewId: 'sports',
    voiceId: 'Algieba',
    voiceName: '코치 박',
    language: 'ko-KR',
    style: 'energetic',
    pitch: 1.05,
    speed: 1.05,
    description: '열정적이고 힘찬 코치 목소리 (Gemini TTS)',
  },
  idol: {
    worldviewId: 'idol',
    voiceId: 'Achernar',
    voiceName: '매니저 수진',
    language: 'ko-KR',
    style: 'cheerful',
    pitch: 1.1,
    speed: 1.0,
    description: '밝고 친근한 언니 목소리 (Gemini TTS)',
  },
  sf: {
    worldviewId: 'sf',
    voiceId: 'Autonoe',
    voiceName: 'AI 아리아',
    language: 'ko-KR',
    style: 'calm',
    pitch: 1.0,
    speed: 1.05,
    description: '차분하고 미래적인 AI 음성 (Gemini TTS)',
  },
  zombie: {
    worldviewId: 'zombie',
    voiceId: 'Enceladus',
    voiceName: '닥터 리',
    language: 'ko-KR',
    style: 'serious',
    pitch: 0.95,
    speed: 1.08,
    description: '긴박하면서도 든든한 의료관 목소리 (Gemini TTS)',
  },
  spy: {
    worldviewId: 'spy',
    voiceId: 'Charon',
    voiceName: '핸들러 오메가',
    language: 'ko-KR',
    style: 'mysterious',
    pitch: 0.9,
    speed: 0.88,
    description: '냉철하고 전문적인 핸들러 음성 (Gemini TTS)',
  },
};

// ============================================================
// 운동명 한글 변환 (스토리용)
// ============================================================

export const EXERCISE_NAMES_KR: Record<string, string> = {
  // 하체
  squat: '스쿼트',
  wall_squat: '벽 스쿼트',
  chair_stand: '의자 기립',
  straight_leg_raise: '다리 들기',
  standing_march_slow: '제자리 행진',
  seated_knee_lift: '무릎 들기',
  // 상체
  standing_arm_raise_front: '팔 들기',
  shoulder_abduction: '어깨 벌리기',
  elbow_flexion: '팔꿈치 굽히기',
  wall_push: '벽 밀기',
  // 코어
  seated_core_hold: '코어 버티기',
  standing_anti_extension_hold: '허리 버티기',
  standing_arm_raise_core: '코어 팔 들기',
  bridge: '브릿지',
  // 손 재활
  finger_flexion: '손가락 굽히기',
  finger_spread: '손가락 벌리기',
  wrist_flexion: '손목 굽히기',
  tendon_glide: '힘줄 글라이딩',
  thumb_opposition: '엄지 터치',
  grip_squeeze: '주먹 쥐기',
  pinch_hold: '집게 집기',
  finger_tap_sequence: '손가락 순서 터치',
};

// ============================================================
// 등급 한글 변환
// ============================================================

export const GRADE_NAMES_KR: Record<string, string> = {
  perfect: '완벽',
  good: '좋음',
  normal: '보통',
  S: '최고',
  A: '우수',
  B: '양호',
  C: '보통',
  D: '노력필요',
};

// ============================================================
// 레벨별 칭호
// ============================================================

export const HERO_TITLES: Record<WorldviewType, Record<number, string>> = {
  fantasy: {
    1: '견습 기사',
    2: '정식 기사',
    3: '숙련 기사',
    4: '상급 기사',
    5: '왕국의 수호자',
    10: '전설의 영웅',
  },
  sports: {
    1: '재활 시작',
    2: '회복 중',
    3: '복귀 준비',
    4: '실전 복귀',
    5: '완전 복귀',
    10: '챔피언',
  },
  idol: {
    1: '신입 연습생',
    2: '정규 연습생',
    3: '데뷔 후보',
    4: '데뷔조',
    5: '인기 아이돌',
    10: '톱 스타',
  },
  sf: {
    1: '신규 파일럿',
    2: '정규 파일럿',
    3: '숙련 파일럿',
    4: '에이스 파일럿',
    5: '함장',
    10: '레전드 파일럿',
  },
  zombie: {
    1: '생존자',
    2: '정찰병',
    3: '경비대원',
    4: '수색대원',
    5: '캠프 리더',
    10: '전설의 생존자',
  },
  spy: {
    1: '신입 요원',
    2: '정규 요원',
    3: '숙련 요원',
    4: '특수 요원',
    5: '더블오 요원',
    10: '전설의 요원',
  },
};

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 레벨에 맞는 칭호 가져오기
 */
export function getHeroTitle(worldviewId: WorldviewType, level: number): string {
  const titles = HERO_TITLES[worldviewId];
  const levels = Object.keys(titles).map(Number).sort((a, b) => b - a);

  for (const titleLevel of levels) {
    if (level >= titleLevel) {
      return titles[titleLevel];
    }
  }

  return titles[1] || '견습생';
}

/**
 * 운동 ID를 한글명으로 변환
 */
export function getExerciseNameKr(exerciseId: string): string {
  return EXERCISE_NAMES_KR[exerciseId] || exerciseId;
}

/**
 * 등급을 한글로 변환
 */
export function getGradeNameKr(grade: string): string {
  return GRADE_NAMES_KR[grade] || grade;
}

/**
 * 세계관 정보 가져오기
 */
export function getWorldViewInfo(worldviewId: WorldviewType): WorldViewInfo {
  return WORLDVIEW_INFO[worldviewId];
}

/**
 * 멘토 NPC 정보 가져오기
 */
export function getMentorInfo(worldviewId: WorldviewType): MentorNpcInfo {
  return WORLDVIEW_MENTORS[worldviewId];
}

/**
 * TTS 설정 가져오기 (레거시)
 */
export function getTTSConfig(worldviewId: WorldviewType): TTSVoiceConfig {
  return TTS_VOICE_CONFIGS[worldviewId];
}

/**
 * Gemini TTS 설정 가져오기
 */
export function getGeminiTTSConfig(worldviewId: WorldviewType): GeminiTTSConfig {
  return GEMINI_TTS_CONFIGS[worldviewId];
}

/**
 * 등급별 Gemini TTS 설정 가져오기
 */
export function getGeminiVoiceSettings(
  worldviewId: WorldviewType,
  grade: 'perfect' | 'good' | 'normal'
): { voiceName: string; style: GeminiVoiceStyle; rate: number; stylePrefix: string } {
  const config = GEMINI_TTS_CONFIGS[worldviewId];
  const gradeSettings = config.gradeStyles[grade];

  return {
    voiceName: config.voiceName,
    style: gradeSettings.style,
    rate: gradeSettings.rate,
    stylePrefix: GEMINI_STYLE_PREFIXES[gradeSettings.style],
  };
}
