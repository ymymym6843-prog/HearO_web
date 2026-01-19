/**
 * 각도 계산 타입 정의
 * @module angle/types
 */

import type { JointType } from '@/types/exercise';

// 2D 포인트 타입
export interface Point2D {
  x: number;
  y: number;
}

// 3D 포인트 타입
export interface Point3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// 벡터 타입
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

// 각도 계산 결과
export interface AngleResult {
  angle: number;          // 계산된 각도 (도)
  confidence: number;     // 신뢰도 (0-1)
  joint: JointType;       // 관절 종류
  timestamp: number;      // 측정 시각
}

// ROM 분석 결과
export interface ROMAnalysis {
  currentAngle: number;
  minAngle: number;
  maxAngle: number;
  averageAngle: number;
  rangeOfMotion: number;  // max - min
  measurements: AngleResult[];
}

// 카메라 뷰 타입
export type CameraViewType = 'front' | 'side' | 'oblique' | 'unknown';

// 3D ROM 측정 결과
export interface ROMResult3D {
  angle2D: number;              // 2D 각도 (정면 기준)
  angle3D: number;              // 3D 각도 (깊이 포함)
  angleSide: number;            // 측면 각도
  confidence: number;           // 측정 신뢰도
  cameraView: CameraViewType;   // 추정된 카메라 뷰
  depthQuality: number;         // Z축 데이터 품질 (0-1)
  recommendedAngle: number;     // 현재 뷰에 권장되는 각도 값
}

// 운동 페이즈 타입
export type ExercisePhaseType = 'ready' | 'down' | 'up' | 'hold' | 'rest';

// 페이즈 감지 결과
export interface PhaseDetection {
  phase: ExercisePhaseType;
  progress: number;       // 현재 동작 진행률 (0-100)
  isRepComplete: boolean; // 1회 완료 여부
}
