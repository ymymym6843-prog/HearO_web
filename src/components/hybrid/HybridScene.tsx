'use client';

/**
 * HybridScene - 2D/3D 하이브리드 렌더링 레이아웃
 *
 * Integrated Master Prompt 구현:
 * - 360도 스카이박스 배경
 * - 2D NPC 레이어 (DOM)
 * - 3D VRM 캐릭터 (Three.js Canvas)
 * - VN 대화창 UI
 * - Phase 전환 애니메이션
 *
 * 레이어 구조 (z-index):
 * 0. 스카이박스 배경 (Three.js)
 * 1. 3D VRM 캐릭터 (Three.js)
 * 2. 2D NPC 이미지 (DOM absolute)
 * 3. VN 대화창 (DOM absolute)
 * 4. 운동 UI (DOM absolute)
 * 5. 전환 효과 오버레이
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { usePhaseStore, useLayerVisibility, useIsTransitioning, useTransitionProgress } from '@/stores/usePhaseStore';
import type { WorldviewType } from '@/types/vrm';
import type { PhaseType, TransitionConfig } from '@/types/phase';
import type { WorldviewId } from '@/constants/worldviews';
import type { LightingSettings, CameraAngle, SceneHelpers } from '@/types/scene';
import type { AnimationPreset } from '@/components/three/VRMCharacter';

// Components
import { SkyboxBackground } from './SkyboxBackground';
import { VRMScene } from './VRMScene';
import { NPCLayer } from './NPCLayer';
import { VNDialogueBox } from './VNDialogueBox';
import { TransitionOverlay } from './TransitionOverlay';
import { BackgroundRandomizerCompact } from '@/components/ui/BackgroundRandomizer';
import { NPCMiniAvatar, type NPCMessage } from './NPCMiniAvatar';

// Hooks
import { useBackground } from '@/hooks/useBackground';

// ============================================
// Props
// ============================================

interface HybridSceneProps {
  /** 세계관 ID */
  worldview: WorldviewType;
  /** VRM 모델 URL */
  vrmModelUrl: string;
  /** 스카이박스 이미지 URL (2:1 Equirectangular) - 파노라마 배경 사용 시 무시됨 */
  skyboxUrl?: string;
  /** 파노라마 배경 사용 여부 (기본: true) */
  usePanoramaBg?: boolean;
  /** 배경 랜덤 버튼 표시 여부 (기본: true) */
  showBgRandomizer?: boolean;
  /** 초기 Phase */
  initialPhase?: PhaseType;
  /** 자식 컴포넌트 (운동 UI 등) */
  children?: React.ReactNode;
  /** Phase 변경 콜백 */
  onPhaseChange?: (phase: PhaseType) => void;
  /** VRM 로드 완료 콜백 */
  onVRMLoaded?: () => void;
  /** 배경 변경 콜백 */
  onBackgroundChange?: (url: string, index: number) => void;
  /** NPC 미니 아바타 메시지 (운동 중 피드백) */
  npcMessage?: NPCMessage | null;
  /** NPC 메시지 닫힘 콜백 */
  onNPCMessageClose?: () => void;
  /** 미니 아바타 항상 표시 (운동 중) */
  showMiniAvatar?: boolean;
  /** 대화 스킵 콜백 (백그라운드 스토리 생성 유지) */
  onDialogueSkip?: () => void;
  /** 배경 컨트롤 노출 콜백 (외부에서 배경 제어 가능하게) */
  exposeBackgroundControl?: (control: {
    randomBackground: () => void;
    currentIndex: number;
    totalCount: number;
  }) => void;
  /** 3D 씬 조명 설정 */
  lightingSettings?: LightingSettings;
  /** 3D 씬 카메라 앵글 */
  cameraAngle?: CameraAngle;
  /** 3D 씬 헬퍼 (그리드, 축) */
  sceneHelpers?: SceneHelpers;
  /** VRM 애니메이션 프리셋 */
  animationPreset?: AnimationPreset;
  /** className */
  className?: string;
}

// ============================================
// 메인 컴포넌트
// ============================================

