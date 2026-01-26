/**
 * useVoiceCommands Hook
 *
 * Web Speech API 기반 음성 인식 훅
 * - 한국어/영어 음성 명령 지원
 * - 연속 인식 모드
 * - 모바일/PC 모두 동작
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================
// Types
// ============================================

/** 지원하는 음성 명령 타입 */
export type VoiceCommandType = 'start' | 'next' | 'pause' | 'restart' | 'help';

/** 명령어 매핑 (한국어 + 영어) */
const VOICE_COMMANDS: Record<VoiceCommandType, string[]> = {
  start: ['시작', '시작해', '시작하자', '스타트', 'start', 'go', 'begin'],
  next: ['다음', '넘겨', '다음으로', '스킵', 'next', 'skip', 'continue'],
  pause: ['멈춰', '정지', '스톱', '잠깐', '중지', 'stop', 'pause', 'wait'],
  restart: ['다시', '다시해', '처음부터', '리스타트', 'restart', 'again', 'reset'],
  help: ['도움', '도움말', '뭐라고', '명령어', 'help', 'commands'],
};

interface UseVoiceCommandsOptions {
  /** 활성화 여부 */
  enabled?: boolean;
  /** 인식 언어 (기본: 한국어) */
  language?: string;
  /** 명령 인식 시 콜백 */
  onCommand?: (command: VoiceCommandType, transcript: string) => void;
  /** 시작 명령 */
  onStart?: () => void;
  /** 다음 명령 */
  onNext?: () => void;
  /** 일시정지 명령 */
  onPause?: () => void;
  /** 다시 시작 명령 */
  onRestart?: () => void;
  /** 도움말 명령 */
  onHelp?: () => void;
  /** 인식 실패 시 콜백 */
  onUnrecognized?: (transcript: string) => void;
  /** 에러 발생 시 콜백 */
  onError?: (error: string) => void;
}

interface UseVoiceCommandsReturn {
  /** 인식 중 여부 */
  isListening: boolean;
  /** 브라우저 지원 여부 */
  isSupported: boolean;
  /** 마지막 인식된 텍스트 */
  lastTranscript: string;
  /** 마지막 인식된 명령 */
  lastCommand: VoiceCommandType | null;
  /** 인식 시작 */
  startListening: () => void;
  /** 인식 중지 */
  stopListening: () => void;
  /** 인식 토글 */
  toggleListening: () => void;
  /** 지원 명령어 목록 */
  supportedCommands: typeof VOICE_COMMANDS;
}

// ============================================
// Hook Implementation
// ============================================

export function useVoiceCommands({
  enabled = true,
  language = 'ko-KR',
  onCommand,
  onStart,
  onNext,
  onPause,
  onRestart,
  onHelp,
  onUnrecognized,
  onError,
}: UseVoiceCommandsOptions = {}): UseVoiceCommandsReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState<VoiceCommandType | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 브라우저 지원 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  // 명령어 매칭
  const matchCommand = useCallback(
    (transcript: string): VoiceCommandType | null => {
      const normalized = transcript.toLowerCase().trim();

      for (const [command, keywords] of Object.entries(VOICE_COMMANDS)) {
        for (const keyword of keywords) {
          if (normalized.includes(keyword.toLowerCase())) {
            return command as VoiceCommandType;
          }
        }
      }
      return null;
    },
    []
  );

  // 명령어 실행
  const executeCommand = useCallback(
    (command: VoiceCommandType, transcript: string) => {
      setLastCommand(command);
      onCommand?.(command, transcript);

      switch (command) {
        case 'start':
          onStart?.();
          break;
        case 'next':
          onNext?.();
          break;
        case 'pause':
          onPause?.();
          break;
        case 'restart':
          onRestart?.();
          break;
        case 'help':
          onHelp?.();
          break;
      }
    },
    [onCommand, onStart, onNext, onPause, onRestart, onHelp]
  );

  // 인식 재시작 (debounced)
  const scheduleRestart = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }

    restartTimeoutRef.current = setTimeout(() => {
      if (isActiveRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn('[VoiceCommands] Failed to restart recognition:', e);
        }
      }
    }, 300);
  }, []);

  // 음성 인식 시작
  const startListening = useCallback(() => {
    if (!isSupported || !enabled) {
      console.warn('[VoiceCommands] Not supported or disabled');
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // 기존 인스턴스 정리
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = language;
    recognition.continuous = true; // 연속 인식
    recognition.interimResults = true; // 중간 결과 포함
    recognition.maxAlternatives = 3; // 대안 결과 수

    recognition.onstart = () => {
      isActiveRef.current = true;
      setIsListening(true);
      console.log('[VoiceCommands] Started listening');
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const results = event.results;
      const lastResult = results[results.length - 1];

      if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript;
        setLastTranscript(transcript);

        const command = matchCommand(transcript);
        if (command) {
          console.log(`[VoiceCommands] Command: "${command}" from "${transcript}"`);
          executeCommand(command, transcript);
        } else {
          console.log(`[VoiceCommands] Unrecognized: "${transcript}"`);
          onUnrecognized?.(transcript);
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.warn('[VoiceCommands] Error:', event.error);
      onError?.(event.error);

      // 치명적이지 않은 오류면 재시작
      if (
        event.error !== 'not-allowed' &&
        event.error !== 'service-not-allowed' &&
        event.error !== 'network'
      ) {
        if (isActiveRef.current) {
          scheduleRestart();
        }
      } else {
        // 권한 오류 등은 인식 중지
        setIsListening(false);
        isActiveRef.current = false;
      }
    };

    recognition.onend = () => {
      // 의도적 종료가 아니면 자동 재시작 (연속 인식)
      if (isActiveRef.current) {
        scheduleRestart();
      } else {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('[VoiceCommands] Failed to start:', error);
      onError?.('Failed to start speech recognition');
    }
  }, [
    isSupported,
    enabled,
    language,
    matchCommand,
    executeCommand,
    onUnrecognized,
    onError,
    scheduleRestart,
  ]);

  // 음성 인식 중지
  const stopListening = useCallback(() => {
    isActiveRef.current = false;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }

    setIsListening(false);
    console.log('[VoiceCommands] Stopped listening');
  }, []);

  // 토글
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      isActiveRef.current = false;

      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    lastTranscript,
    lastCommand,
    startListening,
    stopListening,
    toggleListening,
    supportedCommands: VOICE_COMMANDS,
  };
}

// ============================================
// TypeScript Type Declarations
// ============================================

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

export default useVoiceCommands;
