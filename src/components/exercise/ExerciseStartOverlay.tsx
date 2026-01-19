/**
 * 운동 시작 오버레이 컴포넌트
 */

'use client';

import { Icon } from '@/components/ui/Icon';

interface ExerciseStartOverlayProps {
  exerciseName: string;
  isCharacterLoaded: boolean;
  detectorError: string | null;
  themeColors: {
    primary: string;
    secondary: string;
  };
  onStart: () => void;
  onBack: () => void;
}

export function ExerciseStartOverlay({
  exerciseName,
  isCharacterLoaded,
  detectorError,
  themeColors,
  onStart,
  onBack,
}: ExerciseStartOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">{exerciseName}</h2>

        {/* 감지기 에러 표시 */}
        {detectorError ? (
          <div className="max-w-md mx-auto">
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                <Icon name="warning-outline" size={18} color="#F87171" />
                <span>오류 발생</span>
              </div>
              <p className="text-white/80 text-sm">{detectorError}</p>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={onBack}
                className="px-6 py-3 rounded-full bg-white/20 text-white font-bold hover:bg-white/30"
              >
                목록으로 돌아가기
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-full text-white font-bold"
                style={{ backgroundColor: themeColors.primary }}
              >
                다시 시도
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-white/60 mb-8">
              {isCharacterLoaded ? '캐릭터가 준비되었습니다' : '캐릭터 로딩 중...'}
            </p>
            <button
              onClick={onStart}
              disabled={!isCharacterLoaded}
              className="px-8 py-4 rounded-full text-lg font-bold text-white disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})`,
              }}
            >
              {isCharacterLoaded ? '운동 시작' : '로딩 중...'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ExerciseStartOverlay;