export function HybridScene({
  worldview,
  vrmModelUrl,
  skyboxUrl,
  usePanoramaBg = true,
  showBgRandomizer = true,
  initialPhase = 'intro',
  children,
  onPhaseChange,
  onVRMLoaded,
  onBackgroundChange,
  npcMessage,
  onNPCMessageClose,
  showMiniAvatar = false,
  onDialogueSkip,
  exposeBackgroundControl,
  lightingSettings,
  cameraAngle,
  sceneHelpers,
  animationPreset = 'A',
  className = '',
}: HybridSceneProps) {
  const { current: currentPhase, setPhase, startTransition } = usePhaseStore();
  const layers = useLayerVisibility();
  const isTransitioning = useIsTransitioning();
  const transitionProgress = useTransitionProgress();

  // 디버깅: Phase와 Layer 상태 로깅
  useEffect(() => {
    console.log(`[HybridScene] phase=${currentPhase}, transitioning=${isTransitioning}, npc2D=${layers.npc2D}, vrm3D=${layers.vrm3D}`);
  }, [currentPhase, isTransitioning, layers.npc2D, layers.vrm3D]);

  const [isVRMLoaded, setIsVRMLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitializedPhase = useRef(false);

  // 파노라마 배경 관리
  const {
    backgroundUrl: panoramaBgUrl,
    currentIndex: bgIndex,
    totalCount: bgTotal,
    randomBackground,
  } = useBackground({
    worldviewId: worldview as WorldviewId,
    useSessionSeed: true,
    persistPreference: true,
  });

  // 배경 컨트롤 외부 노출
  useEffect(() => {
    if (exposeBackgroundControl) {
      exposeBackgroundControl({
        randomBackground,
        currentIndex: bgIndex,
        totalCount: bgTotal,
      });
    }
  }, [exposeBackgroundControl, randomBackground, bgIndex, bgTotal]);

  // 초기 Phase 설정 (마운트 시 1회만 실행)
  useEffect(() => {
    if (!hasInitializedPhase.current) {
      setPhase(initialPhase);
      hasInitializedPhase.current = true;
    }
  }, [initialPhase, setPhase]);

  // Phase 변경 콜백 - currentPhase 변경 시에만 호출
  const prevPhaseRef = useRef<PhaseType | null>(null);
  useEffect(() => {
    if (prevPhaseRef.current !== currentPhase) {
      prevPhaseRef.current = currentPhase;
      onPhaseChange?.(currentPhase);
    }
  }, [currentPhase, onPhaseChange]);

  // 배경 변경 콜백
  useEffect(() => {
    if (usePanoramaBg) {
      onBackgroundChange?.(panoramaBgUrl, bgIndex);
    }
  }, [panoramaBgUrl, bgIndex, usePanoramaBg, onBackgroundChange]);

  // VRM 로드 완료 핸들러
  const handleVRMLoaded = useCallback(() => {
    setIsVRMLoaded(true);
    onVRMLoaded?.();
  }, [onVRMLoaded]);

  // Phase 전환 핸들러
  const handleTransition = useCallback(
    async (targetPhase: PhaseType, config?: Partial<TransitionConfig>) => {
      await startTransition(targetPhase, config);
    },
    [startTransition]
  );

  // 스카이박스 URL 결정 (파노라마 우선)
  const effectiveSkyboxUrl = usePanoramaBg
    ? panoramaBgUrl
    : skyboxUrl || `/images/worldviews/${worldview}01_bg.jpg`;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* Layer 0: 스카이박스 + 3D VRM (Three.js Canvas) */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0.9, 2.8], fov: 50 }}
          gl={{
            powerPreference: 'default',
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true, // 스냅샷을 위해 필요
          }}
          dpr={[1, 2]}
        >
          {/* 스카이박스 배경 */}
          {layers.skybox && (
            <SkyboxBackground
              imageUrl={effectiveSkyboxUrl}
              visible={layers.skybox}
            />
          )}

          {/* 3D VRM 캐릭터 */}
          <VRMScene
            modelUrl={vrmModelUrl}
            visible={layers.vrm3D}
            onLoaded={handleVRMLoaded}
            transitionProgress={isTransitioning ? transitionProgress : 1}
            lightingSettings={lightingSettings}
            cameraAngle={cameraAngle}
            sceneHelpers={sceneHelpers}
            animationPreset={animationPreset}
          />
        </Canvas>
      </div>

      {/* Layer 1.5: 배경 오버레이 (intro phase에서 배경 디테일 감소) */}
      <AnimatePresence>
        {currentPhase === 'intro' && layers.npc2D && (
          <motion.div
            key="bg-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Layer 2: 2D NPC 이미지 - phase에 따라 레이아웃 변경 */}
      {/* DEBUG: npc2D={layers.npc2D}, phase={currentPhase} */}
      <AnimatePresence>
        {layers.npc2D && (
          <NPCLayer
            worldview={worldview}
            layoutMode={currentPhase === 'intro' ? 'intro' : 'exercise'}
            isExiting={isTransitioning && currentPhase === 'transition'}
            transitionProgress={transitionProgress}
          />
        )}
      </AnimatePresence>

      {/* Layer 3: VN 대화창 */}
      <AnimatePresence>
        {layers.vnDialogue && (
          <VNDialogueBox
            worldview={worldview}
            onTransitionRequest={() => handleTransition('exercise')}
            onSkipAll={onDialogueSkip}
          />
        )}
      </AnimatePresence>

      {/* Layer 3.5: NPC 미니 아바타 (운동 중 피드백) */}
      {/* exercise phase에서는 원형 미니 아바타로 항상 표시 */}
      {(currentPhase === 'exercise' || showMiniAvatar) && (
        <NPCMiniAvatar
          worldview={worldview}
          message={npcMessage}
          onMessageClose={onNPCMessageClose}
          position="bottom-left"
          alwaysShowAvatar={currentPhase === 'exercise' || showMiniAvatar}
        />
      )}

      {/* Layer 4: 자식 컴포넌트 (운동 UI 등) */}
      {children}

      {/* Layer 5: 전환 효과 오버레이 */}
      <AnimatePresence>
        {isTransitioning && (
          <TransitionOverlay
            progress={transitionProgress}
            worldview={worldview}
          />
        )}
      </AnimatePresence>

      {/* PIP 카메라 뷰는 ExercisePage에서 WebCamera 컴포넌트로 직접 렌더링 */}

      {/* 배경 랜덤 버튼 (intro, exercise phase에서 표시) */}
      {showBgRandomizer && usePanoramaBg && (currentPhase === 'intro' || currentPhase === 'exercise') && (
        <div className={`absolute z-20 ${
          currentPhase === 'intro'
            ? 'top-4 right-4'
            : 'top-20 right-20'  /* exercise에서는 헤더 버튼들 아래 */
        }`}>
          <BackgroundRandomizerCompact
            worldviewId={worldview as WorldviewId}
            onRandomize={randomBackground}
          />
        </div>
      )}
    </div>
  );
}

export default HybridScene;
