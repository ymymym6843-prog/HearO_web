/**
 * 운동 관련 타입 정의
 * HearO Web - MVP 22개 운동 지원 (전신 14 + 손 8)
 * 기준: 웹캠 환경/재활 안전성/인식 안정성
 */

import type { CameraPreset, CameraView, DeviceOrientation } from './camera';

// ============================================
// A. 전신 운동 (Pose 기반) - 14개 MVP
// ============================================

// 하체 운동 (6개)
export type LowerBodyExercise =
  | "squat"                    // 스쿼트
  | "wall_squat"               // 벽 스쿼트 (홀드)
  | "chair_stand"              // 의자 앉았다 일어나기
  | "straight_leg_raise"       // 누워서 다리 들기
  | "standing_march_slow"      // 서서 천천히 행진
  | "seated_knee_lift";        // 앉아서 무릎 들기

// 상체 운동 (4개)
export type UpperBodyExercise =
  | "arm_raise_front" // 팔 앞으로 들기
  | "shoulder_abduction"       // 어깨 벌리기
  | "elbow_flexion"            // 팔꿈치 굽히기 (재활형 컬)
  | "wall_push";               // 벽 밀기

// 코어/체간 운동 (4개)
export type CoreExercise =
  | "seated_core_hold"              // 앉아서 코어 버티기
  | "standing_anti_extension_hold"  // 서서 허리 버티기
  | "standing_arm_raise_core"       // 코어 유지하며 팔 들기
  | "bridge";                       // 브릿지

// 전신 운동 통합 (14개)
export type PoseExercise = LowerBodyExercise | UpperBodyExercise | CoreExercise;

// ============================================
// B. 손 재활 운동 (Hands 기반) - 8개 MVP
// ============================================

// ROM/가동성 (3개)
export type HandROMExercise =
  | "finger_flexion"           // 손가락 굽혔다 펴기
  | "finger_spread"            // 손가락 벌리기
  | "wrist_flexion";           // 손목 굽히기/펴기

// 협응/힘줄 (3개)
export type HandCoordinationExercise =
  | "tendon_glide"             // 힘줄 글라이딩 (5 제스처)
  | "thumb_opposition"         // 엄지-손가락 터치
  | "grip_squeeze";            // 주먹 쥐기 (상대 수축 지수)

// 정밀/기능 (2개)
export type HandPrecisionExercise =
  | "pinch_hold"               // 집게 집기 유지
  | "finger_tap_sequence";     // 손가락 순차 터치

// 손 운동 통합 (8개)
export type HandExercise = HandROMExercise | HandCoordinationExercise | HandPrecisionExercise;

// ============================================
// 확장/연구용 (MVP 제외)
// ============================================
export type ExtendedExercise =
  | "dead_bug"                 // 데드버그 (확장)
  | "bird_dog"                 // 버드독 (확장)
  | "reach_and_touch";         // 목표 터치 (Hands+Pose 통합)

// ============================================
// 전체 운동 타입
// ============================================
export type ExerciseType = PoseExercise | HandExercise;
export type AllExerciseType = ExerciseType | ExtendedExercise;

// 레거시 호환성
export type ExerciseId = ExerciseType;

// ============================================
// 운동 분류 타입
// ============================================

// 운동 대분류
export type ExerciseCategory = "pose" | "hands";

// 운동 중분류
export type ExerciseSubCategory =
  | "lower_body"    // 하체
  | "upper_body"    // 상체
  | "core"          // 코어/체간
  | "hand_rom"      // 손 ROM
  | "hand_coord"    // 손 협응
  | "hand_precision"; // 손 정밀

// 운동 모드
export type ExerciseMode = "rehab" | "fitness" | "both";

// 재활 부위
export type RehabBodyPart = "knee" | "shoulder" | "back" | "hip" | "hand" | "wrist" | "elbow" | "general";

// 피트니스 목표
export type FitnessGoal = "fullBody" | "lowerBody" | "upperBody" | "core" | "hand";

// 운동 난이도
export type ExerciseDifficulty = "easy" | "normal" | "hard";

// 재활 단계 레벨 (Phase 1-5)
export type RehabPhaseLevel = 1 | 2 | 3 | 4 | 5;

// 재활 시기
export type RehabStage = "acute" | "subacute" | "chronic";

// ============================================
// 감지 관련 타입
// ============================================

// 감지 방식
export type DetectionMethod =
  | "angle"         // 관절 각도 기반
  | "position"      // 위치 변화 기반
  | "distance"      // 거리 기반
  | "alignment"     // 정렬 상태 기반
  | "timer"         // 타이머 기반 (등척성 운동)
  | "gesture"       // 제스처 매칭
  | "sequence"      // 순차 패턴
  | "count";        // 횟수 카운팅

// 인식 엔진
export type DetectionEngine =
  | "mediapipe_pose"
  | "mediapipe_hands"
  | "movenet"
  | "hybrid";       // Pose + Hands 통합

// 상태 머신 모드
export type StateMachineMode =
  | "big_is_down"   // 값이 클수록 DOWN (예: 팔꿈치 펴짐)
  | "big_is_up"     // 값이 클수록 UP (예: 손목 높이)
  | "hold_mode"     // 유지 시간 측정
  | "alternating"   // 좌우 교대
  | "sequence"      // 순차 패턴
  | "gesture_match"; // 제스처 매칭

// 구현 가능성
export type ImplementationLevel = "high" | "medium" | "low" | "timer";

// 인식 난이도
export type DetectionDifficulty = "easy" | "medium" | "hard";

// ============================================
// 관절 타입
// ============================================

export type JointType =
  | "knee"
  | "hip"
  | "shoulder"
  | "elbow"
  | "spine"
  | "ankle"
  | "wrist"
  | "neck";

