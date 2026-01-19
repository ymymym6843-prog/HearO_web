# HearO Web - 3D 캐릭터 기반 재활 운동 웹 애플리케이션 개발 프롬프트

> **이 프롬프트를 Claude Code에 전달하여 3D 캐릭터 기반 웹 앱을 개발하세요.**

---

## 프로젝트 개요

### 배경
청각장애인을 위한 재활 헬스케어 웹 애플리케이션 "HearO Web"을 개발합니다.

- **기존 앱**: React Native(Expo) 기반 모바일 앱 (`C:\Users\dbals\VibeCoding\HearO-v2`)
- **현재 구현**: 카메라 화면 위에 MediaPipe SVG 스켈레톤 오버레이
- **목표**: Kalidokit + Three.js를 활용한 **VRM 3D 캐릭터**가 사용자 동작을 실시간으로 따라하는 방식

### 핵심 차별점
| 기존 모바일 앱 | 신규 웹앱 |
|---------------|----------|
| SVG 스켈레톤 오버레이 | **VRM 3D 캐릭터 애니메이션** |
| 카메라 피드 위에 2D 표시 | **3D 캐릭터가 사용자 동작 미러링** |
| 텍스트 기반 피드백 | **캐릭터 표정/제스처 피드백** |

---

## 프로젝트 구조 결정

### ⭐ 새 프로젝트 생성 (권장)

**이유:**
1. React Native(Expo) → Next.js는 완전히 다른 런타임
2. 기존 83개 의존성 중 웹앱에서 사용 가능한 것은 5~6개 뿐
3. Three.js, Kalidokit, @react-three/fiber는 웹 전용 라이브러리
4. 클린 스타트가 의존성 정리보다 효율적

### 재사용 코드 (기존 프로젝트에서 포팅)

```
C:\Users\dbals\VibeCoding\HearO-v2 에서 복사:

✅ 100% 재사용 (순수 TypeScript):
├── src/services/angle/              → lib/exercise/angle/
│   ├── core.ts                      # 2D/3D 각도 계산
│   ├── joint.ts                     # 관절 각도
│   ├── rom.ts                       # ROM 분석
│   ├── phase.ts                     # 운동 페이즈 감지
│   ├── vector.ts                    # 벡터 연산
│   └── utils.ts                     # 스무딩, 칼만 필터
│
├── src/services/exerciseDetection/detectors/  → lib/exercise/detectors/
│   ├── squat.ts                     # 스쿼트
│   ├── bridge.ts                    # 브릿지
│   ├── deadBug.ts                   # 데드버그
│   ├── birdDog.ts                   # 버드독
│   ├── plankHold.ts                 # 플랭크
│   ├── straightLegRaise.ts          # 다리 들어올리기
│   ├── highKnees.ts                 # 하이니즈
│   └── sidePlank.ts                 # 사이드 플랭크
│
├── src/types/                       → types/
│   ├── exercise.ts                  # 운동 타입 정의
│   ├── pose.ts                      # 포즈/랜드마크 타입
│   └── hand.ts                      # 손 랜드마크 타입
│
├── src/constants/                   → lib/constants/
│   └── themes.ts                    # 세계관별 테마 색상
│
└── src/stores/                      → stores/ (약간 수정 필요)
    ├── useExerciseStore.ts          # 운동 상태 관리
    └── useWorldStore.ts             # 세계관 상태

✅ 선택적 재사용:
├── assets/images/                   → public/images/
├── assets/sounds/                   → public/sounds/
└── src/services/handAngleCalculation.ts  → lib/exercise/handAngle.ts
```

### 제외 기능 (웹앱 불필요)

```
❌ 완전 제외:
├── expo-* 전체                      # 네이티브 전용
├── react-native-* 전체              # 네이티브 전용
├── src/services/wearable/           # 웨어러블 연동
├── src/services/offlineQueue/       # 복잡한 오프라인 동기화
├── src/services/realtime/           # 실시간 모니터링
├── app/(clinician)/                 # 임상의 포털 (별도 프로젝트)
├── 햅틱 피드백                       # expo-haptics
└── 네이티브 알림                     # expo-notifications

⚠️ 단순화:
├── 오프라인 지원                     # localStorage/IndexedDB로 간단히
└── TTS                              # Web Speech API 사용
```

