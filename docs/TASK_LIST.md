# HearO Web - Task List

## Progress Overview

| Category | Completed | Total | Progress |
|----------|-----------|-------|----------|
| Core Infrastructure | 7 | 7 | 100% |
| VRM & Animation | 6 | 9 | 67% |
| Theme System | 9 | 11 | 82% |
| Exercise System | 18 | 18 | 100% |
| TTS System | 6 | 9 | 67% |
| Story & NPC | 7 | 9 | 78% |
| Worldview Activation | 3 | 6 | 50% |
| Performance | 5 | 9 | 56% |
| Accessibility | 5 | 7 | 71% |
| **Medical System (Phase 1)** | **8** | **10** | **80%** |
| **Gamification (Phase 1)** | **4** | **6** | **67%** |
| **Overall** | **73** | **105** | **70%** |

---

## Detailed Task Breakdown

### Legend
- `[x]` Completed
- `[ ]` Pending
- `[~]` In Progress
- `[!]` Blocked

---

## 1. Core Infrastructure

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Next.js 14 setup | [x] | - | Completed |
| TypeScript configuration | [x] | - | Strict mode enabled |
| Tailwind CSS setup | [x] | - | With NativeWind |
| Three.js integration | [x] | - | React Three Fiber |
| MediaPipe setup | [x] | - | Pose detection ready |
| Supabase backend | [x] | - | Auth + Database |
| Logger system | [x] | - | createLogger utility |

---

## 2. VRM & Animation System

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| VRM model loader | [x] | - | VRMCharacter component |
| VRMA animation support | [x] | - | Idle, exercise animations |
| Kalidokit pose mapping | [x] | - | vrmAnimator.ts |
| Expression system | [x] | - | 5 expressions |
| VRM feedback service | [x] | - | Audio sync |
| 6 worldview VRM models | [x] | - | Configured in constants |
| Mobile lazy loading | [ ] | High | Performance critical |
| VRM model caching | [ ] | Medium | Reduce load times |
| Animation blending | [ ] | Low | Smooth transitions |

---

## 3. Theme System

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| 6 worldview themes | [x] | - | Fonts, colors, styles |
| CSS variables | [x] | - | Dynamic theming |
| Worldview typing speeds | [x] | - | Per-worldview config |
| NPC entrance delays | [x] | - | Animation timing |
| Dialogue box styles | [x] | - | 6 unique styles |
| Theme context provider | [x] | - | ThemeContext.tsx |
| Google Fonts integration | [x] | - | CDN + local |
| Focus-visible styles | [x] | - | Accessibility |
| Reduced-motion support | [x] | - | prefers-reduced-motion |
| Dark mode per worldview | [ ] | Medium | User preference |
| Theme transitions | [ ] | Low | Animated switching |

---

## 4. Exercise System

### Body Exercises (5/5 Complete)

| Exercise | Status | ROM Range | Landmarks |
|----------|--------|-----------|-----------|
| Squat | [x] | 0-120° | Knees, Hips |
| Bridge | [x] | 0-45° | Hips, Shoulders |
| Straight Leg Raise | [x] | 0-90° | Hip, Knee |
| Wall Squat | [x] | 0-90° | Knees, Back |
| Chair Stand | [x] | 0-90° | Hips, Knees |

### Core Exercises (5/5 Complete)

| Exercise | Status | ROM Range | Landmarks |
|----------|--------|-----------|-----------|
| Seated Core Hold | [x] | N/A | Core stability |
| Standing March Slow | [x] | 0-90° | Hip flexion |
| Seated Knee Lift | [x] | 0-90° | Knee, Hip |
| Standing Anti-Extension Hold | [x] | N/A | Core tension |
| Standing Arm Raise Core | [x] | 0-180° | Shoulder, Core |

### Hand Rehabilitation (8/8 Complete)

