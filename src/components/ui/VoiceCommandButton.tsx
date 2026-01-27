/**
 * VoiceCommandButton - 음성 명령 버튼 컴포넌트
 *
 * 기능:
 * - 음성 인식 on/off 토글
 * - 인식 상태 시각적 피드백
 * - 마지막 인식 결과 표시
 * - 지원 명령어 도움말
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useVoiceCommands, type VoiceCommandType } from '@/hooks/useVoiceCommands';

// ============================================
// Types
// ============================================

interface VoiceCommandButtonProps {
  /** 시작 명령 콜백 */
  onStart?: () => void;
  /** 다음 명령 콜백 */
  onNext?: () => void;
  /** 일시정지 명령 콜백 */
  onPause?: () => void;
  /** 다시 시작 명령 콜백 */
  onRestart?: () => void;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 크기 */
  size?: 'sm' | 'md' | 'lg';
  /** 도움말 표시 여부 */
  showHelp?: boolean;
}

// ============================================
// Component
// ============================================

export function VoiceCommandButton({
  onStart,
  onNext,
  onPause,
  onRestart,
  className = '',
  size = 'md',
  showHelp = true,
}: VoiceCommandButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);

  // 명령 인식 피드백
  const handleCommand = useCallback((command: VoiceCommandType, _transcript: string) => {
    const commandLabels: Record<VoiceCommandType, string> = {
      start: '시작',
      next: '다음',
      pause: '정지',
      restart: '다시',
      help: '도움말',
    };
    setFeedbackText(`${commandLabels[command]}`);

    // 2초 후 피드백 숨김
    setTimeout(() => setFeedbackText(null), 2000);
  }, []);

  // 도움말 표시
  const handleHelp = useCallback(() => {
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 5000);
  }, []);

  const {
    isListening,
    isSupported,
    lastTranscript,
    toggleListening,
  } = useVoiceCommands({
    onStart,
    onNext,
    onPause,
    onRestart,
    onHelp: handleHelp,
    onCommand: handleCommand,
    onUnrecognized: (transcript) => {
      setFeedbackText(`"${transcript.slice(0, 15)}..."`);
      setTimeout(() => setFeedbackText(null), 2000);
    },
  });

  // 지원하지 않으면 렌더링하지 않음
  if (!isSupported) {
    return null;
  }

  // 크기별 스타일
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={`relative ${className}`}>
      {/* 메인 버튼 */}
      <button
        onClick={toggleListening}
        className={`
          ${sizeClasses[size]}
          rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-300
          ${isListening
            ? 'bg-red-500 text-white shadow-red-500/40'
            : 'bg-white/90 text-gray-700 hover:bg-white hover:shadow-xl'
          }
          ${isListening ? 'animate-pulse' : ''}
        `}
        aria-label={isListening ? '음성 인식 중지' : '음성 인식 시작'}
        title={isListening ? '탭하여 중지' : '탭하여 음성 명령 시작'}
      >
        {/* 마이크 아이콘 */}
        <svg
          className={iconSizes[size]}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          {isListening ? (
            // 인식 중 아이콘 (파형)
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          ) : (
            // 마이크 아이콘
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          )}
        </svg>
      </button>

      {/* 인식 중 링 애니메이션 */}
      {isListening && (
        <div className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-30" />
      )}

      {/* 피드백 텍스트 */}
      {(feedbackText || (isListening && lastTranscript)) && (
        <div
          className={`
            absolute -top-10 left-1/2 -translate-x-1/2
            whitespace-nowrap
            bg-black/80 text-white
            px-3 py-1.5 rounded-full
            text-xs font-medium
            animate-fade-in
          `}
        >
          {feedbackText || (isListening ? '듣는 중...' : '')}
        </div>
      )}

      {/* 도움말 툴팁 */}
      {showHelp && showTooltip && (
        <div
          className={`
            absolute bottom-full left-1/2 -translate-x-1/2 mb-3
            bg-gray-900 text-white
            p-3 rounded-lg shadow-xl
            text-xs
            min-w-[160px]
            z-50
          `}
        >
          <div className="font-bold mb-2 text-center">음성 명령</div>
          <ul className="space-y-1">
            <li>&quot;시작&quot; - 운동 시작</li>
            <li>&quot;다음&quot; - 다음으로</li>
            <li>&quot;멈춰&quot; - 일시정지</li>
            <li>&quot;다시&quot; - 처음부터</li>
          </ul>
          {/* 화살표 */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

export default VoiceCommandButton;
