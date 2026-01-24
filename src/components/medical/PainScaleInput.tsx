'use client';

/**
 * 통증 척도 입력 컴포넌트
 *
 * VAS (Visual Analog Scale) 0-10 기반
 * - 직관적인 슬라이더 또는 버튼 UI
 * - 얼굴 이모지 피드백
 * - 색상 그라데이션
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { VASLevel } from '@/services/medical';

// ============================================================
// 타입 정의
// ============================================================

export interface PainScaleInputProps {
  /** 현재 값 */
  value: VASLevel;
  /** 변경 콜백 */
  onChange: (level: VASLevel) => void;
  /** 비활성화 */
  disabled?: boolean;
  /** 모드: slider 또는 buttons */
  mode?: 'slider' | 'buttons';
  /** 간단 모드 (0, 3, 5, 7, 10만 표시) */
  simplified?: boolean;
  /** 라벨 표시 */
  showLabel?: boolean;
  /** 클래스명 */
  className?: string;
}

// ============================================================
// 상수
// ============================================================

const PAIN_LEVELS: { level: VASLevel; label: string; emoji: string; color: string }[] = [
  { level: 0, label: '통증 없음', emoji: '😊', color: '#22c55e' },
  { level: 1, label: '거의 없음', emoji: '🙂', color: '#4ade80' },
  { level: 2, label: '약간', emoji: '😐', color: '#84cc16' },
  { level: 3, label: '경미', emoji: '😕', color: '#a3e635' },
  { level: 4, label: '불편함', emoji: '😟', color: '#facc15' },
  { level: 5, label: '중간', emoji: '😦', color: '#fbbf24' },
  { level: 6, label: '심함', emoji: '😧', color: '#fb923c' },
  { level: 7, label: '매우 심함', emoji: '😫', color: '#f97316' },
  { level: 8, label: '극심함', emoji: '😭', color: '#ef4444' },
  { level: 9, label: '견디기 힘듦', emoji: '😱', color: '#dc2626' },
  { level: 10, label: '최악의 통증', emoji: '🤯', color: '#991b1b' },
];

const SIMPLIFIED_LEVELS: VASLevel[] = [0, 3, 5, 7, 10];

// ============================================================
// 슬라이더 모드 컴포넌트
// ============================================================

function PainSlider({
  value,
  onChange,
  disabled,
}: {
  value: VASLevel;
  onChange: (level: VASLevel) => void;
  disabled?: boolean;
}) {
  const currentLevel = PAIN_LEVELS[value];

  return (
    <div className="space-y-4">
      {/* 슬라이더 */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={10}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) as VASLevel)}
          disabled={disabled}
          className="w-full h-3 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, #22c55e, #facc15, #ef4444)`,
          }}
        />
        {/* 커스텀 썸 */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${(value / 10) * 100}%`,
            transform: 'translateX(-50%) translateY(-50%)',
          }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-white"
            style={{ backgroundColor: currentLevel.color }}
          >
            {currentLevel.emoji}
          </div>
        </motion.div>
      </div>

      {/* 레이블 */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>

      {/* 현재 값 표시 */}
      <motion.div
        key={value}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-4xl mb-1">{currentLevel.emoji}</div>
        <div
          className="text-lg font-bold"
          style={{ color: currentLevel.color }}
        >
          {value}/10
        </div>
        <div className="text-sm text-gray-600">{currentLevel.label}</div>
      </motion.div>
    </div>
  );
}

// ============================================================
// 버튼 모드 컴포넌트
// ============================================================

function PainButtons({
  value,
  onChange,
  disabled,
  simplified,
}: {
  value: VASLevel;
  onChange: (level: VASLevel) => void;
  disabled?: boolean;
  simplified?: boolean;
}) {
  const levels = simplified
    ? PAIN_LEVELS.filter((l) => SIMPLIFIED_LEVELS.includes(l.level))
    : PAIN_LEVELS;

  return (
    <div className="space-y-4">
      {/* 버튼 그리드 */}
      <div className={`grid gap-2 ${simplified ? 'grid-cols-5' : 'grid-cols-6'}`}>
        {levels.map((level) => (
          <motion.button
            key={level.level}
            onClick={() => onChange(level.level)}
            disabled={disabled}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              p-2 rounded-xl flex flex-col items-center justify-center
              transition-all duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${value === level.level
                ? 'ring-2 ring-offset-2 shadow-lg'
                : 'hover:shadow-md'
              }
            `}
            style={{
              backgroundColor: value === level.level ? level.color : `${level.color}30`,
            }}
          >
            <span className={`text-2xl ${simplified ? 'text-3xl' : ''}`}>
              {level.emoji}
            </span>
            <span
              className={`
                text-xs font-medium mt-1
                ${value === level.level ? 'text-white' : 'text-gray-700'}
              `}
            >
              {level.level}
            </span>
          </motion.button>
        ))}
      </div>

      {/* 선택된 값 표시 */}
      <motion.div
        key={value}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center p-3 rounded-lg"
        style={{ backgroundColor: `${PAIN_LEVELS[value].color}20` }}
      >
        <span
          className="font-medium"
          style={{ color: PAIN_LEVELS[value].color }}
        >
          {PAIN_LEVELS[value].label}
        </span>
      </motion.div>
    </div>
  );
}

// ============================================================
// 메인 컴포넌트
// ============================================================

export function PainScaleInput({
  value,
  onChange,
  disabled = false,
  mode = 'buttons',
  simplified = false,
  showLabel = true,
  className = '',
}: PainScaleInputProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* 헤더 */}
      {showLabel && (
        <div className="text-center">
          <h3 className="font-semibold text-gray-800">현재 통증 수준</h3>
          <p className="text-sm text-gray-500">
            0(통증 없음) ~ 10(최악의 통증)
          </p>
        </div>
      )}

      {/* 입력 UI */}
      {mode === 'slider' ? (
        <PainSlider value={value} onChange={onChange} disabled={disabled} />
      ) : (
        <PainButtons
          value={value}
          onChange={onChange}
          disabled={disabled}
          simplified={simplified}
        />
      )}

      {/* 경고 메시지 */}
      {value >= 7 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <p className="text-sm text-red-700 font-medium">
            ⚠️ 통증이 심합니다. 운동을 중단하고 의료 전문가와 상담하세요.
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// 빠른 통증 체크 (운동 중 사용)
// ============================================================

export function QuickPainCheck({
  onSelect,
  className = '',
}: {
  onSelect: (level: VASLevel) => void;
  className?: string;
}) {
  const quickOptions: { level: VASLevel; label: string; emoji: string; color: string }[] = [
    { level: 0, label: '괜찮아요', emoji: '👍', color: '#22c55e' },
    { level: 5, label: '조금 아파요', emoji: '😕', color: '#facc15' },
    { level: 8, label: '많이 아파요', emoji: '😫', color: '#ef4444' },
  ];

  return (
    <div className={`flex gap-3 justify-center ${className}`}>
      {quickOptions.map((option) => (
        <motion.button
          key={option.level}
          onClick={() => onSelect(option.level)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center p-3 rounded-xl transition-all hover:shadow-lg"
          style={{ backgroundColor: `${option.color}20` }}
        >
          <span className="text-3xl mb-1">{option.emoji}</span>
          <span
            className="text-sm font-medium"
            style={{ color: option.color }}
          >
            {option.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}

export default PainScaleInput;
