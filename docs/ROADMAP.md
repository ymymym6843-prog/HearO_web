# HearO Web - Development Roadmap

## Project Overview

HearO Web is a gamified rehabilitation exercise platform that combines VRM 3D avatars with MediaPipe pose detection to provide an immersive, story-driven exercise experience.

### Key Features
- **6 Worldview Themes**: Fantasy, Sports, Idol, SF, Zombie, Spy
- **Hybrid 2D/3D Rendering**: Canvas + DOM layers with seamless transitions
- **Real-time Pose Detection**: MediaPipe integration for exercise tracking
- **VRM Avatar System**: 3D character animations with Kalidokit pose mapping
- **Multi-layer TTS**: Prerendered → Gemini → Google Cloud → Web Speech fallback chain
- **4-Phase Exercise Flow**: Intro → Transition → Exercise → Epilogue

---

## Current Status: 90% Complete

### Build Status
- **TypeScript Errors**: 0
- **Build**: Successful (20 static pages)
- **Last Updated**: 2026-01-24

### Recent Major Updates
- **VRM 애니메이션 시스템 안정화**: Race condition 수정, Kalidokit 간섭 방지
- **Scene Settings Panel**: 조명, 카메라, 배경 실시간 조절
- **Skybox 회전 애니메이션**: 360도 배경 부드러운 회전
- **VN 스타일 UI 개선**: 스킵 버튼, NPC 위치 조정
- **카메라 앵글 프리셋**: 정면, 좌측, 우측, 후면, 위
- HearO-v2 의료 기능 포팅 (Phase 1 완료)
- 게이미피케이션 HUD 시스템
- Recharts 기반 데이터 시각화
- DB 마이그레이션 적용 (medical_core)
- ROM 트렌드 차트 컴포넌트
- 일일 통계 대시보드

---

## Phase 1: Core Infrastructure (100% Complete)

### Completed Tasks
- [x] Next.js 14 project setup with TypeScript
- [x] Tailwind CSS + NativeWind configuration
- [x] Three.js / React Three Fiber integration
- [x] MediaPipe pose detection setup
- [x] Supabase integration for backend
- [x] Logger system implementation
- [x] Type definitions (VRM, Exercise, Worldview)

---

## Phase 2: VRM & Animation System (90% Complete)

### Completed Tasks
- [x] VRM model loader (VRMCharacter component)
- [x] VRMA animation support
- [x] Kalidokit pose mapping (vrmAnimator.ts)
- [x] Expression system (happy, sad, angry, surprised, relaxed)
- [x] VRM feedback service
- [x] 6 worldview VRM models configured
- [x] Animation transition system (Initial → Idle crossfade)
- [x] Animation/Kalidokit state management (race condition fix)

### Remaining Tasks
- [ ] Optimize VRM loading for mobile (lazy loading)
- [ ] Add VRM model caching system

---

## Phase 3: Theme System (95% Complete)

### Completed Tasks
- [x] 6 worldview themes with unique fonts
- [x] CSS variables for dynamic theming
- [x] Worldview-specific typing speeds
- [x] NPC entrance delay configuration
- [x] Dialogue box styles per worldview
- [x] Theme context provider
- [x] Accessibility improvements (focus-visible, reduced-motion)
- [x] Google Fonts integration (Galmuri11, Black Han Sans, Orbitron, etc.)

### Remaining Tasks
- [ ] Dark mode support per worldview
- [ ] Theme transition animations

---

## Phase 4: Exercise System (100% Complete)

### Implemented Exercises (18/18)

#### Body Exercises (5/5)
- [x] Squat
- [x] Bridge
- [x] Straight Leg Raise
- [x] Wall Squat
- [x] Chair Stand

#### Core Exercises (5/5)
- [x] Seated Core Hold
- [x] Standing March Slow
- [x] Seated Knee Lift
- [x] Standing Anti-Extension Hold
- [x] Standing Arm Raise Core

#### Hand Rehabilitation (8/8)
- [x] Finger Flexion (손가락 굽히기/펴기)
- [x] Finger Spread (손가락 벌리기)
- [x] Wrist Flexion (손목 굽히기/펴기)
- [x] Tendon Glide (힘줄 글라이딩 5단계)
- [x] Thumb Opposition (엄지-손가락 터치)
- [x] Grip Squeeze (주먹 쥐기)
- [x] Pinch Hold (집게 집기 유지)
- [x] Finger Tap Sequence (손가락 순차 터치)

### Optional Enhancements
- [ ] Add exercise difficulty levels
- [ ] ROM (Range of Motion) validation per exercise
- [ ] Exercise completion animations

---

## Phase 5: TTS System (90% Complete)

### Completed Tasks
- [x] TTS Router with context-based provider selection
- [x] Gemini TTS integration (Edge Function)
- [x] Web Speech API fallback
- [x] Prerendered TTS audio support
- [x] Daily usage limits and quota tracking
- [x] TTS audio player with volume control

