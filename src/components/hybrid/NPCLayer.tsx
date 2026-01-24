'use client';

/**
 * NPCLayer - 2D NPC 스탠딩 이미지 레이어
 *
 * 비주얼 노벨 스타일 NPC 표시
 * Phase 전환 시 퇴장 애니메이션 지원
 */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorldviewType } from '@/types/vrm';
import { getMainNPC, getNPCImagePath, type NPCEmotion } from '@/constants/npcCharacters';
import { usePhaseStore } from '@/stores/usePhaseStore';

// 레이아웃 모드 타입
export type NPCLayoutMode = 'intro' | 'exercise';

interface NPCLayerProps {
  /** 세계관 ID */
  worldview: WorldviewType;
  /** 레이아웃 모드 (intro: 중앙, exercise: 측면) */
  layoutMode?: NPCLayoutMode;
  /** 퇴장 중 여부 */
  isExiting?: boolean;
  /** 전환 진행률 */
  transitionProgress?: number;
  /** NPC ID (없으면 메인 NPC) */
  npcId?: string;
  /** 감정 상태 */
  emotion?: NPCEmotion;
  /** 위치 (layoutMode가 없을 때 사용) */
  position?: 'left' | 'center' | 'right';
  /** 크기 (화면 높이 대비 %) */
  sizePercent?: number;
}

// 퇴장 애니메이션 variants
const exitAnimations = {
  fade: {
    exit: { opacity: 0, transition: { duration: 0.5 } },
  },
  slideLeft: {
    exit: { x: '-100%', opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' as const } },
  },
  slideRight: {
    exit: { x: '100%', opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' as const } },
  },
  scale: {
    exit: { scale: 0, opacity: 0, transition: { duration: 0.5, ease: 'easeIn' as const } },
  },
  dissolve: {
    exit: {
      opacity: 0,
      filter: 'blur(10px)',
      scale: 1.1,
      transition: { duration: 0.8, ease: 'easeOut' as const },
    },
  },
};

// 등장 애니메이션 - 더 다이나믹한 bounce + slide 효과
const enterAnimations = {
  initial: {
    opacity: 0,
    y: 150,
    scale: 0.85,
    rotate: -3,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: {
      duration: 0.8,
      ease: [0.175, 0.885, 0.32, 1.275] as [number, number, number, number], // stronger bounce overshoot
      opacity: { duration: 0.4 },
      rotate: { duration: 0.6, ease: 'easeOut' },
    },
  },
};

// Idle breathing 애니메이션
const idleBreathingAnimation = {
  y: [0, -5, 0],
  scale: [1, 1.01, 1],
  transition: {
    duration: 3.5,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
};

export function NPCLayer({
  worldview,
  layoutMode = 'intro',
  isExiting = false,
  transitionProgress = 0,
  npcId,
  emotion = 'normal',
  position,
  sizePercent,
}: NPCLayerProps) {
  const { transitionConfig } = usePhaseStore();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  // NPC 정보 가져오기
  const npc = npcId
    ? (require('@/constants/npcCharacters').NPC_CHARACTERS[worldview]?.[npcId] || getMainNPC(worldview))
    : getMainNPC(worldview);

  const imagePath = getNPCImagePath(worldview, npc.id, emotion);

  // 레이아웃 모드에 따른 위치/크기 결정
  const layoutConfig = {
    intro: {
      // 인트로 모드: 중앙 배치, 큰 크기
      position: 'center' as const,
      size: 75, // 75vh
      bottom: '5%',
    },
    exercise: {
      // 운동 모드: 측면 배치, 약간 작은 크기
      position: 'left' as const,
      size: 65, // 65vh
      bottom: '8%',
    },
  };

  const currentLayout = layoutConfig[layoutMode];
  const effectivePosition = position || currentLayout.position;
  const effectiveSize = sizePercent || currentLayout.size;

  // 위치 스타일 계산 - 레이아웃 모드에 따라 동적 변경
  // Note: transform은 Framer Motion이 관리하므로 CSS transform 대신 x 속성 사용
  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: currentLayout.bottom,
    ...(effectivePosition === 'left' && { left: '5%' }),
    ...(effectivePosition === 'center' && { left: '50%' }),
    ...(effectivePosition === 'right' && { right: '5%' }),
  };

  // 중앙 배치 시 X 오프셋 (Framer Motion의 x 속성으로 처리)
  const xOffset = effectivePosition === 'center' ? '-50%' : 0;

  // 퇴장 애니메이션 타입
  const exitAnimation = exitAnimations[transitionConfig.npcExitAnimation] || exitAnimations.dissolve;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`npc-${worldview}-${npc.id}-${layoutMode}`}
        className="npc-base pointer-events-none z-10"
        style={{
          ...positionStyle,
          height: `${effectiveSize}vh`,
        }}
        initial={{ ...enterAnimations.initial, x: xOffset }}
        animate={
          hasEntered
            ? { ...enterAnimations.animate, x: xOffset, ...idleBreathingAnimation }
            : { ...enterAnimations.animate, x: xOffset }
        }
        exit={exitAnimation.exit}
        onAnimationComplete={() => {
          if (!hasEntered) {
            setHasEntered(true);
          }
        }}
      >
        {/* NPC 이미지 컨테이너 */}
        <div
          className="npc-sprite relative h-full"
          style={{
            aspectRatio: '3 / 4', // VN 스타일 3:4 비율
            filter: `drop-shadow(0 10px 30px rgba(0, 0, 0, 0.6))`,
          }}
        >
          {/* 로딩 플레이스홀더 */}
          {!imageLoaded && (
            <motion.div
              initial={{ opacity: 0.5 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                className="w-20 h-20 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${npc.color}40, transparent)`,
                }}
              />
            </motion.div>
          )}

          <Image
            src={imagePath}
            alt={npc.name}
            fill
            sizes="(max-width: 768px) 50vw, 40vw"
            className={`object-contain object-bottom transition-all duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              filter: imageLoaded ? 'none' : 'blur(10px)',
            }}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              console.warn(`[NPCLayer] Failed to load: ${imagePath}`);
              setImageLoaded(true);
            }}
            priority
          />

          {/* 캐릭터 하이라이트 효과 (idle animation) - Enhanced */}
          {imageLoaded && (
            <>
              {/* 바닥 그림자/착지 효과 */}
              <motion.div
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 pointer-events-none"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.4, 0.6, 0.4],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.5,
                }}
                style={{
                  width: '80%',
                  height: '30px',
                  background: `radial-gradient(ellipse at center, ${npc.color}50 0%, ${npc.color}20 40%, transparent 70%)`,
                  filter: 'blur(8px)',
                }}
              />

              {/* 후광 효과 */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{
                  opacity: [0.08, 0.18, 0.08],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  background: `radial-gradient(ellipse at center 70%, ${npc.color}40 0%, ${npc.color}10 30%, transparent 60%)`,
                }}
              />

              {/* 상단 림라이트 효과 */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{
                  opacity: [0.05, 0.12, 0.05],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 1,
                }}
                style={{
                  background: `linear-gradient(180deg, ${npc.color}20 0%, transparent 30%)`,
                }}
              />
            </>
          )}

          {/* 빛 효과 (전환 중) */}
          {isExiting && transitionProgress > 0 && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: transitionProgress * 0.8 }}
              style={{
                background: `radial-gradient(circle at center, ${npc.color}60, transparent 70%)`,
                mixBlendMode: 'overlay',
              }}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default NPCLayer;
