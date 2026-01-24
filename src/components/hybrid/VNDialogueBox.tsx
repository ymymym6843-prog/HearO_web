'use client';

/**
 * VNDialogueBox - 비주얼 노벨 스타일 대화창
 *
 * Integrated Master Prompt 구현:
 * - 타이핑 효과 (Typewriter effect)
 * - 클릭 시 즉시 전체 문장 표시 (Skip)
 * - Three.js 렌더링 프레임 드랍 방지를 위한 최적화
 *
 * 최적화 전략:
 * - useRef로 타이머 관리 (리렌더링 최소화)
 * - CSS transition 활용 (JS 연산 최소화)
 * - requestIdleCallback으로 텍스트 업데이트
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorldviewType } from '@/types/vrm';
import { usePhaseStore, useDialogue } from '@/stores/usePhaseStore';
import { getMainNPC, getNPCImagePath, type NPCCharacter, type NPCEmotion } from '@/constants/npcCharacters';
import { ttsService } from '@/services/ttsService';

// ============================================
// Props & Types
// ============================================

interface VNDialogueBoxProps {
  /** 세계관 ID */
  worldview: WorldviewType;
  /** 전환 요청 콜백 */
  onTransitionRequest?: () => void;
  /** 대화 완료 콜백 */
  onDialogueComplete?: () => void;
  /** 타이핑 속도 (ms/char) */
  typingSpeed?: number;
  /** TTS 활성화 */
  enableTTS?: boolean;
  /** 아바타 표시 여부 (기본: false, NPCLayer와 함께 사용 시 false) */
  showAvatar?: boolean;
}

// ============================================
// 상수
// ============================================

const DEFAULT_TYPING_SPEED = 30; // ms per character
const CURSOR_BLINK_INTERVAL = 500;

// ============================================
// 메모이즈된 서브 컴포넌트
// ============================================

/**
 * NPC 아바타 (메모이즈)
 */
const NPCAvatar = memo(function NPCAvatar({
  npc,
  emotion,
  worldview,
  isSpeaking,
}: {
  npc: NPCCharacter;
  emotion: NPCEmotion;
  worldview: WorldviewType;
  isSpeaking: boolean;
}) {
  const imagePath = getNPCImagePath(worldview, npc.id, emotion);

  return (
    <div className="relative flex-shrink-0">
      <div
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 shadow-lg"
        style={{ borderColor: npc.color }}
      >
        <img
          src={imagePath}
          alt={npc.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/logo-icon.png';
          }}
        />
      </div>

      {/* 말하는 중 인디케이터 */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.2, 1] }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: npc.color }}
          >
            <SpeakingIcon />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/**
 * 말하는 중 아이콘
 */
const SpeakingIcon = memo(function SpeakingIcon() {
  return (
    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z"
        clipRule="evenodd"
      />
    </svg>
  );
});

/**
 * 타이핑 커서 (CSS 애니메이션으로 처리)
 */
const TypingCursor = memo(function TypingCursor({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-blink" />
  );
});

// ============================================
// 메인 컴포넌트
// ============================================