---

## 기술 스택

### 필수 라이브러리

```json
{
  "dependencies": {
    // 프레임워크
    "next": "^14.x",
    "react": "^18.x",
    "typescript": "^5.x",

    // ⭐ 3D 렌더링 (핵심)
    "three": "^0.160+",
    "@react-three/fiber": "^8.x",
    "@react-three/drei": "^9.x",
    "@pixiv/three-vrm": "^2.x",
    "kalidokit": "^1.1+",

    // 포즈 인식
    "@mediapipe/pose": "^0.5.x",
    "@mediapipe/hands": "^0.4.x",
    "@mediapipe/tasks-vision": "^0.10.x",

    // 상태 관리
    "zustand": "^4.x",

    // 스타일링
    "tailwindcss": "^3.x",
    "framer-motion": "^10.x",

    // 백엔드
    "@supabase/supabase-js": "^2.x"
  }
}
```

### Kalidokit + VRM 파이프라인

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   WebCam    │────▶│  MediaPipe   │────▶│  Kalidokit  │
│   Stream    │     │  Pose + Hand │     │  Rigging    │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                    ┌──────────────┐            │
                    │  VRM Model   │◀───────────┘
                    │  (Three.js)  │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ 3D Character │   │  각도 계산   │   │  운동 감지   │
│  Animation   │   │ (기존 로직)  │   │ (기존 로직)  │
└──────────────┘   └──────────────┘   └──────────────┘
```

---

## 폴더 구조

```
hearo-web/
├── app/                              # Next.js App Router
│   ├── page.tsx                      # 홈 (세계관 선택)
│   ├── calibration/page.tsx          # ROM 캘리브레이션
│   ├── exercise/
│   │   ├── page.tsx                  # 운동 목록
│   │   └── [id]/page.tsx             # 운동 실행 (3D 캐릭터)
│   ├── result/page.tsx               # 결과 화면
│   └── layout.tsx                    # 공통 레이아웃
│
├── components/
│   ├── three/                        # ⭐ 3D 렌더링 (신규)
│   │   ├── VRMCharacter.tsx          # VRM 캐릭터 컴포넌트
│   │   ├── Scene.tsx                 # Three.js Scene
│   │   ├── KalidokitBridge.tsx       # MediaPipe → VRM 브릿지
│   │   └── CharacterExpression.tsx   # 캐릭터 표정 제어
│   │
│   ├── camera/
│   │   ├── WebCamera.tsx             # 카메라 스트림
│   │   └── MediaPipeProcessor.tsx    # MediaPipe 처리
│   │
│   ├── exercise/
│   │   ├── ExerciseGuide.tsx         # 운동 가이드 오버레이
│   │   ├── FeedbackPanel.tsx         # 실시간 피드백
│   │   └── RepCounter.tsx            # 횟수 카운터
│   │
│   └── ui/                           # 공통 UI
│       ├── Button.tsx
│       ├── Card.tsx
│       └── ProgressBar.tsx
│
├── lib/
│   ├── mediapipe/                    # MediaPipe 래퍼
│   │   ├── poseDetection.ts
│   │   └── handDetection.ts
│   │
│   ├── kalidokit/                    # Kalidokit 래퍼
│   │   ├── vrmAnimator.ts            # VRM 본 애니메이션
│   │   └── expressionController.ts   # 표정 제어
│   │
│   ├── exercise/                     # ⭐ 기존 코드 포팅
│   │   ├── angle/                    # src/services/angle/ 포팅
│   │   │   ├── core.ts
│   │   │   ├── joint.ts
│   │   │   ├── rom.ts
│   │   │   └── index.ts
│   │   │
│   │   └── detectors/                # src/services/exerciseDetection/detectors/ 포팅
│   │       ├── squat.ts
│   │       ├── bridge.ts
│   │       ├── deadBug.ts
│   │       └── index.ts
│   │
│   └── supabase/
│       └── client.ts
│
├── stores/                           # Zustand 스토어
│   ├── useExerciseStore.ts           # 운동 상태 (기존 코드 참고)
│   ├── useWorldStore.ts              # 세계관 상태
│   ├── useCharacterStore.ts          # 3D 캐릭터 상태 (신규)
│   └── useCalibrationStore.ts        # 캘리브레이션 상태
│
├── types/                            # TypeScript 타입 (기존 코드 포팅)
│   ├── exercise.ts
│   ├── pose.ts
│   ├── hand.ts
│   └── vrm.ts                        # VRM 관련 타입 (신규)
│
├── constants/
│   ├── themes.ts                     # 세계관 테마 (기존 코드 포팅)
│   └── exercises.ts                  # 운동 정의
│
├── hooks/
│   ├── useMediaPipe.ts               # MediaPipe 훅
│   ├── useVRMCharacter.ts            # VRM 캐릭터 훅
│   └── useExerciseDetection.ts       # 운동 감지 훅
│
└── public/
    ├── models/                       # VRM 모델 파일
    │   ├── fantasy_hero.vrm
    │   ├── sports_athlete.vrm
    │   ├── idol_star.vrm
    │   ├── sf_pilot.vrm
    │   ├── zombie_survivor.vrm
    │   └── spy_agent.vrm
    │
    ├── images/                       # 기존 이미지 에셋
    └── sounds/                       # 기존 사운드 에셋
