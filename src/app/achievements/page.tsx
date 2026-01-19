/**
 * 업적 페이지
 * 달성한 업적과 진행 중인 업적 표시
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/useAuthStore';
import { exerciseResultService } from '@/services/exerciseResultService';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AchievementsPage');
import {
  achievementService,
  ACHIEVEMENTS,
  TIER_COLORS,
  type Achievement,
  type AchievementCategory,
} from '@/services/achievementService';
import { AchievementCard } from '@/components/achievements/AchievementCard';
import { AchievementsPageSkeleton } from '@/components/common/Skeleton';

// 카테고리 정보
const CATEGORIES: Record<AchievementCategory, { label: string; icon: IconName }> = {
  streak: { label: '연속 운동', icon: 'flame-outline' },
  reps: { label: '운동 횟수', icon: 'fitness-outline' },
  accuracy: { label: '정확도', icon: 'analytics-outline' },
  duration: { label: '운동 시간', icon: 'time-outline' },
  milestone: { label: '마일스톤', icon: 'star-outline' },
};

export default function AchievementsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalReps: 0,
    totalMinutes: 0,
    currentStreak: 0,
    lastSessionAccuracy: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // 통계 로드 및 업적 체크
  useEffect(() => {
    loadStatsAndCheckAchievements();
  }, [user?.id]);

  async function loadStatsAndCheckAchievements() {
    setIsLoading(true);
    try {
      if (user) {
        // 실제 통계 로드
        const { stats: userStats } = await exerciseResultService.getUserStats(user.id);
        if (userStats) {
          // 연속 운동일 계산을 위해 세션 목록도 가져옴
          const { sessions } = await exerciseResultService.getUserSessions(user.id, {
            status: 'completed',
            limit: 100,
          });

          const streak = calculateStreak(sessions.map((s) => s.started_at));
          const lastAccuracy = sessions[0]?.average_accuracy || 0;

          const newStats = {
            totalSessions: userStats.totalSessions,
            totalReps: userStats.totalReps,
            totalMinutes: Math.round(userStats.totalDuration / 60),
            currentStreak: streak,
            lastSessionAccuracy: lastAccuracy,
          };

          setStats(newStats);

          // 업적 체크
          achievementService.checkAchievements(newStats);
        }
      } else {
        // 로컬 데모 데이터
        const demoStats = {
          totalSessions: 15,
          totalReps: 180,
          totalMinutes: 45,
          currentStreak: 3,
          lastSessionAccuracy: 85,
        };
        setStats(demoStats);
        achievementService.checkAchievements(demoStats);
      }
    } catch (error) {
      logger.error('통계 로드 실패', error);
    } finally {
      setIsLoading(false);
    }
  }

  // 업적 데이터 계산
  const achievementsData = useMemo(() => {
    return achievementService.getAllWithProgress(stats);
  }, [stats]);

  // 필터링된 업적
  const filteredAchievements = useMemo(() => {
    if (selectedCategory === 'all') {
      return achievementsData;
    }
    return achievementsData.filter((a) => a.category === selectedCategory);
  }, [achievementsData, selectedCategory]);

  // 달성률 계산
  const unlockedCount = achievementsData.filter((a) => a.unlocked).length;
  const totalCount = achievementsData.length;
  const completionRate = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // 다음 달성 가능 업적
  const nextAchievements = useMemo(() => {
    return achievementService.getNextAchievements(stats);
  }, [stats]);

  if (isLoading) {
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
            <h1 className="text-xl font-bold text-white">업적</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6">
          <AchievementsPageSkeleton />
        </main>
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
          <h1 className="text-xl font-bold text-white">업적</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 전체 진행도 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-hearo-primary/20 to-blue-600/20 rounded-2xl p-6 border border-hearo-primary/30"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">전체 달성률</h2>
              <p className="text-sm text-gray-400">
                {unlockedCount} / {totalCount} 업적 달성
              </p>
            </div>
            <div className="text-4xl font-bold text-hearo-primary">{completionRate}%</div>
          </div>

          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-hearo-primary to-blue-500"
            />
          </div>

          {/* 현재 스탯 */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <StatMini icon="flame-outline" label="연속" value={`${stats.currentStreak}일`} />
            <StatMini icon="fitness-outline" label="총 횟수" value={`${stats.totalReps}회`} />
            <StatMini icon="time-outline" label="운동 시간" value={`${stats.totalMinutes}분`} />
            <StatMini icon="stats-chart-outline" label="세션" value={`${stats.totalSessions}회`} />
          </div>
        </motion.section>

        {/* 다음 달성 가능 업적 */}
        {nextAchievements.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Icon name="flag-outline" size={20} color="#00D9FF" />
              곧 달성 가능
            </h2>
            <div className="space-y-3">
              {nextAchievements.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  unlocked={false}
                  progress={achievementService.getProgress(achievement.id, stats)}
                  showProgress={true}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* 카테고리 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4" role="group" aria-label="업적 카테고리 필터">
          <FilterButton
            active={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
            aria-label="전체 업적 보기"
          >
            전체
          </FilterButton>
          {(Object.keys(CATEGORIES) as AchievementCategory[]).map((category) => (
            <FilterButton
              key={category}
              active={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
              aria-label={`${CATEGORIES[category].label} 카테고리 필터`}
            >
              <span className="flex items-center gap-1">
                <Icon name={CATEGORIES[category].icon} size={16} color={selectedCategory === category ? '#FFFFFF' : '#9CA3AF'} />
                {CATEGORIES[category].label}
              </span>
            </FilterButton>
          ))}
        </div>

        {/* 업적 목록 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {selectedCategory === 'all' ? '모든 업적' : CATEGORIES[selectedCategory].label}
            </h2>
            <span className="text-sm text-gray-400">
              {filteredAchievements.filter((a) => a.unlocked).length} /{' '}
              {filteredAchievements.length}
            </span>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {/* 달성한 업적 먼저 */}
              {filteredAchievements
                .sort((a, b) => {
                  if (a.unlocked && !b.unlocked) return -1;
                  if (!a.unlocked && b.unlocked) return 1;
                  return (b.progress?.percentage || 0) - (a.progress?.percentage || 0);
                })
                .map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <AchievementCard
                      achievement={achievement}
                      unlocked={achievement.unlocked}
                      progress={achievement.progress}
                      showProgress={true}
                    />
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* 티어 범례 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pt-4 border-t border-white/10"
        >
          <h3 className="text-sm font-medium text-gray-400 mb-3">티어 등급</h3>
          <div className="flex gap-4">
            {(['bronze', 'silver', 'gold', 'platinum'] as const).map((tier) => (
              <div key={tier} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: TIER_COLORS[tier] }}
                />
                <span className="text-sm text-gray-400 capitalize">{tier}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* 하단 여백 */}
        <div className="h-8" />
      </main>
    </div>
  );
}

// 미니 통계 컴포넌트
function StatMini({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="text-center">
      <Icon name={icon} size={20} color="#00D9FF" />
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  );
}

// 필터 버튼
function FilterButton({
  active,
  onClick,
  children,
  'aria-label': ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  'aria-label'?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-hearo-primary text-white'
          : 'bg-slate-800 text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// 연속 운동일 계산
function calculateStreak(sessionDates: string[]): number {
  if (sessionDates.length === 0) return 0;

  const sortedDates = [...sessionDates]
    .map((d) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
    .sort((a, b) => b - a);

  // 중복 제거 (같은 날 여러 세션)
  const uniqueDates = [...new Set(sortedDates)];

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < uniqueDates.length; i++) {
    const expectedDate = todayTime - i * oneDayMs;
    if (uniqueDates[i] === expectedDate) {
      streak++;
    } else if (i === 0 && uniqueDates[i] === todayTime - oneDayMs) {
      // 오늘 운동 안 했지만 어제까지 연속인 경우
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
