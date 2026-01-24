/**
 * 운동 히스토리 페이지
 * 진행 상황, 통계, 추세 표시
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/useAuthStore';
import { exerciseResultService } from '@/services/exerciseResultService';
import { createLogger } from '@/lib/logger';
import { getExerciseName } from '@/constants/exercises';
import type { ExerciseSession } from '@/types/database';

const logger = createLogger('HistoryPage');

// 기간 필터 옵션
type PeriodFilter = '7d' | '30d' | '90d' | 'all';

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  // 데이터 로드 (race condition 방지)
  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setIsLoading(true);
      try {
        if (user) {
          const { sessions: data } = await exerciseResultService.getUserSessions(user.id, {
            status: 'completed',
            limit: 200,
          });
          // 요청 중 user가 변경되었으면 결과 무시
          if (!cancelled) {
            setSessions(data);
          }
        } else {
          // 로컬 데모 데이터
          if (!cancelled) {
            setSessions(generateDemoData());
          }
        }
      } catch (error) {
        if (!cancelled) {
          logger.error('히스토리 로드 실패', error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // 필터링된 세션
  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    // 기간 필터
    if (period !== 'all') {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter((s) => new Date(s.started_at) >= cutoff);
    }

    // 운동 필터
    if (selectedExercise) {
      result = result.filter((s) => s.exercise_type === selectedExercise);
    }

    return result;
  }, [sessions, period, selectedExercise]);

  // 통계 계산
  const stats = useMemo(() => {
    if (filteredSessions.length === 0) {
      return {
        totalSessions: 0,
        totalReps: 0,
        avgAccuracy: 0,
        totalMinutes: 0,
        streak: 0,
      };
    }

    const totalSessions = filteredSessions.length;
    const totalReps = filteredSessions.reduce((sum, s) => sum + s.total_reps, 0);
    const avgAccuracy =
      filteredSessions.reduce((sum, s) => sum + s.average_accuracy, 0) / totalSessions;
    const totalMinutes = Math.round(
      filteredSessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60
    );

    // 연속 운동 일수 계산
    const sortedByDate = [...filteredSessions].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
    let streak = 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of sortedByDate) {
      const sessionDate = new Date(session.started_at);
      sessionDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor(
        (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === streak) {
        streak++;
      } else if (diffDays > streak) {
        break;
      }
    }

    return {
      totalSessions,
      totalReps,
      avgAccuracy: Math.round(avgAccuracy * 10) / 10,
      totalMinutes,
      streak,
    };
  }, [filteredSessions]);

  // 일별 데이터 (차트용)
  const dailyData = useMemo(() => {
    const byDate = new Map<string, { reps: number; accuracy: number; count: number }>();

    filteredSessions.forEach((session) => {
      const date = new Date(session.started_at).toISOString().split('T')[0];
      const existing = byDate.get(date) || { reps: 0, accuracy: 0, count: 0 };
      byDate.set(date, {
        reps: existing.reps + session.total_reps,
        accuracy: existing.accuracy + session.average_accuracy,
        count: existing.count + 1,
      });
    });

    // 최근 7일 데이터 생성
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const data = byDate.get(dateStr);
      result.push({
        date: dateStr,
        day: ['일', '월', '화', '수', '목', '금', '토'][date.getDay()],
        reps: data?.reps || 0,
        avgAccuracy: data ? Math.round(data.accuracy / data.count) : 0,
        hasData: !!data,
      });
    }

    return result;
  }, [filteredSessions]);

  // 운동별 분류
  const exerciseBreakdown = useMemo(() => {
    const breakdown = new Map<string, number>();
    filteredSessions.forEach((s) => {
      breakdown.set(s.exercise_type, (breakdown.get(s.exercise_type) || 0) + 1);
    });
    return Array.from(breakdown.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        type,
        name: getExerciseName(type),
        count,
        percentage: Math.round((count / filteredSessions.length) * 100),
      }));
  }, [filteredSessions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-hearo-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-hearo-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">히스토리 로딩 중...</p>
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
          <h1 className="text-xl font-bold text-white">운동 히스토리</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 기간 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: '7d', label: '7일' },
            { value: '30d', label: '30일' },
            { value: '90d', label: '90일' },
            { value: 'all', label: '전체' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value as PeriodFilter)}
              aria-pressed={period === option.value}
              aria-label={`${option.label} 기간 필터`}
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

        {/* 통계 카드 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-4"
        >
          <StatCard
            icon="stats-chart-outline"
            label="총 세션"
            value={stats.totalSessions}
            unit="회"
          />
          <StatCard
            icon="fitness-outline"
            label="총 반복"
            value={stats.totalReps}
            unit="회"
          />
          <StatCard
            icon="analytics-outline"
            label="평균 정확도"
            value={stats.avgAccuracy}
            unit="%"
          />
          <StatCard
            icon="time-outline"
            label="총 운동 시간"
            value={stats.totalMinutes}
            unit="분"
          />
        </motion.div>

        {/* 연속 운동 */}
        {stats.streak > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-4 border border-orange-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <Icon name="flame-outline" size={28} color="#F97316" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{stats.streak}일 연속 운동!</p>
                <p className="text-sm text-gray-400">꾸준히 운동하고 계시네요</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* 주간 활동 차트 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">주간 활동</h2>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex justify-between gap-2">
              {dailyData.map((day, i) => (
                <div key={i} className="flex-1 text-center">
                  <div className="text-xs text-gray-500 mb-2">{day.day}</div>
                  <div
                    className={`h-20 rounded-lg flex items-end justify-center ${
                      day.hasData ? 'bg-hearo-primary/20' : 'bg-slate-700/50'
                    }`}
                  >
                    {day.hasData && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.min(100, day.reps * 5)}%` }}
                        className="w-full bg-hearo-primary rounded-lg"
                      />
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    {day.hasData ? `${day.reps}회` : '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* 운동별 분류 */}
        {exerciseBreakdown.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-white mb-4">운동별 분류</h2>
            <div className="space-y-3">
              {exerciseBreakdown.map((item) => (
                <button
                  key={item.type}
                  onClick={() =>
                    setSelectedExercise(
                      selectedExercise === item.type ? null : item.type
                    )
                  }
                  aria-pressed={selectedExercise === item.type}
                  aria-label={`${item.name} 운동 필터 (${item.count}회)`}
                  className={`w-full p-4 rounded-xl transition-all ${
                    selectedExercise === item.type
                      ? 'bg-hearo-primary/20 border border-hearo-primary'
                      : 'bg-slate-800/50 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{item.name}</span>
                    <span className="text-hearo-primary font-bold">{item.count}회</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      className="h-full bg-hearo-primary"
                    />
                  </div>
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {/* 최근 세션 목록 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">최근 운동</h2>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>기록된 운동이 없습니다</p>
              <button
                onClick={() => router.push('/exercise')}
                className="mt-4 px-6 py-3 bg-hearo-primary rounded-xl text-white font-medium hover:bg-hearo-primary/90 transition-colors"
              >
                운동 시작하기
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.slice(0, 10).map((session, i) => (
                <SessionCard key={session.id} session={session} index={i} />
              ))}
            </div>
          )}
        </motion.section>

        {/* 하단 여백 */}
        <div className="h-8" />
      </main>
    </div>
  );
}

// 통계 카드
function StatCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: IconName;
  label: string;
  value: number;
  unit: string;
}) {
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
    </div>
  );
}

