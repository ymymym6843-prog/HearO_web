# HearO_web 프로젝트 개선 계획서

## 종합 평가 요약

| 영역 | 등급 | 주요 이슈 |
|------|------|-----------|
| 아키텍처 | B+ | 모듈화 양호, hooks 폴더 필요 |
| 타입 안전성 | A- | strict 모드, 일부 @ts-expect-error |
| 에러 처리 | C+ | Error Boundary 없음 |
| 성능 | B- | 매 프레임 상태 업데이트 |
| 보안 | B+ | 외부 CDN @latest 의존 |
| 운동 감지 | B | 알고리즘 일부 수정 필요 |
| 접근성 | C | ARIA 누락, 청각장애인 특화 부족 |

---

## Phase 1: Critical (즉시 수정) - 1주일

### 1.1 외부 의존성 안정화

**파일:** `src/lib/mediapipe/poseDetection.ts`

```typescript
// Before (위험)
const vision = await FilesetResolver.forVisionTasks(
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
);

// After (안전)
const MEDIAPIPE_VERSION = '0.10.21';  // 안정 버전 고정
const vision = await FilesetResolver.forVisionTasks(
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
);
```

**파일:** `package.json`
```json
{
  "dependencies": {
    "@mediapipe/tasks-vision": "0.10.21"  // RC 버전 → 안정 버전
  }
}
```

---

### 1.2 성능 최적화 - 상태 업데이트 스로틀링

**파일:** `src/app/exercise/[id]/page.tsx`

```typescript
// 추가: throttle 유틸리티
import { useCallback, useRef } from 'react';

function useThrottle<T>(callback: (value: T) => void, delay: number) {
  const lastCall = useRef(0);
  return useCallback((value: T) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      callback(value);
    }
  }, [callback, delay]);
}

// Before: 매 프레임 4개 상태 업데이트
const handlePoseDetected = useCallback((landmarks) => {
  setPhase(storePhase);
  updateAccuracy(result.accuracy);
  updateAngle(result.currentAngle);
  setFeedback(result.feedback);
}, []);

// After: 스로틀 적용 (100ms 간격)
const throttledUpdate = useThrottle((result: DetectionResult) => {
  setPhase(mapDetectorPhaseToStore(result.phase));
  updateAccuracy(result.accuracy);
  updateAngle(result.currentAngle);
  setFeedback(result.feedback);
}, 100);

const handlePoseDetected = useCallback((landmarks) => {
  if (!landmarks || !isActive || !detectorRef.current) return;
  const result = detectorRef.current.processFrame(landmarks);
  throttledUpdate(result);
  // ... 나머지 로직
}, [isActive, throttledUpdate]);
```

---

### 1.3 운동 감지 알고리즘 버그 수정

**파일:** `src/lib/exercise/detection/PlankHoldDetector.ts`

```typescript
// Before: 홀드 시간 누적 버그
if (this.currentPhase === 'HOLDING' && this.isGoodAlignment(result.currentAngle)) {
  if (!this.isHolding) {
    this.isHolding = true;
    this.holdingStartTime = now;
  }
  this.totalHoldTime = (now - this.holdingStartTime) / 1000;
} else {
  this.isHolding = false;
  // totalHoldTime이 리셋되지 않음!
}

// After: 자세 이탈 시 시간 일시정지
private pausedHoldTime: number = 0;

if (this.currentPhase === 'HOLDING' && this.isGoodAlignment(result.currentAngle)) {
  if (!this.isHolding) {
    this.isHolding = true;
    this.holdingStartTime = now;
  }
  this.totalHoldTime = this.pausedHoldTime + (now - this.holdingStartTime) / 1000;
} else {
  if (this.isHolding) {
    // 일시정지 - 현재까지의 시간 저장
    this.pausedHoldTime = this.totalHoldTime;
  }
  this.isHolding = false;
}
```

**파일:** `src/lib/exercise/detection/StraightLegRaiseDetector.ts`

```typescript
// Before: 잘못된 관절 측정
const result = calculateHybridAngle(shoulder, hip, knee);

// After: 엉덩이 굴곡 각도 측정
// 어깨-엉덩이 라인과 엉덩이-발목 라인 사이 각도
const shoulderHipVector = {
  x: shoulder.x - hip.x,
  y: shoulder.y - hip.y,
  z: shoulder.z - hip.z,
};
const hipAnkleVector = {
  x: ankle.x - hip.x,
  y: ankle.y - hip.y,
  z: ankle.z - hip.z,
};
// 두 벡터 사이의 각도 계산
```

