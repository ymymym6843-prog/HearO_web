'use client';

/**
 * NPCMiniAvatar - 운동 중 미니 NPC 아바타 + 말풍선
 *
 * 운동 화면에서 TTS 피드백과 함께 작은 NPC 아바타를 표시
 * - 작은 원형 아바타 (세계관별 NPC)
 * - 말풍선 (TTS 텍스트 또는 격려 메시지)
 * - 자동 숨김 타이머
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { WorldviewType } from '@/types/vrm';
import { getMainNPC, getNPCImagePath, type NPCCharacter, type NPCEmotion } from '@/constants/npcCharacters';

// ============================================
// Types
// ============================================

export interface NPCMessage {
  /** 메시지 텍스트 */
  text: string;
  /** NPC ID (없으면 메인 NPC) */
  npcId?: string;
  /** 감정 상태 */
  emotion?: NPCEmotion;
  /** 표시 시간 (ms), 0이면 수동 닫기 */
  duration?: number;
  /** 메시지 타입 */
  type?: 'feedback' | 'encouragement' | 'instruction' | 'celebration';
}

interface NPCMiniAvatarProps {
  /** 세계관 ID */
  worldview: WorldviewType;
  /** 표시할 메시지 */
  message?: NPCMessage | null;
  /** 메시지 닫힘 콜백 */
  onMessageClose?: () => void;
  /** 위치 */
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  /** 항상 아바타 표시 (메시지 없어도) */
  alwaysShowAvatar?: boolean;
}

// ============================================
// Constants
// ============================================

const DEFAULT_MESSAGE_DURATION = 4000; // 4초

// 메시지 타입별 스타일
const messageTypeStyles: Record<string, { bgColor: string; icon: string }> = {
  feedback: { bgColor: 'rgba(59, 130, 246, 0.9)', icon: '💪' },
  encouragement: { bgColor: 'rgba(16, 185, 129, 0.9)', icon: '🎉' },
  instruction: { bgColor: 'rgba(139, 92, 246, 0.9)', icon: '📢' },
  celebration: { bgColor: 'rgba(245, 158, 11, 0.9)', icon: '⭐' },
};

// 위치별 스타일 (bottom-36: 하단 HUD 위로 배치)
const positionStyles: Record<string, string> = {
  'bottom-left': 'bottom-36 left-4',
  'bottom-right': 'bottom-36 right-4',
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
};

// ============================================
// Sub Components
// ============================================

/** 아바타 이미지 */
const AvatarImage = memo(function AvatarImage({
  npc,
  imagePath,
  isActive,
}: {
  npc: NPCCharacter;
  imagePath: string;
  isActive: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 shadow-lg flex-shrink-0 select-none"
      style={{
        borderColor: npc.color,
        boxShadow: isActive ? `0 0 20px ${npc.color}60` : `0 4px 12px rgba(0,0,0,0.3)`,
        background: `linear-gradient(135deg, ${npc.color}40, ${npc.color}20)`,
      }}
      animate={isActive ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={{ duration: 0.5, repeat: isActive ? Infinity : 0 }}
    >
      {!imgError ? (
        <Image
          src={imagePath}
          alt={npc.name}
          fill
          sizes="64px"
          className="object-cover object-top pointer-events-none select-none"
          style={{ userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
          onError={() => setImgError(true)}
          draggable={false}
        />
      ) : (
        /* 폴백: NPC 이름 첫 글자 */
        <div
          className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl"
          style={{ background: npc.color }}
        >
          {npc.name.charAt(0)}
        </div>
      )}
    </motion.div>
  );
});

/** 말풍선 */
const SpeechBubble = memo(function SpeechBubble({
  message,
  npc,
}: {
  message: NPCMessage;
  npc: NPCCharacter;
}) {
  const typeStyle = messageTypeStyles[message.type || 'feedback'];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.9 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative max-w-xs sm:max-w-sm"
    >
      {/* 말풍선 꼬리 */}
      <div
        className="absolute left-0 top-1/2 -translate-x-2 -translate-y-1/2 w-0 h-0"
        style={{
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderRight: `10px solid ${typeStyle.bgColor}`,
        }}
      />

      {/* 말풍선 본체 */}
      <div
        className="rounded-2xl px-4 py-3 ml-2"
        style={{
          background: typeStyle.bgColor,
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* NPC 이름 */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-white/90">{npc.name}</span>
          <span className="text-sm">{typeStyle.icon}</span>
        </div>

        {/* 메시지 텍스트 */}
        <p className="text-sm sm:text-base text-white leading-snug">
          {message.text}
        </p>
      </div>
    </motion.div>
  );
});

// ============================================
// Main Component
// ============================================

export function NPCMiniAvatar({
  worldview,
  message,
  onMessageClose,
  position = 'bottom-left',
  alwaysShowAvatar = false,
}: NPCMiniAvatarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<NPCMessage | null>(null);

  // NPC 정보
  const npcId = currentMessage?.npcId || message?.npcId;
  const npc = npcId
    ? (require('@/constants/npcCharacters').NPC_CHARACTERS[worldview]?.[npcId] || getMainNPC(worldview))
    : getMainNPC(worldview);

  const emotion = currentMessage?.emotion || message?.emotion || 'normal';
  const imagePath = getNPCImagePath(worldview, npc.id, emotion);

  // 메시지 표시 처리
  useEffect(() => {
    if (message) {
      setCurrentMessage(message);
      setIsVisible(true);

      // 자동 숨김 타이머
      const duration = message.duration ?? DEFAULT_MESSAGE_DURATION;
      if (duration > 0) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setCurrentMessage(null);
          onMessageClose?.();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
      setCurrentMessage(null);
    }
  }, [message, onMessageClose]);

  // 아바타/메시지 모두 숨김 상태면 렌더링 안함
  if (!alwaysShowAvatar && !isVisible) return null;

  return (
    <div
      className={`fixed z-30 flex items-end gap-3 ${positionStyles[position]}`}
    >
      {/* 아바타 */}
      <AnimatePresence>
        {(alwaysShowAvatar || isVisible) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            transition={{ duration: 0.3, ease: 'backOut' }}
          >
            <AvatarImage
              npc={npc}
              imagePath={imagePath}
              isActive={!!currentMessage}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 말풍선 */}
      <AnimatePresence>
        {currentMessage && isVisible && (
          <SpeechBubble message={currentMessage} npc={npc} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Hook: useNPCMessage
// ============================================

/**
 * NPC 메시지 관리 훅
 * 운동 피드백을 NPC 말풍선으로 표시
 */
export function useNPCMessage() {
  const [message, setMessage] = useState<NPCMessage | null>(null);

  const showMessage = useCallback((msg: NPCMessage) => {
    setMessage(msg);
  }, []);

  const hideMessage = useCallback(() => {
    setMessage(null);
  }, []);

  const showFeedback = useCallback((text: string, emotion: NPCEmotion = 'normal') => {
    setMessage({ text, emotion, type: 'feedback', duration: 3000 });
  }, []);

  const showEncouragement = useCallback((text: string) => {
    setMessage({ text, emotion: 'happy', type: 'encouragement', duration: 4000 });
  }, []);

  const showInstruction = useCallback((text: string) => {
    setMessage({ text, emotion: 'serious', type: 'instruction', duration: 5000 });
  }, []);

  const showCelebration = useCallback((text: string) => {
    setMessage({ text, emotion: 'happy', type: 'celebration', duration: 5000 });
  }, []);

  return {
    message,
    showMessage,
    hideMessage,
    showFeedback,
    showEncouragement,
    showInstruction,
    showCelebration,
  };
}

export default memo(NPCMiniAvatar);