// 세션 카드
function SessionCard({
  session,
  index,
}: {
  session: ExerciseSession;
  index: number;
}) {
  const date = new Date(session.started_at);
  const dateStr = date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl"
    >
      <div className="text-center min-w-[60px]">
        <div className="text-sm font-bold text-white">{dateStr}</div>
        <div className="text-xs text-gray-500">{timeStr}</div>
      </div>

      <div className="flex-1">
        <p className="font-medium text-white">
          {getExerciseName(session.exercise_type)}
        </p>
        <p className="text-sm text-gray-400">
          {session.total_reps}회 · {Math.round(session.duration_seconds / 60)}분
        </p>
      </div>

      <div className="text-right">
        <div
          className={`text-lg font-bold ${
            session.average_accuracy >= 80
              ? 'text-green-400'
              : session.average_accuracy >= 60
              ? 'text-yellow-400'
              : 'text-red-400'
          }`}
        >
          {Math.round(session.average_accuracy)}%
        </div>
        <div className="text-xs text-gray-500">정확도</div>
      </div>
    </motion.div>
  );
}

// 데모 데이터 생성
function generateDemoData(): ExerciseSession[] {
  const exercises = ['shoulder_flexion', 'knee_flexion', 'elbow_flexion', 'hip_abduction'];
  const data: ExerciseSession[] = [];

  for (let i = 0; i < 30; i++) {
    // 일부 날짜는 건너뛰기
    if (Math.random() > 0.7) continue;

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
