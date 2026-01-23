/**
 * ThemedDialogueBox - 세계관별 대화창 컴포넌트
 *
 * 각 세계관의 고유한 대화창 스타일 자동 적용:
 * - Fantasy: 양피지 텍스처
 * - Sports: 스코어보드 LED
 * - Idol: 네온사인 글로우
 * - SF: 홀로그램 스캔라인
 * - Spy: 기밀문서 스탬프
 * - Zombie: 거친 노이즈 텍스처
 */

'use client';

import React, { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useTheme, useDialogueBoxClass } from '@/contexts/ThemeContext';
import type { WorldviewId } from '@/constants/worldviews';
import { WORLDVIEW_TYPING_SPEEDS } from '@/constants/themes';

// ============================================
// Types
// ============================================

interface ThemedDialogueBoxProps {
  /** 표시할 텍스트 */
  text: string;
  /** NPC/캐릭터 이름 */
  speakerName?: string;
  /** 타이핑 속도 (ms per char) - 미지정시 세계관별 기본값 사용 */
  typingSpeed?: number;
  /** 타이핑 완료 시 콜백 */
  onComplete?: () => void;
  /** 클릭 시 콜백 (다음으로 진행) */
  onClick?: () => void;
  /** 스킵 가능 여부 */
  skippable?: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 자식 요소 (버튼 등) */
  children?: ReactNode;
  /** 등장 애니메이션 활성화 */
  entrance?: boolean;
  /** 햅틱 피드백 활성화 (모바일) */
  hapticFeedback?: boolean;
}

// ============================================
// Component
// ============================================

export function ThemedDialogueBox({
  text,
  speakerName,
  typingSpeed,
  onComplete,
  onClick,
  skippable = true,
  className = '',
  children,
  entrance = true,
  hapticFeedback = true,
}: ThemedDialogueBoxProps) {
  const { theme, worldviewId } = useTheme();
  const dialogueClass = useDialogueBoxClass();

  // 세계관별 기본 타이핑 속도 사용 (미지정시)
  const effectiveTypingSpeed = typingSpeed ?? WORLDVIEW_TYPING_SPEEDS[worldviewId as keyof typeof WORLDVIEW_TYPING_SPEEDS] ?? 30;

  // 햅틱 피드백 함수
  const triggerHaptic = useCallback(() => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [hapticFeedback]);

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showCursor, setShowCursor] = useState(true);

  const fullTextRef = useRef(text);
  const charIndexRef = useRef(0);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cursorTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 텍스트 변경 시 리셋
  useEffect(() => {
    fullTextRef.current = text;
    charIndexRef.current = 0;
    setDisplayedText('');
    setIsTyping(true);
  }, [text]);

  // 타이핑 애니메이션
  useEffect(() => {
    if (!isTyping) return;

    const typeNextChar = () => {
      if (charIndexRef.current < fullTextRef.current.length) {
        charIndexRef.current++;
        setDisplayedText(fullTextRef.current.slice(0, charIndexRef.current));
        typingTimerRef.current = setTimeout(typeNextChar, effectiveTypingSpeed);
      } else {
        setIsTyping(false);
        onComplete?.();
      }
    };

    typingTimerRef.current = setTimeout(typeNextChar, effectiveTypingSpeed);

    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [isTyping, effectiveTypingSpeed, onComplete]);

  // 커서 깜빡임
  useEffect(() => {
    cursorTimerRef.current = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => {
      if (cursorTimerRef.current) {
        clearInterval(cursorTimerRef.current);
      }
    };
  }, []);

  // 스킵 처리
  const handleClick = useCallback(() => {
    triggerHaptic();

    if (isTyping && skippable) {
      // 타이핑 중이면 스킵
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      setDisplayedText(fullTextRef.current);
      setIsTyping(false);
      onComplete?.();
    } else if (!isTyping) {
      // 타이핑 완료면 다음으로
      onClick?.();
    }
  }, [isTyping, skippable, onComplete, onClick, triggerHaptic]);

  // 세계관별 추가 요소
  const renderWorldviewEffects = () => {
    switch (worldviewId) {
      case 'sf':
        return <div className="hologram-scanlines absolute inset-0 pointer-events-none" />;
      case 'zombie':
        return <div className="noise-overlay absolute inset-0 pointer-events-none" />;
      case 'spy':
        return null; // CSS ::before로 처리
      default:
        return null;
    }
  };

  // 커서 스타일
  const getCursorStyle = (): string => {
    const cursorStyles: Record<WorldviewId, string> = {
      fantasy: '|',
      sports: '_',
      idol: '\u2665', // heart
      sf: '\u2588', // block
      zombie: '\u2592', // medium shade
      spy: '_',
    };
    return cursorStyles[worldviewId];
  };

  return (
    <div
      className={`
        relative p-6 min-h-[120px] cursor-pointer
        transition-all duration-300 ease-out
        ${dialogueClass}
        ${entrance ? 'dialogue-entrance' : ''}
        ${className}
      `}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {/* 세계관별 효과 */}
      {renderWorldviewEffects()}

      {/* 화자 이름 */}
      {speakerName && (
        <div
          className="absolute -top-3 left-4 px-3 py-1 text-sm font-bold rounded"
          style={{
            background: theme.colors.primary,
            color: theme.colors.background,
            fontFamily: theme.fonts.title,
          }}
        >
          {speakerName}
        </div>
      )}

      {/* 대화 텍스트 */}
      <div
        className="relative z-10 text-lg leading-relaxed"
        style={{
          fontFamily: theme.fonts.body,
          color: worldviewId === 'spy' || worldviewId === 'fantasy' ? '#1a1a1a' : theme.colors.text,
        }}
      >
        {displayedText}
        {isTyping && showCursor && (
          <span
            className="ml-1"
            style={{ color: theme.colors.primary }}
          >
            {getCursorStyle()}
          </span>
        )}
      </div>

      {/* 다음 표시 */}
      {!isTyping && (
        <div
          className="absolute bottom-3 right-4 animate-bounce text-sm"
          style={{ color: theme.colors.textSecondary }}
        >
          {worldviewId === 'sf' ? '▶ CONTINUE' : worldviewId === 'spy' ? '[NEXT]' : '\u25BC'}
        </div>
      )}

      {/* 추가 요소 */}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export default ThemedDialogueBox;
