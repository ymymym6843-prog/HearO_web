/**
 * 포즈 인식 관련 타입 정의
 * MediaPipe Pose 33개 랜드마크 기준
 */

// MediaPipe Pose 랜드마크 인덱스 (33개)
export enum PoseLandmark {
  NOSE = 0,
  LEFT_EYE_INNER = 1,
  LEFT_EYE = 2,
  LEFT_EYE_OUTER = 3,
  RIGHT_EYE_INNER = 4,
  RIGHT_EYE = 5,
  RIGHT_EYE_OUTER = 6,
  LEFT_EAR = 7,
  RIGHT_EAR = 8,
  MOUTH_LEFT = 9,
  MOUTH_RIGHT = 10,
  LEFT_SHOULDER = 11,
  RIGHT_SHOULDER = 12,
  LEFT_ELBOW = 13,
  RIGHT_ELBOW = 14,
  LEFT_WRIST = 15,
  RIGHT_WRIST = 16,
  LEFT_PINKY = 17,
  RIGHT_PINKY = 18,
  LEFT_INDEX = 19,
  RIGHT_INDEX = 20,
  LEFT_THUMB = 21,
  RIGHT_THUMB = 22,
  LEFT_HIP = 23,
  RIGHT_HIP = 24,
  LEFT_KNEE = 25,
  RIGHT_KNEE = 26,
  LEFT_ANKLE = 27,
  RIGHT_ANKLE = 28,
  LEFT_HEEL = 29,
  RIGHT_HEEL = 30,
  LEFT_FOOT_INDEX = 31,
  RIGHT_FOOT_INDEX = 32,
}

// 단일 랜드마크 (3D 좌표 + 신뢰도)
export interface Landmark {
  x: number;       // 0~1 정규화 좌표
  y: number;       // 0~1 정규화 좌표
  z: number;       // 깊이 (어깨 너비 기준 정규화)
  visibility: number; // 0~1 가시성 신뢰도
}

// 포즈 인식 결과
export interface PoseResult {
  landmarks: Landmark[];           // 정규화된 2D 좌표 (33개)
  worldLandmarks?: Landmark[];     // 실제 3D 좌표
  timestamp: number;               // 감지 시간
  score: number;                   // 전체 신뢰도 (0~1)
}

// 보상 동작 감지 결과 (간소화 버전)
export interface CompensationInfo {
  detected: boolean;               // 보상 동작 감지 여부
  type: string | null;             // 보상 동작 유형 (knee_valgus, trunk_rotation 등)
  severity: 'low' | 'medium' | 'high' | null; // 심각도
  feedback: string | null;         // 교정 피드백
}

// 좌우 개별 각도 결과
export interface BilateralAngle {
  left: number | null;        // 왼쪽 각도 (null이면 측정 불가)
  right: number | null;       // 오른쪽 각도 (null이면 측정 불가)
  average: number;            // 평균 각도 (유효한 쪽만 계산)
  difference: number;         // 좌우 차이 (|left - right|)
  dominantSide: 'left' | 'right' | 'both' | 'none';  // 더 큰 각도의 방향
}

// 동작 완료 상태 (상태 머신 확장)
export interface RepCompletionState {
  isComplete: boolean;        // 1회 완료 여부
  holdTimeReached: boolean;   // 홀드 시간 도달 여부
  returnedToStart: boolean;   // 시작 자세 복귀 여부
  minDurationMet: boolean;    // 최소 소요 시간 충족 여부
  targetAngleReached: boolean; // 목표 각도 도달 여부
  holdStartTime: number | null; // 홀드 시작 시간
  repStartTime: number | null;  // 반복 시작 시간
}

// 운동 감지 결과
export interface ExerciseDetectionResult {
  exerciseId: string;              // 운동 ID
  phase: string;                   // 현재 동작 단계 ('ready' | 'down' | 'up' | 'hold' | 'rest')
  repCompleted: boolean;           // 반복 완료 여부
  angle: number;                   // 주요 관절 각도 (평균 또는 주측)
  accuracy: number;                // 동작 정확도 (0~100)
  feedback: string | null;         // 실시간 피드백 메시지
  compensation?: CompensationInfo; // 보상 동작 감지 결과

  // 좌우 개별 측정
  bilateralAngle?: BilateralAngle; // 좌우 개별 각도 (양측 동시 측정)
  completionState?: RepCompletionState; // 동작 완료 상세 상태
}

// 조명 품질 검증 결과
export interface LightingQuality {
  isGood: boolean;
  brightness: number;
  level: 'dark' | 'low' | 'good' | 'bright';
  feedback: string;
}

// 가려진 관절 검증 결과
export interface OccludedJointsResult {
  hasOccludedJoints: boolean;
  occludedJoints: string[];
  feedback: string;
}

// 보이는 측면
export type VisibleSide = 'left' | 'right' | 'front';
