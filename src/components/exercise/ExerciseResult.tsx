/**
 * 운동 결과 화면 컴포넌트
 * 운동 세션 완료 후 결과 표시
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { ExerciseSession, ExerciseRep } from '@/types/database';
import { exerciseResultService } from '@/services/exerciseResultService';
import { shareService, type ShareableResult, type ShareOptions } from '@/services/shareService';
import { Icon, type IconName } from '@/components/ui/Icon';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ExerciseResult');

// 결과 데이터 타입
interface ExerciseResultData {
  session: ExerciseSession;
  reps: ExerciseRep[];
}

interface ExerciseResultProps {
  sessionId?: string;
  // 또는 직접 데이터 전달
  sessionData?: {
    exerciseType: string;
    totalReps: number;
    targetReps: number;
    averageAccuracy: number;
    durationSeconds: number;
    repDetails?: Array<{
      repNumber: number;
      accuracy: number;
      maxAngle?: number;
      minAngle?: number;
    }>;
  };
  onRetry?: () => void;
  onGoHome?: () => void;
}

export function ExerciseResult({
  sessionId,
  sessionData,
  onRetry,
  onGoHome,
}: ExerciseResultProps) {
  const router = useRouter();
  const [result, setResult] = useState<ExerciseResultData | null>(null);
  const [isLoading, setIsLoading] = useState(!!sessionId);
  const [activeTab, setActiveTab] = useState<'summary' | 'details'>('summary');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'success' | 'error'>('idle');

  // 세션 데이터 로드
  useEffect(() => {
    if (sessionId) {
      loadSessionData(sessionId);
    }
  }, [sessionId]);

  async function loadSessionData(id: string) {
    setIsLoading(true);
    try {
      const [sessionResult, repsResult] = await Promise.all([
        exerciseResultService.getSession(id),
        exerciseResultService.getSessionReps(id),
      ]);

      if (sessionResult.session) {
        setResult({
          session: sessionResult.session,
          reps: repsResult.reps,
        });
      }
    } catch (error) {
      logger.error('세션 데이터 로드 실패', error);
    } finally {
      setIsLoading(false);
    }
  }

  // 표시할 데이터 결정
  const displayData = result?.session || sessionData;
  const repData = result?.reps || sessionData?.repDetails || [];

  // 데이터에서 값 추출
  const accuracy = displayData
    ? ('averageAccuracy' in displayData ? displayData.averageAccuracy : displayData.average_accuracy)
    : 0;
  const totalReps = displayData
    ? ('totalReps' in displayData ? displayData.totalReps : displayData.total_reps)
    : 0;
  const targetReps = displayData
    ? ('targetReps' in displayData ? displayData.targetReps : displayData.target_reps)
    : 0;
  const duration = displayData
    ? ('durationSeconds' in displayData ? displayData.durationSeconds : displayData.duration_seconds)
    : 0;
  const exerciseType = displayData
    ? ('exerciseType' in displayData ? displayData.exerciseType : displayData.exercise_type)
    : '';

  const completionRate = targetReps > 0 ? Math.round((totalReps / targetReps) * 100) : 0;
  const grade = getGrade(accuracy);

  // 공유 처리
  const handleShare = useCallback(async (platform: ShareOptions['platform'] = 'native') => {
    if (!displayData) return;

    setShareStatus('sharing');

    const shareableResult: ShareableResult = {
      type: 'exercise',
      title: `${getExerciseName(exerciseType)} 완료!`,
      description: `${totalReps}회 완료, 정확도 ${Math.round(accuracy)}%`,
      stats: {
        reps: totalReps,
        accuracy: Math.round(accuracy),
        duration: duration,
      },
    };

    const { success, error } = await shareService.shareResult(shareableResult, { platform });

    if (success) {
      setShareStatus('success');
      setTimeout(() => {
        setShareStatus('idle');
        setShowShareModal(false);
      }, 1500);
    } else {
      logger.error('공유 실패', error);
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 2000);
    }
  }, [displayData, exerciseType, totalReps, accuracy, duration]);

  if (isLoading) {
    return <ResultLoading />;
  }

  if (!displayData) {
    return <ResultError onRetry={() => sessionId && loadSessionData(sessionId)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      {/* 헤더 - 등급 표시 */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="text-center mb-8"
      >
        <div
          className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${grade.bgColor} mb-4`}
        >
          <span className={`text-6xl font-bold ${grade.textColor}`}>{grade.letter}</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">운동 완료!</h1>
        <p className="text-slate-400">{getExerciseName(exerciseType)}</p>
      </motion.div>

      {/* 탭 네비게이션 */}
      <div className="flex justify-center gap-2 mb-6">
        <TabButton
          active={activeTab === 'summary'}
          onClick={() => setActiveTab('summary')}
        >
          요약
        </TabButton>
        <TabButton
          active={activeTab === 'details'}
          onClick={() => setActiveTab('details')}
        >
          상세
        </TabButton>
      </div>

      {/* 탭 컨텐츠 */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'summary' ? (
          <ResultSummary
            accuracy={accuracy}
            totalReps={totalReps}
            targetReps={targetReps}
            completionRate={completionRate}
            duration={duration}
          />
        ) : (
          <ResultDetails reps={repData} />
        )}
      </motion.div>

      {/* 액션 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-900 to-transparent">
        <div className="flex gap-4 max-w-md mx-auto">
          <button
            onClick={() => setShowShareModal(true)}
            className="py-4 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 transition-colors"
            aria-label="공유하기"
          >
            <Icon name="share-outline" size={24} color="#FFFFFF" />
          </button>
          <button
            onClick={onRetry || (() => router.back())}
            className="flex-1 py-4 px-6 rounded-xl bg-slate-700 hover:bg-slate-600 transition-colors font-medium"
          >
            다시 하기
          </button>
          <button
            onClick={onGoHome || (() => router.push('/'))}
            className="flex-1 py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors font-medium"
          >
            홈으로
          </button>
        </div>
      </div>

      {/* 공유 모달 */}
      <AnimatePresence>
        {showShareModal && (
          <ShareModal
            onClose={() => setShowShareModal(false)}
            onShare={handleShare}
            status={shareStatus}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// 결과 요약 컴포넌트
function ResultSummary({
  accuracy,
  totalReps,
  targetReps,
  completionRate,
  duration,
}: {
  accuracy: number;
  totalReps: number;
  targetReps: number;
  completionRate: number;
  duration: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-24">
      <StatCard
        label="정확도"
        value={`${Math.round(accuracy)}%`}
        icon="analytics-outline"
        color="blue"
      />
      <StatCard
        label="완료율"
        value={`${completionRate}%`}
        subValue={`${totalReps}/${targetReps} 회`}
        icon="checkmark-circle-outline"
        color="green"
      />
      <StatCard
        label="소요 시간"
        value={formatDuration(duration)}
        icon="time-outline"
        color="purple"
      />
      <StatCard
        label="평균 속도"
        value={totalReps > 0 ? `${(duration / totalReps).toFixed(1)}초` : '-'}
        subValue="회당"
        icon="flash-outline"
        color="yellow"
      />
    </div>
  );
}

// 통계 카드 컴포넌트
function StatCard({
  label,
  value,
  subValue,
  icon,
  color,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: IconName;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/20 border-blue-500/30',
    green: 'bg-green-500/20 border-green-500/30',
    purple: 'bg-purple-500/20 border-purple-500/30',
    yellow: 'bg-yellow-500/20 border-yellow-500/30',
  };

  const iconColors = {
    blue: '#3B82F6',
    green: '#22C55E',
    purple: '#A855F7',
    yellow: '#EAB308',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 rounded-xl border ${colorClasses[color]}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon name={icon} size={20} color={iconColors[color]} />
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subValue && <div className="text-sm text-slate-400">{subValue}</div>}
    </motion.div>
  );
}

// 상세 결과 컴포넌트
function ResultDetails({
  reps,
}: {
  reps: Array<{
    repNumber?: number;
    rep_number?: number;
    accuracy: number;
    maxAngle?: number;
    max_angle?: number;
    minAngle?: number;
    min_angle?: number;
  }>;
}) {
  if (reps.length === 0) {
    return (
      <div className="text-center text-slate-400 py-8 mb-24">
        상세 기록이 없습니다
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mb-24 space-y-3">
      {reps.map((rep, index) => {
        const repNum = rep.repNumber || rep.rep_number || index + 1;
        const maxAngle = rep.maxAngle || rep.max_angle;
        const minAngle = rep.minAngle || rep.min_angle;

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700"
          >
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold">
              {repNum}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">정확도</span>
                <span
                  className={`font-bold ${
                    rep.accuracy >= 80
                      ? 'text-green-400'
                      : rep.accuracy >= 60
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  }`}
                >
                  {Math.round(rep.accuracy)}%
                </span>
              </div>
              {(maxAngle !== undefined || minAngle !== undefined) && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-slate-500">각도 범위</span>
                  <span className="text-slate-400">
                    {minAngle?.toFixed(0)}° - {maxAngle?.toFixed(0)}°
                  </span>
                </div>
              )}
            </div>
            <AccuracyBar accuracy={rep.accuracy} />
          </motion.div>
        );
      })}
    </div>
  );
}

// 정확도 바 컴포넌트
function AccuracyBar({ accuracy }: { accuracy: number }) {
  const color =
    accuracy >= 80 ? 'bg-green-500' : accuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${accuracy}%` }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={`h-full ${color}`}
      />
    </div>
  );
}

