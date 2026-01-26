/**
 * useTypingAnimation Hook
 *
 * 통합된 타이핑 애니메이션 훅
 * - requestAnimationFrame 기반 부드러운 애니메이션
 * - 이징 효과 (초반 빠름 → 끝 부드럽게)
 * - 구두점에서 자연스러운 쉼
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TYPING_CONFIG } from '@/constants/themes';

interface UseTypingAnimationOptions {
  text: string;
  enabled?: boolean;
  onComplete?: () => void;
  customSpeed?: number;
}

interface UseTypingAnimationReturn {
  displayedText: string;
  isTyping: boolean;
  skip: () => void;
  restart: () => void;
  progress: number; // 0~1
}

export function useTypingAnimation({
  text,
  enabled = true,
  onComplete,
  customSpeed,
}: UseTypingAnimationOptions): UseTypingAnimationReturn {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const charIndexRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);
  const onCompleteRef = useRef(onComplete);

  // onComplete ref 업데이트
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const baseSpeed = customSpeed ?? TYPING_CONFIG.baseSpeed;

  // 이징 함수: 진행도에 따른 속도 배율 계산
  const getSpeedMultiplier = useCallback((progress: number): number => {
    const { easing, acceleration } = TYPING_CONFIG;
    const { startMultiplier, endMultiplier } = acceleration;

    switch (easing) {
      case 'easeOut':
        // 초반 빠름 → 후반 느림 (자연스러운 감속)
        const t = 1 - Math.pow(1 - progress, 2);
        return startMultiplier + (endMultiplier - startMultiplier) * t;

      case 'easeInOut':
        // 중간이 가장 빠름
        const mid =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        return startMultiplier + (1 - startMultiplier) * (1 - Math.abs(mid - 0.5) * 2);

      default: // linear
        return 1;
    }
  }, []);

  // 현재 문자의 딜레이 계산
  const getCharDelay = useCallback(
    (char: string, progress: number): number => {
      const speedMultiplier = getSpeedMultiplier(progress);
      const punctuationDelay = TYPING_CONFIG.punctuationDelay[char] ?? 0;

      return baseSpeed * speedMultiplier + punctuationDelay;
    },
    [baseSpeed, getSpeedMultiplier]
  );

  // 타이핑 시작
  const startTyping = useCallback(() => {
    if (!text) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    charIndexRef.current = 0;
    accumulatedTimeRef.current = 0;
    lastTimeRef.current = performance.now();
    setIsTyping(true);
    setDisplayedText('');

    const typeLoop = (currentTime: number) => {
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      accumulatedTimeRef.current += deltaTime;

      const currentIndex = charIndexRef.current;
      const totalLength = text.length;

      if (currentIndex >= totalLength) {
        setIsTyping(false);
        onCompleteRef.current?.();
        return;
      }

      const progress = currentIndex / totalLength;
      const currentChar = text[currentIndex];
      const requiredDelay = getCharDelay(currentChar, progress);

      if (accumulatedTimeRef.current >= requiredDelay) {
        accumulatedTimeRef.current -= requiredDelay;
        charIndexRef.current++;
        setDisplayedText(text.slice(0, charIndexRef.current));
      }

      animationFrameRef.current = requestAnimationFrame(typeLoop);
    };

    animationFrameRef.current = requestAnimationFrame(typeLoop);
  }, [text, getCharDelay]);

  // 스킵 기능
  const skip = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    charIndexRef.current = text.length;
    setDisplayedText(text);
    setIsTyping(false);
    onCompleteRef.current?.();
  }, [text]);

  // 재시작
  const restart = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startTyping();
  }, [startTyping]);

  // 텍스트 변경 시 시작
  useEffect(() => {
    if (!enabled) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    startTyping();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [text, enabled, startTyping]);

  return {
    displayedText,
    isTyping,
    skip,
    restart,
    progress: text.length > 0 ? charIndexRef.current / text.length : 0,
  };
}

export default useTypingAnimation;