```

---

## 핵심 구현 가이드

### 1. MediaPipe → Kalidokit → VRM 통합

```typescript
// lib/kalidokit/vrmAnimator.ts

import * as Kalidokit from 'kalidokit';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { NormalizedLandmarkList } from '@mediapipe/pose';

/**
 * MediaPipe 랜드마크를 VRM 캐릭터에 적용
 * @param vrm - VRM 모델 인스턴스
 * @param poseLandmarks - MediaPipe Pose 결과 (33개 랜드마크)
 * @param handLandmarks - MediaPipe Hands 결과 (좌/우 각 21개)
 */
export function applyPoseToVRM(
  vrm: VRM,
  poseLandmarks: NormalizedLandmarkList,
  handLandmarks?: { left?: NormalizedLandmarkList; right?: NormalizedLandmarkList }
): void {
  if (!vrm.humanoid) return;

  // 1. Kalidokit으로 포즈 리깅 데이터 계산
  const poseRig = Kalidokit.Pose.solve(poseLandmarks, {
    runtime: 'mediapipe',
    video: null,
  });

  // 2. 척추 회전 적용
  if (poseRig) {
    // 척추
    applyRotation(vrm, VRMHumanBoneName.Spine, poseRig.Spine);
    applyRotation(vrm, VRMHumanBoneName.Chest, poseRig.Spine); // 가슴도 약간 적용

    // 엉덩이
    applyRotation(vrm, VRMHumanBoneName.Hips, poseRig.Hips.rotation);

    // 왼쪽 팔
    applyRotation(vrm, VRMHumanBoneName.LeftUpperArm, poseRig.LeftUpperArm);
    applyRotation(vrm, VRMHumanBoneName.LeftLowerArm, poseRig.LeftLowerArm);

    // 오른쪽 팔
    applyRotation(vrm, VRMHumanBoneName.RightUpperArm, poseRig.RightUpperArm);
    applyRotation(vrm, VRMHumanBoneName.RightLowerArm, poseRig.RightLowerArm);

    // 왼쪽 다리
    applyRotation(vrm, VRMHumanBoneName.LeftUpperLeg, poseRig.LeftUpperLeg);
    applyRotation(vrm, VRMHumanBoneName.LeftLowerLeg, poseRig.LeftLowerLeg);

    // 오른쪽 다리
    applyRotation(vrm, VRMHumanBoneName.RightUpperLeg, poseRig.RightUpperLeg);
    applyRotation(vrm, VRMHumanBoneName.RightLowerLeg, poseRig.RightLowerLeg);
  }

  // 3. 손가락 리깅 (옵션)
  if (handLandmarks?.left) {
    const leftHandRig = Kalidokit.Hand.solve(handLandmarks.left, 'Left');
    applyHandRig(vrm, leftHandRig, 'Left');
  }
  if (handLandmarks?.right) {
    const rightHandRig = Kalidokit.Hand.solve(handLandmarks.right, 'Right');
    applyHandRig(vrm, rightHandRig, 'Right');
  }
}

