/**
 * 인라인 세션 복구 모달
 * exercise/[id] 페이지에서 사용하는 간단한 복구 모달
 */

'use client';

import { sessionRecoveryService } from '@/services/sessionRecoveryService';
import type { SavedSessionState } from '@/services/sessionRecoveryService';
import { Icon } from '@/components/ui/Icon';

interface InlineSessionRecoveryModalProps {
  exerciseName: string;
  onRecover: (sessionState: SavedSessionState) => void;
  onDiscard: () => void;
}

export function InlineSessionRecoveryModal({
  exerciseName,
  onRecover,
  onDiscard,
}: InlineSessionRecoveryModalProps) {
  const recoverable = sessionRecoveryService.checkRecoverableSession();

  if (!recoverable) return null;

  const progress = Math.round(
    (recoverable.sessionState.currentRep / recoverable.sessionState.targetReps) * 100
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* 헤더 */}
        <div className="p-6 bg-gradient-to-br from-hearo-primary/20 to-blue-600/20 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-hearo-primary/20 flex items-center justify-center">
              <Icon name="refresh-outline" size={28} color="#00D9FF" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">이전 운동 발견</h2>
              <p className="text-sm text-gray-400">
                중단된 세션을 이어서 할 수 있습니다
              </p>
            </div>
          </div>
        </div>

        {/* 세션 정보 */}
        <div className="p-6">
          <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-400">운동</span>
              <span className="font-semibold text-white">{exerciseName}</span>
            </div>

            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-400">진행률</span>
              <span className="font-semibold text-hearo-primary">
                {recoverable.sessionState.currentRep} / {recoverable.sessionState.targetReps} ({progress}%)
              </span>
            </div>

            {/* 진행 바 */}
            <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-hearo-primary to-blue-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="space-y-3">
            <button
              onClick={() => onRecover(recoverable.sessionState)}
              className="w-full py-4 px-6 rounded-xl bg-hearo-primary hover:bg-hearo-primary/90
                transition-colors font-semibold text-white flex items-center justify-center gap-2"
            >
              <span>이어서 하기</span>
            </button>

            <button
              onClick={onDiscard}
              className="w-full py-4 px-6 rounded-xl bg-slate-700 hover:bg-slate-600
                transition-colors font-medium text-white"
            >
              새로 시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InlineSessionRecoveryModal;
