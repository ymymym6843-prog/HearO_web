/**
 * vrmAnimator.ts - 호환성 래퍼
 *
 * 기존 코드와의 호환성을 위해 유지
 * 실제 구현은 @/hooks/useKalidokit 사용 권장
 *
 * @deprecated useKalidokit 훅 사용 권장
 */

import { resetVRMPose, setVRMExpression } from '@/hooks/useKalidokit';

// 기존 API 호환성을 위해 re-export
export { resetVRMPose, setVRMExpression };

// 기존 applyPoseToVRM 함수는 더 이상 사용하지 않음
// useKalidokit 훅이 자동으로 처리함

/**
 * @deprecated useKalidokit 훅 사용 권장
 * 이 함수는 더 이상 사용되지 않습니다.
 * VRMCharacter에서 useKalidokit 훅이 자동으로 포즈를 적용합니다.
 */
export function applyPoseToVRM(): void {
  console.warn(
    '[vrmAnimator] applyPoseToVRM is deprecated. ' +
    'Use useKalidokit hook instead - it automatically applies pose.'
  );
}

// 기타 deprecated 함수들
export function updateConfig(): void {
  console.warn('[vrmAnimator] updateConfig is deprecated. Use useKalidokit options instead.');
}

export function getConfig(): Record<string, unknown> {
  console.warn('[vrmAnimator] getConfig is deprecated.');
  return {};
}

export function resetConfig(): void {
  console.warn('[vrmAnimator] resetConfig is deprecated.');
}

export function diagnoseVRMRestPose(): Record<string, unknown> {
  console.warn('[vrmAnimator] diagnoseVRMRestPose is deprecated.');
  return {};
}

export function startPoseAlignment(): void {
  console.warn('[vrmAnimator] startPoseAlignment is deprecated. Utonics style does not require calibration.');
}

export function getPoseAlignmentState(): Record<string, unknown> {
  return { status: 'idle', progress: 100, message: 'Calibration not required', isStable: true };
}

export function isPoseAlignmentInProgress(): boolean {
  return false;
}

export function isPoseAlignmentCompleted(): boolean {
  return true;
}

export function resetPoseAlignment(): void {
  console.warn('[vrmAnimator] resetPoseAlignment is deprecated.');
}

export function restoreVRMRestPose(): void {
  console.warn('[vrmAnimator] restoreVRMRestPose is deprecated. Use resetVRMPose instead.');
}

// Deprecated aliases
export const startCalibration = startPoseAlignment;
export const getCalibrationState = getPoseAlignmentState;
export const resetCalibration = resetPoseAlignment;
