/**
 * 카메라 관련 타입 정의
 * 웹 카메라 시스템에 사용되는 타입들
 */

// 카메라 프리셋 타입
export type CameraPreset = "fullBody" | "upperBody" | "lowerBody";

// 화면 비율 타입
export type AspectRatio = "9:16" | "4:3" | "16:9" | "1:1";

// 실루엣 가이드 타입
export type GuideType = "full" | "upper" | "lower";

// 카메라 설정 인터페이스
export interface CameraConfig {
  preset: CameraPreset;
  aspectRatio: AspectRatio;
  zoomLevel: number;              // 0.5 (광각) ~ 1.0 (기본) ~ 2.0 (줌)
  guideType: GuideType;           // 실루엣 가이드 타입
  recommendedDistance: {
    min: number;                  // 최소 권장 거리 (m)
    max: number;                  // 최대 권장 거리 (m)
  };
  requiredLandmarks: number[];    // 필수로 보여야 할 랜드마크 인덱스
}

// 카메라 상태 인터페이스
export interface CameraState {
  isReady: boolean;
  hasPermission: boolean;
  isTransitioning: boolean;
  currentConfig: CameraConfig | null;
}

// 거리 상태 타입
export type DistanceStatus = "tooClose" | "optimal" | "tooFar" | "unknown";

// 거리 측정 결과 인터페이스
export interface DistanceResult {
  estimatedDistance: number;      // 추정 거리 (m)
  status: DistanceStatus;
  message: string;                // 사용자에게 표시할 메시지
}

// 랜드마크 가시성 결과 인터페이스
export interface LandmarkVisibility {
  allVisible: boolean;            // 모든 필수 랜드마크가 보이는지
  visibleCount: number;           // 보이는 랜드마크 수
  requiredCount: number;          // 필요한 랜드마크 수
  missingLandmarks: number[];     // 보이지 않는 랜드마크 인덱스
  message: string;                // 사용자에게 표시할 메시지
}

// 디바이스 타입
export type DeviceType = "mobile" | "tablet" | "desktop";

// 디바이스 방향
export type DeviceOrientation = "portrait" | "landscape";

// 카메라 뷰
export type CameraView = "front" | "side";

// 레이아웃 설정 인터페이스
export interface LayoutConfig {
  deviceType: DeviceType;
  orientation: DeviceOrientation;
  cameraAreaRatio: number;        // 카메라 영역 비율 (0-1)
  showSidePanel: boolean;         // 사이드 패널 표시 여부
  overlayControls: boolean;       // 오버레이 컨트롤 사용 여부
}