### Remaining Tasks
- [ ] Google Cloud TTS integration
- [ ] TTS caching for offline mode
- [ ] Voice selection per worldview

---

## Phase 6: Story & NPC System (90% Complete)

### Completed Tasks
- [x] NPC character definitions (6 mentors)
- [x] NPC emotion system (normal, happy, serious, surprised)
- [x] Dialogue box with typing effect
- [x] Story JSON loader
- [x] Epilogue content service
- [x] NPC entrance animations
- [x] NPC image assets (90 images: 6 worldviews × 5 NPCs × 3 emotions)

### Remaining Tasks
- [ ] Complete story content for all worldviews
- [ ] Dynamic story branching based on performance

---

## Phase 7: Worldview Activation (50% Complete)

### Active Worldviews (3/6)
- [x] Fantasy - Elderlin mentor, parchment UI
- [x] Sports - Coach Park mentor, scoreboard UI
- [x] Idol - Manager Sujin mentor, neon UI

### Inactive Worldviews (3/6)
- [ ] SF - AI Aria mentor, hologram UI
- [ ] Zombie - Dr. Lee mentor, distressed UI
- [ ] Spy - Handler Omega mentor, classified UI

### Tasks for Activation
- [ ] Complete VRM models for inactive worldviews
- [ ] Create NPC images
- [ ] Write story content
- [ ] Generate prerendered TTS audio

---

## Phase 8: Performance & Optimization (70% Complete)

### Completed Tasks
- [x] Web Worker for MediaPipe processing
- [x] One Euro Filter for landmark smoothing
- [x] GPU acceleration for animations
- [x] Lazy loading for components
- [x] TypeScript strict mode compliance

### Remaining Tasks
- [ ] Mobile performance optimization (target: 30fps)
- [ ] Memory leak detection and fixes
- [ ] Bundle size optimization
- [ ] Service worker for offline support

---

## Phase 9: Accessibility (90% Complete)

### Completed Tasks
- [x] Focus-visible styles
- [x] Prefers-reduced-motion support
- [x] High contrast mode support
- [x] Haptic feedback support
- [x] Keyboard navigation

### Remaining Tasks
- [ ] Screen reader optimization
- [ ] ARIA labels for all interactive elements

---

## Phase 10: Medical System - HearO-v2 포팅 (95% Complete)

### Completed Tasks (Phase 1)
- [x] ROM 측정 서비스 (AAOS 표준 기반)
- [x] 2단계 재활 시스템 (RECOVERY / STRENGTH)
- [x] 안전 기능 서비스 (Red Flags 감지)
- [x] ROMGauge 컴포넌트 (Recharts 기반)
- [x] ExerciseHUD 컴포넌트 (게이미피케이션 통합)
- [x] RedFlagAlert 컴포넌트
- [x] PainScaleInput 컴포넌트 (VAS 0-10)
- [x] DB 마이그레이션 적용 (Supabase)
- [x] TypeScript 타입 정의 (medical.ts)
- [x] ROM 트렌드 차트 컴포넌트
- [x] 일일 통계 대시보드 (게이미피케이션)
- [x] 캘리브레이션 UI (게이미피케이션 스타일 - 기존 완성)

### Remaining Tasks (Phase 2+)
- [ ] 의료진 대시보드 (Phase 3)
- [ ] 리포트 내보내기 기능 (Phase 3)

### Key Features
- **2단계 재활 시스템**: 4단계 → 2단계 단순화 (RECOVERY: 0-70% ROM, STRENGTH: 70%+ ROM)
- **XP/레벨 시스템**: 운동당 XP 획득, 콤보 보너스, 정확도 보너스
- **Red Flags**: 심한 통증, 과도한 ROM, 좌우 비대칭, ROM 감소, 보상 동작 감지
- **시각화**: Recharts 라이브러리 기반 반원형 게이지

---

## Future Roadmap

### Q1 2026
- Complete all 22 exercises
- Activate remaining 3 worldviews
- Mobile app release (React Native)

### Q2 2026
- Multiplayer/social features
- Exercise history and progress tracking
- AI-powered exercise recommendations

### Q3 2026
- Professional therapist dashboard
- HIPAA compliance certification
- Healthcare provider integration

---

## Technical Debt

1. **VRM Loading**: Currently loads full model on each scene
2. **TTS Fallback**: Google Cloud TTS not yet integrated
3. **Offline Mode**: Limited offline functionality
4. **Test Coverage**: Unit tests needed for core services

### Recently Resolved
- ~~**Animation Race Condition**~~: Fixed useEffect triggering premature state reset during animation loading

---

## Contributing

See [TASK_LIST.md](./TASK_LIST.md) for detailed task breakdown and contribution guidelines.

---

*Last updated: 2026-01-24*
