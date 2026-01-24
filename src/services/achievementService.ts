/**
 * 업적 시스템 서비스
 * 운동 목표 달성에 따른 업적 관리
 */

import { createLogger } from '@/lib/logger';
import type { IconName } from '@/components/ui/Icon';

const _logger = createLogger('AchievementService');

// 업적 카테고리
export type AchievementCategory = 'streak' | 'reps' | 'accuracy' | 'duration' | 'milestone';

// 업적 정의
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  category: AchievementCategory;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: {
    type: 'count' | 'streak' | 'accuracy' | 'duration';
    value: number;
    exercise?: string; // 특정 운동 제한 (없으면 전체)
  };
  reward?: {
    type: 'badge' | 'title' | 'theme';
    value: string;
  };
}

// 달성된 업적
export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: string;
  progress: number; // 달성 시점의 진행도 (100%)
}

// 진행 중인 업적
export interface AchievementProgress {
  achievementId: string;
  currentValue: number;
  targetValue: number;
  percentage: number;
}

// 모든 업적 정의
export const ACHIEVEMENTS: Achievement[] = [
  // 연속 운동 (Streak)
  {
    id: 'streak_3',
    name: '시작이 반이다',
    description: '3일 연속 운동하기',
    icon: 'flame-outline',
    category: 'streak',
    tier: 'bronze',
    requirement: { type: 'streak', value: 3 },
  },
  {
    id: 'streak_7',
    name: '일주일 완주',
    description: '7일 연속 운동하기',
    icon: 'flame-outline',
    category: 'streak',
    tier: 'silver',
    requirement: { type: 'streak', value: 7 },
  },
  {
    id: 'streak_30',
    name: '한 달 챔피언',
    description: '30일 연속 운동하기',
    icon: 'flame-outline',
    category: 'streak',
    tier: 'gold',
    requirement: { type: 'streak', value: 30 },
  },
  {
    id: 'streak_100',
    name: '철인',
    description: '100일 연속 운동하기',
    icon: 'flame-outline',
    category: 'streak',
    tier: 'platinum',
    requirement: { type: 'streak', value: 100 },
  },

  // 총 반복 횟수
  {
    id: 'reps_100',
    name: '워밍업 완료',
    description: '총 100회 운동 완료',
    icon: 'fitness-outline',
    category: 'reps',
    tier: 'bronze',
    requirement: { type: 'count', value: 100 },
  },
  {
    id: 'reps_500',
    name: '꾸준한 노력',
    description: '총 500회 운동 완료',
    icon: 'fitness-outline',
    category: 'reps',
    tier: 'silver',
    requirement: { type: 'count', value: 500 },
  },
  {
    id: 'reps_1000',
    name: '천의 기록',
    description: '총 1,000회 운동 완료',
    icon: 'fitness-outline',
    category: 'reps',
    tier: 'gold',
    requirement: { type: 'count', value: 1000 },
  },
  {
    id: 'reps_5000',
    name: '마스터',
    description: '총 5,000회 운동 완료',
    icon: 'fitness-outline',
    category: 'reps',
    tier: 'platinum',
    requirement: { type: 'count', value: 5000 },
  },

  // 정확도
  {
    id: 'accuracy_80',
    name: '정확함의 시작',
    description: '80% 이상 정확도로 세션 완료',
    icon: 'analytics-outline',
    category: 'accuracy',
    tier: 'bronze',
    requirement: { type: 'accuracy', value: 80 },
  },
  {
    id: 'accuracy_90',
    name: '예리한 움직임',
    description: '90% 이상 정확도로 세션 완료',
    icon: 'analytics-outline',
    category: 'accuracy',
    tier: 'silver',
    requirement: { type: 'accuracy', value: 90 },
  },
  {
    id: 'accuracy_95',
    name: '완벽주의자',
    description: '95% 이상 정확도로 세션 완료',
    icon: 'analytics-outline',
    category: 'accuracy',
    tier: 'gold',
    requirement: { type: 'accuracy', value: 95 },
  },
  {
    id: 'perfect_session',
    name: '퍼펙트 게임',
    description: '100% 정확도로 세션 완료',
    icon: 'analytics-outline',
    category: 'accuracy',
    tier: 'platinum',
    requirement: { type: 'accuracy', value: 100 },
  },

  // 운동 시간
  {
    id: 'duration_60',
    name: '시간 투자',
    description: '총 1시간 운동',
    icon: 'time-outline',
    category: 'duration',
    tier: 'bronze',
    requirement: { type: 'duration', value: 60 },
  },
  {
    id: 'duration_300',
    name: '5시간의 노력',
    description: '총 5시간 운동',
    icon: 'time-outline',
    category: 'duration',
    tier: 'silver',
    requirement: { type: 'duration', value: 300 },
  },
  {
    id: 'duration_600',
    name: '10시간 달성',
    description: '총 10시간 운동',
    icon: 'time-outline',
    category: 'duration',
    tier: 'gold',
    requirement: { type: 'duration', value: 600 },
  },

  // 마일스톤
  {
    id: 'first_session',
    name: '첫 걸음',
    description: '첫 번째 운동 세션 완료',
    icon: 'star-outline',
    category: 'milestone',
    tier: 'bronze',
    requirement: { type: 'count', value: 1 },
  },
  {
    id: 'ten_sessions',
    name: '열 번째 도전',
    description: '10개 세션 완료',
    icon: 'star-outline',
    category: 'milestone',
    tier: 'silver',
    requirement: { type: 'count', value: 10 },
  },
  {
    id: 'fifty_sessions',
    name: '50번의 도전',
    description: '50개 세션 완료',
    icon: 'star-outline',
    category: 'milestone',
    tier: 'gold',
    requirement: { type: 'count', value: 50 },
  },
];

