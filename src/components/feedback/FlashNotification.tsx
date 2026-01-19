'use client';

/**
 * 시각적 플래시 알림 컴포넌트
 * 청각장애인 사용자를 위한 중요 이벤트 알림
 * 화면 전체에 짧은 애니메이션으로 메시지 표시
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';

// 알림 타입 정의
export type FlashType = 'success' | 'warning' | 'error' | 'info' | 'rep' | 'complete';

interface FlashNotificationProps {
  show: boolean;
  type: FlashType;
  message: string;
  onComplete?: () => void;
  duration?: number; // ms, 기본 1500ms
}

// 타입별 스타일 설정
const FLASH_CONFIG: Record<FlashType, { color: string; bgColor: string; icon: IconName }> = {
  success: {
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    icon: 'checkmark-circle-outline',
  },
  warning: {
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    icon: 'warning-outline',
  },
  error: {
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    icon: 'close-circle-outline',
  },
  info: {
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    icon: 'information-circle-outline',
  },
  rep: {
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    icon: 'fitness-outline',
  },
  complete: {
    color: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
    icon: 'trophy-outline',
  },
};

export function FlashNotification({
  show,
  type,
  message,
  onComplete,
  duration = 1500,
}: FlashNotificationProps) {
  const config = FLASH_CONFIG[type];

  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          {/* 배경 플래시 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.6, 0.3, 0],
            }}
            transition={{
              duration: duration / 1000,
              times: [0, 0.15, 0.5, 1],
              ease: 'easeOut',
            }}
            className="absolute inset-0"
            style={{ backgroundColor: config.bgColor }}
          />

          {/* 중앙 알림 카드 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.1, 1, 0.9],
              y: [20, 0, 0, -10],
            }}
            transition={{
              duration: duration / 1000,
              times: [0, 0.2, 0.7, 1],
              ease: 'easeOut',
            }}
            className="relative bg-black/85 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl"
            style={{
              borderWidth: 3,
              borderColor: config.color,
              boxShadow: `0 0 40px ${config.color}40`,
            }}
          >
            {/* 아이콘 */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{
                duration: 0.4,
                delay: 0.1,
                ease: 'backOut',
              }}
              className="flex justify-center mb-3"
              aria-hidden="true"
            >
              <Icon name={config.icon} size={56} color={config.color} />
            </motion.div>

            {/* 메시지 */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="text-xl sm:text-2xl font-black text-center"
              style={{ color: config.color }}
            >
              {message}
            </motion.p>
          </motion.div>

          {/* 스크린 리더용 텍스트 */}
          <span className="sr-only">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 반복 완료 알림용 간편 컴포넌트
interface RepFlashProps {
  repCount: number;
  show: boolean;
  onComplete?: () => void;
}

export function RepFlash({ repCount, show, onComplete }: RepFlashProps) {
  return (
    <FlashNotification
      show={show}
      type="rep"
      message={`${repCount}회 완료!`}
      onComplete={onComplete}
      duration={1000}
    />
  );
}

// 운동 완료 알림용 간편 컴포넌트
interface ExerciseCompleteFlashProps {
  show: boolean;
  accuracy?: number;
  onComplete?: () => void;
}

export function ExerciseCompleteFlash({
  show,
  accuracy,
  onComplete,
}: ExerciseCompleteFlashProps) {
  const message = accuracy !== undefined
    ? `운동 완료! 정확도 ${Math.round(accuracy)}%`
    : '운동 완료!';

  return (
    <FlashNotification
      show={show}
      type="complete"
      message={message}
      onComplete={onComplete}
      duration={2500}
    />
  );
}

// 사용 예시를 위한 훅
export function useFlashNotification() {
  const [flash, setFlash] = useState<{
    show: boolean;
    type: FlashType;
    message: string;
  }>({
    show: false,
    type: 'info',
    message: '',
  });

  const showFlash = (type: FlashType, message: string) => {
    setFlash({ show: true, type, message });
  };

  const hideFlash = () => {
    setFlash((prev) => ({ ...prev, show: false }));
  };

  return {
    flash,
    showFlash,
    hideFlash,
    FlashComponent: (
      <FlashNotification
        show={flash.show}
        type={flash.type}
        message={flash.message}
        onComplete={hideFlash}
      />
    ),
  };
}