// 탭 버튼 컴포넌트
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-full font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-slate-800 text-slate-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// 로딩 상태
function ResultLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">결과를 불러오는 중...</p>
      </div>
    </div>
  );
}

// 에러 상태
function ResultError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="sad-outline" size={48} color="#9CA3AF" />
        </div>
        <h2 className="text-xl font-bold mb-2">결과를 불러올 수 없습니다</h2>
        <p className="text-slate-400 mb-6">데이터를 가져오는데 문제가 발생했습니다</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition-colors"
          >
            다시 시도
          </button>
        )}
      </div>
    </div>
  );
}

// 유틸리티 함수들
function getGrade(accuracy: number): {
  letter: string;
  bgColor: string;
  textColor: string;
} {
  if (accuracy >= 90) {
    return { letter: 'S', bgColor: 'bg-gradient-to-br from-yellow-400 to-orange-500', textColor: 'text-white' };
  } else if (accuracy >= 80) {
    return { letter: 'A', bgColor: 'bg-gradient-to-br from-green-400 to-green-600', textColor: 'text-white' };
  } else if (accuracy >= 70) {
    return { letter: 'B', bgColor: 'bg-gradient-to-br from-blue-400 to-blue-600', textColor: 'text-white' };
  } else if (accuracy >= 60) {
    return { letter: 'C', bgColor: 'bg-gradient-to-br from-yellow-500 to-yellow-700', textColor: 'text-white' };
  } else {
    return { letter: 'D', bgColor: 'bg-gradient-to-br from-red-400 to-red-600', textColor: 'text-white' };
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}분 ${secs}초`;
  }
  return `${secs}초`;
}

function getExerciseName(type: string): string {
  const names: Record<string, string> = {
    shoulder_flexion: '어깨 굴곡',
    shoulder_abduction: '어깨 외전',
    elbow_flexion: '팔꿈치 굴곡',
    knee_flexion: '무릎 굴곡',
    hip_flexion: '고관절 굴곡',
    hip_abduction: '고관절 외전',
    squat: '스쿼트',
    lunge: '런지',
  };
  return names[type] || type;
}

// 공유 모달 컴포넌트
function ShareModal({
  onClose,
  onShare,
  status,
}: {
  onClose: () => void;
  onShare: (platform: ShareOptions['platform']) => void;
  status: 'idle' | 'sharing' | 'success' | 'error';
}) {
  const shareOptions: Array<{ platform: ShareOptions['platform']; icon: IconName; label: string }> = [
    { platform: 'native', icon: 'share-social-outline', label: '공유하기' },
    { platform: 'twitter', icon: 'logo-twitter', label: 'X (Twitter)' },
    { platform: 'facebook', icon: 'logo-facebook', label: 'Facebook' },
    { platform: 'kakao', icon: 'chatbubble-outline', label: '카카오톡' },
    { platform: 'clipboard', icon: 'clipboard-outline', label: '복사하기' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full max-w-md bg-slate-800 rounded-t-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">결과 공유하기</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-700 transition-colors"
          >
            <Icon name="close" size={24} color="#FFFFFF" />
          </button>
        </div>

        {/* 상태 표시 */}
        {status === 'sharing' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">공유 중...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="checkmark-circle" size={40} color="#22C55E" />
            </div>
            <p className="text-green-400 font-medium">공유 완료!</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="sad-outline" size={40} color="#EF4444" />
            </div>
            <p className="text-red-400 font-medium">공유에 실패했습니다</p>
          </div>
        )}

        {status === 'idle' && (
          <div className="grid grid-cols-5 gap-4">
            {shareOptions.map((option) => (
              <button
                key={option.platform}
                onClick={() => onShare(option.platform)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-700 transition-colors"
              >
                <Icon name={option.icon} size={28} color="#9CA3AF" />
                <span className="text-xs text-slate-400">{option.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* 하단 여백 */}
        <div className="h-4" />
      </motion.div>
    </motion.div>
  );
}

export default ExerciseResult;