// 티어 색상
export const TIER_COLORS: Record<Achievement['tier'], string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
};

// 로컬 스토리지 키
const STORAGE_KEY = 'hearo-achievements';

class AchievementService {
  /**
   * 달성된 업적 조회
   */
  getUnlockedAchievements(): UnlockedAchievement[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * 업적 달성 여부 확인
   */
  isUnlocked(achievementId: string): boolean {
    const unlocked = this.getUnlockedAchievements();
    return unlocked.some((a) => a.achievementId === achievementId);
  }

  /**
   * 업적 달성 처리
   */
  unlockAchievement(achievementId: string): UnlockedAchievement | null {
    if (this.isUnlocked(achievementId)) {
      return null; // 이미 달성
    }

    const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!achievement) {
      return null;
    }

    const unlocked: UnlockedAchievement = {
      achievementId,
      unlockedAt: new Date().toISOString(),
      progress: 100,
    };

    const allUnlocked = this.getUnlockedAchievements();
    allUnlocked.push(unlocked);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allUnlocked));

    return unlocked;
  }

  /**
   * 통계 기반 업적 체크
   */
  checkAchievements(stats: {
    totalSessions: number;
    totalReps: number;
    totalMinutes: number;
    currentStreak: number;
    lastSessionAccuracy: number;
  }): Achievement[] {
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of ACHIEVEMENTS) {
      if (this.isUnlocked(achievement.id)) {
        continue;
      }

      let unlocked = false;

      switch (achievement.requirement.type) {
        case 'count':
          if (achievement.category === 'milestone') {
            unlocked = stats.totalSessions >= achievement.requirement.value;
          } else {
            unlocked = stats.totalReps >= achievement.requirement.value;
          }
          break;

        case 'streak':
          unlocked = stats.currentStreak >= achievement.requirement.value;
          break;

        case 'accuracy':
          unlocked = stats.lastSessionAccuracy >= achievement.requirement.value;
          break;

        case 'duration':
          unlocked = stats.totalMinutes >= achievement.requirement.value;
          break;
      }

      if (unlocked) {
        this.unlockAchievement(achievement.id);
        newlyUnlocked.push(achievement);
      }
    }

    return newlyUnlocked;
  }

  /**
   * 업적 진행도 계산
   */
  getProgress(
    achievementId: string,
    stats: {
      totalSessions: number;
      totalReps: number;
      totalMinutes: number;
      currentStreak: number;
    }
  ): AchievementProgress | null {
    const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!achievement) return null;

    let currentValue = 0;
    const targetValue = achievement.requirement.value;

    switch (achievement.requirement.type) {
      case 'count':
        currentValue =
          achievement.category === 'milestone' ? stats.totalSessions : stats.totalReps;
        break;
      case 'streak':
        currentValue = stats.currentStreak;
        break;
      case 'duration':
        currentValue = stats.totalMinutes;
        break;
      case 'accuracy':
        currentValue = 0; // 정확도는 세션별로 체크
        break;
    }

    return {
      achievementId,
      currentValue: Math.min(currentValue, targetValue),
      targetValue,
      percentage: Math.min(100, Math.round((currentValue / targetValue) * 100)),
    };
  }

  /**
   * 모든 업적과 진행도 조회
   */
  getAllWithProgress(stats: {
    totalSessions: number;
    totalReps: number;
    totalMinutes: number;
    currentStreak: number;
  }): Array<Achievement & { unlocked: boolean; progress: AchievementProgress | null }> {
    const unlocked = this.getUnlockedAchievements();

    return ACHIEVEMENTS.map((achievement) => ({
      ...achievement,
      unlocked: unlocked.some((u) => u.achievementId === achievement.id),
      progress: this.getProgress(achievement.id, stats),
    }));
  }

  /**
   * 카테고리별 업적 조회
   */
  getByCategory(category: AchievementCategory): Achievement[] {
    return ACHIEVEMENTS.filter((a) => a.category === category);
  }

  /**
   * 다음 달성 가능한 업적 조회
   */
  getNextAchievements(stats: {
    totalSessions: number;
    totalReps: number;
    totalMinutes: number;
    currentStreak: number;
  }): Achievement[] {
    const allWithProgress = this.getAllWithProgress(stats);
    return allWithProgress
      .filter((a) => !a.unlocked && a.progress && a.progress.percentage > 0)
      .sort((a, b) => (b.progress?.percentage || 0) - (a.progress?.percentage || 0))
      .slice(0, 3);
  }

  /**
   * 업적 초기화
   */
  resetAchievements(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// 싱글톤 인스턴스
export const achievementService = new AchievementService();
export default achievementService;
