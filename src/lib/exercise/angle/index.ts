/**
 * 각도 계산 모듈
 * @module angle
 */

// 타입
export * from './types';

// 상수
export * from './constants';

// 핵심 각도 계산
export { calculate2DAngle, calculate3DAngle, calculateSideAngle } from './core';

// 관절 각도 계산
export { calculateJointAngle, calculateSpineAngle } from './joint';

// Kalman 필터
export { KalmanFilter, JointKalmanFilters, jointKalmanFilters } from './filter';

// 유틸리티
export {
  smoothAngle,
  smoothAngleKalman,
  calculateAngularVelocity,
  extractPoint3D,
  convertLandmarksToPoints,
  isAngleInRange,
  calculateAngleProgress,
} from './utils';