// 회전 적용 헬퍼 함수
function applyRotation(
  vrm: VRM,
  boneName: VRMHumanBoneName,
  rotation: { x: number; y: number; z: number } | undefined
): void {
  if (!rotation) return;
  const bone = vrm.humanoid?.getNormalizedBoneNode(boneName);
  if (bone) {
    bone.rotation.set(rotation.x, rotation.y, rotation.z);
  }
}
```

### 2. 운동 감지 통합 (기존 로직 활용)

```typescript
// hooks/useExerciseDetection.ts

import { useMemo, useCallback } from 'react';
import { useExerciseStore } from '@/stores/useExerciseStore';
import { detectSquat } from '@/lib/exercise/detectors/squat';
import { detectBridge } from '@/lib/exercise/detectors/bridge';
// ... 다른 감지기 import

import type { Landmark, ExerciseDetectionResult } from '@/types';

const DETECTORS: Record<string, (landmarks: Landmark[]) => ExerciseDetectionResult> = {
  squat: detectSquat,
  bridge: detectBridge,
  dead_bug: detectDeadBug,
  bird_dog: detectBirdDog,
  plank_hold: detectPlankHold,
  straight_leg_raise: detectStraightLegRaise,
  high_knees: detectHighKnees,
  side_plank: detectSidePlank,
};

export function useExerciseDetection() {
  const { currentExercise, incrementReps, updateAccuracy } = useExerciseStore();

  const detectExercise = useCallback((landmarks: Landmark[]): ExerciseDetectionResult | null => {
    if (!currentExercise || !DETECTORS[currentExercise]) {
      return null;
    }

    const detector = DETECTORS[currentExercise];
    const result = detector(landmarks);

    // 상태 업데이트
    if (result.repCompleted) {
      incrementReps();
    }
    updateAccuracy(result.accuracy);

    return result;
  }, [currentExercise, incrementReps, updateAccuracy]);

  return { detectExercise };
}
```

### 3. VRM 캐릭터 컴포넌트

```typescript
// components/three/VRMCharacter.tsx

'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { applyPoseToVRM } from '@/lib/kalidokit/vrmAnimator';
import { useCharacterStore } from '@/stores/useCharacterStore';

interface VRMCharacterProps {
  modelUrl: string;
  onLoaded?: (vrm: VRM) => void;
}

export function VRMCharacter({ modelUrl, onLoaded }: VRMCharacterProps) {
  const vrmRef = useRef<VRM | null>(null);
  const { scene } = useThree();
  const { poseLandmarks, handLandmarks } = useCharacterStore();

  // VRM 모델 로드
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(modelUrl, (gltf) => {
      const vrm = gltf.userData.vrm as VRM;
      vrmRef.current = vrm;
      scene.add(vrm.scene);

      // T-Pose에서 자연스러운 자세로
      vrm.scene.rotation.y = Math.PI;

      onLoaded?.(vrm);
    });

    return () => {
      if (vrmRef.current) {
        scene.remove(vrmRef.current.scene);
        vrmRef.current = null;
      }
    };
  }, [modelUrl, scene, onLoaded]);

  // 매 프레임마다 포즈 업데이트
  useFrame(() => {
    if (vrmRef.current && poseLandmarks) {
      applyPoseToVRM(vrmRef.current, poseLandmarks, handLandmarks);
      vrmRef.current.update(1 / 60); // 60fps 기준
    }
  });

  return null; // 실제 렌더링은 VRM.scene에서 처리
}
```

### 4. 운동 화면 통합

```typescript
// app/exercise/[id]/page.tsx

