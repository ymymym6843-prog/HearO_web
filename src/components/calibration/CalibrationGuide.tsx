/**
 * ROM 보정 가이드 컴포넌트
 * 사용자의 관절 가동 범위를 측정하고 저장
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Landmark } from '@/types/pose';
import { Icon } from '@/components/ui/Icon';

// 보정할 관절 타입
export type CalibrationJoint =
  | 'shoulder_flexion'
  | 'shoulder_abduction'
  | 'elbow_flexion'
  | 'knee_flexion'
  | 'hip_flexion'
  | 'hip_abduction';

// 보정 결과
export interface CalibrationResult {
  joint: CalibrationJoint;
  startAngle: number;
  targetAngle: number;
  maxMeasured: number;
  minMeasured: number;
  timestamp: string;
}

// 보정 단계
type CalibrationStep = 'intro' | 'start_position' | 'end_position' | 'confirm' | 'complete';

// 관절 정보 - 사용자 친화적 용어
const JOINT_INFO: Record<CalibrationJoint, {
  name: string;
  description: string;
  startInstruction: string;
  endInstruction: string;
}> = {
  shoulder_flexion: {
    name: '팔 앞으로 들기',
    description: '어깨 앞쪽 움직임을 측정해요',
    startInstruction: '편하게 팔을 내려주세요',
    endInstruction: '천천히 팔을 앞으로 올려주세요',
  },
  shoulder_abduction: {
    name: '팔 옆으로 들기',
    description: '어깨 옆쪽 움직임을 측정해요',
    startInstruction: '편하게 팔을 내려주세요',
    endInstruction: '천천히 팔을 옆으로 올려주세요',
  },
  elbow_flexion: {
    name: '팔 구부리기',
    description: '팔꿈치 움직임을 측정해요',
    startInstruction: '팔을 쭉 펴주세요',
    endInstruction: '팔꿈치를 천천히 구부려주세요',
  },
  knee_flexion: {
    name: '무릎 구부리기',
    description: '무릎 움직임을 측정해요',
    startInstruction: '다리를 펴고 편하게 서주세요',
    endInstruction: '무릎을 천천히 구부려주세요',
  },
  hip_flexion: {
    name: '다리 앞으로 들기',
    description: '엉덩이 앞쪽 움직임을 측정해요',
    startInstruction: '바르게 서주세요',
    endInstruction: '무릎을 가슴 쪽으로 당겨주세요',
  },
  hip_abduction: {
    name: '다리 옆으로 들기',
    description: '엉덩이 옆쪽 움직임을 측정해요',
    startInstruction: '바르게 서주세요',
    endInstruction: '다리를 옆으로 들어올려주세요',
  },
};

interface CalibrationGuideProps {
  joint: CalibrationJoint;
  currentAngle?: number; // 실시간 각도 (외부에서 전달)
  landmarks?: Landmark[];
  onComplete: (result: CalibrationResult) => void;
  onCancel: () => void;
}

export function CalibrationGuide({
  joint,
  currentAngle = 0,
  onComplete,
  onCancel,
}: CalibrationGuideProps) {
  const [step, setStep] = useState<CalibrationStep>('intro');
  const [startAngle, setStartAngle] = useState<number>(0);
  const [endAngle, setEndAngle] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [measurements, setMeasurements] = useState<number[]>([]);

  const measurementRef = useRef<number[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const jointInfo = JOINT_INFO[joint];

  // 측정 시작
  const startMeasurement = useCallback(() => {
    setIsRecording(true);
    setCountdown(3);
    measurementRef.current = [];

    // 카운트다운
    let count = 3;
    timerRef.current = setInterval(() => {
      count--;
      setCountdown(count);

      if (count <= 0) {
        clearInterval(timerRef.current!);
        // 2초간 측정
        setTimeout(() => {
          stopMeasurement();
        }, 2000);
      }
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 측정 중 각도 수집
  useEffect(() => {
    if (isRecording && countdown <= 0) {
      measurementRef.current.push(currentAngle);
    }
  }, [currentAngle, isRecording, countdown]);

  // 측정 종료
  const stopMeasurement = useCallback(() => {
    setIsRecording(false);
    const measurements = measurementRef.current;

    if (measurements.length > 0) {
      // 중앙값 사용 (이상치 제거)
      const sorted = [...measurements].sort((a, b) => a - b);
      const medianAngle = sorted[Math.floor(sorted.length / 2)];

      if (step === 'start_position') {
        setStartAngle(medianAngle);
        setStep('end_position');
      } else if (step === 'end_position') {
        setEndAngle(medianAngle);
        setMeasurements(measurements);
        setStep('confirm');
      }
    }
  }, [step]);

  // 완료 처리
  const handleComplete = useCallback(() => {
    const result: CalibrationResult = {
      joint,
      startAngle,
      targetAngle: endAngle,
      maxMeasured: Math.max(...measurements, endAngle),
      minMeasured: Math.min(...measurements, startAngle),
      timestamp: new Date().toISOString(),
    };

    onComplete(result);
    setStep('complete');
  }, [joint, startAngle, endAngle, measurements, onComplete]);

  // 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 현재 진행 단계 번호 (게이미피케이션용)
  const stepNumber = step === 'intro' ? 1 : step === 'start_position' ? 2 : step === 'end_position' ? 3 : step === 'confirm' ? 4 : 5;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* 게이미피케이션 헤더 */}
      <header className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: 'rgba(0, 217, 255, 0.2)',
                border: '2px solid #00D9FF',
                boxShadow: '0 0 15px rgba(0, 217, 255, 0.4)',
              }}
            >
              <Icon name="body-outline" size={20} color="#00D9FF" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{jointInfo.name}</h1>
              <p className="text-xs text-gray-400">{jointInfo.description}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Icon name="close" size={24} color="#FFFFFF" />
          </button>
        </div>

        {/* 진행 단계 바 (미션 스타일) */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((num) => {
            const isActive = stepNumber >= num;
            const isCurrent = stepNumber === num;
            const labels = ['INTRO', 'START', 'END', 'SAVE'];
            return (
              <div key={num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${isCurrent ? 'scale-110' : ''}`}
                    style={{
                      backgroundColor: isActive ? '#00D9FF' : 'rgba(255, 255, 255, 0.1)',
                      color: isActive ? '#000000' : 'rgba(255, 255, 255, 0.4)',
                      boxShadow: isCurrent ? '0 0 15px rgba(0, 217, 255, 0.6)' : 'none',
                    }}
                  >
                    {isActive && stepNumber > num ? 'V' : num}
                  </div>
                  <span
                    className="text-[10px] mt-1 uppercase tracking-wider"
                    style={{ color: isActive ? '#00D9FF' : 'rgba(255, 255, 255, 0.4)' }}
                  >
                    {labels[num - 1]}
                  </span>
                </div>
                {num < 4 && (
                  <div
                    className="h-0.5 flex-1 mx-1"
                    style={{ backgroundColor: stepNumber > num ? '#00D9FF' : 'rgba(255, 255, 255, 0.1)' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {/* 소개 단계 (게이미피케이션 스타일) */}
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center max-w-md"
            >
              {/* 미션 아이콘 */}
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{
                  backgroundColor: 'rgba(0, 217, 255, 0.15)',
                  border: '3px solid #00D9FF',
                  boxShadow: '0 0 30px rgba(0, 217, 255, 0.3)',
                }}
              >
                <Icon name="body-outline" size={52} color="#00D9FF" />
              </div>

              {/* 미션 배지 */}
              <div
                className="inline-block px-4 py-1 rounded-full mb-3"
                style={{
                  backgroundColor: 'rgba(0, 217, 255, 0.2)',
                  border: '1px solid #00D9FF',
                }}
              >
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#00D9FF' }}>
                  NEW MISSION
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                {jointInfo.name}
              </h2>
              <p className="text-sm text-gray-400 mb-6">나만의 운동 범위 스캔</p>

              <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                HearO가 나에게 딱 맞는 운동을 추천해드릴게요!
                <br />
                편안한 범위 내에서만 천천히 움직여주세요.
              </p>

              {/* 경고 카드 */}
              <div
                className="rounded-xl p-4 mb-8 flex items-center gap-3"
                style={{
                  backgroundColor: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)' }}
                >
                  <Icon name="warning-outline" size={18} color="#FBBF24" />
                </div>
                <p className="text-yellow-400 text-xs text-left">
                  통증이 느껴지면 즉시 중단하고 전문가와 상담하세요
                </p>
              </div>

              <button
                onClick={() => setStep('start_position')}
                className="w-full py-4 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #00D9FF, #0099CC)',
                  boxShadow: '0 4px 20px rgba(0, 217, 255, 0.4)',
                }}
              >
                측정 시작
              </button>
            </motion.div>
          )}

          {/* 시작 위치 측정 */}
          {step === 'start_position' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center max-w-md"
            >
              <MeasurementUI
                title="시작 자세"
                instruction={jointInfo.startInstruction}
                currentAngle={currentAngle}
                isRecording={isRecording}
                countdown={countdown}
                onStart={startMeasurement}
              />
            </motion.div>
          )}

          {/* 끝 위치 측정 */}
          {step === 'end_position' && (
            <motion.div
              key="end"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center max-w-md"
            >
              <MeasurementUI
                title="최대 자세"
                instruction={jointInfo.endInstruction}
                currentAngle={currentAngle}
                isRecording={isRecording}
                countdown={countdown}
                onStart={startMeasurement}
              />
            </motion.div>
          )}

          {/* 확인 (게이미피케이션 결과 화면) */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center max-w-md"
            >
              {/* 성공 배지 */}
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  border: '3px solid #22C55E',
                  boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)',
                }}
              >
                <Icon name="checkmark-circle-outline" size={56} color="#22C55E" />
              </div>

              <div
                className="inline-block px-4 py-1 rounded-full mb-3"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
              >
                <span className="text-xs font-bold text-green-500 uppercase tracking-wider">SCAN COMPLETE</span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-6">측정 결과</h2>

              {/* 결과 카드 (게이미피케이션 스타일) */}
              <div
                className="rounded-2xl p-6 mb-6"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                }}
              >
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">MIN</p>
                    <p className="text-2xl font-black text-white">{startAngle.toFixed(0)}<span className="text-sm text-gray-400">°</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">MAX</p>
                    <p
                      className="text-2xl font-black"
                      style={{ color: '#00D9FF', textShadow: '0 0 10px rgba(0, 217, 255, 0.5)' }}
                    >
                      {endAngle.toFixed(0)}<span className="text-sm text-gray-400">°</span>
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">RANGE</p>
                    <p className="text-2xl font-black text-green-500">{Math.abs(endAngle - startAngle).toFixed(0)}<span className="text-sm text-gray-400">°</span></p>
                  </div>
                </div>

                {/* ROM 범위 시각화 바 */}
                <div className="mt-6">
                  <div
                    className="h-3 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.abs(endAngle - startAngle) / 1.8)}%`,
                        background: 'linear-gradient(90deg, #00D9FF, #22C55E)',
                        boxShadow: '0 0 15px rgba(0, 217, 255, 0.5)',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('start_position')}
                  className="flex-1 py-4 rounded-xl font-medium text-white transition-all duration-300 hover:bg-white/10"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  다시 하기
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 py-4 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                    boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
                  }}
                >
                  저장하기
                </button>
              </div>
            </motion.div>
          )}

          {/* 완료 (게이미피케이션 성공 화면) */}
          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-36 h-36 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.3)',
                  border: '4px solid #22C55E',
                  boxShadow: '0 0 50px rgba(34, 197, 94, 0.5)',
                }}
              >
                <Icon name="checkmark-circle" size={72} color="#22C55E" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div
                  className="inline-block px-6 py-2 rounded-full mb-4"
                  style={{
                    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                    boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
                  }}
                >
                  <span className="text-sm font-bold text-white uppercase tracking-wider">MISSION COMPLETE</span>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">저장 완료!</h2>
                <p className="text-gray-400">ROM 데이터가 성공적으로 저장되었습니다</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 게이미피케이션 각도 표시 (측정 중일 때) */}
      {(step === 'start_position' || step === 'end_position') && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center">
          <div
            className="px-10 py-5 rounded-2xl backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              border: '2px solid #00D9FF',
              boxShadow: '0 0 30px rgba(0, 217, 255, 0.4)',
            }}
          >
            <p className="text-xs text-gray-400 uppercase tracking-wider text-center mb-2">CURRENT ANGLE</p>
            <div className="flex items-baseline justify-center gap-1">
              <span
                className="text-5xl font-black"
                style={{
                  color: '#00D9FF',
                  textShadow: '0 0 20px rgba(0, 217, 255, 0.6)',
                }}
              >
                {currentAngle.toFixed(1)}
              </span>
              <span className="text-2xl text-gray-400">°</span>
            </div>
            {/* 각도 레벨 바 */}
            <div
              className="mt-3 h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${Math.min(100, (currentAngle / 180) * 100)}%`,
                  background: 'linear-gradient(90deg, #00D9FF, #0099CC)',
                  boxShadow: '0 0 10px rgba(0, 217, 255, 0.6)',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 측정 UI 컴포넌트 (게이미피케이션 스타일)