---

### 1.4 접근성 - 뷰포트 줌 허용

**파일:** `src/app/layout.tsx`

```typescript
// Before (WCAG 위반)
export const viewport: Viewport = {
  maximumScale: 1,
  userScalable: false,
};

// After (접근성 준수)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};
```

---

## Phase 2: Warning (2주 내 수정)

### 2.1 Error Boundary 추가

**새 파일:** `src/components/ErrorBoundary.tsx`

```typescript
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-hearo-bg">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-500 mb-4">
              오류가 발생했습니다
            </h1>
            <p className="text-gray-400 mb-6">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-hearo-primary rounded-xl"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

### 2.2 햅틱 피드백 서비스 추가

**새 파일:** `src/services/hapticService.ts`

```typescript
/**
 * 햅틱 피드백 서비스
 * 청각장애인 사용자를 위한 진동 알림
 */

class HapticService {
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  // 단일 탭 (50ms)
  tap(): void {
    if (this.isSupported) navigator.vibrate(50);
  }

  // 성공 알림 (짧은 3회)
  success(): void {
    if (this.isSupported) navigator.vibrate([100, 50, 100, 50, 100]);
  }

  // 경고 알림 (긴 2회)
  warning(): void {
    if (this.isSupported) navigator.vibrate([200, 100, 200]);
  }

  // 오류 알림 (강한 1회)
  error(): void {
    if (this.isSupported) navigator.vibrate(500);
  }

  // 카운트다운 (count에 따라 펄스)
  countdown(count: number): void {
    if (this.isSupported && count > 0) {
      navigator.vibrate(150);
    }
  }

  // 운동 단계 전환
  phaseChange(): void {
    if (this.isSupported) navigator.vibrate(100);
  }

  // 횟수 증가
  repComplete(): void {
    if (this.isSupported) navigator.vibrate([80, 40, 80]);
  }
}

export const hapticService = new HapticService();
```

---

### 2.3 ARIA 속성 추가

**파일:** `src/components/feedback/AccuracyMeter.tsx`

```typescript
export function AccuracyMeter({ accuracy, ... }) {
  const label = getAccuracyLabel(accuracy);

  return (
    <div
      role="meter"
      aria-label="운동 정확도"
      aria-valuenow={Math.round(accuracy)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${Math.round(accuracy)}% - ${label}`}
      className="flex flex-col gap-1"
    >
      {/* 기존 UI */}
    </div>
  );
}

function getAccuracyLabel(acc: number): string {
  if (acc >= 90) return '완벽';
  if (acc >= 70) return '양호';
  if (acc >= 50) return '보통';
  return '개선 필요';
}
```

**파일:** `src/components/feedback/CoachingMessage.tsx`

```typescript
export function CoachingMessage({ message, type, ... }) {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          role="alert"
          aria-live={type === 'error' ? 'assertive' : 'polite'}
          aria-atomic="true"
          className="flex items-center gap-3"
        >
          <Icon name={config.icon} aria-hidden="true" />
          <span className="sr-only">{getTypeLabel(type)}: </span>
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

### 2.4 MediaPipe 설정 개선

**파일:** `src/lib/mediapipe/poseDetection.ts`

```typescript
// Before
poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: '...pose_landmarker_lite.task',  // LITE 모델
  },
  minPoseDetectionConfidence: 0.5,  // 너무 낮음
  minPosePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

// After
poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: '...pose_landmarker_full.task',  // FULL 모델
  },
  minPoseDetectionConfidence: 0.65,  // 신뢰도 상향
  minPosePresenceConfidence: 0.65,
  minTrackingConfidence: 0.6,
});
```

---

### 2.5 운동 임계값 조정

**파일:** `src/lib/exercise/detection/SquatDetector.ts`

```typescript
const SQUAT_DEFAULTS = {
  startAngle: 165,
  targetAngle: 105,    // 90° → 105° (일반인에게 적합)
  tolerance: 15,
  holdTime: 0.5,       // 0.3초 → 0.5초 (충분한 유지)
};
```

**파일:** `src/lib/exercise/detection/BridgeDetector.ts`

```typescript
const BRIDGE_DEFAULTS = {
  startAngle: 140,
  targetAngle: 170,    // 175° → 170° (척추 부담 감소)
  holdTime: 1.0,
};
```

**파일:** `src/lib/exercise/detection/HighKneesDetector.ts`

```typescript
cooldownConfig: {
  minCooldown: 200,    // 100ms → 200ms (오탐지 방지)
  maxCooldown: 500,
  adaptiveThreshold: 300,
}
```

---

## Phase 3: 개선 권장 (1개월)

### 3.1 시각적 알림 시스템

**새 파일:** `src/components/feedback/FlashNotification.tsx`

```typescript
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';

