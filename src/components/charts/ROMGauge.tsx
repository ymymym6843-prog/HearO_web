'use client';

/**
 * ROM Gauge 컴포넌트
 *
 * 실시간 ROM(관절 가동 범위) 시각화
 * - 반원형 게이지로 현재 각도 표시
 * - 정상 범위, 목표 값 시각화
 * - 재활 단계(RECOVERY/STRENGTH) 표시
 * - 게이미피케이션 요소 통합
 */

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import type { RehabPhase, JointType, MovementType } from '@/services/medical';

// ============================================================
// 타입 정의
// ============================================================

export interface ROMGaugeProps {
  /** 현재 ROM 각도 */
  currentAngle: number;
  /** 목표 각도 (캘리브레이션 기반) */
  targetAngle: number;
  /** 정상 ROM 범위 */
  normalRange: { min: number; max: number };
  /** 관절 타입 */
  jointType: JointType;
  /** 움직임 타입 */
  movementType?: MovementType;
  /** 재활 단계 */
  phase?: RehabPhase;
  /** 단계 내 진행률 (0-100) */
  phaseProgress?: number;
  /** 정확도 (0-100) */
  accuracy?: number;
  /** 크기 */
  size?: 'sm' | 'md' | 'lg';
  /** 숨김 라벨 */
  hideLabel?: boolean;
  /** 애니메이션 활성화 */
  animated?: boolean;
  /** 클래스명 */
  className?: string;
}

// ============================================================
// 상수
// ============================================================

const PHASE_COLORS: Record<RehabPhase, { primary: string; secondary: string; bg: string }> = {
  RECOVERY: {
    primary: '#3b82f6', // blue-500
    secondary: '#93c5fd', // blue-300
    bg: '#dbeafe', // blue-100
  },
  STRENGTH: {
    primary: '#22c55e', // green-500
    secondary: '#86efac', // green-300
    bg: '#dcfce7', // green-100
  },
};

const SIZE_CONFIG = {
  sm: { width: 120, height: 80, fontSize: 'text-lg', labelSize: 'text-xs' },
  md: { width: 180, height: 110, fontSize: 'text-2xl', labelSize: 'text-sm' },
  lg: { width: 240, height: 140, fontSize: 'text-3xl', labelSize: 'text-base' },
};

const JOINT_LABELS: Record<JointType, string> = {
  shoulder: '어깨',
  elbow: '팔꿈치',
  wrist: '손목',
  hip: '고관절',
  knee: '무릎',
  ankle: '발목',
  spine: '척추',
};

const MOVEMENT_LABELS: Record<MovementType, string> = {
  flexion: '굴곡',
  extension: '신전',
  abduction: '외전',
  adduction: '내전',
  rotation: '회전',
  lateral: '측굴',
};

// ============================================================
// 컴포넌트
// ============================================================

export function ROMGauge({
  currentAngle,
  targetAngle,
  normalRange,
  jointType,
  movementType,
  phase = 'RECOVERY',
  phaseProgress = 0,
  accuracy,
  size = 'md',
  hideLabel = false,
  animated = true,
  className = '',
}: ROMGaugeProps) {
  // 계산된 값들
  const { percentage, isWithinTarget, isOverTarget, gaugeData, colors } = useMemo(() => {
    const maxAngle = Math.max(targetAngle, normalRange.max);
    const pct = Math.min(100, (currentAngle / maxAngle) * 100);
    const targetPct = (targetAngle / maxAngle) * 100;

    const withinTarget = currentAngle >= targetAngle * 0.9 && currentAngle <= targetAngle * 1.1;
    const overTarget = currentAngle > targetAngle * 1.1;

    // 게이지 데이터 (반원)
    const data = [
      { value: Math.min(pct, 100), name: 'current' },
      { value: Math.max(0, 100 - pct), name: 'remaining' },
    ];

    return {
      percentage: pct,
      isWithinTarget: withinTarget,
      isOverTarget: overTarget,
      gaugeData: data,
      colors: PHASE_COLORS[phase],
    };
  }, [currentAngle, targetAngle, normalRange.max, phase]);

  // 사이즈 설정
  const sizeConfig = SIZE_CONFIG[size];

  // 상태에 따른 색상
  const statusColor = useMemo(() => {
    if (isOverTarget) return '#f97316'; // orange-500 (주의)
    if (isWithinTarget) return colors.primary;
    return colors.secondary;
  }, [isOverTarget, isWithinTarget, colors]);

  // 정확도 색상
  const accuracyColor = useMemo(() => {
    if (!accuracy) return '#9ca3af'; // gray-400
    if (accuracy >= 90) return '#22c55e'; // green-500
    if (accuracy >= 70) return '#eab308'; // yellow-500
    return '#ef4444'; // red-500
  }, [accuracy]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* 게이지 */}
      <div
        className="relative"
        style={{ width: sizeConfig.width, height: sizeConfig.height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={gaugeData}
              startAngle={180}
              endAngle={0}
              innerRadius="60%"
              outerRadius="100%"
              dataKey="value"
              strokeWidth={0}
              animationDuration={animated ? 500 : 0}
            >
              <Cell fill={statusColor} />
              <Cell fill="#e5e7eb" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* 중앙 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <AnimatePresence mode="wait">
            <motion.span
              key={currentAngle}
              initial={animated ? { scale: 0.8, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`${sizeConfig.fontSize} font-bold`}
              style={{ color: statusColor }}
            >
              {Math.round(currentAngle)}°
            </motion.span>
          </AnimatePresence>
          <span className={`${sizeConfig.labelSize} text-gray-500`}>
            / {targetAngle}°
          </span>
        </div>

        {/* 목표 마커 */}
        <div
          className="absolute w-1 h-3 bg-gray-800 rounded-full"
          style={{
            bottom: '45%',
            left: '50%',
            transform: `translateX(-50%) rotate(${180 - (targetAngle / normalRange.max) * 180}deg)`,
            transformOrigin: 'bottom center',
          }}
        />
      </div>

      {/* 라벨 */}
      {!hideLabel && (
        <div className="mt-2 text-center">
          <p className={`${sizeConfig.labelSize} font-medium text-gray-700`}>
            {JOINT_LABELS[jointType]}
            {movementType && ` ${MOVEMENT_LABELS[movementType]}`}
          </p>

          {/* 재활 단계 배지 */}
          <div className="flex items-center justify-center gap-2 mt-1">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium`}
              style={{
                backgroundColor: colors.bg,
                color: colors.primary,
              }}
            >
              {phase === 'RECOVERY' ? '회복기' : '강화기'}
            </span>

            {/* 정확도 표시 */}
            {accuracy !== undefined && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${accuracyColor}20`,
                  color: accuracyColor,
                }}
              >
                {Math.round(accuracy)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* 단계 진행 바 */}
      {phaseProgress > 0 && (
        <div className="w-full mt-2">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: colors.primary }}
              initial={{ width: 0 }}
              animate={{ width: `${phaseProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center mt-1">
            단계 진행률 {Math.round(phaseProgress)}%
          </p>
        </div>
      )}
    </div>
  );
}

export default ROMGauge;