export function VNDialogueBox({
  worldview,
  onTransitionRequest,
  onDialogueComplete,
  typingSpeed = DEFAULT_TYPING_SPEED,
  enableTTS = false,
  showAvatar = false, // 기본적으로 아바타 숨김 (NPCLayer와 함께 사용)
}: VNDialogueBoxProps) {
  const dialogue = useDialogue();
  const { advanceDialogue, endDialogue } = usePhaseStore();

  // 현재 대화 엔트리
  const currentEntry = dialogue?.entries[dialogue.currentIndex];

  // 상태
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Refs (리렌더링 방지)
  const typingTimerRef = useRef<number | null>(null);
  const charIndexRef = useRef(0);
  const fullTextRef = useRef('');
  const containerRef = useRef<HTMLDivElement>(null);

  // NPC 정보
  const npc = useMemo(() => {
    if (!currentEntry) return getMainNPC(worldview);
    const npcChars = require('@/constants/npcCharacters').NPC_CHARACTERS[worldview];
    return npcChars?.[currentEntry.npcId] || getMainNPC(worldview);
  }, [worldview, currentEntry?.npcId]);

  const emotion: NPCEmotion = currentEntry?.emotion || 'normal';

  /**
   * 타이핑 시작
   */
  const startTyping = useCallback((text: string) => {
    // 이전 타이머 정리
    if (typingTimerRef.current) {
      cancelAnimationFrame(typingTimerRef.current);
    }

    fullTextRef.current = text;
    charIndexRef.current = 0;
    setDisplayedText('');
    setIsTyping(true);
    setIsComplete(false);

    // requestIdleCallback 또는 requestAnimationFrame 사용
    const typeNextChar = () => {
      if (charIndexRef.current < fullTextRef.current.length) {
        charIndexRef.current++;
        setDisplayedText(fullTextRef.current.slice(0, charIndexRef.current));

        // 다음 문자 타이핑 예약
        typingTimerRef.current = window.setTimeout(() => {
          requestAnimationFrame(typeNextChar);
        }, typingSpeed) as unknown as number;
      } else {
        // 타이핑 완료
        setIsTyping(false);
        setIsComplete(true);
      }
    };

    requestAnimationFrame(typeNextChar);
  }, [typingSpeed]);

  /**
   * 타이핑 스킵 (즉시 전체 텍스트 표시)
   */
  const skipTyping = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    setDisplayedText(fullTextRef.current);
    setIsTyping(false);
    setIsComplete(true);
  }, []);

  /**
   * 다음 대화로 진행
   */
  const handleAdvance = useCallback(() => {
    // 타이핑 중이면 스킵
    if (isTyping) {
      skipTyping();
      return;
    }

    // TTS 중지
    if (isSpeaking) {
      ttsService.stop();
      setIsSpeaking(false);
    }

    // 다음 대화로 진행
    const nextEntry = advanceDialogue();

    if (!nextEntry) {
      // 대화 완료
      endDialogue();
      onDialogueComplete?.();

      // 완료 후 액션
      if (currentEntry?.onComplete === 'startTransition') {
        onTransitionRequest?.();
      }
    }
  }, [isTyping, isSpeaking, skipTyping, advanceDialogue, endDialogue, onDialogueComplete, currentEntry, onTransitionRequest]);

  /**
   * 클릭/탭 핸들러
   */
  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    handleAdvance();
  }, [handleAdvance]);

  /**
   * 키보드 핸들러 (Enter, Space)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleAdvance();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAdvance]);

  /**
   * 대화 텍스트 변경 시 타이핑 시작
   */
  useEffect(() => {
    if (currentEntry?.text) {
      startTyping(currentEntry.text);

      // TTS 재생
      if (enableTTS && currentEntry.tts !== false) {
        setIsSpeaking(true);
        ttsService.speak(currentEntry.text, () => {
          setIsSpeaking(false);
        });
      }
    }

    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [currentEntry?.text, startTyping, enableTTS, currentEntry?.tts]);

  /**
   * 자동 진행
   */
  useEffect(() => {
    if (isComplete && currentEntry?.autoAdvance && currentEntry.autoAdvance > 0) {
      const timer = setTimeout(handleAdvance, currentEntry.autoAdvance);
      return () => clearTimeout(timer);
    }
  }, [isComplete, currentEntry?.autoAdvance, handleAdvance]);

  // 대화가 없으면 렌더링하지 않음
  if (!dialogue || !currentEntry) return null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.3 }}
      className="absolute bottom-0 left-0 right-0 z-20 p-4 sm:p-6"
      onClick={handleTap}
      onTouchEnd={handleTap}
    >
      {/* 반투명 배경 */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
        }}
      />

      {/* 대화창 컨테이너 */}
      <div className="relative flex items-end gap-4 max-w-3xl mx-auto">
        {/* NPC 아바타 (showAvatar가 true일 때만 표시) */}
        {showAvatar && (
          <NPCAvatar
            npc={npc}
            emotion={emotion}
            worldview={worldview}
            isSpeaking={isSpeaking}
          />
        )}

        {/* 대화 내용 */}
        <div
          className={`flex-1 rounded-2xl p-4 sm:p-5 border-2 ${showAvatar ? 'rounded-bl-sm' : ''}`}
          style={{
            backgroundColor: 'rgba(20, 20, 30, 0.95)',
            borderColor: npc.color + '60',
            boxShadow: `0 0 30px ${npc.color}20`,
          }}
        >
          {/* NPC 이름 */}
          <div className="flex items-center gap-2 mb-3">
            {/* 말하는 중 인디케이터 (아바타 없을 때) */}
            {!showAvatar && isSpeaking && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: npc.color }}
              />
            )}
            <span className="font-bold text-base" style={{ color: npc.color }}>
              {npc.name}
            </span>
            {npc.title && (
              <span className="text-xs text-gray-400">
                {npc.title}
              </span>
            )}
          </div>

          {/* 대사 텍스트 */}
          <p className="text-base sm:text-lg leading-relaxed text-white/95 min-h-[3.5em]">
            {displayedText}
            <TypingCursor visible={isTyping} />
          </p>

          {/* 진행 안내 */}
          <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
            <span>
              {dialogue.currentIndex + 1} / {dialogue.entries.length}
            </span>
            <span className={isComplete ? 'animate-pulse' : 'opacity-50'}>
              {isTyping ? '클릭하여 스킵' : '클릭하여 계속'}
            </span>
          </div>
        </div>
      </div>

      {/* CSS 애니메이션 스타일 */}
      <style jsx global>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .animate-blink {
          animation: blink ${CURSOR_BLINK_INTERVAL}ms infinite;
        }
      `}</style>
    </motion.div>
  );
}

export default memo(VNDialogueBox);
