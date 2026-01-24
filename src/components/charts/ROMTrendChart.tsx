'use client';

/**
 * ROM 트렌드 차트 컴포넌트
 *
 * 시간에 따른 ROM 변화를 시각화
 * - 일별/주별/월별 트렌드
 * - 목표 대비 진행률
 * - 재활 단계 표시
 */

import React, { useMemo } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { motion } from 'framer-motion';

// ============================================================
// 타입 정의
// ============================================================

export interface ROMDataPoint {
  date: string;
  angle: number;
  accuracy?: number;
  phase?: 'RECOVERY' | 'STRENGTH';
}

export interface ROMTrendChartProps {
  data: ROMDataPoint[];
  jointType: string;
  movementType: string;
  targetAngle?: number;
  normalMin?: number;
  normalMax?: number;
  title?: string;
  showAccuracy?: boolean;
  height?: number;
  className?: string;
}

// ============================================================
// 커스텀 툴팁
// ============================================================

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="rounded-xl p-3 shadow-lg"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid rgba(0, 217, 255, 0.3)',
      }}
    >
      <p className="text-xs text-gray-400 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-white font-medium">
            {entry.dataKey === 'angle' ? 'ROM' : '정확도'}:
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: entry.color }}
          >
            {entry.value.toFixed(1)}{entry.dataKey === 'angle' ? '°' : '%'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 메인 컴포넌트
// ============================================================

export function ROMTrendChart({
  data,
  jointType,
  movementType,
  targetAngle,
  normalMin,
  normalMax,
  title,
  showAccuracy = false,
  height = 300,
  className = '',
}: ROMTrendChartProps) {
  // 통계 계산
  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const angles = data.map((d) => d.angle);
    const min = Math.min(...angles);
    const max = Math.max(...angles);
    const avg = angles.reduce((a, b) => a + b, 0) / angles.length;
    const latest = angles[angles.length - 1];
    const first = angles[0];
    const improvement = latest - first;

    return { min, max, avg, latest, improvement };
  }, [data]);

  // 차트 도메인 계산
  const yDomain = useMemo(() => {
    if (data.length === 0) return [0, 180];
    const angles = data.map((d) => d.angle);
    const min = Math.min(...angles, normalMin || Infinity);
    const max = Math.max(...angles, normalMax || -Infinity, targetAngle || -Infinity);
    return [Math.max(0, min - 10), Math.min(180, max + 10)];
  }, [data, normalMin, normalMax, targetAngle]);

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500">데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">
            {title || `${jointType} ${movementType}`}
          </h3>
          <p className="text-xs text-gray-400">ROM 변화 추이</p>
        </div>

        {/* 통계 뱃지 */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                stats.improvement >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
              style={{
                backgroundColor: stats.improvement >= 0
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)',
              }}
            >
              {stats.improvement >= 0 ? '+' : ''}{stats.improvement.toFixed(1)}°
            </div>
          </motion.div>
        )}
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: '최신', value: stats.latest, color: '#00D9FF' },
            { label: '평균', value: stats.avg, color: '#A78BFA' },
            { label: '최소', value: stats.min, color: '#F97316' },
            { label: '최대', value: stats.max, color: '#22C55E' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg p-2 text-center"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            >
              <p className="text-[10px] text-gray-500 uppercase">{stat.label}</p>
              <p className="text-lg font-bold" style={{ color: stat.color }}>
                {stat.value.toFixed(0)}°
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 차트 */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            {/* 그리드 */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255, 255, 255, 0.1)"
              vertical={false}
            />

            {/* 정상 범위 영역 */}
            {normalMin !== undefined && normalMax !== undefined && (
              <Area
                type="monotone"
                dataKey={() => normalMax - normalMin}
                fill="rgba(34, 197, 94, 0.1)"
                stroke="none"
                baseValue={normalMin}
              />
            )}

            {/* 축 */}
            <XAxis
              dataKey="date"
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
              tickLine={false}
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
              tickLine={false}
              tickFormatter={(value) => `${value}°`}
            />

            {/* 툴팁 */}
            <Tooltip content={<CustomTooltip />} />

            {/* 목표선 */}
            {targetAngle && (
              <ReferenceLine
                y={targetAngle}
                stroke="#22C55E"
                strokeDasharray="5 5"
                label={{
                  value: '목표',
                  fill: '#22C55E',
                  fontSize: 10,
                  position: 'right',
                }}
              />
            )}

            {/* ROM 라인 */}
            <Line
              type="monotone"
              dataKey="angle"
              stroke="#00D9FF"
              strokeWidth={3}
              dot={{ fill: '#00D9FF', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#00D9FF', stroke: '#fff', strokeWidth: 2 }}
            />

            {/* 정확도 라인 (옵션) */}
            {showAccuracy && (
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#A78BFA"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-cyan-400 rounded" />
          <span className="text-gray-400">ROM</span>
        </div>
        {showAccuracy && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-purple-400 rounded" style={{ borderStyle: 'dashed' }} />
            <span className="text-gray-400">정확도</span>
          </div>
        )}
        {targetAngle && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-green-400 rounded" style={{ borderStyle: 'dashed' }} />
            <span className="text-gray-400">목표</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ROMTrendChart;
