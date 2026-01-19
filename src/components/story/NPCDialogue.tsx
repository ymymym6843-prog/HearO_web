'use client';

/**
 * NPCDialogue - NPC 대화 표시 컴포넌트
 * 비주얼노벨 스타일 대화창
 */

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorldviewType } from '@/types/vrm';
import {
  NPC_CHARACTERS,
  getNPCImagePath,
  getMainNPC,
  type NPCCharacter,
  type NPCEmotion,
} from '@/constants/npcCharacters';
import { ttsService } from '@/services/ttsService';
import type { PerformanceRating } from '@/types/exercise';

interface NPCDialogueProps {
  /** 세계관 ID */
  worldview: WorldviewType;
  /** NPC ID (없으면 메인 NPC 사용) */
  npcId?: string;
  /** 감정 */
  emotion?: NPCEmotion;
  /** 대사 텍스트 */
  dialogue: string;
  /** 말풍선 위치 */
  position?: 'left' | 'right' | 'center';
  /** TTS 활성화 */
  ttsEnabled?: boolean;
  /** 자동 숨김 시간 (ms, 0이면 자동 숨김 안함) */
  autoHideDelay?: number;
  /** 표시 완료 콜백 */
  onComplete?: () => void;
  /** 탭 콜백 */
  onTap?: () => void;
  /** 표시 여부 */
  visible?: boolean;
}

export function NPCDialogue({
  worldview,
  npcId,
  emotion = 'normal',
  dialogue,
  position = 'left',
  ttsEnabled = false,
  autoHideDelay = 5000,
  onComplete,
  onTap,
  visible = true,
}: NPCDialogueProps) {
  const [isVisible, setIsVisible] = useState(visible);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [displayedText, setDisplayedText] = useState('');

  // NPC 정보 가져오기
  const npc: NPCCharacter = npcId
    ? NPC_CHARACTERS[worldview][npcId] || getMainNPC(worldview)
    : getMainNPC(worldview);

  const imagePath = getNPCImagePath(worldview, npc.id, emotion);

  // 타이핑 효과
  useEffect(() => {
    if (!visible || !dialogue) return;

    let index = 0;
    setDisplayedText('');

    const interval = setInterval(() => {
      if (index < dialogue.length) {
        setDisplayedText(dialogue.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [dialogue, visible]);

  // TTS 재생
  useEffect(() => {
    if (!visible || !ttsEnabled || !dialogue) return;

    setIsSpeaking(true);
    ttsService.speak(dialogue, () => {
      setIsSpeaking(false);
    });

    return () => {
      ttsService.stop();
    };
  }, [dialogue, visible, ttsEnabled]);

  // 자동 숨김
  useEffect(() => {
    if (!visible || autoHideDelay <= 0) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, autoHideDelay);

    return () => clearTimeout(timer);
  }, [visible, autoHideDelay, onComplete]);

  // 탭 핸들러
  const handleTap = useCallback(() => {
    if (isSpeaking) {
      ttsService.stop();
      setIsSpeaking(false);
    }
    onTap?.();
  }, [isSpeaking, onTap]);

  // visible prop 변경 시 업데이트
  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  // dialogue가 없으면 렌더링하지 않음
  if (!isVisible || !dialogue) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className={`
          flex items-end gap-3 p-4
          ${position === 'right' ? 'flex-row-reverse' : ''}
          ${position === 'center' ? 'justify-center' : ''}
        `}
        onClick={handleTap}
      >
        {/* NPC 아바타 */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="relative flex-shrink-0"
        >
          <div
            className="w-16 h-16 rounded-full overflow-hidden border-2"
            style={{ borderColor: npc.color }}
          >
            <Image
              src={imagePath}
              alt={npc.name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
              onError={(e) => {
                // 이미지 로드 실패 시 플레이스홀더
                (e.target as HTMLImageElement).src = '/images/logo-icon.png';
              }}
            />
          </div>

          {/* 말하는 중 인디케이터 */}
          {isSpeaking && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: npc.color }}
            >
              <svg
                className="w-3 h-3 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                  clipRule="evenodd"
                />
              </svg>
            </motion.div>
          )}
        </motion.div>

        {/* 말풍선 */}
        <motion.div
          initial={{ opacity: 0, x: position === 'right' ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`
            flex-1 max-w-[320px] rounded-2xl p-4 border-2
            ${position === 'right' ? 'rounded-br-sm' : 'rounded-bl-sm'}
          `}
          style={{
            backgroundColor: 'var(--background-secondary)',
            borderColor: npc.color,
          }}
        >
          {/* NPC 이름 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold" style={{ color: npc.color }}>
              {npc.name}
            </span>
            <span className="text-xs text-gray-400">{npc.title}</span>
          </div>

          {/* 대사 (타이핑 효과) */}
          <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
            {displayedText}
            {dialogue && displayedText.length < dialogue.length && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                |
              </motion.span>
            )}
          </p>

          {/* 탭 안내 */}
          <p className="text-xs text-gray-500 mt-2 text-right">탭하여 계속</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// 결과 화면용 NPC 배너
interface NPCResultBannerProps {
  worldview: WorldviewType;
  performanceRating: PerformanceRating;
  customDialogue?: string;
}

export function NPCResultBanner({
  worldview,
  performanceRating,
  customDialogue,
}: NPCResultBannerProps) {
  const npc = getMainNPC(worldview);
  const emotion: NPCEmotion =
    performanceRating === 'perfect'
      ? 'happy'
      : performanceRating === 'good'
      ? 'normal'
      : 'serious';

  const imagePath = getNPCImagePath(worldview, npc.id, emotion);

  // 기본 대사
  const defaultDialogues: Record<PerformanceRating, string[]> = {
    perfect: [
      '완벽했어요! 정말 대단합니다!',
      '최고의 실력이에요! 이 조자로 계속!',
      '놀라운 실력이네요! 자랑스러워요!',
    ],
    good: [
      '잘했어요! 조금만 더 힘내세요!',
      '좋아요! 점점 나아지고 있어요!',
      '훌륭해요! 이 기세로 계속해요!',
    ],
    normal: [
      '괜찮아요, 다시 도전해봐요!',
      '포기하지 마세요! 할 수 있어요!',
      '연습하면 늘어요! 화이팅!',
    ],
  };

  // useState 초기화 시점에 랜덤 대사 선택 (hydration 일치를 위해 suppressHydrationWarning 사용)
  const [dialogue] = useState(() => {
    if (customDialogue) return customDialogue;
    const dialogues = defaultDialogues[performanceRating];
    const randomIndex = Math.floor(Math.random() * dialogues.length);
    return dialogues[randomIndex];
  });

  const bgColor =
    performanceRating === 'perfect'
      ? '#10B981'
      : performanceRating === 'good'
      ? '#3B82F6'
      : '#F59E0B';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 rounded-2xl"
      style={{ backgroundColor: `${bgColor}20` }}
    >
      {/* NPC 아바타 */}
      <div
        className="w-12 h-12 rounded-full overflow-hidden"
        style={{ backgroundColor: `${bgColor}30` }}
      >
        <Image
          src={imagePath}
          alt={npc.name}
          width={48}
          height={48}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/logo-icon.png';
          }}
        />
      </div>

      {/* 대사 */}
      <div className="flex-1">
        <p className="text-xs font-semibold mb-1" style={{ color: bgColor }}>
          {npc.name}의 한마디
        </p>
        <p className="text-sm italic" style={{ color: 'var(--foreground-secondary)' }}>
          &quot;{dialogue}&quot;
        </p>
      </div>
    </motion.div>
  );
}

export default NPCDialogue;
