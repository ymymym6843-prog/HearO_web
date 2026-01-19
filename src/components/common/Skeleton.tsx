'use client';

/**
 * 스켈레톤 UI 컴포넌트
 * 로딩 상태에서 콘텐츠 플레이스홀더 표시
 */

import { memo } from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  animate?: boolean;
}

const roundedClasses = {
  none: '',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

// 기본 스켈레톤
export const Skeleton = memo(function Skeleton({
  className = '',
  width,
  height,
  rounded = 'md',
  animate = true,
}: SkeletonProps) {
  return (
    <div
      className={`
        bg-slate-700/50
        ${roundedClasses[rounded]}
        ${animate ? 'animate-pulse' : ''}
        ${className}
      `}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      aria-hidden="true"
    />
  );
});

// 업적 카드 스켈레톤
export const AchievementCardSkeleton = memo(function AchievementCardSkeleton() {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-4">
        {/* 아이콘 */}
        <div className="w-14 h-14 bg-slate-700/50 rounded-xl" />

        {/* 정보 */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-32 bg-slate-700/50 rounded" />
            <div className="h-5 w-12 bg-slate-700/50 rounded-full" />
          </div>
          <div className="h-4 w-full bg-slate-700/50 rounded" />
          <div className="h-4 w-3/4 bg-slate-700/50 rounded" />
        </div>
      </div>
    </div>
  );
});

// 운동 카드 스켈레톤
export const ExerciseCardSkeleton = memo(function ExerciseCardSkeleton() {
  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 animate-pulse">
      <div className="flex items-center gap-4">
        {/* 아이콘 */}
        <div className="w-16 h-16 bg-slate-700/50 rounded-xl" />

        {/* 정보 */}
        <div className="flex-1 space-y-2">
          <div className="h-5 w-40 bg-slate-700/50 rounded" />
          <div className="h-4 w-24 bg-slate-700/50 rounded" />
        </div>

        {/* 화살표 */}
        <div className="w-6 h-6 bg-slate-700/50 rounded-full" />
      </div>
    </div>
  );
});

// 통계 카드 스켈레톤
export const StatCardSkeleton = memo(function StatCardSkeleton() {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 bg-slate-700/50 rounded" />
        <div className="h-4 w-16 bg-slate-700/50 rounded" />
      </div>
      <div className="h-8 w-24 bg-slate-700/50 rounded" />
    </div>
  );
});

// 히스토리 세션 스켈레톤
export const SessionCardSkeleton = memo(function SessionCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl animate-pulse">
      {/* 날짜 */}
      <div className="text-center min-w-[60px] space-y-1">
        <div className="h-4 w-12 bg-slate-700/50 rounded mx-auto" />
        <div className="h-3 w-10 bg-slate-700/50 rounded mx-auto" />
      </div>

      {/* 정보 */}
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-slate-700/50 rounded" />
        <div className="h-3 w-20 bg-slate-700/50 rounded" />
      </div>

      {/* 정확도 */}
      <div className="text-right space-y-1">
        <div className="h-6 w-12 bg-slate-700/50 rounded" />
        <div className="h-3 w-10 bg-slate-700/50 rounded" />
      </div>
    </div>
  );
});

// 업적 페이지 스켈레톤
export const AchievementsPageSkeleton = memo(function AchievementsPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-20 bg-slate-700/50 rounded-full" />
        ))}
      </div>

      {/* 업적 카드 목록 */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <AchievementCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
});

// 운동 목록 스켈레톤
export const ExerciseListSkeleton = memo(function ExerciseListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <ExerciseCardSkeleton key={i} />
      ))}
    </div>
  );
});

export default Skeleton;
