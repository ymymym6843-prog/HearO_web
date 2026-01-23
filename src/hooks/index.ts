/**
 * Custom Hooks Export
 */

export { useExerciseDetection, useHoldExercise } from './useExerciseDetection';
export { useExerciseSession } from './useExerciseSession';

// VRM + Kalidokit 통합 훅 (Utonics 스타일)
export { useKalidokit, resetVRMPose, setVRMExpression } from './useKalidokit';
export type { UseKalidokitOptions, UseKalidokitReturn } from './useKalidokit';

// VRMA 애니메이션 훅 (Utonics 벤치마킹)
export { useVRMAAnimation, DEFAULT_VRMA_ANIMATIONS } from './useVRMAAnimation';
export type { VRMAAnimationInfo, UseVRMAAnimationReturn } from './useVRMAAnimation';

// VRM 뷰어 제어 훅 (카메라, 조명, 스크린샷)
export { useVRMViewer, CAMERA_ANGLE_OPTIONS } from './useVRMViewer';
export type {
  CameraAngle,
  CameraPosition,
  LightingSettings,
  ViewerSettings,
  UseVRMViewerReturn,
} from './useVRMViewer';

// VRM 모델 로딩 및 분석 훅
export {
  useVRMLoader,
  hasBone,
  supportsFingerTracking,
  supportsLegTracking,
} from './useVRMLoader';
export type {
  MeshInfo,
  BoneAnalysis,
  VRMMetaInfo,
  VRMAnalysis,
  UseVRMLoaderOptions,
  UseVRMLoaderReturn,
} from './useVRMLoader';
