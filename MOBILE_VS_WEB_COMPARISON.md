# HearO 모바일(v2) vs 웹 앱 비교 분석

> 분석일: 2025-01-16
> 모바일: `C:\Users\dbals\VibeCoding\HearO-v2`
> 웹: `C:\Users\dbals\VibeCoding\HearO_web`

---

## 목차
1. [기술 스택 차이](#1-기술-스택-차이)
2. [포즈 감지 구현 방식](#2-포즈-감지-구현-방식)
3. [디렉토리 구조 및 아키텍처](#3-디렉토리-구조-및-아키텍처)
4. [모바일 전용 기능](#4-모바일-전용-기능)
5. [웹에서 구현해야 할 누락 기능](#5-웹에서-구현해야-할-누락-기능)
6. [코드 품질 및 테스트 커버리지](#6-코드-품질-및-테스트-커버리지)

---

## 1. 기술 스택 차이

### 1.1 프레임워크/라이브러리 비교표

| 구분 | 모바일 (HearO-v2) | 웹 (HearO_web) |
|------|-------------------|----------------|
| **프레임워크** | Expo (React Native) v54 | Next.js v16.1.2 |
| **React 버전** | React 19.1.0, React Native 0.81.5 | React 19.2.3 |
| **라우팅** | expo-router v6 | Next.js App Router |
| **스타일링** | NativeWind v4 + TailwindCSS 3.4 | TailwindCSS v4 |
| **상태관리** | Zustand v5.0.9 | Zustand v5.0.10 |
| **백엔드** | Supabase v2.89.0 | Supabase v2.90.1 |
| **포즈 감지** | @mediapipe/pose + TensorFlow.js | @mediapipe/tasks-vision |
| **3D 렌더링** | - | Three.js, @react-three/fiber, @pixiv/three-vrm |
| **애니메이션** | react-native-reanimated v4.2 | framer-motion v12 |
| **VRM 아바타** | - | @pixiv/three-vrm v3.4.5, Kalidokit v1.1.5 |

### 1.2 모바일 전용 패키지

```javascript
// React Native 전용
"expo-camera": "~17.0.10",
"expo-haptics": "~15.0.8",           // 햅틱 피드백
"expo-secure-store": "~15.0.8",      // 보안 저장소
"expo-file-system": "~19.0.21",      // 파일 시스템
"expo-speech": "~14.0.8",            // 음성 합성
"expo-speech-recognition": "^3.0.1", // 음성 인식
"expo-location": "~19.0.8",          // 위치 서비스
"expo-sms": "~14.0.8",               // SMS 발송
"expo-sharing": "~14.0.8",           // 공유 기능
"lottie-react-native": "~7.3.1",     // Lottie 애니메이션

// 건강/웨어러블 연동
"react-native-health": "^1.19.0",         // Apple HealthKit
"react-native-health-connect": "^3.5.0",  // Google Health Connect

// 네이티브 기능
"@react-native-community/netinfo": "^11.4.1",  // 네트워크 상태
"react-native-gesture-handler": "~2.28.0",     // 제스처
```

### 1.3 웹 전용 패키지

```javascript
// 3D 렌더링 및 VRM
"three": "^0.182.0",
"@react-three/fiber": "^9.5.0",
"@react-three/drei": "^10.7.7",
"@pixiv/three-vrm": "^3.4.5",
"kalidokit": "^1.1.5",            // 포즈 → VRM 애니메이션 변환

// 애니메이션
"framer-motion": "^12.26.2",
```

---

## 2. 포즈 감지 구현 방식

### 2.1 모바일 포즈 감지 아키텍처

**파일:** `src/services/mediapipe.ts` (웹용), `src/services/poseDetection/tensorflowPoseDetection.ts` (네이티브용)

```
+------------------+     +---------------------+     +------------------+
|   expo-camera    | --> |   TensorFlow.js     | --> |    MoveNet       |
|   (네이티브)      |     | @tfjs-react-native  |     | (17 keypoints)   |
+------------------+     +---------------------+     +------------------+
        |
        v (웹 모드 시)
+------------------+     +---------------------+     +------------------+
|  HTMLVideoElement| --> |  @mediapipe/pose    | --> |   BlazePose      |
|   (웹 캔버스)     |     |  tasks-vision       |     | (33 keypoints)   |
+------------------+     +---------------------+     +------------------+
```

**핵심 특징:**
- **플랫폼별 분기**: `.native.tsx` / `.web.tsx` 파일 분리
- **하이브리드 서비스**: `hybridPoseService.ts`로 플랫폼 자동 감지
- **MoveNet → MediaPipe 매핑**: 17개 키포인트를 33개로 확장 매핑
- **CPU 델리게이트 사용**: GPU 대신 CPU로 카메라 안정성 확보
- **15 FPS 타겟**: 성능/정확도 균형

### 2.2 웹 포즈 감지 아키텍처

**파일:** `src/lib/mediapipe/poseDetection.ts`

```
+------------------+     +----------------------+     +------------------+
| HTMLVideoElement | --> | @mediapipe/tasks-    | --> |  PoseLandmarker  |
| (navigator.media |     |      vision          |     | (pose_landmarker |
|    Devices API)  |     | (0.10.22-rc)         |     |   _lite.task)    |
+------------------+     +----------------------+     +------------------+
        |
        v
+------------------+     +---------------------+
| Kalidokit        | --> | VRM Character       |
| (포즈 → 본 매핑)  |     | Animation           |
+------------------+     +---------------------+
```

**핵심 특징:**
- **단일 파이프라인**: @mediapipe/tasks-vision만 사용
- **GPU 델리게이트**: 웹에서 WebGL 가속 활용
- **VIDEO 모드**: 실시간 비디오 프레임 처리
- **Kalidokit 통합**: 포즈 데이터 → VRM 본 애니메이션 변환

### 2.3 주요 차이점

| 항목 | 모바일 | 웹 |
|------|--------|-----|
| **라이브러리** | @mediapipe/pose + TensorFlow.js | @mediapipe/tasks-vision |
| **네이티브 지원** | MoveNet (17 keypoints) | BlazePose만 (33 keypoints) |
| **Z좌표 정규화** | 어깨 너비 기반 정규화 | 기본값 사용 |
| **품질 검증** | 조명/가려진 관절 검증 | 없음 |
| **FPS 타겟** | 15 FPS (setTimeout) | 프레임별 (requestAnimationFrame) |
| **스무딩** | 비활성화 (딜레이 제거) | 없음 |
| **VRM 연동** | 없음 | Kalidokit으로 직접 연동 |

---

## 3. 디렉토리 구조 및 아키텍처

### 3.1 모바일 디렉토리 구조

```
HearO-v2/
├── app/                         # Expo Router (파일 기반 라우팅)
│   ├── (auth)/                  # 인증 관련 화면
│   ├── (clinician)/             # 치료사 전용 화면
│   ├── (main)/                  # 메인 앱 화면 (28개 라우트)
│   │   ├── calibration.tsx      # ROM 측정/캘리브레이션
│   │   ├── exercise.tsx         # 운동 실행 화면
│   │   ├── exercise-result.tsx  # 결과 화면
│   │   ├── hand-rehab.tsx       # 손 재활
│   │   ├── rom-check.tsx        # ROM 체크
│   │   ├── wearable-connect.tsx # 웨어러블 연동
│   │   └── ...
│   ├── (onboarding)/            # 온보딩 플로우
│   └── (story)/                 # 스토리 모드
├── src/
│   ├── __tests__/               # 10개 테스트 파일
│   ├── api/                     # Edge Functions 호출
│   ├── components/              # 22개 하위 디렉토리
│   │   ├── auth/
│   │   ├── avatar/              # 아바타 에디터
│   │   ├── calibration/         # 캘리브레이션 UI
│   │   ├── clinician/           # 치료사 대시보드
│   │   ├── common/              # 공통 컴포넌트
│   │   ├── exercise/            # 운동 관련 (50+ 파일)
│   │   ├── offline/             # 오프라인 상태 UI
│   │   ├── rom/                 # ROM 측정 UI
│   │   ├── safety/              # 안전 관련 UI
│   │   ├── story/               # 스토리 모드 UI
│   │   └── ...
│   ├── config/                  # 설정
│   ├── constants/               # 상수값
│   ├── contexts/                # React Context
│   ├── data/                    # 정적 데이터
│   ├── hooks/                   # 커스텀 훅 (20+ 파일)
│   ├── i18n/                    # 국제화
│   ├── lib/                     # 유틸리티 라이브러리
│   ├── modules/                 # 기능 모듈
│   │   ├── poseDetection/       # 포즈 감지 모듈
│   │   ├── plugins/             # 플러그인 시스템
│   │   └── rehabilitation/      # 재활 모듈
│   ├── services/                # 비즈니스 로직 (70+ 파일)
│   │   ├── ai/                  # AI 서비스
│   │   ├── angle/               # 각도 계산
│   │   ├── auth/                # 인증
│   │   ├── calibration/         # 캘리브레이션
│   │   ├── exerciseDetection/   # 운동 감지 (15+ 디텍터)
│   │   ├── fatigue/             # 피로도 감지
│   │   ├── handRehab/           # 손 재활
│   │   ├── notifications/       # 알림
│   │   ├── offlineQueue/        # 오프라인 큐
│   │   ├── poseDetection/       # 포즈 감지
│   │   ├── realtime/            # 실시간 기능
│   │   ├── safety/              # 안전 기능 (낙상/응급)
│   │   ├── social/              # 소셜 기능
│   │   ├── storyAgents/         # 스토리 AI 에이전트
│   │   ├── sync/                # 동기화
│   │   ├── tts/                 # TTS 서비스
│   │   ├── video/               # 비디오 녹화
│   │   └── wearable/            # 웨어러블 연동
│   ├── stores/                  # Zustand 스토어 (15+ 파일)
│   ├── templates/               # 템플릿
│   ├── types/                   # TypeScript 타입
│   └── utils/                   # 유틸리티
├── locales/                     # 다국어 리소스
├── supabase/                    # Supabase 설정
└── docs/                        # 문서화
```

### 3.2 웹 디렉토리 구조

```
HearO_web/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── exercise/
│   │   │   ├── page.tsx         # 운동 목록
│   │   │   └── [id]/page.tsx    # 운동 실행
│   │   ├── worldview/
│   │   │   └── page.tsx         # 세계관 선택
│   │   ├── layout.tsx           # 루트 레이아웃
│   │   └── page.tsx             # 홈페이지
│   ├── components/
│   │   ├── camera/
│   │   │   └── WebCamera.tsx    # 웹캠 컴포넌트
│   │   ├── feedback/            # 피드백 UI (5개 컴포넌트)
│   │   │   ├── AccuracyMeter.tsx
│   │   │   ├── CoachingMessage.tsx
│   │   │   ├── HoldTimer.tsx
│   │   │   ├── PhaseIndicator.tsx
│   │   │   └── RepCounter.tsx
│   │   ├── story/
│   │   │   └── NPCDialogue.tsx
│   │   ├── three/               # 3D 렌더링
│   │   │   ├── Scene.tsx
│   │   │   └── VRMCharacter.tsx
│   │   ├── ui/                  # UI 컴포넌트
│   │   │   ├── Icon.tsx
│   │   │   └── Logo.tsx
│   │   └── worldview/
│   │       └── WorldviewCarousel.tsx
│   ├── constants/
│   │   ├── npcCharacters.ts
│   │   ├── npcDialogueTemplates.ts
│   │   ├── themes.ts
│   │   └── worldviews.ts
│   ├── hooks/                   # (비어있음)
│   ├── lib/
│   │   ├── calibration/         # 캘리브레이션
│   │   │   ├── CalibrationManager.ts
│   │   │   └── depthCorrection.ts
│   │   ├── exercise/
│   │   │   ├── angle/           # 각도 계산 (7개 파일)
│   │   │   └── detection/       # 운동 감지 (9개 디텍터)
│   │   ├── kalidokit/
│   │   │   └── vrmAnimator.ts
│   │   └── mediapipe/
│   │       └── poseDetection.ts
│   ├── services/
│   │   ├── sfxService.ts        # 효과음
│   │   ├── storyService.ts      # 스토리
│   │   └── ttsService.ts        # TTS
│   ├── stores/
│   │   ├── useCalibrationStore.ts
│   │   ├── useCharacterStore.ts
│   │   ├── useExerciseStore.ts
│   │   └── useWorldStore.ts
│   └── types/
│       ├── calibration.ts
│       ├── camera.ts
│       ├── exercise.ts
│       ├── pose.ts
│       └── vrm.ts
└── public/                      # 정적 자산
```

### 3.3 아키텍처 비교

| 항목 | 모바일 | 웹 |
|------|--------|-----|
| **총 소스 파일 수** | ~200+ | ~55 |
| **컴포넌트 수** | 100+ | ~18 |
| **서비스 수** | 70+ | ~3 |
| **스토어 수** | 15+ | 4 |
| **훅 수** | 20+ | 0 (비어있음) |
| **라우트 수** | 30+ | 4 |
| **운동 디텍터** | 15+ (squat, lunge, plank...) | 9 |

---

## 4. 모바일 전용 기능

### 4.1 햅틱 피드백 (expo-haptics)

**사용처:**
- 버튼 클릭
- 운동 반복 완료
- 오류/경고 알림
- 통증 레벨 슬라이더
- 세션 복구 안내

**관련 파일:**
```
src/components/ui/Button.tsx
src/components/exercise/PainScaleWidget.tsx
src/components/exercise/SessionRecoveryBanner.tsx
src/components/onboarding/PrimaryButton.tsx
src/services/ttsService/exerciseSpeech.ts
```

### 4.2 웨어러블 연동 (HealthKit / Health Connect)

**파일:** `src/services/wearable/wearableService.ts`

**기능:**
- 실시간 심박수 모니터링
- HRV(심박 변동성) 데이터 수집
- 활동 칼로리/걸음 수 조회
- 운동 기록 저장/동기화
- HRV 기반 피로도 감지

**관련 컴포넌트:**
```
app/(main)/wearable-connect.tsx
src/components/exercise/HeartRateMonitor.tsx
src/components/exercise/WearableFatigueWarning.tsx
src/services/wearable/hrvFatigueService.ts
```

### 4.3 오프라인 동기화

**파일:** `src/services/offlineQueueService.ts`

**기능:**
- 네트워크 장애 시 API 요청 큐잉
- 지수 백오프 재시도
- 충돌 해결 전략 (server_wins, client_wins, manual)
- HIPAA 준수 데이터 암호화
- 백그라운드 동기화
- 배터리/네트워크 유형별 제어

**관련 컴포넌트:**
```
src/components/offline/NetworkStatusIndicator.tsx
src/components/offline/SyncProgressModal.tsx
src/components/common/SyncStatusIndicator.tsx
src/stores/useOfflineStore.ts
```

### 4.4 낙상 감지 및 응급 알림

**파일:** `src/services/safety/fallDetectionService.ts`

**감지 메커니즘:**
1. **포즈 기반**: 수직 위치 급락, 자세 변화, 가시성 급락
2. **웨어러블 기반**: 가속도 급변, 심박수 급등
3. **복합 분석**: 두 데이터 소스 결합

**안전 기능:**
- 오탐지 방지 (운동 동작 필터링)
- 카운트다운 후 자동 응급 알림
- GPS 위치 정보 첨부
- SMS/전화 자동 발신

### 4.5 통증 추적

**관련 파일:**
```
src/components/exercise/PainScaleWidget.tsx
src/components/exercise/PainAlert.tsx
src/components/exercise/PainCheckModal.tsx
src/components/calibration/PainCheckPrompt.tsx
src/components/safety/PainLocationPicker.tsx
src/hooks/usePainTracking.ts
```

**기능:**
- 0-10 통증 척도 입력
- 신체 부위별 통증 위치 마킹
- 운동 중 통증 감지 시 자동 일시정지
- 통증 이력 추적

### 4.6 치료사 연동 (Clinician Portal)

**관련 파일:**
```
app/(clinician)/
src/components/clinician/RealtimePatientStats.tsx
src/components/clinician/RealtimeActivityFeed.tsx
src/services/clinicianAuthService.ts
src/services/clinicianInviteService.ts
app/(main)/clinician-connect.tsx
app/(main)/clinician-feedback.tsx
```

**기능:**
- 실시간 환자 모니터링
- 운동 처방 전송
- 피드백 교환
- 활동 피드

### 4.7 손 재활 (Hand Rehabilitation)

**관련 파일:**
```
app/(main)/hand-rehab.tsx
app/(main)/hand-calibration.tsx
src/services/handRehab/
src/services/handAngleCalculation.ts
src/services/mediapipeHand.ts
src/components/exercise/HandSkeleton.tsx
src/components/exercise/HandRehabProgress.tsx
```

**기능:**
- 손가락 관절 각도 측정
- 손 재활 운동 가이드
- MediaPipe Hands 연동

### 4.8 비디오 녹화

**파일:** `src/services/video/`

**기능:**
- 운동 세션 녹화
- 녹화 영상 업로드
- 치료사 리뷰용 공유

### 4.9 열 스로틀링 감지

**파일:** `src/services/thermalThrottling.ts`

**기능:**
- 기기 온도 모니터링
- 과열 시 자동 품질 저하
- 배터리 보호

### 4.10 기타 모바일 전용

| 기능 | 설명 |
|------|------|
| **보안 저장소** | expo-secure-store로 민감 데이터 저장 |
| **위치 서비스** | 낙상 시 GPS 위치 전송 |
| **SMS 발송** | 응급 연락처에 SMS 전송 |
| **공유** | 결과 이미지/리포트 공유 |
| **음성 인식** | 음성 명령 지원 |
| **Lottie 애니메이션** | 고품질 벡터 애니메이션 |

---

## 5. 웹에서 구현해야 할 누락 기능

### 5.1 Critical (필수 구현)

| 우선순위 | 기능 | 설명 | 예상 난이도 |
|----------|------|------|------------|
| P0 | **Error Boundary** | 앱 크래시 방지 | 낮음 |
| P0 | **로딩/에러 상태 UI** | 사용자 피드백 | 낮음 |
| P0 | **인증 시스템** | Supabase Auth 연동 | 중간 |
| P0 | **운동 결과 저장** | Supabase 연동 | 중간 |

### 5.2 High (높은 우선순위)

| 우선순위 | 기능 | 설명 | 예상 난이도 |
|----------|------|------|------------|
| P1 | **ROM 측정/캘리브레이션** | 관절 가동 범위 측정 | 높음 |
| P1 | **운동 결과 화면** | 상세 분석, 차트 | 중간 |
| P1 | **설정 화면** | 사용자 설정 관리 | 중간 |
| P1 | **스로틀링된 상태 업데이트** | 성능 최적화 | 낮음 |
| P1 | **포즈 품질 검증** | 조명/가려진 관절 체크 | 중간 |
| P1 | **추가 운동 디텍터** | 6개 추가 필요 | 중간 |

### 5.3 Medium (중간 우선순위)

| 우선순위 | 기능 | 설명 | 예상 난이도 |
|----------|------|------|------------|
| P2 | **통증 추적** | 통증 척도/위치 입력 | 중간 |
| P2 | **세션 복구** | 중단된 세션 복구 | 중간 |
| P2 | **진행 기록** | 운동 이력 대시보드 | 중간 |
| P2 | **업적 시스템** | 게이미피케이션 | 중간 |
| P2 | **금기사항 체크** | 운동 전 안전 검증 | 중간 |
| P2 | **다국어 지원** | i18n 설정 | 낮음 |

### 5.4 Low (낮은 우선순위 / 웹 제외 가능)

| 우선순위 | 기능 | 웹 대안 | 비고 |
|----------|------|---------|------|
| P3 | 햅틱 피드백 | 시각/청각 피드백 강화 | 웹에서 미지원 |
| P3 | 웨어러블 연동 | Web Bluetooth API (제한적) | 브라우저 지원 제한 |
| P3 | 오프라인 동기화 | Service Worker | PWA로 구현 가능 |
| P3 | 낙상 감지 | 포즈 기반만 가능 | 웨어러블 없이 제한적 |
| P3 | 손 재활 | MediaPipe Hands 웹 버전 | 별도 구현 필요 |
| P3 | 비디오 녹화 | MediaRecorder API | 웹에서 구현 가능 |
| P3 | 치료사 연동 | 별도 웹 포털 | 기획 검토 필요 |

### 5.5 기능별 상세 구현 가이드

#### 5.5.1 Error Boundary (P0)

```typescript
// src/components/ErrorBoundary.tsx
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Sentry/LogRocket 등 에러 추적 서비스 연동
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

#### 5.5.2 스로틀된 상태 업데이트 (P1)

```typescript
// src/hooks/useThrottle.ts
import { useCallback, useRef } from 'react';

export function useThrottle<T>(callback: (value: T) => void, delay: number) {
  const lastCall = useRef(0);

  return useCallback((value: T) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      callback(value);
    }
  }, [callback, delay]);
}

// 사용 예시 (exercise/[id]/page.tsx)
const throttledUpdate = useThrottle((result: DetectionResult) => {
  setPhase(result.phase);
  updateAccuracy(result.accuracy);
  updateAngle(result.currentAngle);
  setFeedback(result.feedback);
}, 100);  // 100ms 간격으로 제한
```

#### 5.5.3 포즈 품질 검증 (P1)

```typescript
// src/lib/mediapipe/poseQuality.ts
export interface QualityCheckResult {
  isGood: boolean;
  issues: string[];
}

export function validatePoseQuality(
  landmarks: Landmark[],
  videoElement: HTMLVideoElement
): QualityCheckResult {
  const issues: string[] = [];

  // 1. 가시성 검사 (주요 관절)
  const keyJoints = [11, 12, 23, 24]; // 어깨, 힙
  const avgVisibility = keyJoints.reduce(
    (sum, i) => sum + (landmarks[i]?.visibility || 0), 0
  ) / keyJoints.length;

  if (avgVisibility < 0.5) {
    issues.push('관절이 잘 보이지 않습니다. 카메라 위치를 조정해주세요.');
  }

  // 2. 프레임 내 위치 검사
  const nose = landmarks[0];
  if (nose.y < 0.1 || nose.y > 0.9) {
    issues.push('화면 중앙에 서주세요.');
  }

  return {
    isGood: issues.length === 0,
    issues,
  };
}
```

---

## 6. 코드 품질 및 테스트 커버리지

### 6.1 테스트 현황 비교

| 항목 | 모바일 | 웹 |
|------|--------|-----|
| **테스트 프레임워크** | Jest + ts-jest | 없음 |
| **E2E 테스트** | Playwright | 없음 |
| **테스트 파일 수** | 10개 | 0개 |
| **테스트 커버리지 설정** | 있음 (services, utils) | 없음 |
| **Mock 설정** | 완비 (MediaPipe, TensorFlow, Camera) | 없음 |

### 6.2 모바일 테스트 파일 목록

```
src/__tests__/
├── accuracyValidation.test.ts    # 정확도 검증
├── angleCalculation.test.ts      # 각도 계산
├── calibration.test.ts           # 캘리브레이션
├── exerciseRecognition.test.ts   # 운동 인식
├── pain-tracking.test.ts         # 통증 추적
├── poseStability.test.ts         # 포즈 안정성
└── setup.ts                      # 테스트 설정

src/services/offlineQueue/__tests__/
├── phase1Integration.test.ts     # 오프라인 큐 Phase 1
└── phase2Integration.test.ts     # 오프라인 큐 Phase 2

src/services/sync/__tests__/
└── conflictResolution.test.ts    # 충돌 해결

src/utils/__tests__/
└── contraindicationChecker.test.ts  # 금기사항 체커
```

### 6.3 코드 품질 도구

| 도구 | 모바일 | 웹 |
|------|--------|-----|
| **ESLint** | eslint-config-expo v10 | eslint-config-next v16 |
| **TypeScript** | v5.9.2 (strict 설정) | v5 |
| **prettier** | 없음 (ESLint에 포함) | 없음 |
| **Sentry** | @sentry/react-native v7 | 없음 |

### 6.4 웹 프로젝트 개선 필요 사항

#### 6.4.1 테스트 환경 구축 권장

```json
// package.json에 추가
{
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "jest": "^30.0.0",
    "jest-environment-jsdom": "^30.0.0",
    "@types/jest": "^30.0.0"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

#### 6.4.2 코드 커버리지 대상 (권장)

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    'src/stores/**/*.ts',
    'src/services/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### 6.5 품질 지표 비교

| 지표 | 모바일 | 웹 | 권장 |
|------|--------|-----|------|
| **TypeScript strict** | Yes | Yes | - |
| **@ts-expect-error 사용** | 일부 | 일부 | 최소화 |
| **any 타입 사용** | 최소 | 일부 | 금지 |
| **에러 추적** | Sentry | 없음 | 추가 권장 |
| **로깅 시스템** | createLogger | console.log | 통합 로거 권장 |

---

## 요약 및 권장 사항

### 즉시 조치 (1주 내)

1. **Error Boundary 추가** - 앱 안정성 필수
2. **상태 업데이트 스로틀링** - 성능 최적화
3. **MediaPipe 버전 고정** - RC 버전에서 안정 버전으로
4. **로딩/에러 상태 UI** - 사용자 경험 개선

### 단기 계획 (1개월)

1. **인증 시스템 구축** - Supabase Auth 연동
2. **운동 결과 저장/조회** - 데이터 영속성
3. **테스트 환경 구축** - Jest + Testing Library
4. **추가 운동 디텍터** - 누락된 6개 운동

### 중기 계획 (3개월)

1. **ROM 측정 기능** - 캘리브레이션 시스템
2. **통증 추적** - 안전 기능
3. **진행 기록/대시보드** - 사용자 동기 부여
4. **PWA 지원** - 오프라인/설치 가능

### 웹에서 제외 권장

- 웨어러블 연동 (브라우저 제한)
- 낙상 자동 감지 (정확도 제한)
- SMS/전화 발신 (브라우저 불가)
- 손 재활 (별도 프로젝트로 분리 권장)

---

*이 문서는 자동 생성되었으며, 코드 변경 시 업데이트가 필요합니다.*
