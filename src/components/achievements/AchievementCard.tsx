/**
 * 업적 카드 컴포넌트
 * 업적 표시 및 진행도 시각화
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Achievement, AchievementProgress } from '@/services/achievementService';
import { TIER_COLORS } from '@/services/achievementService';
import { Icon } from '@/components/ui/Icon';

interface AchievementCardProps {
  achievement: Achievement;
  unlocked: boolean;
  progress?: AchievementProgress | null;
  showProgress?: boolean;
  onClick?: () => void;
}

export const AchievementCard = memo(function AchievementCard({
  achievement,
  unlocked,
  progress,
  showProgress = true,
  onClick,
}: AchievementCardProps) {
  const tierColor = TIER_COLORS[achievement.tier];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl p-4 cursor-pointer transition-all
        ${unlocked
          ? 'bg-gradient-to-br from-slate-800 to-slate-700'
          : 'bg-slate-800/50 opacity-60'
        }
      `}
    >
      {/* 티어 표시 */}
      <div
        className="absolute top-0 right-0 w-16 h-16 opacity-20"
        style={{
          background: `radial-gradient(circle at top right, ${tierColor}, transparent)`,
        }}
      />

      <div className="flex items-start gap-4">
        {/* 아이콘 */}
        <div
          className={`
            w-14 h-14 rounded-xl flex items-center justify-center
            ${unlocked ? '' : 'grayscale'}
          `}
          style={{
            background: unlocked
              ? `linear-gradient(135deg, ${tierColor}40, ${tierColor}20)`
              : 'rgba(255,255,255,0.1)',
          }}
        >
          {unlocked ? (
            <Icon name={achievement.icon} size={28} color={tierColor} />
          ) : (
            <Icon name="lock-closed-outline" size={24} color="#6B7280" />
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white truncate">{achievement.name}</h3>
            {unlocked && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: tierColor, color: '#000' }}
              >
                {achievement.tier.toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-1">{achievement.description}</p>

          {/* 진행도 바 */}
          {showProgress && progress && !unlocked && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{progress.currentValue} / {progress.targetValue}</span>
                <span>{progress.percentage}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percentage}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: tierColor }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 달성 표시 */}
      {unlocked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2"
        >
          <Icon name="checkmark-circle" size={20} color="#22C55E" />
        </motion.div>
      )}
    </motion.div>
  );
});

// 업적 달성 알림 컴포넌트
export const AchievementUnlockNotification = memo(function AchievementUnlockNotification({
  achievement,
  onClose,
}: {
  achievement: Achievement;
  onClose: () => void;
}) {
  const tierColor = TIER_COLORS[achievement.tier];

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full mx-4"
    >
      <div
        className="bg-slate-900 rounded-2xl p-6 shadow-2xl border-2"
        style={{ borderColor: tierColor }}
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${tierColor}40, ${tierColor}20)`,
            }}
          >
            <Icon name={achievement.icon} size={40} color={tierColor} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-sm text-hearo-primary font-medium mb-1">업적 달성!</p>
            <h3 className="text-xl font-bold text-white mb-2">{achievement.name}</h3>
            <p className="text-gray-400 text-sm">{achievement.description}</p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full
              text-white text-sm transition-colors"
          >
            확인
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
});

// 작은 업적 배지
export const AchievementBadge = memo(function AchievementBadge({
  achievement,
  size = 'md',
}: {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
}) {
  const tierColor = TIER_COLORS[achievement.tier];
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };
  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center`}
      style={{
        background: `linear-gradient(135deg, ${tierColor}, ${tierColor}80)`,
      }}
      title={`${achievement.name}: ${achievement.description}`}
    >
      <Icon name={achievement.icon} size={iconSizes[size]} color="#FFFFFF" />
    </div>
  );
});

export default AchievementCard;
