'use client';

/**
 * T-pose 캘리브레이션 오버레이
 * 운동 시작 전 5초간 T-pose를 유지하여 기준점 설정
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useCharacterStore } from '@/stores/useCharacterStore';
import { Icon } from '@/components/ui/Icon';
import type { Landmark } from '@/types/pose';

interface CalibrationOverlayProps {
  themeColor?: string;
  duration?: number; // 캘리브레이션 시간 (초)
  onComplete?: () => void;
  currentLandmarks: Landmark[] | null;
}

// 디버그 로깅 카운터
let tposeDebugCount = 0;
const MAX_TPOSE_DEBUG = 10;

// T-pose 감지 함수 (양팔을 옆으로 펼친 자세)
function detectTPose(landmarks: Landmark[]): boolean {
  if (!landmarks || landmarks.length < 33) {
    if (tposeDebugCount < MAX_TPOSE_DEBUG) {
      console.log('[TPose] No landmarks or length < 33:', landmarks?.length);
      tposeDebugCount++;
    }
    return false;
  }

  // MediaPipe 랜드마크 인덱스
  // 11: 왼쪽 어깨, 12: 오른쪽 어깨
  // 13: 왼쪽 팔꿈치, 14: 오른쪽 팔꿈치
  // 15: 왼쪽 손목, 16: 오른쪽 손목
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];

  // visibility 체크 (더 관대하게)
  const minVisibility = 0.3;
  if (
    leftShoulder.visibility < minVisibility ||
    rightShoulder.visibility < minVisibility ||
    leftElbow.visibility < minVisibility ||
    rightElbow.visibility < minVisibility ||
    leftWrist.visibility < minVisibility ||
    rightWrist.visibility < minVisibility
  ) {
    if (tposeDebugCount < MAX_TPOSE_DEBUG) {
      console.log('[TPose] Low visibility:', {
        leftShoulder: leftShoulder.visibility.toFixed(2),
        rightShoulder: rightShoulder.visibility.toFixed(2),
        leftElbow: leftElbow.visibility.toFixed(2),
        rightElbow: rightElbow.visibility.toFixed(2),
        leftWrist: leftWrist.visibility.toFixed(2),
        rightWrist: rightWrist.visibility.toFixed(2),
      });
      tposeDebugCount++;
    }
    return false;
  }

  // T-pose 조건 (매우 관대하게 설정):
  // 1. 손목이 어깨보다 옆으로 펼쳐져 있음
  // 2. 팔이 대략적으로 수평 (손목이 어깨보다 너무 아래가 아님)

  const shoulderLevel = (leftShoulder.y + rightShoulder.y) / 2;
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);

  // 매우 관대한 허용치
  const yTolerance = 0.35; // 35% 허용 (매우 관대)
  const minArmExtension = 0.08; // 절대값: 손목이 어깨에서 8% 이상 떨어져 있으면 OK

  // 실제 값 계산
  const leftElbowYDiff = Math.abs(leftElbow.y - shoulderLevel);
  const leftWristYDiff = Math.abs(leftWrist.y - shoulderLevel);
  const rightElbowYDiff = Math.abs(rightElbow.y - shoulderLevel);
  const rightWristYDiff = Math.abs(rightWrist.y - shoulderLevel);
  const leftArmExtensionVal = Math.abs(leftWrist.x - leftShoulder.x);
  const rightArmExtensionVal = Math.abs(rightWrist.x - rightShoulder.x);

  // 디버그: 실제 값 출력
  if (tposeDebugCount < MAX_TPOSE_DEBUG) {
    console.log('[TPose] Values:', {
      shoulderLevel: shoulderLevel.toFixed(3),
      shoulderWidth: shoulderWidth.toFixed(3),
      yTolerance,
      minArmExtension,
      leftElbowYDiff: leftElbowYDiff.toFixed(3),
      leftWristYDiff: leftWristYDiff.toFixed(3),
      rightElbowYDiff: rightElbowYDiff.toFixed(3),
      rightWristYDiff: rightWristYDiff.toFixed(3),
      leftArmExtensionVal: leftArmExtensionVal.toFixed(3),
      rightArmExtensionVal: rightArmExtensionVal.toFixed(3),
    });
  }

  // 간단한 체크: 손목이 어깨보다 옆으로 펼쳐져 있고, 너무 아래로 내려가지 않았는지
  const leftArmOK = leftArmExtensionVal > minArmExtension && leftWristYDiff < yTolerance;
  const rightArmOK = rightArmExtensionVal > minArmExtension && rightWristYDiff < yTolerance;

  if (tposeDebugCount < MAX_TPOSE_DEBUG) {
    console.log('[TPose] Result:', {
      leftArmOK,
      rightArmOK,
      result: leftArmOK && rightArmOK,
    });
    tposeDebugCount++;
  }

  return leftArmOK && rightArmOK;
}

export function CalibrationOverlay({
  themeColor = '#8B5CF6',
  duration = 5,
  onComplete,
  currentLandmarks,
}: CalibrationOverlayProps) {
  const {
    calibrationProgress,
    startCalibration,
    updateCalibrationProgress,
    completeCalibration,
  } = useCharacterStore();

  const [tPoseDetected, setTPoseDetected] = useState(false);
  const [calibrationStarted, setCalibrationStarted] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);

  // refs for interval handling
  const landmarksRef = useRef<Landmark[] | null>(null);
  const progressRef = useRef(0);
  const samplesRef = useRef<Landmark[][]>([]);

  // Update landmarks ref when prop changes
  useEffect(() => {
    landmarksRef.current = currentLandmarks;
  }, [currentLandmarks]);

  // 캘리브레이션 시작
  const handleStartCalibration = useCallback(() => {
    startCalibration();
    setCalibrationStarted(true);
    setLocalProgress(0);
    progressRef.current = 0;
    samplesRef.current = [];
  }, [startCalibration]);

  // Calibration timer using setInterval
  useEffect(() => {
    if (!calibrationStarted) return;

    console.log('[Calibration] Timer started, duration:', duration);

    const intervalMs = 100; // 100ms intervals
    const incrementPerTick = (100 / duration) * (intervalMs / 1000);
    let tickCount = 0;

    const interval = setInterval(() => {
      tickCount++;
      const landmarks = landmarksRef.current;

      // 처음 몇 번만 로깅
      if (tickCount <= 5) {
        console.log('[Calibration] Tick', tickCount, 'landmarks:', landmarks ? landmarks.length : 'null');
      }

      const isTPose = landmarks ? detectTPose(landmarks) : false;

      setTPoseDetected(isTPose);

      if (isTPose) {
        // T-pose 유지 시 진행률 증가
        progressRef.current = Math.min(progressRef.current + incrementPerTick, 100);

        // 랜드마크 샘플 수집
        if (landmarks && progressRef.current < 100) {
          samplesRef.current.push([...landmarks]);
        }
      } else {
        // T-pose가 깨지면 진행률 감소
        progressRef.current = Math.max(progressRef.current - incrementPerTick * 0.5, 0);
      }

      setLocalProgress(progressRef.current);
      updateCalibrationProgress(progressRef.current);

      // 완료 체크
      if (progressRef.current >= 100 && samplesRef.current.length > 0) {
        clearInterval(interval);

        // 평균 랜드마크 계산
        const samples = samplesRef.current;
        const numLandmarks = samples[0].length;
        const avgLandmarks: Landmark[] = [];

        for (let i = 0; i < numLandmarks; i++) {
          let sumX = 0, sumY = 0, sumZ = 0, sumVis = 0;
          for (const sample of samples) {
            sumX += sample[i].x;
            sumY += sample[i].y;
            sumZ += sample[i].z;
            sumVis += sample[i].visibility;
          }
          avgLandmarks.push({
            x: sumX / samples.length,
            y: sumY / samples.length,
            z: sumZ / samples.length,
            visibility: sumVis / samples.length,
          });
        }

        completeCalibration(avgLandmarks);
        onComplete?.();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [calibrationStarted, duration, updateCalibrationProgress, completeCalibration, onComplete]);

  if (!calibrationStarted) {
    // 캘리브레이션 시작 안내
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
        <div className="text-center max-w-md px-6">
          {/* T-pose 가이드 이미지 */}
          <div className="mb-6 relative">
            <div className="w-48 h-48 mx-auto rounded-full flex items-center justify-center"
                 style={{ backgroundColor: `${themeColor}20` }}>
              {/* T-pose 실루엣 */}
              <svg viewBox="0 0 100 100" className="w-32 h-32" fill={themeColor}>
                {/* 머리 */}
                <circle cx="50" cy="15" r="10" />
                {/* 몸통 */}
                <rect x="45" y="25" width="10" height="35" rx="2" />
                {/* 왼팔 */}
                <rect x="10" y="28" width="35" height="8" rx="2" />
                {/* 오른팔 */}
                <rect x="55" y="28" width="35" height="8" rx="2" />
                {/* 왼다리 */}
                <rect x="40" y="60" width="8" height="30" rx="2" />
                {/* 오른다리 */}
                <rect x="52" y="60" width="8" height="30" rx="2" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            T-pose 캘리브레이션
          </h2>
          <p className="text-white/70 mb-6">
            양팔을 옆으로 펼친 T-pose 자세를 취해주세요.
            <br />
            {duration}초간 자세를 유지하면 캘리브레이션이 완료됩니다.
          </p>

          <button
            onClick={handleStartCalibration}
            className="px-8 py-4 rounded-2xl font-bold text-white text-lg transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: themeColor }}
          >
            준비 완료
          </button>
        </div>
      </div>
    );
  }

  // 캘리브레이션 진행 중
  const remainingTime = Math.ceil(duration * (1 - localProgress / 100));

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
      <div className="text-center max-w-md px-6">
        {/* 진행률 원형 표시 */}
        <div className="relative w-48 h-48 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* 배경 원 */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="8"
            />
            {/* 진행률 원 */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={tPoseDetected ? themeColor : '#EF4444'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${localProgress * 2.83} 283`}
              className="transition-all duration-200"
            />
          </svg>

          {/* 중앙 텍스트 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-white">
              {remainingTime}
            </span>
            <span className="text-white/60 text-sm">초</span>
          </div>
        </div>

        {/* 상태 메시지 */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {tPoseDetected ? (
            <>
              <Icon name="checkmark-circle" size={24} color="#10B981" />
              <span className="text-green-400 font-medium">
                T-pose 인식됨 - 유지하세요!
              </span>
            </>
          ) : (
            <>
              <Icon name="alert-circle" size={24} color="#F59E0B" />
              <span className="text-amber-400 font-medium">
                양팔을 옆으로 펼쳐주세요
              </span>
            </>
          )}
        </div>

        {/* 진행률 바 */}
        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-200 rounded-full"
            style={{
              width: `${localProgress}%`,
              backgroundColor: tPoseDetected ? themeColor : '#EF4444',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default CalibrationOverlay;
