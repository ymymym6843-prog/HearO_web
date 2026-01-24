/**
 * 통계 페이지
 * 운동 통계 및 진행 분석
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/useAuthStore';
import { exerciseResultService } from '@/services/exerciseResultService';
import { createLogger } from '@/lib/logger';
import { getExerciseName } from '@/constants/exercises';
import type { ExerciseSession } from '@/types/database';

const logger = createLogger('StatisticsPage');

// 기간 필터 옵션
type PeriodFilter = 'week' | 'month' | '3month' | 'year';

export default function StatisticsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('month');

  // 데이터 로드 - user.id 변경 시에만 실행
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadData() {
    setIsLoading(true);
    try {
      if (user) {
        const { sessions: data } = await exerciseResultService.getUserSessions(user.id, {
          status: 'completed',
          limit: 500,
        });
        setSessions(data);
      } else {
        // 데모 데이터
        setSessions(generateDemoData());
      }
    } catch (error) {
      logger.error('통계 로드 실패', error);
    } finally {
      setIsLoading(false);
    }
  }

  // 기간별 필터링
  const filteredSessions = useMemo(() => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : period === '3month' ? 90 : 365;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return sessions.filter((s) => new Date(s.started_at) >= cutoff);
  }, [sessions, period]);

  // 이전 기간 데이터 (비교용)
  const previousPeriodSessions = useMemo(() => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : period === '3month' ? 90 : 365;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const previousCutoff = new Date();
    previousCutoff.setDate(previousCutoff.getDate() - days * 2);
    return sessions.filter(
      (s) => new Date(s.started_at) >= previousCutoff && new Date(s.started_at) < cutoff
    );
  }, [sessions, period]);

  // 주요 통계
  const stats = useMemo(() => {
    const total = filteredSessions.length;
    const prev = previousPeriodSessions.length;

    const totalReps = filteredSessions.reduce((sum, s) => sum + s.total_reps, 0);
    const prevReps = previousPeriodSessions.reduce((sum, s) => sum + s.total_reps, 0);

    const avgAccuracy = total > 0
      ? filteredSessions.reduce((sum, s) => sum + s.average_accuracy, 0) / total
      : 0;
    const prevAvgAccuracy = prev > 0
      ? previousPeriodSessions.reduce((sum, s) => sum + s.average_accuracy, 0) / prev
      : 0;

    const totalMinutes = Math.round(
      filteredSessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60
    );
    const prevMinutes = Math.round(
      previousPeriodSessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60
    );

    return {
      sessions: { value: total, change: total - prev },
      reps: { value: totalReps, change: totalReps - prevReps },
      accuracy: { value: Math.round(avgAccuracy * 10) / 10, change: Math.round((avgAccuracy - prevAvgAccuracy) * 10) / 10 },
      minutes: { value: totalMinutes, change: totalMinutes - prevMinutes },
    };
  }, [filteredSessions, previousPeriodSessions]);

  // 일별 추세 데이터
  const dailyTrend = useMemo(() => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : period === '3month' ? 90 : 365;
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const daySessions = filteredSessions.filter(
        (s) => s.started_at.split('T')[0] === dateStr
      );

      result.push({
        date: dateStr,
        sessions: daySessions.length,
        reps: daySessions.reduce((sum, s) => sum + s.total_reps, 0),
        accuracy: daySessions.length > 0
          ? daySessions.reduce((sum, s) => sum + s.average_accuracy, 0) / daySessions.length
          : 0,
      });
    }

    return result;
  }, [filteredSessions, period]);

  // 운동별 통계
  const exerciseStats = useMemo(() => {
    const stats = new Map<string, { count: number; totalReps: number; totalAccuracy: number }>();

    filteredSessions.forEach((s) => {
      const existing = stats.get(s.exercise_type) || { count: 0, totalReps: 0, totalAccuracy: 0 };
      stats.set(s.exercise_type, {
        count: existing.count + 1,
        totalReps: existing.totalReps + s.total_reps,
        totalAccuracy: existing.totalAccuracy + s.average_accuracy,
      });
    });

    return Array.from(stats.entries())
      .map(([type, data]) => ({
        type,
        name: getExerciseName(type),
        count: data.count,
        totalReps: data.totalReps,
        avgAccuracy: Math.round((data.totalAccuracy / data.count) * 10) / 10,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredSessions]);

  // 최고 기록
  const bestRecords = useMemo(() => {
    if (filteredSessions.length === 0) return null;

    const bestAccuracy = filteredSessions.reduce(
      (best, s) => (s.average_accuracy > best.average_accuracy ? s : best),
      filteredSessions[0]
    );

    const mostReps = filteredSessions.reduce(
      (best, s) => (s.total_reps > best.total_reps ? s : best),
      filteredSessions[0]
    );

    return {
      bestAccuracy: {
        value: Math.round(bestAccuracy.average_accuracy),
        exercise: getExerciseName(bestAccuracy.exercise_type),
        date: new Date(bestAccuracy.started_at).toLocaleDateString('ko-KR'),
      },
      mostReps: {
        value: mostReps.total_reps,
        exercise: getExerciseName(mostReps.exercise_type),
        date: new Date(mostReps.started_at).toLocaleDateString('ko-KR'),
      },
    };
  }, [filteredSessions]);

  // 주간 목표 달성률
  const weeklyGoal = useMemo(() => {
    const targetSessions = 5; // 주 5회 목표
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
    thisWeek.setHours(0, 0, 0, 0);

    const weekSessions = sessions.filter((s) => new Date(s.started_at) >= thisWeek).length;
    return {
      current: weekSessions,
      target: targetSessions,
      percentage: Math.min(100, Math.round((weekSessions / targetSessions) * 100)),
    };
  }, [sessions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-hearo-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-hearo-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">통계 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hearo-bg">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-hearo-bg/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            aria-label="뒤로 가기"
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </button>
          <h1 className="text-xl font-bold text-white">통계</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 기간 선택 */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: 'week', label: '이번 주' },
            { value: 'month', label: '이번 달' },
            { value: '3month', label: '3개월' },
            { value: 'year', label: '1년' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value as PeriodFilter)}
              aria-pressed={period === option.value}
              aria-label={`${option.label} 기간 선택`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                period === option.value
                  ? 'bg-hearo-primary text-white'
                  : 'bg-slate-800 text-gray-400 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* 주간 목표 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-gradient-to-r from-hearo-primary/20 to-blue-600/20 rounded-xl p-5 border border-hearo-primary/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">이번 주 목표</h3>
              <span className="text-hearo-primary font-bold">{weeklyGoal.current}/{weeklyGoal.target}회</span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${weeklyGoal.percentage}%` }}
                className="h-full bg-gradient-to-r from-hearo-primary to-blue-500 rounded-full"
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">
              {weeklyGoal.percentage >= 100
                ? '목표 달성!'
                : `${weeklyGoal.target - weeklyGoal.current}회 더 운동하면 목표 달성`}
            </p>
          </div>
        </motion.section>

        {/* 주요 통계 카드 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          <StatCard
            icon="fitness-outline"
            label="운동 횟수"
            value={stats.sessions.value}
            unit="회"
            change={stats.sessions.change}
          />
          <StatCard
            icon="barbell-outline"
            label="총 반복"
            value={stats.reps.value}
            unit="회"
            change={stats.reps.change}
          />
          <StatCard
            icon="star-outline"
            label="평균 정확도"
            value={stats.accuracy.value}
            unit="%"
            change={stats.accuracy.change}
          />
          <StatCard
            icon="timer-outline"
            label="운동 시간"
            value={stats.minutes.value}
            unit="분"
            change={stats.minutes.change}
          />
        </motion.section>

        {/* 활동 추세 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">활동 추세</h2>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <ActivityChart data={dailyTrend} period={period} />
          </div>
        </motion.section>

        {/* 최고 기록 */}
        {bestRecords && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-lg font-semibold text-white mb-4">최고 기록</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-500/30">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center mb-2">
                  <Icon name="trophy-outline" size={24} color="#EAB308" />
                </div>
                <p className="text-sm text-gray-400">최고 정확도</p>
                <p className="text-xl font-bold text-white">{bestRecords.bestAccuracy.value}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  {bestRecords.bestAccuracy.exercise} · {bestRecords.bestAccuracy.date}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-xl p-4 border border-green-500/30">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                  <Icon name="fitness-outline" size={24} color="#22C55E" />
                </div>
                <p className="text-sm text-gray-400">최다 반복</p>
                <p className="text-xl font-bold text-white">{bestRecords.mostReps.value}회</p>
                <p className="text-xs text-gray-500 mt-1">
                  {bestRecords.mostReps.exercise} · {bestRecords.mostReps.date}
                </p>
              </div>
            </div>
          </motion.section>
        )}

        {/* 운동별 통계 */}
        {exerciseStats.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-lg font-semibold text-white mb-4">운동별 통계</h2>
            <div className="space-y-3">
              {exerciseStats.map((item, index) => (
                <motion.div
                  key={item.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="bg-slate-800/50 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{item.name}</span>
                    <span className="text-hearo-primary font-bold">{item.count}회</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">총 반복</span>
                      <span className="text-white ml-2">{item.totalReps}회</span>
                    </div>
                    <div>
                      <span className="text-gray-500">평균 정확도</span>
                      <span className="text-white ml-2">{item.avgAccuracy}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* 데이터 없음 */}
        {filteredSessions.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="stats-chart-outline" size={48} color="#9CA3AF" />
            </div>
            <p className="text-gray-400 mb-4">이 기간의 운동 기록이 없습니다</p>
            <button
              onClick={() => router.push('/exercise')}
              className="px-6 py-3 bg-hearo-primary rounded-xl text-white font-medium hover:bg-hearo-primary/90 transition-colors"
            >
              운동 시작하기
            </button>
          </div>
        )}

        {/* 하단 여백 */}
        <div className="h-8" />
      </main>
    </div>
  );
}

// 통계 카드 컴포넌트
function StatCard({
  icon,
  label,
  value,
  unit,
  change,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: number;
  unit: string;
  change: number;
}) {
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon name={icon} size={18} color="#00D9FF" />
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">
        {value}
        <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
      </div>
      {change !== 0 && (
        <div className={`text-xs mt-1 ${isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-500'}`}>
          {isPositive ? '+' : ''}{change}{unit} 이전 대비
        </div>
      )}
    </div>
  );
}

