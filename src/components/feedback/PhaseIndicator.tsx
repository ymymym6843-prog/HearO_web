'use client';

/**
 * PhaseIndicator - 운동 단계 표시 컴포넌트
 * 현재 운동 단계를 시각적으로 표시 (준비, 내려가기, 유지, 올라가기)
 * React.memo로 불필요한 리렌더링 방지
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { ExercisePhase } from '@/types/exercise';

interface PhaseIndicatorProps {
  phase: ExercisePhase;
  themeColor?: string;
}

const PHASE_CONFIG: Record<ExercisePhase, { label: string; color: string; icon: IconName }> = {
  ready: { label: '준비', color: '#3B82F6', icon: 'radio-button-on-outline' },
  down: { label: '내려가기', color: '#F59E0B', icon: 'arrow-down-outline' },
  hold: { label: '유지', color: '#10B981', icon: 'hand-left-outline' },
  up: { label: '올라가기', color: '#8B5CF6', icon: 'arrow-up-outline' },
  rest: { label: '휴식', color: '#9CA3AF', icon: 'pause-outline' },
  transition: { label: '전환', color: '#6366F1', icon: 'swap-horizontal-outline' },
};

export const PhaseIndicator = memo(function PhaseIndicator({ phase, themeColor }: PhaseIndicatorProps) {
  const config = PHASE_CONFIG[phase];
  const color = themeColor || config.color;

  return (
    <div className="flex items-center gap-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            backgroundColor: `${color}20`,
            border: `2px solid ${color}`,
          }}
        >
          <Icon name={config.icon} size={18} color={color} />
          <span
            className="font-bold text-sm"
            style={{ color }}
          >
            {config.label}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

export default PhaseIndicator;