'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { VRMCharacter } from '@/components/three/VRMCharacter';
import { WebCamera } from '@/components/camera/WebCamera';
import { MediaPipeProcessor } from '@/components/camera/MediaPipeProcessor';
import { FeedbackPanel } from '@/components/exercise/FeedbackPanel';
import { useExerciseDetection } from '@/hooks/useExerciseDetection';
import { useWorldStore } from '@/stores/useWorldStore';
import { useCharacterStore } from '@/stores/useCharacterStore';

const WORLDVIEW_MODELS: Record<string, string> = {
  fantasy: '/models/fantasy_hero.vrm',
  sports: '/models/sports_athlete.vrm',
  idol: '/models/idol_star.vrm',
  sf: '/models/sf_pilot.vrm',
  zombie: '/models/zombie_survivor.vrm',
  spy: '/models/spy_agent.vrm',
};

export default function ExercisePage({ params }: { params: { id: string } }) {
  const { currentWorldview } = useWorldStore();
  const { setPoseLandmarks, setHandLandmarks } = useCharacterStore();
  const { detectExercise } = useExerciseDetection();

  const modelUrl = WORLDVIEW_MODELS[currentWorldview] || WORLDVIEW_MODELS.fantasy;

  // MediaPipe 결과 처리
  const handlePoseResults = (landmarks: any) => {
    setPoseLandmarks(landmarks);
    const result = detectExercise(landmarks);
    // 피드백 표시 등
  };

  return (
    <div className="relative w-full h-screen">
      {/* 3D 캐릭터 영역 (60%) */}
      <div className="absolute inset-0 w-[60%]">
        <Canvas camera={{ position: [0, 1.5, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[0, 2, 2]} intensity={1} />
          <VRMCharacter modelUrl={modelUrl} />
          <OrbitControls enableZoom={false} />
          <Environment preset="studio" />
        </Canvas>
      </div>

      {/* 카메라 피드 (작게, 우측 하단) */}
      <div className="absolute bottom-4 right-4 w-[300px] h-[225px] rounded-lg overflow-hidden shadow-lg">
        <WebCamera>
          <MediaPipeProcessor onResults={handlePoseResults} />
        </WebCamera>
      </div>

      {/* 피드백 패널 */}
      <div className="absolute top-4 right-4 w-[300px]">
        <FeedbackPanel exerciseId={params.id} />
      </div>
    </div>
  );
}
```

---

## MVP 기능 범위 (Phase 1)

### 포함 기능

| 기능 | 상세 | 우선순위 |
|------|------|----------|
| **3D 캐릭터** | Kalidokit + VRM 실시간 애니메이션 | ⭐ 필수 |
| **포즈 인식** | MediaPipe Pose (33 랜드마크) | ⭐ 필수 |
| **운동 감지** | 8개 MVP 운동 (기존 로직 포팅) | ⭐ 필수 |
| **각도 계산** | 2D/3D 각도, ROM 측정 (기존 로직) | ⭐ 필수 |
| **세계관** | 6개 테마 + 캐릭터 모델 | ⭐ 필수 |
| **결과 화면** | 운동 요약, 캐릭터 축하 애니메이션 | 높음 |
| **Supabase** | 인증, 운동 기록 저장 | 높음 |
| **음성 피드백** | Web Speech API TTS | 보통 |

### 제외 기능 (Phase 1)

- 웨어러블 기기 연동
- 햅틱 피드백
- 임상의 포털
- 복잡한 오프라인 동기화
- 손 재활 운동 (Phase 2)
- 소셜 기능 (Phase 2)

---

## MVP 운동 목록 (8개)

기존 프로젝트의 감지기를 그대로 포팅:

| # | 운동 | 파일 | 주요 각도 |
|---|------|------|----------|
| 1 | 스쿼트 | squat.ts | 무릎 각도 (170° → 90° → 170°) |
| 2 | 브릿지 | bridge.ts | 엉덩이 높이, 몸통-허벅지 각도 |
| 3 | 데드버그 | deadBug.ts | 팔-다리 교차 움직임 |
| 4 | 버드독 | birdDog.ts | 대각선 팔-다리 정렬 |
| 5 | 플랭크 | plankHold.ts | 몸통 정렬, 유지 시간 |
| 6 | 다리 들어올리기 | straightLegRaise.ts | 다리 각도 (0° → 90°) |
| 7 | 하이니즈 | highKnees.ts | 무릎 높이, 템포 |
| 8 | 사이드 플랭크 | sidePlank.ts | 측면 몸통 정렬 |

---

## VRM 모델 준비

### 무료 VRM 소스

1. **VRoid Hub** (https://hub.vroid.com/)
   - 무료 VRM 모델 다운로드 가능
   - 세계관별 캐릭터 검색

2. **VRoid Studio** (https://vroid.com/studio)
   - 직접 캐릭터 제작 가능
   - VRM 형식으로 내보내기

3. **Booth** (https://booth.pm/)
   - 유/무료 VRM 모델 마켓

### 세계관별 캐릭터 컨셉

| 세계관 | 캐릭터 컨셉 | 색상 테마 |
|--------|------------|----------|
| Fantasy | 기사/마법사 | #8B5CF6 (보라) |
| Sports | 운동선수/코치 | #EF4444 (빨강) |
| Idol | 아이돌/가수 | #EC4899 (핑크) |
| SF | 파일럿/로봇 | #06B6D4 (시안) |
| Zombie | 생존자/영웅 | #84CC16 (라임) |
| Spy | 스파이/요원 | #1F2937 (다크) |

---

## 시작 명령어

```bash
# 1. 프로젝트 생성 (별도 폴더에)
cd C:\Users\dbals\VibeCoding
npx create-next-app@latest hearo-web --typescript --tailwind --eslint --app --src-dir

# 2. 핵심 의존성 설치
cd hearo-web
npm install three @react-three/fiber @react-three/drei @pixiv/three-vrm kalidokit
npm install @mediapipe/pose @mediapipe/hands @mediapipe/tasks-vision
npm install zustand framer-motion
npm install @supabase/supabase-js

# 3. 개발 서버 시작
npm run dev
```

---

## 개발 로드맵

### Phase 1: 기초 인프라 (1주)
- [ ] Next.js 프로젝트 설정
- [ ] 타입 정의 포팅 (types/)
- [ ] MediaPipe 웹 연동
- [ ] 기본 카메라 컴포넌트

### Phase 2: 3D 시스템 (1주)
- [ ] Three.js + React Three Fiber 설정
- [ ] VRM 모델 로딩
- [ ] Kalidokit 통합
- [ ] 실시간 캐릭터 애니메이션

### Phase 3: 운동 시스템 (1주)
- [ ] 각도 계산 모듈 포팅
- [ ] 8개 운동 감지기 포팅
- [ ] 운동 상태 관리 (Zustand)
- [ ] 피드백 UI

### Phase 4: UX 완성 (1주)
- [ ] 세계관 시스템 + 캐릭터 모델
- [ ] 결과 화면 + 캐릭터 애니메이션
- [ ] Supabase 연동
- [ ] 반응형 레이아웃

---

## 참고 자료

- [Kalidokit GitHub](https://github.com/yeemachine/kalidokit)
- [Three.js VRM](https://github.com/pixiv/three-vrm)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [MediaPipe Pose](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
- [VRoid Hub](https://hub.vroid.com/)

---

## 핵심 지침

1. **기존 코드 최대 활용**: 운동 감지 로직, 각도 계산은 검증된 코드이므로 그대로 포팅
2. **Kalidokit + VRM이 핵심 차별점**: 2D 스켈레톤 대신 3D 캐릭터가 사용자 동작 미러링
3. **점진적 개발**: 카메라 → MediaPipe → Kalidokit → VRM → 운동 감지 순서로
4. **성능 최적화**: VRM lazy loading, 30fps 제한, Web Worker 분리 고려

---

**이 프롬프트를 Claude Code에 전달하여 웹 앱 개발을 시작하세요!**
