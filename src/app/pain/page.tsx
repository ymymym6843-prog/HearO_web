/**
 * 통증 추적 페이지
 * 통증 기록 조회 및 추세 분석
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  painTrackingService,
  type PainTrend,
} from '@/services/painTrackingService';
import {
  PainTracker,
  type PainRecord,
  type BodyPart,
} from '@/components/pain/PainTracker';

// 신체 부위 정보
const BODY_PARTS_INFO: Record<BodyPart, string> = {
  neck: '목',
  shoulder_left: '왼쪽 어깨',
  shoulder_right: '오른쪽 어깨',
  elbow_left: '왼쪽 팔꿈치',
  elbow_right: '오른쪽 팔꿈치',
  wrist_left: '왼쪽 손목',
  wrist_right: '오른쪽 손목',
  back_upper: '등 상부',
  back_lower: '허리',
  hip_left: '왼쪽 고관절',
  hip_right: '오른쪽 고관절',
  knee_left: '왼쪽 무릎',
  knee_right: '오른쪽 무릎',
  ankle_left: '왼쪽 발목',
  ankle_right: '오른쪽 발목',
};

export default function PainTrackingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [records, setRecords] = useState<PainRecord[]>([]);
  const [trends, setTrends] = useState<PainTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRecorder, setShowRecorder] = useState(false);
  const [selectedPart, setSelectedPart] = useState<BodyPart | null>(null);

  // 데이터 로드
  useEffect(() => {
    loadPainData();
  }, [user?.id]);

  async function loadPainData() {
    setIsLoading(true);
    try {
      const [recordsResult, trendsResult] = await Promise.all([
        painTrackingService.getPainRecords(user?.id, { limit: 50 }),
        painTrackingService.analyzePainTrends(user?.id, 30),
      ]);

      setRecords(recordsResult.records);
      setTrends(trendsResult.trends);
    } catch (error) {
      console.error('Failed to load pain data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // 통증 기록 제출 핸들러
  const handlePainSubmit = async (record: PainRecord) => {
    await painTrackingService.recordPain(record, user?.id);
    setShowRecorder(false);
    loadPainData(); // 데이터 새로고침
  };

  // 통계 계산
  const stats = useMemo(() => {
    if (records.length === 0) {
      return { avgLevel: 0, recordCount: 0, mostAffected: null };
    }

    const avgLevel = records.reduce((sum, r) => sum + r.painLevel, 0) / records.length;

    // 가장 영향받는 부위
    const partCounts = new Map<BodyPart, number>();
    records.forEach((r) => {
      partCounts.set(r.bodyPart, (partCounts.get(r.bodyPart) || 0) + 1);
    });

    let mostAffected: BodyPart | null = null;
    let maxCount = 0;
    partCounts.forEach((count, part) => {
      if (count > maxCount) {
        maxCount = count;
        mostAffected = part;
      }
    });

    return {
      avgLevel: Math.round(avgLevel * 10) / 10,
      recordCount: records.length,
      mostAffected,
    };
  }, [records]);

  // 최근 7일 데이터
  const weeklyData = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];

      const dayRecords = records.filter((r) => {
        const rDate = new Date(r.timestamp);
        rDate.setHours(0, 0, 0, 0);
        return rDate.toISOString().split('T')[0] === dateStr;
      });

      const avgLevel =
        dayRecords.length > 0
          ? dayRecords.reduce((sum, r) => sum + r.painLevel, 0) / dayRecords.length
          : 0;

      result.push({
        date: dateStr,
        day: ['일', '월', '화', '수', '목', '금', '토'][date.getDay()],
        avgLevel: Math.round(avgLevel * 10) / 10,
        hasData: dayRecords.length > 0,
      });
    }
    return result;
  }, [records]);

  if (showRecorder) {
    return (
      <PainTracker
        timing="before"
        onSubmit={handlePainSubmit}
        onSkip={() => setShowRecorder(false)}
        initialBodyPart={selectedPart || undefined}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-hearo-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-hearo-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">통증 기록 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hearo-bg">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-hearo-bg/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors"
              aria-label="뒤로 가기"
            >
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </button>
            <h1 className="text-xl font-bold text-white">통증 추적</h1>
          </div>
          <button
            onClick={() => {
              setSelectedPart(null);
              setShowRecorder(true);
            }}
            className="px-4 py-2 bg-hearo-primary rounded-xl text-white font-medium hover:bg-hearo-primary/90 transition-colors"
          >
            + 기록하기
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 요약 카드 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4"
        >
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.avgLevel}</p>
            <p className="text-xs text-gray-400 mt-1">평균 통증</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.recordCount}</p>
            <p className="text-xs text-gray-400 mt-1">총 기록</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-white truncate">
              {stats.mostAffected ? BODY_PARTS_INFO[stats.mostAffected] : '-'}
            </p>
            <p className="text-xs text-gray-400 mt-1">주요 부위</p>
          </div>
        </motion.section>

        {/* 주간 추이 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">주간 추이</h2>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex justify-between items-end gap-2 h-32">
              {weeklyData.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="flex-1 w-full flex items-end justify-center">
                    {day.hasData ? (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(day.avgLevel / 10) * 100}%` }}
                        className={`w-full max-w-8 rounded-t-lg ${getPainColor(day.avgLevel)}`}
                      />
                    ) : (
                      <div className="w-full max-w-8 h-2 bg-slate-700 rounded" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{day.day}</p>
                  {day.hasData && (
                    <p className="text-xs text-gray-400">{day.avgLevel}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* 부위별 추세 */}
        {trends.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-white mb-4">부위별 추세</h2>
            <div className="space-y-3">
              {trends.map((trend) => (
                <TrendCard
                  key={trend.bodyPart}
                  trend={trend}
                  onClick={() => {
                    setSelectedPart(trend.bodyPart);
                    setShowRecorder(true);
                  }}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* 최근 기록 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">최근 기록</h2>
          {records.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/30 rounded-xl">
              <p className="text-gray-400 mb-4">아직 기록이 없습니다</p>
              <button
                onClick={() => setShowRecorder(true)}
                className="px-6 py-3 bg-hearo-primary rounded-xl text-white font-medium hover:bg-hearo-primary/90 transition-colors"
              >
                첫 기록 시작하기
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {records.slice(0, 10).map((record, i) => (
                <RecordCard key={record.id || i} record={record} index={i} />
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

// 추세 카드 컴포넌트
function TrendCard({
  trend,
  onClick,
}: {
  trend: PainTrend;
  onClick: () => void;
}) {
  const trendConfig: Record<string, { icon: IconName; color: string; iconColor: string; label: string }> = {
    improving: { icon: 'trending-down-outline', color: 'text-green-400', iconColor: '#22C55E', label: '개선 중' },
    stable: { icon: 'remove-outline', color: 'text-yellow-400', iconColor: '#EAB308', label: '유지 중' },
    worsening: { icon: 'trending-up-outline', color: 'text-red-400', iconColor: '#EF4444', label: '악화 중' },
  };
  const trendIcon = trendConfig[trend.trend];

  return (
    <button
      onClick={onClick}
      className="w-full p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors text-left"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${getPainColor(
              trend.averageLevel
            )}`}
          >
            <span className="text-white font-bold">{Math.round(trend.averageLevel)}</span>
          </div>
          <div>
            <p className="font-medium text-white">
              {BODY_PARTS_INFO[trend.bodyPart]}
            </p>
            <p className="text-sm text-gray-400">{trend.recordCount}회 기록</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 ${trendIcon.color}`}>
          <Icon name={trendIcon.icon} size={18} color={trendIcon.iconColor} />
          <span className="text-sm">{trendIcon.label}</span>
        </div>
      </div>
    </button>
  );
}

// 기록 카드 컴포넌트
function RecordCard({ record, index }: { record: PainRecord; index: number }) {
  const date = new Date(record.timestamp);
  const dateStr = date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const timingLabels = {
    before: '운동 전',
    during: '운동 중',
    after: '운동 후',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl"
    >
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center ${getPainColor(
          record.painLevel
        )}`}
      >
        <span className="text-white font-bold text-lg">{record.painLevel}</span>
      </div>

      <div className="flex-1">
        <p className="font-medium text-white">{BODY_PARTS_INFO[record.bodyPart]}</p>
        <p className="text-sm text-gray-400">
          {timingLabels[record.timing]} · {record.painType}
        </p>
      </div>

      <div className="text-right">
        <p className="text-sm text-white">{dateStr}</p>
        <p className="text-xs text-gray-500">{timeStr}</p>
      </div>
    </motion.div>
  );
}

// 통증 레벨에 따른 색상
function getPainColor(level: number): string {
  if (level === 0) return 'bg-green-500';
  if (level <= 3) return 'bg-yellow-500';
  if (level <= 6) return 'bg-orange-500';
  return 'bg-red-500';
}