| Exercise | Status | Notes |
|----------|--------|-------|
| Finger Flexion | [x] | 손가락 굽히기/펴기 |
| Finger Spread | [x] | 손가락 벌리기 |
| Wrist Flexion | [x] | 손목 굽히기/펴기 |
| Tendon Glide | [x] | 힘줄 글라이딩 (5단계) |
| Thumb Opposition | [x] | 엄지-손가락 터치 |
| Grip Squeeze | [x] | 주먹 쥐기 |
| Pinch Hold | [x] | 집게 집기 유지 |
| Finger Tap Sequence | [x] | 손가락 순차 터치 |

---

## 5. TTS System

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| TTS Router | [x] | - | Context-based routing |
| Gemini TTS Edge Function | [x] | - | High quality voice |
| Web Speech API fallback | [x] | - | Browser native |
| Prerendered TTS support | [x] | - | WAV files |
| Usage quota tracking | [x] | - | Daily limits |
| TTS audio player | [x] | - | Volume control |
| Google Cloud TTS | [ ] | Medium | Additional provider |
| TTS caching | [ ] | Medium | Offline support |
| Voice selection | [ ] | Low | Per worldview |

---

## 6. Story & NPC System

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| NPC character definitions | [x] | - | 6 mentors |
| NPC emotion system | [x] | - | 4 emotions |
| Dialogue box typing | [x] | - | Variable speed |
| Story JSON loader | [x] | - | all_stories.json |
| Epilogue content service | [x] | - | Grade-based |
| NPC entrance animations | [x] | - | Framer Motion |
| NPC image assets | [x] | - | 90 images (6 worldviews × 5 NPCs × 3 emotions) |
| Complete story content | [ ] | High | All worldviews |
| Dynamic story branching | [ ] | Low | Performance-based |

---

## 7. Worldview Activation

| Worldview | VRM | NPC Image | Stories | TTS | Status |
|-----------|-----|-----------|---------|-----|--------|
| Fantasy | [x] | [~] | [x] | [x] | Active |
| Sports | [x] | [~] | [x] | [x] | Active |
| Idol | [x] | [~] | [x] | [x] | Active |
| SF | [x] | [ ] | [ ] | [ ] | Inactive |
| Zombie | [x] | [ ] | [ ] | [ ] | Inactive |
| Spy | [x] | [ ] | [ ] | [ ] | Inactive |

---

## 8. Performance & Optimization

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Web Worker MediaPipe | [x] | - | Parallel processing |
| One Euro Filter | [x] | - | Landmark smoothing |
| GPU acceleration | [x] | - | CSS will-change |
| Lazy loading | [x] | - | Dynamic imports |
| TypeScript strict | [x] | - | 0 errors |
| Mobile 30fps target | [ ] | Critical | Performance |
| Memory leak fixes | [ ] | High | Long sessions |
| Bundle optimization | [ ] | Medium | Code splitting |
| Service worker | [ ] | Medium | Offline PWA |

---

## 9. Accessibility

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Focus-visible styles | [x] | - | Keyboard nav |
| Reduced-motion | [x] | - | Animation toggle |
| High contrast | [x] | - | Color accessibility |
| Haptic feedback | [x] | - | Mobile vibration |
| Keyboard navigation | [x] | - | Tab order |
| Screen reader | [ ] | High | ARIA labels |
| Full ARIA labels | [ ] | Medium | Interactive elements |

---

## 10. Medical System (Phase 1) - HearO-v2 포팅

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| ROM 측정 서비스 (romService.ts) | [x] | - | AAOS 표준 기반 |
| 안전 기능 서비스 (safetyService.ts) | [x] | - | Red Flags 감지 |
| 2단계 재활 시스템 | [x] | - | RECOVERY/STRENGTH |
| ROMGauge 컴포넌트 | [x] | - | Recharts 기반 |
| PainScaleInput 컴포넌트 | [x] | - | VAS 0-10 스케일 |
| RedFlagAlert 컴포넌트 | [x] | - | 위험 신호 알림 |
| DB 마이그레이션 SQL | [x] | - | 003_medical_core.sql |
| TypeScript 타입 정의 | [x] | - | src/types/medical.ts |
| 의료진 대시보드 | [ ] | Low | Phase 3 이후 |
| 캘리브레이션 UI 리뉴얼 | [ ] | Medium | 게이미피케이션 통합 |

---

