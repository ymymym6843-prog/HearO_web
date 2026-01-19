/**
 * 통증 추적 컴포넌트
 * 재활 운동 전후 통증 레벨 기록
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';

// 통증 레벨 (0-10 NRS 척도)
export type PainLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// 신체 부위
export type BodyPart =
  | 'neck'
  | 'shoulder_left'
  | 'shoulder_right'
  | 'elbow_left'
  | 'elbow_right'
  | 'wrist_left'
  | 'wrist_right'
  | 'back_upper'
  | 'back_lower'
  | 'hip_left'
  | 'hip_right'
  | 'knee_left'
  | 'knee_right'
  | 'ankle_left'
  | 'ankle_right';

// 통증 기록
export interface PainRecord {
  id?: string;
  bodyPart: BodyPart;
  painLevel: PainLevel;
  painType: 'sharp' | 'dull' | 'burning' | 'aching' | 'other';
  timing: 'before' | 'during' | 'after';
  notes?: string;
  timestamp: string;
  sessionId?: string;
}

// 신체 부위 정보
const BODY_PARTS: Record<BodyPart, { label: string; side?: 'left' | 'right' }> = {
  neck: { label: '목' },
  shoulder_left: { label: '왼쪽 어깨', side: 'left' },
  shoulder_right: { label: '오른쪽 어깨', side: 'right' },
  elbow_left: { label: '왼쪽 팔꿈치', side: 'left' },
  elbow_right: { label: '오른쪽 팔꿈치', side: 'right' },
  wrist_left: { label: '왼쪽 손목', side: 'left' },
  wrist_right: { label: '오른쪽 손목', side: 'right' },
  back_upper: { label: '등 상부' },
  back_lower: { label: '허리' },
  hip_left: { label: '왼쪽 고관절', side: 'left' },
  hip_right: { label: '오른쪽 고관절', side: 'right' },
  knee_left: { label: '왼쪽 무릎', side: 'left' },
  knee_right: { label: '오른쪽 무릎', side: 'right' },
  ankle_left: { label: '왼쪽 발목', side: 'left' },
  ankle_right: { label: '오른쪽 발목', side: 'right' },
};

// 통증 유형
const PAIN_TYPES: Array<{ value: 'sharp' | 'dull' | 'burning' | 'aching' | 'other'; label: string; icon: IconName }> = [
  { value: 'sharp', label: '찌르는', icon: 'flash-outline' },
  { value: 'dull', label: '둔한', icon: 'ellipse-outline' },
  { value: 'burning', label: '타는', icon: 'flame-outline' },
  { value: 'aching', label: '쑤시는', icon: 'pulse-outline' },
  { value: 'other', label: '기타', icon: 'help-circle-outline' },
];

interface PainTrackerProps {
  timing: 'before' | 'during' | 'after';
  sessionId?: string;
  onSubmit: (record: PainRecord) => void;
  onSkip?: () => void;
  initialBodyPart?: BodyPart;
}

export function PainTracker({
  timing,
  sessionId,
  onSubmit,
  onSkip,
  initialBodyPart,
}: PainTrackerProps) {
  const [step, setStep] = useState<'body' | 'level' | 'type' | 'notes'>('body');
  const [selectedPart, setSelectedPart] = useState<BodyPart | null>(initialBodyPart || null);
  const [painLevel, setPainLevel] = useState<PainLevel>(0);
  const [painType, setPainType] = useState<typeof PAIN_TYPES[number]['value']>('aching');
  const [notes, setNotes] = useState('');

  const handleBodyPartSelect = useCallback((part: BodyPart) => {
    setSelectedPart(part);
    setStep('level');
  }, []);

  const handleLevelSelect = useCallback((level: PainLevel) => {
    setPainLevel(level);
    if (level === 0) {
      // 통증 없음이면 바로 제출
      handleSubmit(level);
    } else {
      setStep('type');
    }
  }, []);

  const handleSubmit = useCallback((overrideLevel?: PainLevel) => {
    if (!selectedPart) return;

    const record: PainRecord = {
      bodyPart: selectedPart,
      painLevel: overrideLevel ?? painLevel,
      painType,
      timing,
      notes: notes.trim() || undefined,
      timestamp: new Date().toISOString(),
      sessionId,
    };

    onSubmit(record);
  }, [selectedPart, painLevel, painType, timing, notes, sessionId, onSubmit]);

  const timingLabels = {
    before: '운동 전',
    during: '운동 중',
    after: '운동 후',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <p className="text-sm text-hearo-primary mb-2">{timingLabels[timing]} 통증 체크</p>
        <h1 className="text-2xl font-bold">
          {step === 'body' && '어디가 불편하신가요?'}
          {step === 'level' && '통증 정도를 선택해주세요'}
          {step === 'type' && '어떤 종류의 통증인가요?'}
          {step === 'notes' && '추가 정보 (선택)'}
        </h1>
      </div>

      {/* 단계별 UI */}
      <AnimatePresence mode="wait">
        {step === 'body' && (
          <motion.div
            key="body"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <BodyPartSelector
              selectedPart={selectedPart}
              onSelect={handleBodyPartSelect}
            />
          </motion.div>
        )}

        {step === 'level' && (
          <motion.div
            key="level"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <PainLevelSelector
              selectedLevel={painLevel}
              onSelect={handleLevelSelect}
            />
            <button
              onClick={() => setStep('body')}
              className="mt-6 text-gray-400 hover:text-white transition-colors"
            >
              ← 부위 다시 선택
            </button>
          </motion.div>
        )}

        {step === 'type' && (
          <motion.div
            key="type"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <PainTypeSelector
              selectedType={painType}
              onSelect={(type) => {
                setPainType(type);
                setStep('notes');
              }}
            />
            <button
              onClick={() => setStep('level')}
              className="mt-6 text-gray-400 hover:text-white transition-colors"
            >
              ← 통증 정도 다시 선택
            </button>
          </motion.div>
        )}

        {step === 'notes' && (
          <motion.div
            key="notes"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-md mx-auto"
          >
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="추가로 기록하고 싶은 내용이 있나요? (선택사항)"
              className="w-full h-32 p-4 bg-slate-800 rounded-xl border border-slate-700
                focus:border-hearo-primary outline-none resize-none"
            />

            {/* 요약 */}
            <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
              <h3 className="text-sm text-gray-400 mb-2">기록 요약</h3>
              <p className="text-white">
                <span className="font-semibold">{BODY_PARTS[selectedPart!]?.label}</span>
                {' · '}
                <span className="text-hearo-primary">{painLevel}점</span>
                {' · '}
                <span>{PAIN_TYPES.find(t => t.value === painType)?.label}</span>
              </p>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setStep('type')}
                className="flex-1 py-4 px-6 rounded-xl bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                이전
              </button>
              <button
                onClick={() => handleSubmit()}
                className="flex-1 py-4 px-6 rounded-xl bg-hearo-primary hover:bg-hearo-primary/90
                  transition-colors font-semibold"
              >
                저장
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 건너뛰기 버튼 */}
      {onSkip && (
        <div className="fixed bottom-6 left-0 right-0 text-center">
          <button
            onClick={onSkip}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            통증 없음, 건너뛰기
          </button>
        </div>
      )}
    </div>
  );
}

