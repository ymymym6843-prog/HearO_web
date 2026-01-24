'use client';

/**
 * 일일 통계 대시보드 컴포넌트
 *
 * 게이미피케이션 요소가 적용된 일일 운동 통계
 * - 오늘의 XP 획득량
 * - 운동 완료 현황
 * - 연속 달성 기록
 * - 주간 활동 히트맵
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ============================================================
// 타입 정의
// ============================================================

export interface DailyStats {
  date: string;
  totalXP: number;
  exerciseCount: number;
  totalReps: number;
  avgAccuracy: number;
  totalDuration: number; // 초
  streak: number;
  level: number;
  levelProgress: number; // 0-100
}

export interface WeeklyActivity {
  day: string;
  date: string;
  completed: boolean;
  xp: number;
}

export interface DailyStatsDashboardProps {
  todayStats: DailyStats;
  weeklyActivity: WeeklyActivity[];
  dailyGoal?: {
    targetXP: number;
    targetExercises: number;
    targetReps: number;
  };
  className?: string;
}

// ============================================================
// 서브 컴포넌트
// ============================================================

function StatCard({
  label,
  value,
  unit,
  icon,
  color,
  subValue,
}: {
  label: string;
  value: number | string;
  unit?: string;
  icon: string;
  color: string;
  subValue?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: `1px solid ${color}30`,
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <span
          className="text-2xl"
          role="img"
          aria-label={label}
        >
          {icon}
        </span>
        {subValue && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {subValue}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold" style={{ color }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
    </motion.div>
  );
}

function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 8,
  color = '#00D9FF',
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* 배경 원 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255, 255, 255, 0.1)"
        strokeWidth={strokeWidth}
      />
      {/* 진행 원 */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{
          filter: `drop-shadow(0 0 6px ${color}80)`,
        }}
      />
    </svg>
  );
}

function WeeklyHeatmap({ data }: { data: WeeklyActivity[] }) {
  return (
    <div className="flex gap-2 justify-between">
      {data.map((day, index) => {
        const intensity = day.xp > 0 ? Math.min(1, day.xp / 500) : 0;
        const bgColor = day.completed
          ? `rgba(34, 197, 94, ${0.2 + intensity * 0.6})`
          : 'rgba(255, 255, 255, 0.05)';
        const borderColor = day.completed
          ? `rgba(34, 197, 94, ${0.4 + intensity * 0.4})`
          : 'rgba(255, 255, 255, 0.1)';

        const isToday = index === data.length - 1; // 마지막이 오늘이라고 가정

        return (
          <motion.div
            key={day.date}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`flex flex-col items-center gap-1 ${isToday ? 'scale-110' : ''}`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                isToday ? 'ring-2 ring-cyan-400' : ''
              }`}
              style={{
                backgroundColor: bgColor,
                border: `1px solid ${borderColor}`,
              }}
            >
              {day.completed ? (
                <span className="text-green-400 text-sm">✓</span>
              ) : (
                <span className="text-gray-600 text-xs">-</span>
              )}
            </div>
            <span className={`text-[10px] ${isToday ? 'text-cyan-400 font-bold' : 'text-gray-500'}`}>
              {day.day}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

function LevelProgressBar({
  level,
  progress,
  totalXP,
}: {
  level: number;
  progress: number;
  totalXP: number;
}) {
  // XP 필요량 계산 (레벨당 1000 XP 증가)
  const xpForCurrentLevel = level * 1000;
  const xpForNextLevel = (level + 1) * 1000;
  const xpNeeded = xpForNextLevel - totalXP;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg"
            style={{
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
            }}
          >
            {level}
          </div>
          <div>
            <p className="text-sm font-bold text-white">Level {level}</p>
            <p className="text-xs text-gray-400">{xpNeeded.toLocaleString()} XP to next</p>
          </div>
        </div>
        <span className="text-xs text-gray-500">{progress}%</span>
      </div>

      {/* 진행 바 */}
      <div
        className="h-3 rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
            boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ============================================================
// 메인 컴포넌트
// ============================================================

export function DailyStatsDashboard({
  todayStats,
  weeklyActivity,
  dailyGoal = { targetXP: 500, targetExercises: 3, targetReps: 30 },
  className = '',
}: DailyStatsDashboardProps) {
  // 목표 달성률 계산
  const xpProgress = Math.min(100, (todayStats.totalXP / dailyGoal.targetXP) * 100);
  const exerciseProgress = Math.min(100, (todayStats.exerciseCount / dailyGoal.targetExercises) * 100);
  const repsProgress = Math.min(100, (todayStats.totalReps / dailyGoal.targetReps) * 100);
  const overallProgress = Math.round((xpProgress + exerciseProgress + repsProgress) / 3);

  // 운동 시간 포맷
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 헤더 - 오늘의 목표 달성률 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.1), rgba(139, 92, 246, 0.1))',
          border: '1px solid rgba(0, 217, 255, 0.2)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">오늘의 목표</p>
            <h2 className="text-2xl font-bold text-white mb-2">
              {overallProgress >= 100 ? '🎉 목표 달성!' : `${overallProgress}% 달성`}
            </h2>
            <p className="text-sm text-gray-400">
              {todayStats.exerciseCount}개 운동 · {todayStats.totalReps}회 반복
            </p>
          </div>
          <div className="relative">
            <ProgressRing
              progress={overallProgress}
              size={100}
              strokeWidth={10}
              color={overallProgress >= 100 ? '#22C55E' : '#00D9FF'}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-white">{overallProgress}%</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 스탯 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="획득 XP"
          value={todayStats.totalXP}
          unit="XP"
          icon="⚡"
          color="#00D9FF"
          subValue={`목표 ${dailyGoal.targetXP}`}
        />
        <StatCard
          label="평균 정확도"
          value={todayStats.avgAccuracy}
          unit="%"
          icon="🎯"
          color="#22C55E"
        />
        <StatCard
          label="연속 기록"
          value={todayStats.streak}
          unit="일"
          icon="🔥"
          color="#F59E0B"
          subValue={todayStats.streak >= 7 ? '주간 달성!' : undefined}
        />
        <StatCard
          label="운동 시간"
          value={formatDuration(todayStats.totalDuration)}
          icon="⏱️"
          color="#A78BFA"
        />
      </div>

      {/* 레벨 진행률 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl p-4"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <LevelProgressBar
          level={todayStats.level}
          progress={todayStats.levelProgress}
          totalXP={todayStats.totalXP}
        />
      </motion.div>

      {/* 주간 활동 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl p-4"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">이번 주 활동</h3>
          <span className="text-xs text-gray-400">
            {weeklyActivity.filter((d) => d.completed).length}/7일 완료
          </span>
        </div>
        <WeeklyHeatmap data={weeklyActivity} />
      </motion.div>

      {/* 주간 XP 차트 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl p-4"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <h3 className="text-sm font-bold text-white mb-4">주간 XP 획득</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyActivity}>
              <XAxis
                dataKey="day"
                tick={{ fill: '#9CA3AF', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Bar dataKey="xp" radius={[4, 4, 0, 0]}>
                {weeklyActivity.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      index === weeklyActivity.length - 1
                        ? '#00D9FF'
                        : entry.completed
                        ? 'rgba(34, 197, 94, 0.6)'
                        : 'rgba(255, 255, 255, 0.1)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}

export default DailyStatsDashboard;