// 손 관절 타입
export type HandJointType =
  | "wrist"
  | "thumb_cmc" | "thumb_mcp" | "thumb_ip" | "thumb_tip"
  | "index_mcp" | "index_pip" | "index_dip" | "index_tip"
  | "middle_mcp" | "middle_pip" | "middle_dip" | "middle_tip"
  | "ring_mcp" | "ring_pip" | "ring_dip" | "ring_tip"
  | "pinky_mcp" | "pinky_pip" | "pinky_dip" | "pinky_tip";

// ============================================
// 각도/임계값 관련
// ============================================

// 각도 목표
export interface AngleTarget {
  start: { min: number; max: number };   // 시작 각도 범위
  end: { min: number; max: number };     // 목표 각도 범위
  tolerance: number;                      // 허용 오차
}

// 히스테리시스 임계값
export interface HysteresisThreshold {
  downThreshold: number;  // DOWN→UP 전환 임계값
  upThreshold: number;    // UP→DOWN 전환 임계값
}

// ============================================
// 운동 정보 인터페이스
// ============================================

export interface Exercise {
  id: ExerciseType;
  name: string;                          // 영문명
  koreanName: string;                    // 한글명
  description: string;                   // 한 줄 설명

  // 분류
  category: ExerciseCategory;
  subCategory: ExerciseSubCategory;
  mode: ExerciseMode;
  bodyParts: RehabBodyPart[];
  difficulty: ExerciseDifficulty;

  // 운동 설정
  targetReps: number;
  sets: number;
  restSeconds: number;
  holdSeconds?: number;                  // 정적 운동용

  // 재활 전용
  rehabPhaseStart?: RehabPhaseLevel;
  rehabStages: RehabStage[];             // 적용 가능 재활 시기

  // 감지 설정
  detectionMethod: DetectionMethod;
  detectionEngine: DetectionEngine;
  stateMachineMode: StateMachineMode;
  detectionDifficulty: DetectionDifficulty;
  implementationLevel: ImplementationLevel;

  // 포즈 인식
  requiredLandmarks: number[];
  cameraPreset: CameraPreset;
  orientation: DeviceOrientation;
  cameraView: CameraView;

  // ROM 측정
  primaryJoint?: JointType | HandJointType;
  targetAngle?: AngleTarget;
  threshold?: HysteresisThreshold;

  // 가이드
  instructions: string[];
  warnings?: string[];
  failureConditions?: string[];          // 실패 조건
}

// ============================================
// 운동 세션 관련
// ============================================

export interface ExerciseSession {
  id: string;
  userId: string;
  worldviewId: string;
  exerciseId: ExerciseType;

  // 실행 데이터
  reps: number;
  targetReps: number;
  sets: number;
  targetSets: number;

  // 품질 데이터
  accuracy: number;
  averageROM?: number;
  maxROM?: number;
  formScore?: number;                    // 폼 점수 (0~100)

  // ROM 측정 기록
  romMeasurements?: ROMRecording[];

  // 시간
  duration: number;
  completedAt: Date;
  createdAt: Date;
}

// ROM 기록
export interface ROMRecording {
  jointType: JointType | HandJointType;
  angle: number;
  timestamp: number;
  confidence: number;
}

// ============================================
// 성과 평가
// ============================================

// 성과 등급
export type PerformanceGrade = "S" | "A" | "B" | "C" | "D";

// 성과 평가 (운동 완료 후)
export type PerformanceRating = 'perfect' | 'good' | 'normal';

// 운동 결과
export interface ExerciseResult {
  exerciseId: ExerciseType;
  reps: number;
  targetReps: number;
  accuracy: number;
  successRate: number;
  grade: PerformanceGrade;
  formScore: number;

  // ROM 분석
  romAnalysis?: {
    averageAngle: number;
    maxAngle: number;
    targetAngle: number;
    achievementRate: number;
  };

  // 보상동작 분석
  compensationWarnings?: number;
}

// ============================================
// 운동 진행 상태
// ============================================

export interface ExerciseProgress {
  currentRep: number;
  targetReps: number;
  currentSet: number;
  targetSets: number;
  accuracy: number;
  phase: ExercisePhase;
  feedback?: string;
  currentAngle?: number;
  holdTime?: number;                     // 홀드 운동용
  formScore?: number;
}

// 운동 단계
export type ExercisePhase = "ready" | "down" | "up" | "hold" | "rest" | "transition";

// ============================================
// 운동 설정
// ============================================

export interface ExerciseConfig {
  targetReps: number;
  targetSets: number;
  restTime: number;
  holdTime?: number;
  countdownTime: number;
  feedbackEnabled: boolean;
  voiceGuidanceEnabled: boolean;
  romTrackingEnabled: boolean;
  compensationCheckEnabled: boolean;     // 보상동작 체크
}

// ============================================
// 운동 통계
// ============================================

export interface ExerciseStats {
  totalSessions: number;
  totalReps: number;
  totalDuration: number;
  averageAccuracy: number;
  averageFormScore: number;
  favoriteExercise?: ExerciseType;
  bestGrade: PerformanceGrade;
  averageROM?: Record<JointType, number>;
  progressByStage?: Record<RehabStage, number>;
}

// ============================================
// 처방 관련
// ============================================

// 운동 처방
export interface ExercisePrescription {
  stage: RehabStage;
  frequency: string;                     // 예: "주 5~7일"
  duration: string;                      // 예: "10~15분"
  sets: number;
  reps: number;
  holdSeconds?: number;
  tempo?: string;                        // 예: "3초 올리기/3초 내리기"
  safetyNotes: string[];
}

// 진행 기준
export interface ProgressionCriteria {
  fromStage: RehabStage;
  toStage: RehabStage;
  criteria: string[];
}
