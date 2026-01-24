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

// Components
import { SkyboxBackground } from './SkyboxBackground';
import { VRMScene } from './VRMScene';
import { NPCLayer } from './NPCLayer';
import { VNDialogueBox } from './VNDialogueBox';
import { TransitionOverlay } from './TransitionOverlay';
import { BackgroundRandomizerCompact } from '@/components/ui/BackgroundRandomizer';

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
  className = '',
}: HybridSceneProps) {
  const { current: currentPhase, setPhase, startTransition } = usePhaseStore();
  const layers = useLayerVisibility();
  const isTransitioning = useIsTransitioning();
  const transitionProgress = useTransitionProgress();

  const [isVRMLoaded, setIsVRMLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 파노라마 배경 관리
  const {
    backgroundUrl: panoramaBgUrl,
    currentIndex: bgIndex,
    randomBackground,
  } = useBackground({
    worldviewId: worldview as WorldviewId,
    useSessionSeed: true,
    persistPreference: true,
  });

  // 초기 Phase 설정
  useEffect(() => {
    setPhase(initialPhase);
  }, [initialPhase, setPhase]);

  // Phase 변경 콜백
  useEffect(() => {
    onPhaseChange?.(currentPhase);
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
          camera={{ position: [0, 1.5, 3], fov: 50 }}
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
          />
        </Canvas>
      </div>

      {/* Layer 2: 2D NPC 이미지 */}
      <AnimatePresence>
        {layers.npc2D && (
          <NPCLayer
            worldview={worldview}
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
            onTransitionRequest={() => handleTransition('transition')}
          />
        )}
      </AnimatePresence>

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

      {/* PIP 카메라 뷰 (exercise phase에서만) */}
      {layers.cameraPIP && (
        <div className="absolute bottom-4 right-4 w-32 h-24 rounded-lg overflow-hidden border-2 border-white/30 shadow-lg z-30">
          {/* WebCamera 컴포넌트가 여기에 삽입됨 */}
          <div className="w-full h-full bg-black/50 flex items-center justify-center">
            <span className="text-white/50 text-xs">Camera</span>
          </div>
        </div>
      )}

      {/* 배경 랜덤 버튼 (intro phase에서만 표시) */}
      {showBgRandomizer && usePanoramaBg && currentPhase === 'intro' && (
        <div className="absolute top-4 right-4 z-20">
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
