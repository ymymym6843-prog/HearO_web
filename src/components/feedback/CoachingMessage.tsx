'use client';

/**
 * CoachingMessage - 실시간 코칭 메시지 컴포넌트
 * AI 기반 자세 교정 피드백 표시
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';

type MessageType = 'info' | 'success' | 'warning' | 'error';

interface CoachingMessageProps {
  message: string | null;
  type?: MessageType;
  themeColor?: string;
}

const TYPE_CONFIG: Record<MessageType, { bgColor: string; iconColor: string; icon: IconName }> = {
  info: {
    bgColor: 'rgba(59, 130, 246, 0.2)',
    iconColor: '#3B82F6',
    icon: 'information-circle',
  },
  success: {
    bgColor: 'rgba(16, 185, 129, 0.2)',
    iconColor: '#10B981',
    icon: 'checkmark-circle',
  },
  warning: {
    bgColor: 'rgba(245, 158, 11, 0.2)',
    iconColor: '#F59E0B',
    icon: 'warning',
  },
  error: {
    bgColor: 'rgba(239, 68, 68, 0.2)',
    iconColor: '#EF4444',
    icon: 'alert-circle',
  },
};

export function CoachingMessage({
  message,
  type = 'info',
  themeColor,
}: CoachingMessageProps) {
  const config = TYPE_CONFIG[type];

  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-sm"
          style={{
            backgroundColor: themeColor ? `${themeColor}20` : config.bgColor,
            border: `1px solid ${themeColor || config.iconColor}40`,
          }}
        >
          <Icon
            name={config.icon}
            size={20}
            color={themeColor || config.iconColor}
          />
          <span className="text-sm text-white font-medium">
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CoachingMessage;