## 11. Gamification System (Phase 1)

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| ExerciseHUD 컴포넌트 | [x] | - | 통합 게이미피케이션 HUD |
| XP/레벨 시스템 | [x] | - | romService에 통합 |
| 콤보 카운터 | [x] | - | ExerciseHUD에 포함 |
| 스트릭 표시 | [x] | - | ExerciseHUD에 포함 |
| 업적 시스템 확장 | [ ] | Medium | HearO-v2 기반 추가 |
| 일일 통계 대시보드 | [ ] | Medium | Phase 2 |

---

## Recent Changes (2026-01-24)

### HearO-v2 포팅 (Phase 1)
1. ROM 측정 서비스 구현 (`src/services/medical/romService.ts`)
   - AAOS 표준 ROM 범위 기반
   - 2단계 재활 시스템 (RECOVERY/STRENGTH)
   - XP/레벨/콤보 시스템 통합
2. 안전 기능 서비스 구현 (`src/services/medical/safetyService.ts`)
   - Red Flags 감지 (통증, ROM 이상, 비대칭 등)
   - 운동 전/후 안전 체크
3. ROMGauge 컴포넌트 (`src/components/charts/ROMGauge.tsx`)
   - Recharts 기반 반원형 게이지
   - 재활 단계 표시 및 정확도 시각화
4. ExerciseHUD 컴포넌트 (`src/components/gamification/ExerciseHUD.tsx`)
   - XP/레벨/콤보/스트릭 표시
   - 실시간 진행률 표시
5. RedFlagAlert 컴포넌트 (`src/components/medical/RedFlagAlert.tsx`)
   - 심각도별 알림 스타일
   - 전체 화면 오버레이 (심각한 경고)
6. PainScaleInput 컴포넌트 (`src/components/medical/PainScaleInput.tsx`)
   - VAS 0-10 스케일
   - 슬라이더/버튼 모드
7. DB 마이그레이션 파일 (`supabase/migrations/003_medical_core.sql`)
   - patients, rom_measurements, pain_events 테이블
   - RLS 정책 및 헬퍼 함수

### Bug Fixes
1. Fixed `NPCLayer.tsx` Framer Motion ease type error
2. Fixed `VNDialogueBox.tsx` NPCEmotion type (added 'surprised')
3. Fixed `VRMScene.tsx` bufferAttribute args prop
4. Fixed `prerenderedContentService.ts` WorldviewType import
5. Fixed `ttsRouter.ts` TTSProvider and log type errors
6. Fixed `mediapipe.worker.ts` error handler type
7. Excluded `supabase/functions` from TypeScript compilation
8. Fixed CSS @import order in globals.css

### New Features (Earlier)
1. Worldview-specific typing speeds
2. NPC entrance delay configuration
3. Haptic feedback support
4. Enhanced accessibility (focus-visible, reduced-motion, high-contrast)

---

## Priority Queue (Next Sprint)

### Critical
1. [ ] Mobile 30fps performance optimization

### High
1. [ ] Complete story content for inactive worldviews (SF, Zombie, Spy)
2. [ ] Screen reader optimization
3. [ ] Memory leak detection

### Medium
1. [ ] Google Cloud TTS integration
2. [ ] VRM model caching
3. [ ] Dark mode per worldview
4. [ ] Bundle size optimization

### Low
1. [ ] Animation blending
2. [ ] Theme transition animations
3. [ ] Dynamic story branching

---

## Build Information

```
Build Status: SUCCESS
TypeScript Errors: 0
Static Pages: 20
Last Build: 2026-01-24
```

---

## File Structure

```
src/
├── app/                    # Next.js pages
├── components/
│   ├── hybrid/            # 2D/3D hybrid components
│   ├── themed/            # Worldview-themed components
│   └── three/             # Three.js components
├── constants/             # Theme, exercise configs
├── contexts/              # React contexts
├── hooks/                 # Custom hooks
├── lib/                   # Utilities (kalidokit, logger)
├── services/              # Business logic
│   └── tts/              # TTS providers
├── types/                 # TypeScript definitions
└── workers/              # Web workers
```

---

*Last updated: 2026-01-24*
