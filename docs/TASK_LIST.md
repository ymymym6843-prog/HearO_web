# HearO Web - Task List

## Progress Overview

| Category | Completed | Total | Progress |
|----------|-----------|-------|----------|
| Core Infrastructure | 7 | 7 | 100% |
| VRM & Animation | 6 | 9 | 67% |
| Theme System | 10 | 12 | 83% |
| Exercise System | 18 | 18 | 100% |
| TTS System | 6 | 9 | 67% |
| Story & NPC | 8 | 9 | 89% |
| Worldview Activation | 3 | 6 | 50% |
| Performance | 5 | 9 | 56% |
| Accessibility | 5 | 7 | 71% |
| **Medical System (Phase 1)** | **12** | **14** | **86%** |
| **Gamification (Phase 1)** | **6** | **6** | **100%** |
| **Overall** | **86** | **112** | **77%** |

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
| Panorama backgrounds | [x] | - | 20 images per worldview |
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
| Complete story content | [x] | - | All 6 worldviews complete |
| Dynamic story branching | [ ] | Low | Performance-based |

---

## 7. Worldview Activation

| Worldview | VRM | NPC Image | Stories | TTS | Status |
|-----------|-----|-----------|---------|-----|--------|
| Fantasy | [x] | [x] | [x] | [x] | Active |
| Sports | [x] | [x] | [x] | [x] | Active |
| Idol | [x] | [x] | [x] | [x] | Active |
| SF | [x] | [x] | [x] | [ ] | Inactive (Coming Soon) |
| Zombie | [x] | [x] | [x] | [ ] | Inactive (Coming Soon) |
| Spy | [x] | [x] | [x] | [ ] | Inactive (Coming Soon) |

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
| DB 마이그레이션 적용 | [x] | - | Supabase에 적용됨 |
| TypeScript 타입 정의 | [x] | - | src/types/medical.ts |
| ROM 트렌드 차트 | [x] | - | ROMTrendChart.tsx |
| 일일 통계 대시보드 | [x] | - | DailyStatsDashboard.tsx |
| 캘리브레이션 UI | [x] | - | 게이미피케이션 스타일 완성 |
| Security 보안 수정 | [x] | - | search_path 설정 |
| 의료진 대시보드 | [ ] | Low | Phase 3 이후 |
| 리포트 내보내기 | [ ] | Low | Phase 3 이후 |

---

## 11. Gamification System (Phase 1)

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| ExerciseHUD 컴포넌트 | [x] | - | 통합 게이미피케이션 HUD |
| XP/레벨 시스템 | [x] | - | romService에 통합 |
| 콤보 카운터 | [x] | - | ExerciseHUD에 포함 |
| 스트릭 표시 | [x] | - | ExerciseHUD에 포함 |
| 일일 통계 대시보드 | [x] | - | DailyStatsDashboard.tsx |
| 주간 활동 히트맵 | [x] | - | DailyStatsDashboard에 포함 |

---

## Recent Changes (2026-01-24)

### Exercise Page HybridScene Integration (NEW)
1. 운동 페이지에 HybridScene 컴포넌트 통합
   - 4단계 Phase 시스템: intro → transition → exercise → epilogue
   - intro phase: 2D NPC + VN 대화창으로 운동 소개
   - transition phase: 2D→3D 전환 애니메이션
   - exercise phase: 3D VRM + MediaPipe 운동 감지
2. 운동별 인트로 대화 시퀀스 (`src/constants/exerciseDialogues.ts`)
   - 세계관별 맞춤형 대사 템플릿 (6 세계관)
   - 운동 시작 전 NPC 격려 대화
   - 운동 완료 후 성과별 피드백 대화
3. Phase 전환 로직
   - VN 대화 완료 시 자동 전환
   - 스킵 버튼으로 바로 운동 시작 가능
   - 운동 완료 후 intro로 돌아가 재시도 가능

### Panorama Background System
1. 세계관별 파노라마 배경 (각 20개 이미지)
   - `public/images/worldviews/backgrounds/{worldview}/{worldview}01.png` ~ `{worldview}20.png`
   - Equirectangular 포맷 (Three.js SkyboxBackground)
2. useBackground 훅 (`src/hooks/useBackground.ts`)
   - 세션별 일관된 랜덤 배경 (세션 시드 기반)
   - localStorage 사용자 선호도 저장
   - 다음/이전/특정 인덱스/랜덤 배경 변경 함수
3. BackgroundRandomizer 컴포넌트 (`src/components/ui/BackgroundRandomizer.tsx`)
   - 주사위 아이콘 랜덤 버튼 (Framer Motion 애니메이션)
   - Full 버전 및 Compact (아이콘 전용) 버전
4. HybridScene 통합
   - `usePanoramaBg` prop으로 파노라마 배경 사용 여부 설정
   - `showBgRandomizer` prop으로 랜덤 버튼 표시 설정
   - intro phase에서만 랜덤 버튼 표시

### HearO-v2 포팅 (Phase 1 완료)
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
7. DB 마이그레이션 적용 (Supabase)
   - patients, rom_measurements, pain_events 테이블
   - RLS 정책 및 헬퍼 함수
   - search_path 보안 수정 적용
8. ROM 트렌드 차트 (`src/components/charts/ROMTrendChart.tsx`)
   - 시간에 따른 ROM 변화 시각화
   - 목표 대비 진행률 표시
   - 통계 카드 (최신/평균/최소/최대)
9. 일일 통계 대시보드 (`src/components/gamification/DailyStatsDashboard.tsx`)
   - 오늘의 목표 달성률
   - XP/정확도/연속기록/운동시간 통계
   - 레벨 진행률 바
   - 주간 활동 히트맵
   - 주간 XP 막대 차트

### Bug Fixes
1. Fixed `NPCLayer.tsx` Framer Motion ease type error
2. Fixed `VNDialogueBox.tsx` NPCEmotion type (added 'surprised')
3. Fixed `VRMScene.tsx` bufferAttribute args prop
4. Fixed `prerenderedContentService.ts` WorldviewType import
5. Fixed `ttsRouter.ts` TTSProvider and log type errors
6. Fixed `mediapipe.worker.ts` error handler type
7. Excluded `supabase/functions` from TypeScript compilation
8. Fixed CSS @import order in globals.css
9. Fixed Pretendard font loading error (`@font-face` -> `@import`)
10. Removed debug logs from `poseDetection.ts`
11. Fixed cascading render issues in exercise pages (useEffect setState)
12. Fixed Math.random during render in result page (use seeded random)
13. Fixed `detectHands` recursive reference in hand exercise page

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
1. [x] Complete story content for inactive worldviews (SF, Zombie, Spy) - ✅ 완료됨
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
│   ├── three/             # Three.js components
│   └── ui/                # UI components (BackgroundRandomizer)
├── constants/             # Theme, exercise configs
├── contexts/              # React contexts
├── hooks/                 # Custom hooks (useBackground, useKalidokit, etc.)
├── lib/                   # Utilities (kalidokit, logger)
├── services/              # Business logic
│   └── tts/              # TTS providers
├── types/                 # TypeScript definitions
└── workers/              # Web workers

public/
└── images/
    └── worldviews/
        └── backgrounds/    # Panorama backgrounds (20 per worldview)
            ├── fantasy/
            ├── sf/
            ├── zombie/
            ├── sports/
            ├── spy/
            └── idol/
```

---

*Last updated: 2026-01-24 (HybridScene VN intro + Panorama backgrounds + Code quality fixes)*
