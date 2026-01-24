/**
 * 세션 복구 모달
 * 중단된 운동 세션 복구 옵션 제공
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  sessionRecoveryService,
  type RecoverableSession,
} from '@/services/sessionRecoveryService';
import { Icon } from '@/components/ui/Icon';
import { getExerciseName } from '@/constants/exercises';

interface SessionRecoveryModalProps {
  onRecover: (session: RecoverableSession) => void;
  onDiscard: () => void;
  onDismiss: () => void;
}

// 클라이언트에서만 실행되는 초기 세션 체크
function getInitialSession(): { session: RecoverableSession | null; isVisible: boolean } {
  if (typeof window === 'undefined') {
    return { session: null, isVisible: false };
  }
  const recoverable = sessionRecoveryService.checkRecoverableSession();
  if (recoverable && recoverable.canRecover) {
    return { session: recoverable, isVisible: true };
  }
  return { session: null, isVisible: false };
}

export function SessionRecoveryModal({
  onRecover,
  onDiscard,
  onDismiss,
}: SessionRecoveryModalProps) {
  // Lazy initialization으로 cascading render 방지
  const [initialState] = useState(getInitialSession);
  const session = initialState.session;
  const [isVisible, setIsVisible] = useState(initialState.isVisible);

  const handleRecover = () => {
    if (session) {
      onRecover(session);
      setIsVisible(false);
    }
  };

  const handleDiscard = () => {
    sessionRecoveryService.clearSessionState();
    onDiscard();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    onDismiss();
    setIsVisible(false);
  };

  if (!session) return null;

  const { sessionState, timeSinceLastUpdate } = session;
  const progress = Math.round((sessionState.currentRep / sessionState.targetReps) * 100);
  const exerciseName = getExerciseName(sessionState.exerciseType);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md bg-slate-800 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="p-6 bg-gradient-to-br from-hearo-primary/20 to-blue-600/20 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-hearo-primary/20 flex items-center justify-center">
                  <Icon name="refresh-outline" size={28} color="#00D9FF" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">이전 운동 발견</h2>
                  <p className="text-sm text-gray-400">
                    {timeSinceLastUpdate}분 전 중단됨
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
                    {sessionState.currentRep} / {sessionState.targetReps} ({progress}%)
                  </span>
                </div>

                {/* 진행 바 */}
                <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-hearo-primary to-blue-500"
                  />
                </div>

                <div className="flex justify-between items-center mt-3">
                  <span className="text-gray-400">소요 시간</span>
                  <span className="text-white">
                    {formatDuration(sessionState.elapsedSeconds)}
                  </span>
                </div>

                {sessionState.repData.length > 0 && (
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-gray-400">평균 정확도</span>
                    <span className="text-white">
                      {Math.round(
                        sessionState.repData.reduce((sum, r) => sum + r.accuracy, 0) /
                          sessionState.repData.length
                      )}%
                    </span>
                  </div>
                )}
              </div>

              {/* 액션 버튼 */}
              <div className="space-y-3">
                <button
                  onClick={handleRecover}
                  className="w-full py-4 px-6 rounded-xl bg-hearo-primary hover:bg-hearo-primary/90
                    transition-colors font-semibold text-white flex items-center justify-center gap-2"
                >
                  <span>이어서 하기</span>
                  <span className="text-sm opacity-80">({sessionState.currentRep}회부터)</span>
                </button>

                <button
                  onClick={handleDiscard}
                  className="w-full py-4 px-6 rounded-xl bg-slate-700 hover:bg-slate-600
                    transition-colors font-medium text-white"
                >
                  새로 시작하기
                </button>

                <button
                  onClick={handleDismiss}
                  className="w-full py-3 text-gray-500 hover:text-gray-300 transition-colors text-sm"
                >
                  나중에 결정하기
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 유틸리티 함수
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}분 ${secs}초`;
  }
  return `${secs}초`;
}

export default SessionRecoveryModal;
