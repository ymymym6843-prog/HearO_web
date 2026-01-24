'use client';

/**
 * Exercise HUD (Heads-Up Display)
 *
 * 운동 중 표시되는 게이미피케이션 통합 HUD
 * - XP/레벨 표시
 * - 콤보 카운터
 * - 스트릭 표시
 * - 실시간 피드백
 * - 업적 알림
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RehabPhase, XPReward } from '@/services/medical';

// ============================================================
// 타입 정의
// ============================================================

export interface ExerciseHUDProps {
  /** 현재 레벨 */
  level: number;
  /** 현재 XP */
  currentXP: number;
  /** 레벨업 필요 XP */
  requiredXP: number;
  /** 현재 콤보 */
  combo: number;
  /** 스트릭 일수 */
  streak: number;
  /** 재활 단계 */
  phase: RehabPhase;
  /** 완료한 반복 횟수 */
  completedReps: number;
  /** 목표 반복 횟수 */
  targetReps: number;
  /** 현재 세션 정확도 */
  accuracy: number;
  /** XP 획득 이벤트 */
  onXPGain?: (reward: XPReward) => void;
  /** 위치 */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** 컴팩트 모드 */
  compact?: boolean;
  /** 클래스명 */
  className?: string;
}

export interface XPPopupProps {
  reward: XPReward;
  onComplete: () => void;
}

export interface ComboDisplayProps {
  combo: number;
  maxCombo?: number;
}

// ============================================================
// XP 팝업 컴포넌트
// ============================================================

export function XPPopup({ reward, onComplete }: XPPopupProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.8 }}
      className="fixed top-1/4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
    >
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-2xl shadow-lg">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold"
          >
            +{reward.total} XP
          </motion.div>
          <div className="flex gap-2 justify-center mt-1 text-xs opacity-90">
            {reward.accuracyBonus > 0 && (
              <span>정확도 +{reward.accuracyBonus}</span>
            )}
            {reward.streakBonus > 0 && (
              <span>스트릭 +{reward.streakBonus}</span>
            )}
            {reward.phaseBonus > 0 && (
              <span>단계 +{reward.phaseBonus}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// 콤보 디스플레이 컴포넌트
// ============================================================

export function ComboDisplay({ combo, maxCombo = 10 }: ComboDisplayProps) {
  const isHighCombo = combo >= 5;
  const isPerfectCombo = combo >= maxCombo;

  if (combo < 2) return null;

  return (
    <motion.div
      key={combo}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full
        ${isPerfectCombo ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
          isHighCombo ? 'bg-gradient-to-r from-orange-500 to-red-500' :
          'bg-gradient-to-r from-blue-500 to-cyan-500'}
        text-white font-bold shadow-lg
      `}
    >
      <motion.span
        key={combo}
        initial={{ scale: 1.5 }}
        animate={{ scale: 1 }}
        className="text-xl"
      >
        {combo}
      </motion.span>
      <span className="text-sm">
        {isPerfectCombo ? 'PERFECT!' : isHighCombo ? 'GREAT!' : 'COMBO'}
      </span>
      {isHighCombo && (
        <motion.span
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ repeat: Infinity, duration: 0.5 }}
        >
          🔥
        </motion.span>
      )}
    </motion.div>
  );
}

// ============================================================
// 레벨 프로그레스 컴포넌트
// ============================================================

function LevelProgress({
  level,
  currentXP,
  requiredXP,
  compact = false,
}: {
  level: number;
  currentXP: number;
  requiredXP: number;
  compact?: boolean;
}) {
  const progress = (currentXP / requiredXP) * 100;

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'min-w-[120px]'}`}>
      {/* 레벨 배지 */}
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-md">
          {level}
        </div>
        {/* 레벨업 애니메이션 */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-yellow-400"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
          }}
        />
      </div>

      {/* XP 바 */}
      {!compact && (
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Lv.{level}</span>
            <span>{currentXP}/{requiredXP}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 스트릭 디스플레이 컴포넌트
// ============================================================

function StreakDisplay({ streak }: { streak: number }) {
  if (streak < 1) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
      <span className="text-lg">🔥</span>
      <span className="text-sm font-bold text-orange-600">{streak}일</span>
    </div>
  );
}

// ============================================================
// 진행률 링 컴포넌트
// ============================================================

function ProgressRing({
  completed,
  target,
  size = 60,
}: {
  completed: number;
  target: number;
  size?: number;
}) {
  const progress = Math.min(100, (completed / target) * 100);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* 배경 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="4"
          fill="none"
        />
        {/* 진행 원 */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5 }}
          style={{
            strokeDasharray: circumference,
          }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>
      {/* 중앙 텍스트 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-gray-800">{completed}</span>
        <span className="text-xs text-gray-500">/{target}</span>
      </div>
    </div>
  );
}

// ============================================================
// 메인 HUD 컴포넌트
// ============================================================

export function ExerciseHUD({
  level,
  currentXP,
  requiredXP,
  combo,
  streak,
  phase,
  completedReps,
  targetReps,
  accuracy,
  position = 'top-right',
  compact = false,
  className = '',
}: ExerciseHUDProps) {
  const [xpPopups, setXpPopups] = useState<XPReward[]>([]);

  // 포지션 클래스
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  // XP 획득 처리 (향후 게이미피케이션 기능에서 사용 예정)
  const _handleXPGain = useCallback((reward: XPReward) => {
    setXpPopups((prev) => [...prev, reward]);
  }, []);

  const removePopup = useCallback((index: number) => {
    setXpPopups((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <>
      {/* XP 팝업들 */}
      <AnimatePresence>
        {xpPopups.map((reward, index) => (
          <XPPopup
            key={index}
            reward={reward}
            onComplete={() => removePopup(index)}
          />
        ))}
      </AnimatePresence>

      {/* 메인 HUD */}
      <div
        className={`
          fixed ${positionClasses[position]} z-40
          ${compact ? 'space-y-2' : 'space-y-3'}
          ${className}
        `}
      >
        {/* 레벨 & XP */}
        <motion.div
          initial={{ opacity: 0, x: position.includes('right') ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-3"
        >
          <LevelProgress
            level={level}
            currentXP={currentXP}
            requiredXP={requiredXP}
            compact={compact}
          />
        </motion.div>

        {/* 콤보 & 스트릭 */}
        <motion.div
          initial={{ opacity: 0, x: position.includes('right') ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2"
        >
          <ComboDisplay combo={combo} />
          <StreakDisplay streak={streak} />
        </motion.div>

        {/* 진행률 & 정확도 */}
        {!compact && (
          <motion.div
            initial={{ opacity: 0, x: position.includes('right') ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-3 flex items-center gap-3"
          >
            <ProgressRing completed={completedReps} target={targetReps} />
            <div>
              <div className="text-sm text-gray-600">정확도</div>
              <div className={`text-xl font-bold ${
                accuracy >= 90 ? 'text-green-500' :
                accuracy >= 70 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {Math.round(accuracy)}%
              </div>
            </div>
          </motion.div>
        )}

        {/* 재활 단계 표시 */}
        <motion.div
          initial={{ opacity: 0, x: position.includes('right') ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className={`
            px-3 py-1.5 rounded-full text-sm font-medium
            ${phase === 'RECOVERY'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-green-100 text-green-700'}
          `}
        >
          {phase === 'RECOVERY' ? '🔵 회복기' : '🟢 강화기'}
        </motion.div>
      </div>
    </>
  );
}

export default ExerciseHUD;