interface FlashNotificationProps {
  show: boolean;
  type: 'success' | 'warning' | 'info';
  message: string;
  onComplete?: () => void;
}

export function FlashNotification({
  show,
  type,
  message,
  onComplete
}: FlashNotificationProps) {
  const colors = {
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
  };

  const icons = {
    success: 'checkmark-circle',
    warning: 'warning',
    info: 'information-circle',
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1.2, 1, 0.8],
          }}
          transition={{ duration: 1.5, times: [0, 0.2, 0.7, 1] }}
          onAnimationComplete={onComplete}
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
        >
          <div
            className="bg-black/80 backdrop-blur-lg rounded-3xl p-8 border-4"
            style={{ borderColor: colors[type] }}
          >
            <Icon
              name={icons[type] as any}
              size={64}
              color={colors[type]}
            />
            <p className="text-2xl font-black text-white mt-4 text-center">
              {message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

### 3.2 커스텀 훅 분리

**새 파일:** `src/hooks/useExerciseDetection.ts`

```typescript
import { useRef, useCallback } from 'react';
import { getDetectorForExercise, resetDetector } from '@/lib/exercise/detection';
import { hapticService } from '@/services/hapticService';
import type { ExerciseType } from '@/types/exercise';
import type { Landmark } from '@/types/pose';

interface UseExerciseDetectionOptions {
  exerciseId: ExerciseType;
  onRepComplete?: (count: number, accuracy: number) => void;
  onPhaseChange?: (phase: string) => void;
  onComplete?: (avgAccuracy: number) => void;
  targetReps: number;
}

export function useExerciseDetection({
  exerciseId,
  onRepComplete,
  onPhaseChange,
  onComplete,
  targetReps,
}: UseExerciseDetectionOptions) {
  const detectorRef = useRef(getDetectorForExercise(exerciseId));
  const lastRepCountRef = useRef(0);
  const accumulatedAccuracyRef = useRef<number[]>([]);
  const lastPhaseRef = useRef<string>('');

  const processFrame = useCallback((landmarks: Landmark[]) => {
    if (!detectorRef.current) return null;

    const result = detectorRef.current.processFrame(landmarks);

    // 단계 변경 감지
    if (result.phase !== lastPhaseRef.current) {
      lastPhaseRef.current = result.phase;
      hapticService.phaseChange();
      onPhaseChange?.(result.phase);
    }

    // 반복 완료 감지
    const currentRepCount = detectorRef.current.getRepCount();
    if (currentRepCount > lastRepCountRef.current) {
      lastRepCountRef.current = currentRepCount;
      accumulatedAccuracyRef.current.push(result.accuracy);
      hapticService.repComplete();
      onRepComplete?.(currentRepCount, result.accuracy);

      // 목표 달성 확인
      if (currentRepCount >= targetReps) {
        const avgAccuracy = accumulatedAccuracyRef.current.reduce((a, b) => a + b, 0)
          / accumulatedAccuracyRef.current.length;
        hapticService.success();
        onComplete?.(avgAccuracy);
      }
    }

    return result;
  }, [exerciseId, onRepComplete, onPhaseChange, onComplete, targetReps]);

  const reset = useCallback(() => {
    resetDetector(exerciseId);
    detectorRef.current = getDetectorForExercise(exerciseId);
    lastRepCountRef.current = 0;
    accumulatedAccuracyRef.current = [];
    lastPhaseRef.current = '';
  }, [exerciseId]);

  return { processFrame, reset };
}
```

---

### 3.3 접근성 설정 페이지

**새 파일:** `src/app/settings/accessibility/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';

interface AccessibilitySettings {
  hearingImpaired: boolean;
  hapticFeedback: boolean;
  reduceMotion: boolean;
  largeText: boolean;
  highContrast: boolean;
}

export default function AccessibilitySettingsPage() {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    hearingImpaired: false,
    hapticFeedback: true,
    reduceMotion: false,
    largeText: false,
    highContrast: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('accessibility-settings', JSON.stringify(newSettings));

    // CSS 변수 업데이트
    if (key === 'reduceMotion') {
      document.documentElement.style.setProperty(
        '--animation-duration',
        value ? '0ms' : '300ms'
      );
    }
  };

  return (
    <div className="min-h-screen bg-hearo-bg p-6">
      <h1 className="text-2xl font-bold text-white mb-8">접근성 설정</h1>

      <div className="space-y-4">
        <SettingToggle
          label="청각 지원 모드"
          description="시각적 알림 강화 및 햅틱 피드백 활성화"
          checked={settings.hearingImpaired}
          onChange={(v) => updateSetting('hearingImpaired', v)}
        />

        <SettingToggle
          label="햅틱 피드백"
          description="중요 이벤트 발생 시 진동 알림"
          checked={settings.hapticFeedback}
          onChange={(v) => updateSetting('hapticFeedback', v)}
        />

        <SettingToggle
          label="애니메이션 감소"
          description="움직임에 민감한 사용자를 위한 옵션"
          checked={settings.reduceMotion}
          onChange={(v) => updateSetting('reduceMotion', v)}
        />

        <SettingToggle
          label="큰 글씨"
          description="텍스트 크기 20% 확대"
          checked={settings.largeText}
          onChange={(v) => updateSetting('largeText', v)}
        />
      </div>
    </div>
  );
}

function SettingToggle({ label, description, checked, onChange }) {
  return (
    <label className="flex items-center justify-between p-4 bg-hearo-surface rounded-xl cursor-pointer">
      <div>
        <p className="font-semibold text-white">{label}</p>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-6 h-6 accent-hearo-primary"
      />
    </label>
  );
}
```

---

### 3.4 캐시 크기 제한

**파일:** `src/services/sfxService.ts`

```typescript
class SFXService {
  private audioCache: Map<string, AudioBuffer> = new Map();
  private readonly MAX_CACHE_SIZE = 50; // 최대 50개 오디오 파일

  private async loadAudio(url: string): Promise<AudioBuffer | null> {
    // 캐시 확인
    if (this.audioCache.has(url)) {
      return this.audioCache.get(url)!;
    }

    // 캐시 크기 제한 (LRU 방식)
    if (this.audioCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.audioCache.keys().next().value;
      this.audioCache.delete(firstKey);
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      this.audioCache.set(url, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error(`Failed to load audio: ${url}`, error);
      return null;
    }
  }
}
```

---

## 파일 구조 변경 요약

```
src/
├── app/
│   └── settings/
│       └── accessibility/
│           └── page.tsx          # [NEW] 접근성 설정
├── components/
│   ├── ErrorBoundary.tsx         # [NEW] 에러 바운더리
│   └── feedback/
│       └── FlashNotification.tsx # [NEW] 시각적 알림
├── hooks/                        # [NEW] 폴더 생성
│   └── useExerciseDetection.ts   # [NEW] 운동 감지 훅
├── services/
│   └── hapticService.ts          # [NEW] 햅틱 피드백
└── lib/
    └── exercise/
        └── detection/
            ├── PlankHoldDetector.ts    # [MODIFY] 버그 수정
            ├── StraightLegRaiseDetector.ts # [MODIFY] 알고리즘 수정
            ├── SquatDetector.ts        # [MODIFY] 임계값 조정
            └── BridgeDetector.ts       # [MODIFY] 임계값 조정
```

---

## 체크리스트

### Phase 1: Critical
- [ ] MediaPipe 버전 고정 (RC → 안정)
- [ ] 상태 업데이트 스로틀링 (100ms)
- [ ] PlankHold 시간 누적 버그 수정
- [ ] StraightLegRaise 알고리즘 수정
- [ ] viewport userScalable: true

### Phase 2: Warning
- [ ] ErrorBoundary 추가
- [ ] hapticService 구현
- [ ] ARIA 속성 추가 (AccuracyMeter, CoachingMessage)
- [ ] MediaPipe FULL 모델 + 신뢰도 상향
- [ ] 운동 임계값 조정 (Squat 105°, Bridge 170°)

### Phase 3: Suggestion
- [ ] FlashNotification 컴포넌트
- [ ] useExerciseDetection 훅 분리
- [ ] 접근성 설정 페이지
- [ ] 오디오 캐시 크기 제한

---

## 예상 소요 시간

| Phase | 작업량 | 예상 시간 |
|-------|--------|-----------|
| Phase 1 | 5개 항목 | 3-4일 |
| Phase 2 | 5개 항목 | 5-7일 |
| Phase 3 | 4개 항목 | 5-7일 |
| **총계** | **14개 항목** | **2-3주** |

---

*작성일: 2026-01-16*
*작성자: AI Code Review Assistant*
