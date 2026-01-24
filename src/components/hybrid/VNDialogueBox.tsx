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
import { getMainNPC, getNPCImagePath, NPC_CHARACTERS, type NPCCharacter, type NPCEmotion } from '@/constants/npcCharacters';
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
  /** 전체 스킵 콜백 (스킵해도 스토리는 계속 생성됨을 알림) */
  onSkipAll?: () => void;
  /** 타이핑 속도 (ms/char) */
  typingSpeed?: number;
  /** TTS 활성화 */
  enableTTS?: boolean;
  /** 아바타 표시 여부 (기본: false, NPCLayer와 함께 사용 시 false) */
  showAvatar?: boolean;
  /** 스킵 버튼 표시 여부 (기본: true) */
  showSkipButton?: boolean;
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
 * NPC 아바타 (메모이즈) - 대화창 내 아바타 표시용 (향후 사용 예정)
 */
const _NPCAvatar = memo(function _NPCAvatar({
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
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
  onSkipAll,
  typingSpeed: _typingSpeed = DEFAULT_TYPING_SPEED,
  enableTTS = false,
  showAvatar: _showAvatar = false, // 기본적으로 아바타 숨김 (NPCLayer와 함께 사용)
  showSkipButton = true,
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

  // NPC 정보 - currentEntry 전체를 의존성으로 사용 (React Compiler 호환)
  const npc = useMemo(() => {
    if (!currentEntry) return getMainNPC(worldview);
    const npcChars = NPC_CHARACTERS[worldview];
    return npcChars?.[currentEntry.npcId] || getMainNPC(worldview);
  }, [worldview, currentEntry]);

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
   * 전체 스킵 핸들러
   * 대화를 건너뛰고 바로 운동으로 전환
   * 백그라운드에서 스토리 생성은 계속됨
   */
  const handleSkipAll = useCallback(() => {
    // 타이핑 중지
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    // TTS 중지
    if (isSpeaking) {
      ttsService.stop();
      setIsSpeaking(false);
    }

    // 대화 종료
    endDialogue();

    // 스킵 콜백 호출 (백그라운드 스토리 생성 유지 알림)
    onSkipAll?.();

    // 전환 요청
    onTransitionRequest?.();
  }, [isSpeaking, endDialogue, onSkipAll, onTransitionRequest]);

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

  // 현재 텍스트 (useEffect 의존성용)
  const currentText = currentEntry?.text;

  /**
   * 타이핑 효과 실행
   * currentText 변경 시 새로운 타이핑 애니메이션 시작
   */
  useEffect(() => {
    if (!currentText) return;

    // refs 초기화 (useEffect 내에서만 업데이트)
    fullTextRef.current = currentText;
    charIndexRef.current = 0;

    // 새 텍스트 시작 - 타이핑 애니메이션을 위한 필수 초기화
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayedText('');
    setIsTyping(true);
    setIsComplete(false);

    // 타이핑 애니메이션 시작
    const typeNextChar = () => {
      if (charIndexRef.current < fullTextRef.current.length) {
        charIndexRef.current++;
        setDisplayedText(fullTextRef.current.slice(0, charIndexRef.current));
        typingTimerRef.current = requestAnimationFrame(typeNextChar);
      } else {
        setIsTyping(false);
        setIsComplete(true);
      }
    };

    // 첫 프레임 대기 후 시작
    const startTimer = setTimeout(() => {
      typingTimerRef.current = requestAnimationFrame(typeNextChar);
    }, 50);

    // TTS 재생
    if (enableTTS && currentEntry?.tts !== false) {
      setIsSpeaking(true);
      ttsService.speak(currentText, () => {
        setIsSpeaking(false);
      });
    }

    return () => {
      clearTimeout(startTimer);
      if (typingTimerRef.current) {
        cancelAnimationFrame(typingTimerRef.current);
      }
    };
  }, [currentText, enableTTS, currentEntry?.tts]);

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
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed bottom-0 left-0 right-0 z-20 p-4 pb-6"
      onClick={handleTap}
      onTouchEnd={handleTap}
    >
      {/* 대화창 영역 (전체 너비) */}
      <div className="relative w-full max-w-6xl mx-auto">
        {/* Skip Button - 대화창 우상단 */}
        {showSkipButton && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            onClick={(e) => {
              e.stopPropagation();
              handleSkipAll();
            }}
            className="absolute -top-12 right-4 sm:right-8 px-4 py-2 rounded-xl z-10
                       flex items-center gap-2 transition-all duration-200
                       hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(30, 30, 40, 0.9)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* Play 아이콘 */}
            <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="text-sm text-gray-300 font-medium">바로 시작</span>
          </motion.button>
        )}

        {/* Name Plate - 대화창 좌상단에 별도 분리 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="absolute -top-12 left-4 sm:left-8 px-5 py-2 rounded-t-xl z-10"
          style={{
            background: `linear-gradient(135deg, ${npc.color} 0%, ${npc.color}CC 100%)`,
            boxShadow: `0 -4px 20px ${npc.color}40`,
          }}
        >
          <div className="flex items-center gap-2">
            {/* 말하는 중 인디케이터 */}
            {isSpeaking && (
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="w-2.5 h-2.5 rounded-full bg-white/90"
              />
            )}
            <span className="font-bold text-white text-sm sm:text-base drop-shadow-md">
              {npc.name}
            </span>
            {npc.title && (
              <span className="text-xs text-white/70 hidden sm:inline">
                {npc.title}
              </span>
            )}
          </div>
        </motion.div>

        {/* Glassmorphism 대화창 - Enhanced */}
        <div
          className="vn-dialogue-box relative w-full rounded-2xl p-5 sm:p-6 overflow-hidden"
          style={{
            background: `linear-gradient(135deg,
              rgba(20, 20, 35, 0.92) 0%,
              rgba(15, 15, 25, 0.88) 50%,
              rgba(20, 20, 35, 0.92) 100%)`,
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: `1px solid rgba(255, 255, 255, 0.12)`,
            boxShadow: `
              0 8px 32px rgba(0, 0, 0, 0.6),
              0 0 80px ${npc.color}20,
              0 0 120px ${npc.color}10,
              inset 0 1px 0 rgba(255, 255, 255, 0.08),
              inset 0 -1px 0 rgba(0, 0, 0, 0.2)
            `,
          }}
        >
          {/* Animated Border Glow */}
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{
              boxShadow: [
                `inset 0 0 30px ${npc.color}15, 0 0 20px ${npc.color}10`,
                `inset 0 0 40px ${npc.color}25, 0 0 30px ${npc.color}15`,
                `inset 0 0 30px ${npc.color}15, 0 0 20px ${npc.color}10`,
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Shimmer Effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(105deg,
                transparent 40%,
                rgba(255, 255, 255, 0.03) 45%,
                rgba(255, 255, 255, 0.05) 50%,
                rgba(255, 255, 255, 0.03) 55%,
                transparent 60%)`,
              backgroundSize: '200% 100%',
            }}
            animate={{
              backgroundPosition: ['200% 0%', '-200% 0%'],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />

          {/* 상단 하이라이트 라인 - Enhanced */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: `linear-gradient(90deg,
                transparent 5%,
                ${npc.color}40 20%,
                ${npc.color}80 50%,
                ${npc.color}40 80%,
                transparent 95%)`,
            }}
          />

          {/* 좌측 하이라이트 */}
          <div
            className="absolute top-0 left-0 bottom-0 w-px"
            style={{
              background: `linear-gradient(180deg,
                ${npc.color}60,
                rgba(255, 255, 255, 0.1) 50%,
                transparent)`,
            }}
          />

          {/* 대사 텍스트 */}
          <p className="text-base sm:text-lg md:text-xl leading-relaxed text-white/95 min-h-[4em] sm:min-h-[4.5em]">
            {displayedText}
            <TypingCursor visible={isTyping} />
          </p>

          {/* 하단 UI 영역 */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
            {/* 진행 상황 */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 font-mono">
                {String(dialogue.currentIndex + 1).padStart(2, '0')} / {String(dialogue.entries.length).padStart(2, '0')}
              </span>
              {/* 진행 바 */}
              <div className="w-20 sm:w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: npc.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${((dialogue.currentIndex + 1) / dialogue.entries.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* 계속 안내 */}
            <motion.div
              animate={isComplete ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.5 }}
              transition={isComplete ? { duration: 1.5, repeat: Infinity } : {}}
              className="flex items-center gap-2 text-xs text-gray-400"
            >
              <span className="hidden sm:inline">
                {isTyping ? '클릭하여 스킵' : '클릭하여 계속'}
              </span>
              {/* 계속 화살표 아이콘 */}
              <motion.svg
                animate={isComplete ? { x: [0, 4, 0] } : {}}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </motion.svg>
            </motion.div>
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
