/**
 * Phase 타입 정의
 * HearO 4단계 프로그램 워크플로우
 *
 * Phase 1: 인트로/스토리 (대화 모드) - 2D NPC + VN UI
 * Phase 2: 미션 돌입 (전환 연출) - 2D→3D 트랜지션
 * Phase 3: 운동 수행 (액션 모드) - 3D VRM + MediaPipe
 * Phase 4: 보상/에필로그 (스냅샷 모드) - 결과 합성
 */

// ============================================
// Phase 타입
// ============================================

export type PhaseType = 'intro' | 'transition' | 'exercise' | 'epilogue';

export interface PhaseState {
  /** 현재 Phase */
  current: PhaseType;
  /** 이전 Phase */
  previous: PhaseType | null;
  /** 전환 진행률 (0-1) */
  transitionProgress: number;
  /** 전환 중 여부 */
  isTransitioning: boolean;
}

// ============================================
// Layer 가시성 타입
// ============================================

export interface LayerVisibility {
  /** 360도 스카이박스 배경 */
  skybox: boolean;
  /** 2D NPC 레이어 */
  npc2D: boolean;
  /** VN 대화창 UI */
  vnDialogue: boolean;
  /** 3D VRM 캐릭터 */
  vrm3D: boolean;
  /** MediaPipe 활성화 */
  mediapipe: boolean;
  /** PIP 카메라 뷰 */
  cameraPIP: boolean;
  /** 운동 UI (횟수, 타이머 등) */
  exerciseUI: boolean;
  /** 결과/스냅샷 UI */
  resultUI: boolean;
}

// Phase별 레이어 가시성 프리셋
export const PHASE_LAYER_PRESETS: Record<PhaseType, LayerVisibility> = {
  intro: {
    skybox: true,
    npc2D: true,
    vnDialogue: true,
    vrm3D: false,      // 숨김
    mediapipe: false,  // 비활성
    cameraPIP: false,
    exerciseUI: false,
    resultUI: false,
  },
  transition: {
    skybox: true,
    npc2D: true,       // 퇴장 애니메이션 중
    vnDialogue: false,
    vrm3D: true,       // 등장 애니메이션
    mediapipe: false,  // 전환 완료 후 활성화
    cameraPIP: false,
    exerciseUI: false,
    resultUI: false,
  },
  exercise: {
    skybox: true,
    npc2D: false,
    vnDialogue: false,
    vrm3D: true,
    mediapipe: true,   // 활성
    cameraPIP: true,   // PIP로 최소화
    exerciseUI: true,
    resultUI: false,
  },
  epilogue: {
    skybox: true,
    npc2D: true,       // 칭찬 NPC
    vnDialogue: true,
    vrm3D: true,       // 스냅샷용
    mediapipe: false,
    cameraPIP: false,
    exerciseUI: false,
    resultUI: true,
  },
};

// ============================================
// 전환 설정
// ============================================

export interface TransitionConfig {
  /** 전환 지속 시간 (ms) */
  duration: number;
  /** 이징 함수 */
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring';
  /** NPC 퇴장 애니메이션 */
  npcExitAnimation: 'fade' | 'slideLeft' | 'slideRight' | 'scale' | 'dissolve';
  /** VRM 등장 애니메이션 */
  vrmEnterAnimation: 'fade' | 'scale' | 'slideUp' | 'portal';
  /** 카메라 워킹 */
  cameraTransition: boolean;
  /** 빛 효과 */
  lightEffect: boolean;
}

export const DEFAULT_TRANSITION_CONFIG: TransitionConfig = {
  duration: 1500,
  easing: 'easeInOut',
  npcExitAnimation: 'dissolve',
  vrmEnterAnimation: 'portal',
  cameraTransition: true,
  lightEffect: true,
};

// ============================================
// VN 대화 시퀀스
// ============================================

export interface DialogueEntry {
  /** NPC ID */
  npcId: string;
  /** 감정 상태 */
  emotion: 'normal' | 'happy' | 'serious' | 'surprised';
  /** 대사 텍스트 */
  text: string;
  /** TTS 활성화 */
  tts?: boolean;
  /** 자동 진행 딜레이 (ms, 0이면 수동) */
  autoAdvance?: number;
  /** 대화 완료 후 액션 */
  onComplete?: 'next' | 'startTransition' | 'startExercise';
}

export interface DialogueSequence {
  /** 시퀀스 ID */
  id: string;
  /** 대화 목록 */
  entries: DialogueEntry[];
  /** 현재 인덱스 */
  currentIndex: number;
}

// ============================================
// 스냅샷 메타데이터
// ============================================

export interface SnapshotMetadata {
  /** 타임스탬프 */
  timestamp: number;
  /** 운동 타입 */
  exerciseType: string;
  /** 세계관 */
  worldview: string;
  /** 성과 등급 */
  performanceRating: 'perfect' | 'good' | 'normal';
  /** 캡처 시점 (운동 중 최고 순간) */
  capturePoint: 'peak' | 'completion';
  /** 3D 씬 카메라 앵글 */
  cameraAngle: [number, number, number];
  /** VRM 포즈 데이터 */
  poseData?: Record<string, { x: number; y: number; z: number }>;
}

export interface SnapshotResult {
  /** 3D 캔버스 이미지 (base64) */
  canvasImage: string;
  /** 합성된 최종 이미지 (2D UI 포함) */
  composedImage: string;
  /** 메타데이터 */
  metadata: SnapshotMetadata;
}

// ============================================
// Phase 이벤트
// ============================================

export type PhaseEvent =
  | { type: 'DIALOGUE_START'; sequence: DialogueSequence }
  | { type: 'DIALOGUE_ADVANCE' }
  | { type: 'DIALOGUE_COMPLETE' }
  | { type: 'TRANSITION_START' }
  | { type: 'TRANSITION_PROGRESS'; progress: number }
  | { type: 'TRANSITION_COMPLETE' }
  | { type: 'EXERCISE_START' }
  | { type: 'EXERCISE_REP_COMPLETE'; rep: number }
  | { type: 'EXERCISE_COMPLETE'; result: { reps: number; accuracy: number } }
  | { type: 'SNAPSHOT_CAPTURE' }
  | { type: 'EPILOGUE_START'; result: SnapshotResult }
  | { type: 'EPILOGUE_COMPLETE' };

export default PhaseType;
