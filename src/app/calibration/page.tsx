/**
 * 나만의 운동 범위 페이지
 * 동작별 가동 범위 측정 관리
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/useAuthStore';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useToast } from '@/components/common/Toast';
import {
  calibrationService,
  DEFAULT_ROM_RANGES,
  type StoredCalibration,
} from '@/services/calibrationService';
import type { CalibrationJoint } from '@/components/calibration/CalibrationGuide';

// 관절 정보 - 사용자 친화적 용어
const JOINT_INFO: Record<CalibrationJoint, {
  name: string;
  description: string;
}> = {
  shoulder_flexion: {
    name: '팔 앞으로 들기',
    description: '어깨 앞쪽 움직임을 측정해요',
  },
  shoulder_abduction: {
    name: '팔 옆으로 들기',
    description: '어깨 옆쪽 움직임을 측정해요',
  },
  elbow_flexion: {
    name: '팔 구부리기',
    description: '팔꿈치 움직임을 측정해요',
  },
  knee_flexion: {
    name: '무릎 구부리기',
    description: '무릎 움직임을 측정해요',
  },
  hip_flexion: {
    name: '다리 앞으로 들기',
    description: '엉덩이 앞쪽 움직임을 측정해요',
  },
  hip_abduction: {
    name: '다리 옆으로 들기',
    description: '엉덩이 옆쪽 움직임을 측정해요',
  },
};

const ALL_JOINTS: CalibrationJoint[] = [
  'shoulder_flexion',
  'shoulder_abduction',
  'elbow_flexion',
  'knee_flexion',
  'hip_flexion',
  'hip_abduction',
];

export default function CalibrationPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const [calibrations, setCalibrations] = useState<StoredCalibration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJoint, setSelectedJoint] = useState<CalibrationJoint | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CalibrationJoint | null>(null);

  // 데이터 로드
  const loadCalibrations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await calibrationService.getAllCalibrations(user?.id);
      setCalibrations(data);
    } catch (error) {
      console.error('Failed to load calibrations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCalibrations();
  }, [loadCalibrations]);

  // 보정 삭제 확인
  const handleDeleteCalibration = (joint: CalibrationJoint) => {
    setDeleteTarget(joint);
  };

  // 측정 삭제 실행
  const confirmDeleteCalibration = async () => {
    if (!deleteTarget) return;

    const { success } = await calibrationService.deleteCalibration(deleteTarget, user?.id);
    if (success) {
      showToast('success', '측정 데이터가 삭제되었습니다.');
      await loadCalibrations();
    } else {
      showToast('error', '삭제에 실패했습니다.');
    }
    setDeleteTarget(null);
  };

  // 모든 측정 초기화
  const handleResetAll = async () => {
    const { success } = await calibrationService.resetAllCalibrations(user?.id);
    if (success) {
      showToast('success', '모든 측정 데이터가 초기화되었습니다.');
      await loadCalibrations();
    } else {
      showToast('error', '초기화에 실패했습니다.');
    }
    setShowResetConfirm(false);
  };

  // 측정 시작 (운동 페이지로 이동)
  const startCalibration = (joint: CalibrationJoint) => {
    router.push(`/calibration/${joint}`);
  };

  // 측정된 동작 확인
  const getCalibration = (joint: CalibrationJoint) => {
    return calibrations.find((c) => c.joint === joint);
  };

  // 보정률 계산
  const calibratedCount = calibrations.length;
  const totalCount = ALL_JOINTS.length;
  const calibrationPercentage = Math.round((calibratedCount / totalCount) * 100);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-hearo-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-hearo-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">보정 데이터 로딩 중...</p>
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
          <h1 className="text-xl font-bold text-white">나만의 운동 범위</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 소개 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-gradient-to-r from-hearo-primary/20 to-blue-600/20 rounded-xl p-5 border border-hearo-primary/30">
            <h2 className="font-semibold text-white mb-2">나에게 딱 맞는 운동 설정</h2>
            <p className="text-sm text-gray-400">
              내 몸에 맞는 움직임 범위를 측정하면 더 정확한 운동 피드백을 받을 수 있어요.
              측정하지 않은 동작은 기본값을 사용해요.
            </p>
          </div>
        </motion.section>

        {/* 보정 현황 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-slate-800/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400">측정 현황</span>
              <span className="font-bold text-white">{calibratedCount}/{totalCount} 완료</span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${calibrationPercentage}%` }}
                className="h-full bg-gradient-to-r from-hearo-primary to-blue-500 rounded-full"
              />
            </div>
            {calibratedCount === totalCount && (
              <p className="text-sm text-green-400 mt-2">모든 동작 측정이 완료되었어요!</p>
            )}
          </div>
        </motion.section>

        {/* 관절별 보정 목록 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">동작별 설정</h2>
          <div className="space-y-3">
            {ALL_JOINTS.map((joint, index) => {
              const info = JOINT_INFO[joint];
              const calibration = getCalibration(joint);
              const defaultRange = DEFAULT_ROM_RANGES[joint];

              return (
                <motion.div
                  key={joint}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className={`bg-slate-800/50 rounded-xl p-4 border ${
                    calibration ? 'border-green-500/30' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
                      <Icon name="body-outline" size={28} color="#9CA3AF" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{info.name}</h3>
                        {calibration && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            측정됨
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{info.description}</p>

                      {/* ROM 정보 */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-slate-700/50 rounded-lg p-2">
                          <span className="text-gray-500">시작</span>
                          <span className="text-white ml-2">
                            {calibration ? `${calibration.startAngle}°` : `${defaultRange.start}° (기본)`}
                          </span>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-2">
                          <span className="text-gray-500">목표</span>
                          <span className="text-white ml-2">
                            {calibration ? `${calibration.targetAngle}°` : `${defaultRange.target}° (기본)`}
                          </span>
                        </div>
                      </div>

                      {calibration && (
                        <p className="text-xs text-gray-500 mt-2">
                          마지막 측정: {new Date(calibration.updatedAt).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => startCalibration(joint)}
                        className="px-4 py-2 bg-hearo-primary/20 hover:bg-hearo-primary/30 text-hearo-primary text-sm font-medium rounded-lg transition-colors"
                      >
                        {calibration ? '다시 측정' : '측정하기'}
                      </button>
                      {calibration && (
                        <button
                          onClick={() => handleDeleteCalibration(joint)}
                          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded-lg transition-colors"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* 전체 초기화 */}
        {calibrations.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
            >
              모든 측정 데이터 초기화
            </button>
          </motion.section>
        )}

        {/* 안내 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <h3 className="font-semibold text-yellow-400 mb-2">측정 전 확인해주세요</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• 통증이 없는 범위 내에서만 움직여주세요</li>
              <li>• 카메라가 전신을 볼 수 있도록 위치를 조정해주세요</li>
              <li>• 밝은 조명 아래에서 진행하면 더 정확해요</li>
              <li>• 몸에 맞는 옷을 입으면 인식이 더 잘 돼요</li>
            </ul>
          </div>
        </motion.section>

        {/* 하단 여백 */}
        <div className="h-8" />
      </main>

      {/* 초기화 확인 모달 */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="측정 데이터 초기화"
        message="모든 측정 데이터가 삭제됩니다.\n이 작업은 되돌릴 수 없습니다."
        confirmText="초기화"
        cancelText="취소"
        variant="danger"
        onConfirm={handleResetAll}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="측정 데이터 삭제"
        message={`${deleteTarget ? JOINT_INFO[deleteTarget].name : ''} 측정 데이터를 삭제하시겠습니까?`}
        confirmText="삭제"
        cancelText="취소"
        variant="warning"
        onConfirm={confirmDeleteCalibration}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
