/**
 * 운동 관련 타입 정의
 * HearO Web - 8개 MVP 운동 지원
 */

import type { CameraPreset, CameraView, DeviceOrientation } from './camera';

// MVP 운동 타입 (6개) - 웹캠 단일 카메라 최적화
export type ExerciseType =
  // 하체 운동 (2개) - 무릎 각도 기반, 측면 카메라
  | "squat"                 // 스쿼트
  | "lunge"                 // 런지
  // 상체 운동 (2개) - 팔 각도 기반
  | "bicep_curl"            // 바이셉컬 (팔꿈치 각도)
  | "arm_raise"             // 암레이즈 (어깨 굴곡, shoulder flexion)
  // 전신/코어 운동 (2개)
  | "high_knees"            // 하이니즈 (고관절 각도, 정면 카메라)
  | "plank_hold";           // 플랭크 (정렬 유지, hold timer)

// 레거시 호환성
export type ExerciseId = ExerciseType;

// 운동 모드
export type ExerciseMode = "rehab" | "fitness" | "both";

// 재활 부위
export type RehabBodyPart = "knee" | "shoulder" | "back" | "hip" | "hand" | "general";

// 피트니스 목표
export type FitnessGoal = "fullBody" | "lowerBody" | "upperBody" | "core";

// 운동 난이도
export type ExerciseDifficulty = "easy" | "normal" | "hard";

// 재활 단계 레벨 (Phase 1-5)
export type RehabPhaseLevel = 1 | 2 | 3 | 4 | 5;

// 감지 방식
export type DetectionMethod =
  | "angle"         // 관절 각도 기반
  | "position"      // 위치 변화 기반
  | "alignment"     // 정렬 상태 기반
  | "timer"         // 타이머 기반 (등척성 운동)
  | "count";        // 횟수 카운팅

// 구현 가능성
export type ImplementationLevel = "high" | "medium" | "low" | "timer";

// 관절 타입
export type JointType =
  | "knee"
  | "hip"
  | "shoulder"
  | "elbow"
  | "spine"
  | "ankle"
  | "wrist"
  | "neck";

// 각도 목표
export interface AngleTarget {
  start: { min: number; max: number };   // 시작 각도 범위
  end: { min: number; max: number };     // 목표 각도 범위
  tolerance: number;                      // 허용 오차
}

// 운동 정보 인터페이스
export interface Exercise {
  id: ExerciseType;
  name: string;                          // 영문명
  koreanName: string;                    // 한글명
  description: string;                   // 한 줄 설명

  // 운동 설정
  targetReps: number;
  sets: number;
  restSeconds: number;
  holdSeconds?: number;                  // 정적 운동용

  // 분류
  mode: ExerciseMode;
  bodyParts: RehabBodyPart[];
  difficulty: ExerciseDifficulty;

  // 재활 전용
  rehabPhaseStart?: RehabPhaseLevel;

  // 감지 설정
  detectionMethod: DetectionMethod;
  implementationLevel: ImplementationLevel;

  // 포즈 인식
  requiredLandmarks: number[];
  cameraPreset: CameraPreset;
  orientation: DeviceOrientation;
  cameraView: CameraView;

  // ROM 측정
  primaryJoint?: JointType;
  targetAngle?: AngleTarget;

  // 가이드
  instructions: string[];
  warnings?: string[];
}

// 운동 세션
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

  // ROM 측정 기록
  romMeasurements?: ROMRecording[];

  // 시간
  duration: number;
  completedAt: Date;
  createdAt: Date;
}

// ROM 기록
export interface ROMRecording {
  jointType: JointType;
  angle: number;
  timestamp: number;
  confidence: number;
}

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

  // ROM 분석
  romAnalysis?: {
    averageAngle: number;
    maxAngle: number;
    targetAngle: number;
    achievementRate: number;
  };
}

// 운동 진행 상태
export interface ExerciseProgress {
  currentRep: number;
  targetReps: number;
  currentSet: number;
  targetSets: number;
  accuracy: number;
  phase: ExercisePhase;
  feedback?: string;
  currentAngle?: number;
}

// 운동 단계
export type ExercisePhase = "ready" | "down" | "up" | "hold" | "rest";

// 운동 설정
export interface ExerciseConfig {
  targetReps: number;
  targetSets: number;
  restTime: number;
  holdTime?: number;
  countdownTime: number;
  feedbackEnabled: boolean;
  voiceGuidanceEnabled: boolean;
  romTrackingEnabled: boolean;
}

// 운동 통계
export interface ExerciseStats {
  totalSessions: number;
  totalReps: number;
  totalDuration: number;
  averageAccuracy: number;
  favoriteExercise?: ExerciseType;
  bestGrade: PerformanceGrade;
  averageROM?: Record<JointType, number>;
}
