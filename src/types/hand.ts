/**
 * MediaPipe Hand Landmarker 타입 정의
 * 21개 랜드마크의 2D/3D 좌표 및 관련 타입
 */

/** 손 랜드마크 인덱스 (21개) */
export enum HandLandmark {
  WRIST = 0,
  THUMB_CMC = 1,
  THUMB_MCP = 2,
  THUMB_IP = 3,
  THUMB_TIP = 4,
  INDEX_FINGER_MCP = 5,
  INDEX_FINGER_PIP = 6,
  INDEX_FINGER_DIP = 7,
  INDEX_FINGER_TIP = 8,
  MIDDLE_FINGER_MCP = 9,
  MIDDLE_FINGER_PIP = 10,
  MIDDLE_FINGER_DIP = 11,
  MIDDLE_FINGER_TIP = 12,
  RING_FINGER_MCP = 13,
  RING_FINGER_PIP = 14,
  RING_FINGER_DIP = 15,
  RING_FINGER_TIP = 16,
  PINKY_MCP = 17,
  PINKY_PIP = 18,
  PINKY_DIP = 19,
  PINKY_TIP = 20,
}

/** 손가락 이름 */
export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

/** 손가락별 랜드마크 매핑 */
export const FINGER_LANDMARKS: Record<FingerName, number[]> = {
  thumb: [
    HandLandmark.THUMB_CMC,
    HandLandmark.THUMB_MCP,
    HandLandmark.THUMB_IP,
    HandLandmark.THUMB_TIP,
  ],
  index: [
    HandLandmark.INDEX_FINGER_MCP,
    HandLandmark.INDEX_FINGER_PIP,
    HandLandmark.INDEX_FINGER_DIP,
    HandLandmark.INDEX_FINGER_TIP,
  ],
  middle: [
    HandLandmark.MIDDLE_FINGER_MCP,
    HandLandmark.MIDDLE_FINGER_PIP,
    HandLandmark.MIDDLE_FINGER_DIP,
    HandLandmark.MIDDLE_FINGER_TIP,
  ],
  ring: [
    HandLandmark.RING_FINGER_MCP,
    HandLandmark.RING_FINGER_PIP,
    HandLandmark.RING_FINGER_DIP,
    HandLandmark.RING_FINGER_TIP,
  ],
  pinky: [
    HandLandmark.PINKY_MCP,
    HandLandmark.PINKY_PIP,
    HandLandmark.PINKY_DIP,
    HandLandmark.PINKY_TIP,
  ],
};

/** 손가락 TIP 인덱스 */
export const FINGER_TIPS: Record<FingerName, number> = {
  thumb: HandLandmark.THUMB_TIP,
  index: HandLandmark.INDEX_FINGER_TIP,
  middle: HandLandmark.MIDDLE_FINGER_TIP,
  ring: HandLandmark.RING_FINGER_TIP,
  pinky: HandLandmark.PINKY_TIP,
};

/** 2D 정규화 랜드마크 */
export interface HandLandmarkPoint {
  x: number;        // 0-1 정규화
  y: number;        // 0-1 정규화
  z: number;        // 깊이 (손목 기준)
  visibility?: number;
}

/** 3D 월드 랜드마크 (미터 단위) */
export interface HandWorldLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/** 손 좌우 구분 */
export type Handedness = 'Left' | 'Right';

/** 단일 손 감지 결과 */
export interface SingleHandResult {
  landmarks: HandLandmarkPoint[];      // 21개 2D 좌표
  worldLandmarks: HandWorldLandmark[]; // 21개 3D 좌표
  handedness: Handedness;
  score: number;                       // 감지 신뢰도
}

/** 전체 손 감지 결과 (최대 2개 손) */
export interface HandResult {
  hands: SingleHandResult[];
  timestamp: number;
}

/** 손 감지 상태 */
export type HandDetectionStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'detecting'
  | 'error';

/** 손 감지 옵션 */
export interface HandDetectionOptions {
  delegate: 'GPU' | 'CPU';
  numHands: number;
  minHandDetectionConfidence: number;
  minHandPresenceConfidence: number;
  minTrackingConfidence: number;
}

