/**
 * 운동 결과 페이지
 * /exercise/result?session=... 형태로 접근
 */

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { ExerciseResult } from '@/components/exercise/ExerciseResult';

function ExerciseResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get('session');

  // 세션 ID가 없으면 임시 데모 데이터 표시
  const demoData = !sessionId ? {
    exerciseType: 'shoulder_flexion',
    totalReps: 10,
    targetReps: 12,
    averageAccuracy: 85,
    durationSeconds: 120,
    repDetails: Array.from({ length: 10 }, (_, i) => ({
      repNumber: i + 1,
      accuracy: 70 + Math.random() * 25,
      maxAngle: 140 + Math.random() * 20,
      minAngle: 20 + Math.random() * 10,
    })),
  } : undefined;

  return (
    <ExerciseResult
      sessionId={sessionId || undefined}
      sessionData={demoData}
      onRetry={() => router.push('/exercise')}
      onGoHome={() => router.push('/')}
    />
  );
}

export default function ExerciseResultPage() {
  return (
    <Suspense fallback={<ResultLoadingFallback />}>
      <ExerciseResultContent />
    </Suspense>
  );
}

function ResultLoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">로딩 중...</p>
      </div>
    </div>
  );
}
