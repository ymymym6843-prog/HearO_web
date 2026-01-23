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

## Current Status: 75% Complete

### Build Status
- **TypeScript Errors**: 0
- **Build**: Successful (20 static pages)
- **Last Updated**: 2026-01-24

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

## Phase 2: VRM & Animation System (85% Complete)

### Completed Tasks
- [x] VRM model loader (VRMCharacter component)
- [x] VRMA animation support
- [x] Kalidokit pose mapping (vrmAnimator.ts)
- [x] Expression system (happy, sad, angry, surprised, relaxed)
- [x] VRM feedback service
- [x] 6 worldview VRM models configured

### Remaining Tasks
- [ ] Optimize VRM loading for mobile (lazy loading)
- [ ] Add VRM model caching system
- [ ] Implement smooth animation blending

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

## Phase 4: Exercise System (64% Complete)

### Implemented Exercises (14/22)

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

#### Hand Rehabilitation (4/12)
- [x] Finger Flexion
- [x] Tendon Glide
- [x] Thumb Opposition
- [x] Finger Spread
- [ ] Grip Squeeze
- [ ] Wrist Flexion
- [ ] Wrist Extension
- [ ] Finger Abduction
- [ ] Thumb Flexion
- [ ] Power Grip
- [ ] Pinch Grip
- [ ] Hand Open/Close

### Remaining Tasks
- [ ] Implement remaining 8 hand exercises
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

## Phase 6: Story & NPC System (80% Complete)

### Completed Tasks
- [x] NPC character definitions (6 mentors)
- [x] NPC emotion system (normal, happy, serious, surprised)
- [x] Dialogue box with typing effect
- [x] Story JSON loader
- [x] Epilogue content service
- [x] NPC entrance animations

### Remaining Tasks
- [ ] Complete story content for all worldviews
- [ ] NPC image assets (currently using placeholders)
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

---

## Contributing

See [TASK_LIST.md](./TASK_LIST.md) for detailed task breakdown and contribution guidelines.

---

*Last updated: 2026-01-24*
