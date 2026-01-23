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

interface NPCLayerProps {
  /** 세계관 ID */
  worldview: WorldviewType;
  /** 퇴장 중 여부 */
  isExiting?: boolean;
  /** 전환 진행률 */
  transitionProgress?: number;
  /** NPC ID (없으면 메인 NPC) */
  npcId?: string;
  /** 감정 상태 */
  emotion?: NPCEmotion;
  /** 위치 */
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

// 등장 애니메이션
const enterAnimations = {
  initial: { opacity: 0, y: 50, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

export function NPCLayer({
  worldview,
  isExiting = false,
  transitionProgress = 0,
  npcId,
  emotion = 'normal',
  position = 'left',
  sizePercent = 80,
}: NPCLayerProps) {
  const { transitionConfig } = usePhaseStore();
  const [imageLoaded, setImageLoaded] = useState(false);

  // NPC 정보 가져오기
  const npc = npcId
    ? (require('@/constants/npcCharacters').NPC_CHARACTERS[worldview]?.[npcId] || getMainNPC(worldview))
    : getMainNPC(worldview);

  const imagePath = getNPCImagePath(worldview, npc.id, emotion);

  // 위치 스타일 계산
  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    ...(position === 'left' && { left: '5%' }),
    ...(position === 'center' && { left: '50%', transform: 'translateX(-50%)' }),
    ...(position === 'right' && { right: '5%' }),
  };

  // 퇴장 애니메이션 타입
  const exitAnimation = exitAnimations[transitionConfig.npcExitAnimation] || exitAnimations.dissolve;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`npc-${worldview}-${npc.id}`}
        className="pointer-events-none z-10"
        style={{
          ...positionStyle,
          height: `${sizePercent}%`,
        }}
        initial={enterAnimations.initial}
        animate={enterAnimations.animate}
        exit={exitAnimation.exit}
      >
        {/* NPC 이미지 */}
        <div
          className="relative h-full"
          style={{
            aspectRatio: '2/3', // 일반적인 스탠딩 일러스트 비율
          }}
        >
          {/* 로딩 플레이스홀더 */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/10 animate-pulse" />
            </div>
          )}

          <Image
            src={imagePath}
            alt={npc.name}
            fill
            className={`object-contain object-bottom transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              // 이미지 로드 실패 시 기본 이미지 사용
              console.warn(`[NPCLayer] Failed to load: ${imagePath}`);
              setImageLoaded(true);
            }}
            priority
          />

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

        {/* NPC 이름 태그 (디버그용, 선택적) */}
        {process.env.NODE_ENV === 'development' && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs"
            style={{ backgroundColor: npc.color + '80' }}
          >
            {npc.name}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default NPCLayer;