// 신체 부위 선택기
function BodyPartSelector({
  selectedPart,
  onSelect,
}: {
  selectedPart: BodyPart | null;
  onSelect: (part: BodyPart) => void;
}) {
  // 그룹별 정렬
  const groups = [
    { label: '상체', parts: ['neck', 'shoulder_left', 'shoulder_right', 'elbow_left', 'elbow_right', 'wrist_left', 'wrist_right'] },
    { label: '몸통', parts: ['back_upper', 'back_lower'] },
    { label: '하체', parts: ['hip_left', 'hip_right', 'knee_left', 'knee_right', 'ankle_left', 'ankle_right'] },
  ];

  return (
    <div className="max-w-md mx-auto space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="text-sm text-gray-400 mb-3">{group.label}</h3>
          <div className="grid grid-cols-2 gap-3">
            {group.parts.map((part) => {
              const bodyPart = part as BodyPart;
              const info = BODY_PARTS[bodyPart];
              const isSelected = selectedPart === bodyPart;

              return (
                <button
                  key={part}
                  onClick={() => onSelect(bodyPart)}
                  className={`
                    p-4 rounded-xl text-left transition-all
                    ${isSelected
                      ? 'bg-hearo-primary text-white ring-2 ring-hearo-primary ring-offset-2 ring-offset-slate-900'
                      : 'bg-slate-800 hover:bg-slate-700'}
                  `}
                >
                  <span className="font-medium">{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// 통증 레벨 선택기 (NRS 0-10)
function PainLevelSelector({
  selectedLevel,
  onSelect,
}: {
  selectedLevel: PainLevel;
  onSelect: (level: PainLevel) => void;
}) {
  const levels: PainLevel[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const getLevelColor = (level: PainLevel) => {
    if (level === 0) return 'bg-green-500';
    if (level <= 3) return 'bg-yellow-500';
    if (level <= 6) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getLevelDescription = (level: PainLevel) => {
    if (level === 0) return '통증 없음';
    if (level <= 3) return '약한 통증';
    if (level <= 6) return '중간 통증';
    if (level <= 8) return '심한 통증';
    return '극심한 통증';
  };

  return (
    <div className="max-w-md mx-auto">
      {/* 현재 선택된 레벨 표시 */}
      <div className="text-center mb-8">
        <div className={`
          inline-flex items-center justify-center w-24 h-24 rounded-full
          ${getLevelColor(selectedLevel)} text-white text-4xl font-bold
        `}>
          {selectedLevel}
        </div>
        <p className="mt-4 text-lg">{getLevelDescription(selectedLevel)}</p>
      </div>

      {/* 레벨 버튼들 */}
      <div className="flex justify-between gap-1">
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => onSelect(level)}
            className={`
              w-8 h-12 rounded-lg text-sm font-medium transition-all
              ${selectedLevel === level
                ? `${getLevelColor(level)} text-white scale-110`
                : 'bg-slate-700 hover:bg-slate-600'}
            `}
          >
            {level}
          </button>
        ))}
      </div>

      {/* 범례 */}
      <div className="flex justify-between mt-4 text-xs text-gray-500">
        <span>통증 없음</span>
        <span>극심한 통증</span>
      </div>
    </div>
  );
}

// 통증 유형 선택기
function PainTypeSelector({
  selectedType,
  onSelect,
}: {
  selectedType: string;
  onSelect: (type: typeof PAIN_TYPES[number]['value']) => void;
}) {
  return (
    <div className="max-w-md mx-auto grid grid-cols-2 gap-4">
      {PAIN_TYPES.map((type) => (
        <button
          key={type.value}
          onClick={() => onSelect(type.value)}
          className={`
            p-6 rounded-xl text-center transition-all
            ${selectedType === type.value
              ? 'bg-hearo-primary text-white ring-2 ring-hearo-primary ring-offset-2 ring-offset-slate-900'
              : 'bg-slate-800 hover:bg-slate-700'}
          `}
        >
          <Icon name={type.icon} size={32} color={selectedType === type.value ? '#FFFFFF' : '#9CA3AF'} />
          <span className="font-medium mt-2">{type.label}</span>
        </button>
      ))}
    </div>
  );
}

export default PainTracker;