// 활동 차트 컴포넌트
function ActivityChart({
  data,
  period,
}: {
  data: Array<{ date: string; sessions: number; reps: number; accuracy: number }>;
  period: PeriodFilter;
}) {
  const maxReps = Math.max(...data.map((d) => d.reps), 1);

  // 기간에 따라 표시할 데이터 포인트 수 조정
  const displayData = period === 'week'
    ? data
    : period === 'month'
    ? data.filter((_, i) => i % 3 === 0 || i === data.length - 1)
    : data.filter((_, i) => i % 7 === 0 || i === data.length - 1);

  return (
    <div className="h-32 flex items-end gap-1">
      {displayData.map((d, i) => {
        const height = d.reps > 0 ? Math.max(10, (d.reps / maxReps) * 100) : 5;
        return (
          <div key={i} className="flex-1 flex flex-col items-center">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              className={`w-full rounded-t ${d.reps > 0 ? 'bg-hearo-primary' : 'bg-slate-700'}`}
              title={`${d.date}: ${d.reps}회`}
            />
          </div>
        );
      })}
    </div>
  );
}

// 데모 데이터 생성
function generateDemoData(): ExerciseSession[] {
  const exercises = ['shoulder_flexion', 'knee_flexion', 'elbow_flexion', 'hip_abduction'];
  const data: ExerciseSession[] = [];

  for (let i = 0; i < 90; i++) {
    if (Math.random() > 0.6) continue;

    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(9 + Math.floor(Math.random() * 10));

    data.push({
      id: `demo-${i}`,
      user_id: 'demo',
      exercise_type: exercises[Math.floor(Math.random() * exercises.length)],
      worldview: null,
      started_at: date.toISOString(),
      ended_at: new Date(date.getTime() + 1000 * 60 * 5).toISOString(),
      total_reps: 8 + Math.floor(Math.random() * 5),
      target_reps: 12,
      average_accuracy: 70 + Math.floor(Math.random() * 25),
      duration_seconds: 180 + Math.floor(Math.random() * 120),
      status: 'completed',
      created_at: date.toISOString(),
    });
  }

  return data;
}