function MeasurementUI({
  title,
  instruction,
  isRecording,
  countdown,
  onStart,
}: {
  title: string;
  instruction: string;
  currentAngle: number;
  isRecording: boolean;
  countdown: number;
  onStart: () => void;
}) {
  return (
    <>
      {/* 미션 스타일 타이틀 */}
      <div
        className="inline-block px-6 py-2 rounded-full mb-4"
        style={{
          backgroundColor: 'rgba(0, 217, 255, 0.2)',
          border: '1px solid #00D9FF',
        }}
      >
        <span
          className="text-sm font-bold uppercase tracking-wider"
          style={{ color: '#00D9FF' }}
        >
          MISSION
        </span>
      </div>

      <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
      <p className="text-gray-400 mb-8 max-w-xs mx-auto">{instruction}</p>

      {isRecording ? (
        <div className="mb-8">
          {countdown > 0 ? (
            <div
              className="w-36 h-36 rounded-full flex items-center justify-center mx-auto"
              style={{
                backgroundColor: 'rgba(0, 217, 255, 0.2)',
                border: '4px solid #00D9FF',
                boxShadow: '0 0 40px rgba(0, 217, 255, 0.5)',
              }}
            >
              <span
                className="text-7xl font-black"
                style={{
                  color: '#00D9FF',
                  textShadow: '0 0 30px rgba(0, 217, 255, 0.8)',
                }}
              >
                {countdown}
              </span>
            </div>
          ) : (
            <div
              className="w-36 h-36 rounded-full flex items-center justify-center mx-auto animate-pulse"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                border: '4px solid #22C55E',
                boxShadow: '0 0 40px rgba(34, 197, 94, 0.5)',
              }}
            >
              <div className="text-center">
                <div className="flex justify-center mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce mx-0.5" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce mx-0.5" style={{ animationDelay: '100ms' }} />
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce mx-0.5" style={{ animationDelay: '200ms' }} />
                </div>
                <span className="text-lg font-bold text-green-500">SCANNING</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={onStart}
          className="w-full py-4 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #00D9FF, #0099CC)',
            boxShadow: '0 4px 20px rgba(0, 217, 255, 0.4)',
          }}
        >
          START SCAN
        </button>
      )}
    </>
  );
}

export default CalibrationGuide;
