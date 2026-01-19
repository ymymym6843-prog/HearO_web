/**
 * 운동 완료 화면 컴포넌트
 */

'use client';

import { NPCResultBanner } from '@/components/story/NPCDialogue';
import type { WorldviewType } from '@/types/vrm';

interface ExerciseCompleteScreenProps {
  currentRep: number;
  targetReps: number;
  accuracy: number;
  performanceRating: 'perfect' | 'good' | 'normal';
  completionStory: string;
  currentWorldview: WorldviewType;
  themeColor: string;
  onEnd: () => void;
  onRetry: () => void;
}

export function ExerciseCompleteScreen({
  currentRep,
  targetReps,
  accuracy,
  performanceRating,
  completionStory,
  currentWorldview,
  themeColor,
  onEnd,
  onRetry,
}: ExerciseCompleteScreenProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
      <div className="text-center max-w-md mx-4">
        <h2 className="text-4xl font-bold text-white mb-4">운동 완료!</h2>

        <div className="mb-6">
          <div
            className="inline-block px-6 py-2 rounded-full text-lg font-bold text-white"
            style={{
              backgroundColor:
                performanceRating === 'perfect'
                  ? '#10B981'
                  : performanceRating === 'good'
                  ? '#3B82F6'
                  : '#F59E0B',
            }}
          >
            {performanceRating === 'perfect'
              ? '완벽!'
              : performanceRating === 'good'
              ? '좋아요!'
              : '다음엔 더 잘할 수 있어요!'}
          </div>
        </div>

        {/* 결과 요약 */}
        <div className="bg-white/10 rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 text-white">
            <div>
              <p className="text-white/60 text-sm">완료 횟수</p>
              <p className="text-2xl font-bold">{currentRep}/{targetReps}</p>
            </div>
            <div>
              <p className="text-white/60 text-sm">정확도</p>
              <p className="text-2xl font-bold">{Math.round(accuracy)}%</p>
            </div>
          </div>
        </div>

        {/* 스토리 텍스트 */}
        {completionStory && (
          <div className="bg-white/10 rounded-2xl p-5 mb-6 text-left">
            <p className="text-white/90 text-sm leading-relaxed italic">
              &quot;{completionStory}&quot;
            </p>
          </div>
        )}

        {/* NPC 결과 배너 */}
        <div className="mb-6">
          <NPCResultBanner
            worldview={currentWorldview}
            performanceRating={performanceRating}
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={onEnd}
            className="px-6 py-3 rounded-full bg-white/20 text-white font-bold hover:bg-white/30"
          >
            목록으로
          </button>
          <button
            onClick={onRetry}
            className="px-6 py-3 rounded-full text-white font-bold"
            style={{ backgroundColor: themeColor }}
          >
            다시 하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExerciseCompleteScreen;