/** 기본 손 감지 옵션 */
export const DEFAULT_HAND_OPTIONS: HandDetectionOptions = {
  delegate: 'GPU',
  numHands: 2,
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

/** 손가락 각도 결과 */
export interface FingerAngles {
  /** MCP 관절 각도 (손목-MCP-PIP) */
  mcp: number;
  /** PIP 관절 각도 (MCP-PIP-DIP) */
  pip: number;
  /** DIP 관절 각도 (PIP-DIP-TIP) */
  dip: number;
  /** 전체 굴곡 각도 (합산) */
  totalFlexion: number;
}

/** 전체 손 각도 결과 */
export interface HandAngles {
  thumb: Omit<FingerAngles, 'dip'> & { ip: number };  // 엄지는 IP 관절
  index: FingerAngles;
  middle: FingerAngles;
  ring: FingerAngles;
  pinky: FingerAngles;
  /** 손목 각도 */
  wrist: {
    flexion: number;      // 굴곡/신전
    deviation: number;    // 편위 (요/척측)
  };
}

/** 손 모양 제스처 */
export type HandGesture =
  | 'open'           // 손 펴기
  | 'fist'           // 주먹
  | 'pointing'       // 검지 가리키기
  | 'pinch'          // 엄지-검지 집기
  | 'thumbs_up'      // 엄지척
  | 'hook'           // 갈고리 (힘줄 미끄럼 1단계)
  | 'table_top'      // 테이블탑 (힘줄 미끄럼 2단계)
  | 'straight_fist'  // 직선 주먹 (힘줄 미끄럼 3단계)
  | 'full_fist'      // 완전 주먹 (힘줄 미끄럼 4단계)
  | 'unknown';

/** 재활 운동 타입 */
export type HandRehabExercise =
  | 'finger_flexion'       // 손가락 굴곡/신전
  | 'tendon_glide'         // 힘줄 미끄럼 (5단계)
  | 'thumb_opposition'     // 엄지-손가락 터치
  | 'finger_spread'        // 손가락 벌리기
  | 'grip_squeeze'         // 그립 운동
  | 'wrist_rotation';      // 손목 회전

/** 재활 운동 정의 */
export interface HandRehabDefinition {
  type: HandRehabExercise;
  name: string;
  nameKo: string;
  description: string;
  targetConditions: string[];     // 적응증
  steps: string[];                // 운동 단계
  targetGestures?: HandGesture[]; // 목표 제스처 시퀀스
  repetitions: number;            // 권장 반복 횟수
  holdSeconds?: number;           // 유지 시간
}

/** 재활 운동 정의 목록 */
export const HAND_REHAB_DEFINITIONS: Record<HandRehabExercise, HandRehabDefinition> = {
  finger_flexion: {
    type: 'finger_flexion',
    name: 'Finger Flexion/Extension',
    nameKo: '손가락 굴곡/신전',
    description: '손가락을 완전히 펴고 주먹을 쥐는 운동',
    targetConditions: ['관절염', '손목터널증후군', '건염'],
    steps: [
      '손가락을 완전히 펴세요',
      '천천히 주먹을 쥐세요',
      '5초간 유지 후 다시 펴세요',
    ],
    targetGestures: ['open', 'fist'],
    repetitions: 10,
    holdSeconds: 5,
  },
  tendon_glide: {
    type: 'tendon_glide',
    name: 'Tendon Gliding Exercise',
    nameKo: '힘줄 미끄럼 운동',
    description: '5단계 손 모양으로 힘줄 스트레칭',
    targetConditions: ['손목터널증후군', '방아쇠 손가락', '건초염'],
    steps: [
      '1단계: 손을 완전히 펴세요 (Straight)',
      '2단계: 손가락 끝만 굽히세요 (Hook)',
      '3단계: 손가락을 테이블탑 모양으로 (Table Top)',
      '4단계: 직선 주먹을 쥐세요 (Straight Fist)',
      '5단계: 완전한 주먹을 쥐세요 (Full Fist)',
    ],
    targetGestures: ['open', 'hook', 'table_top', 'straight_fist', 'full_fist'],
    repetitions: 5,
    holdSeconds: 3,
  },
  thumb_opposition: {
    type: 'thumb_opposition',
    name: 'Thumb-to-Finger Opposition',
    nameKo: '엄지-손가락 터치',
    description: '엄지를 각 손가락 끝에 차례로 터치',
    targetConditions: ['뇌졸중 재활', '손 기능 회복', '미세운동 향상'],
    steps: [
      '엄지를 검지 끝에 터치하세요',
      '엄지를 중지 끝에 터치하세요',
      '엄지를 약지 끝에 터치하세요',
      '엄지를 새끼 끝에 터치하세요',
    ],
    repetitions: 10,
  },
  finger_spread: {
    type: 'finger_spread',
    name: 'Finger Spread',
    nameKo: '손가락 벌리기',
    description: '손가락을 최대한 벌리는 운동',
    targetConditions: ['관절염', '손 강화', '유연성 향상'],
    steps: [
      '손바닥을 펴세요',
      '손가락을 최대한 벌리세요',
      '5초간 유지하세요',
      '손가락을 모으세요',
    ],
    targetGestures: ['open'],
    repetitions: 10,
    holdSeconds: 5,
  },
  grip_squeeze: {
    type: 'grip_squeeze',
    name: 'Grip Squeeze',
    nameKo: '그립 쥐기',
    description: '주먹을 꽉 쥐었다 풀기',
    targetConditions: ['관절염', '손 강화', '그립력 향상'],
    steps: [
      '손을 완전히 펴세요',
      '주먹을 꽉 쥐세요',
      '5초간 유지하세요',
      '천천히 손을 펴세요',
    ],
    targetGestures: ['open', 'fist'],
    repetitions: 10,
    holdSeconds: 5,
  },
  wrist_rotation: {
    type: 'wrist_rotation',
    name: 'Wrist Rotation',
    nameKo: '손목 회전',
    description: '손목을 원형으로 돌리는 운동',
    targetConditions: ['손목터널증후군', '손목 유연성', '관절염'],
    steps: [
      '주먹을 쥐세요',
      '손목을 시계 방향으로 5회 돌리세요',
      '반시계 방향으로 5회 돌리세요',
    ],
    repetitions: 5,
  },
};

/** 손 연결선 정의 (시각화용) */
export const HAND_CONNECTIONS: [number, number][] = [
  // 손목 → 각 손가락 MCP
  [HandLandmark.WRIST, HandLandmark.THUMB_CMC],
  [HandLandmark.WRIST, HandLandmark.INDEX_FINGER_MCP],
  [HandLandmark.WRIST, HandLandmark.MIDDLE_FINGER_MCP],
  [HandLandmark.WRIST, HandLandmark.RING_FINGER_MCP],
  [HandLandmark.WRIST, HandLandmark.PINKY_MCP],
  // 엄지
  [HandLandmark.THUMB_CMC, HandLandmark.THUMB_MCP],
  [HandLandmark.THUMB_MCP, HandLandmark.THUMB_IP],
  [HandLandmark.THUMB_IP, HandLandmark.THUMB_TIP],
  // 검지
  [HandLandmark.INDEX_FINGER_MCP, HandLandmark.INDEX_FINGER_PIP],
  [HandLandmark.INDEX_FINGER_PIP, HandLandmark.INDEX_FINGER_DIP],
  [HandLandmark.INDEX_FINGER_DIP, HandLandmark.INDEX_FINGER_TIP],
  // 중지
  [HandLandmark.MIDDLE_FINGER_MCP, HandLandmark.MIDDLE_FINGER_PIP],
  [HandLandmark.MIDDLE_FINGER_PIP, HandLandmark.MIDDLE_FINGER_DIP],
  [HandLandmark.MIDDLE_FINGER_DIP, HandLandmark.MIDDLE_FINGER_TIP],
  // 약지
  [HandLandmark.RING_FINGER_MCP, HandLandmark.RING_FINGER_PIP],
  [HandLandmark.RING_FINGER_PIP, HandLandmark.RING_FINGER_DIP],
  [HandLandmark.RING_FINGER_DIP, HandLandmark.RING_FINGER_TIP],
  // 새끼
  [HandLandmark.PINKY_MCP, HandLandmark.PINKY_PIP],
  [HandLandmark.PINKY_PIP, HandLandmark.PINKY_DIP],
  [HandLandmark.PINKY_DIP, HandLandmark.PINKY_TIP],
  // 손바닥 연결
  [HandLandmark.INDEX_FINGER_MCP, HandLandmark.MIDDLE_FINGER_MCP],
  [HandLandmark.MIDDLE_FINGER_MCP, HandLandmark.RING_FINGER_MCP],
  [HandLandmark.RING_FINGER_MCP, HandLandmark.PINKY_MCP],
];
