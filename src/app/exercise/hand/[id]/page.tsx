'use client';

/**
 * 손 재활 운동 실행 페이지
 * MediaPipe Hand Landmarker로 손을 인식하고 분석
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useWorldStore } from '@/stores/useWorldStore';
import { WORLDVIEW_COLORS } from '@/constants/themes';
import { Icon } from '@/components/ui/Icon';
import {
  type HandRehabExercise,
  type HandLandmarkPoint,
  HAND_REHAB_DEFINITIONS,
} from '@/types/hand';
import { HandDrawer } from '@/lib/hand/handDrawer';
import {
  type HandRehabAnalysis,
  HandRehabAnalyzer,
  getHandRehabAnalyzer,
  resetHandRehabAnalyzer,
} from '@/lib/hand/handRehabAnalyzer';
import type { PerformanceRating } from '@/types/exercise';
import { ttsService } from '@/services/ttsService';
import { sfxService } from '@/services/sfxService';
import { NPCDialogue } from '@/components/story/NPCDialogue';

// 손 재활 운동 정보 (MVP 8개)
const handExerciseInfo: Record<HandRehabExercise, { koreanName: string; targetReps: number }> = {
  // ROM/가동성 (3개)
  finger_flexion: { koreanName: '손가락 굽히기/펴기', targetReps: 10 },
  finger_spread: { koreanName: '손가락 벌리기', targetReps: 10 },
  wrist_flexion: { koreanName: '손목 굽히기/펴기', targetReps: 10 },
  // 협응/힘줄 (3개)
  tendon_glide: { koreanName: '힘줄 글라이딩', targetReps: 5 },
  thumb_opposition: { koreanName: '엄지-손가락 터치', targetReps: 10 },
  grip_squeeze: { koreanName: '주먹 쥐기', targetReps: 10 },
  // 정밀/기능 (2개)
  pinch_hold: { koreanName: '집게 집기 유지', targetReps: 10 },
  finger_tap_sequence: { koreanName: '손가락 순차 터치', targetReps: 5 },
};

export default function HandExercisePage() {
  const params = useParams();
  const router = useRouter();
  const exerciseId = params.id as HandRehabExercise;

  const { currentWorldview } = useWorldStore();
  const colors = WORLDVIEW_COLORS[currentWorldview];

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const handDrawerRef = useRef<HandDrawer | null>(null);
  const analyzerRef = useRef<HandRehabAnalyzer | null>(null);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedHands, setDetectedHands] = useState<{ left: boolean; right: boolean }>({ left: false, right: false });
  const [analysis, setAnalysis] = useState<HandRehabAnalysis | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // NPC/TTS States
  const [showNPCDialogue, setShowNPCDialogue] = useState(false);
  const [npcDialogue, setNpcDialogue] = useState('');
  const [, setPerformanceRating] = useState<PerformanceRating>('normal');
  const lastRepCountRef = useRef(0);

  const exerciseInfo = handExerciseInfo[exerciseId];
  const definition = HAND_REHAB_DEFINITIONS[exerciseId];


  // Rep 카운트 변경 감지 및 효과
  useEffect(() => {
    if (!analysis) return;

    const currentReps = analysis.repCount;
    const prevReps = lastRepCountRef.current;

    // 새로운 rep 완료
    if (currentReps > prevReps) {
      // 효과음 재생
      sfxService.playCommonSFX('success');

      // 중간 피드백 (5회마다)
      if (currentReps % 5 === 0 && currentReps < exerciseInfo.targetReps) {
        const messages = [
          '좋아요! 계속 가세요!',
          '잘하고 있어요!',
          '훌륭해요! 조금만 더!',
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        setNpcDialogue(randomMessage);
        setShowNPCDialogue(true);
        ttsService.speakWithWebSpeech(randomMessage);
      }

      lastRepCountRef.current = currentReps;
    }
  }, [analysis?.repCount, exerciseInfo.targetReps]);

  // 운동 완료 처리
  useEffect(() => {
    if (!isCompleted) return;

    // 성과 평가
    const avgProgress = analysis?.progress || 0;
    let rating: PerformanceRating = 'normal';
    if (avgProgress >= 90) rating = 'perfect';
    else if (avgProgress >= 70) rating = 'good';
    setPerformanceRating(rating);

    // 완료 효과음
    sfxService.playCommonSFX('complete');

    // 완료 메시지 (손 재활 운동은 별도 스토리 없음)
    const completionMsg = rating === 'perfect'
      ? '완벽해요! 정말 대단해요!'
      : rating === 'good'
      ? '잘했어요! 좋은 운동이었어요!'
      : '수고했어요!';

    setNpcDialogue(completionMsg);
    setShowNPCDialogue(true);
    ttsService.speakWithWebSpeech(completionMsg);
  }, [isCompleted, currentWorldview, exerciseId, analysis?.progress]);

  // MediaPipe Hand Landmarker 초기화
  const initializeHandLandmarker = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      handLandmarkerRef.current = handLandmarker;
      return true;
    } catch (err) {
      console.error('Hand Landmarker 초기화 실패:', err);
      setError('손 인식 모델을 불러오지 못했습니다.');
      return false;
    }
  }, []);

  // 카메라 시작
  const startCamera = useCallback(async () => {
    try {
      // 모바일에서는 더 유연한 해상도 요청
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: isMobile ? { ideal: 480 } : { ideal: 640 },
          height: isMobile ? { ideal: 640 } : { ideal: 480 },
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return true;
    } catch (err) {
      console.error('카메라 시작 실패:', err);
      setError('카메라를 사용할 수 없습니다. 권한을 확인해주세요.');
      return false;
    }
  }, []);

  // 손 감지 루프
  const detectHands = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const handLandmarker = handLandmarkerRef.current;

    if (!video || !canvas || !handLandmarker || video.readyState !== 4) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
      return;
    }

    // 캔버스 크기 설정
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 비디오 프레임 그리기 (미러링)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // 손 감지
    const results = handLandmarker.detectForVideo(video, performance.now());

    // HandDrawer 매 프레임 새로 생성 (context 갱신 보장)
    handDrawerRef.current = new HandDrawer(ctx);

    // 손 랜드마크 그리기 및 분석
    if (results.landmarks && results.landmarks.length > 0) {
      setIsDetecting(true);

      // 감지된 손 추적
      const hands = { left: false, right: false };
      const landmarksData: { left: HandLandmarkPoint[] | null; right: HandLandmarkPoint[] | null } = {
        left: null,
        right: null,
      };
      let primaryLandmarks: HandLandmarkPoint[] | null = null;

      // 모든 감지된 손 처리
      for (let i = 0; i < results.landmarks.length; i++) {
        const landmarks: HandLandmarkPoint[] = results.landmarks[i].map((lm) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
        }));

        // 손 방향 확인 (Left/Right)
        const handedness = results.handednesses[i]?.[0]?.categoryName;
        if (handedness === 'Left') {
          hands.left = true;
          landmarksData.left = landmarks;
        } else if (handedness === 'Right') {
          hands.right = true;
          landmarksData.right = landmarks;
        }

        // 손 그리기 (각 손마다 다른 색상)
        const isLeftHand = handedness === 'Left';
        handDrawerRef.current?.drawHandWithFingerColors(landmarks, true, isLeftHand ? '#FF6B6B' : '#4ECDC4');

        // 첫 번째 손을 분석용으로 사용 (또는 가장 정확도 높은 손)
        if (!primaryLandmarks) {
          primaryLandmarks = landmarks;
        }
      }

      setDetectedHands(hands);

      // 운동 분석 (주 손 기준)
      if (primaryLandmarks) {
        if (!analyzerRef.current) {
          analyzerRef.current = getHandRehabAnalyzer(exerciseId);
        }
        const analysisResult = analyzerRef.current.analyze(primaryLandmarks);
        setAnalysis(analysisResult);

        // 완료 체크
        if (analysisResult.repCount >= exerciseInfo.targetReps && !isCompleted) {
          setIsCompleted(true);
        }
      }
    } else {
      setIsDetecting(false);
      setDetectedHands({ left: false, right: false });
    }

    animationFrameRef.current = requestAnimationFrame(detectHands);
  }, [exerciseId, exerciseInfo.targetReps, isCompleted]);

  // 초기화
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      setIsLoading(true);
      setError(null);

      const handLandmarkerReady = await initializeHandLandmarker();
      if (!mounted) return;

      if (!handLandmarkerReady) {
        setIsLoading(false);
        return;
      }

      const cameraReady = await startCamera();
      if (!mounted) return;

      if (!cameraReady) {
        setIsLoading(false);
        return;
      }

      // 분석기 초기화
      analyzerRef.current = getHandRehabAnalyzer(exerciseId);

      setIsLoading(false);

      // 감지 시작
      animationFrameRef.current = requestAnimationFrame(detectHands);
    };

    initialize();

    return () => {
      mounted = false;

      // 애니메이션 정리
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // 카메라 정리
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }

      // Hand Landmarker 정리
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }

      // 분석기 초기화
      resetHandRehabAnalyzer();
    };
  }, [exerciseId, initializeHandLandmarker, startCamera, detectHands]);

  // 운동이 없으면 목록으로
  if (!exerciseInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <p className="text-lg" style={{ color: 'var(--foreground)' }}>
            운동을 찾을 수 없습니다.
          </p>
          <Link
            href="/exercise"
            className="mt-4 inline-block px-4 py-2 rounded-lg"
            style={{ backgroundColor: colors.primary, color: '#FFFFFF' }}
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* 헤더 */}
      <header
        className="sticky top-0 z-10 p-4 flex items-center justify-between"
        style={{
          background: 'var(--background)',
          borderBottom: '1px solid var(--background-tertiary)',
        }}
      >
        <Link
          href="/exercise"
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>뒤로</span>
        </Link>

        <h1 className="font-bold text-lg" style={{ color: 'var(--foreground)' }}>
          {exerciseInfo.koreanName}
        </h1>

        <div className="w-20" />
      </header>

      {/* 메인 컨텐츠 */}
      <main className="p-4">
        {/* 에러 표시 */}
        {error && (
          <div
            className="mb-4 p-4 rounded-xl text-center"
            style={{ backgroundColor: 'rgba(255, 0, 0, 0.1)', color: '#FF6B6B' }}
          >
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 rounded-lg"
              style={{ backgroundColor: colors.primary, color: '#FFFFFF' }}
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 로딩 */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-t-transparent rounded-full"
              style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
            />
            <p className="mt-4" style={{ color: 'var(--foreground-secondary)' }}>
              카메라 및 손 인식 모델 로딩 중...
            </p>
          </div>
        )}

        {/* 메인 뷰 - 카메라 + 게이미피케이션 HUD */}
        <div className="relative rounded-2xl overflow-hidden bg-black max-w-2xl mx-auto border-2" style={{ borderColor: colors.primary + '40' }}>
          <video
            ref={videoRef}
            className="hidden"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="w-full h-auto"
            style={{ maxHeight: '70vh' }}
          />

          {/* 좌상단 - 손 감지 상태 */}
          {!isLoading && !error && (
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm transition-all duration-300 ${detectedHands.left ? 'scale-105' : 'opacity-50'}`}
                style={{
                  backgroundColor: detectedHands.left ? 'rgba(255, 107, 107, 0.85)' : 'rgba(50, 50, 50, 0.7)',
                  color: '#FFFFFF',
                  boxShadow: detectedHands.left ? '0 0 12px rgba(255, 107, 107, 0.5)' : 'none',
                }}
              >
                <span className={`w-2 h-2 rounded-full ${detectedHands.left ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
                LEFT
              </div>
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm transition-all duration-300 ${detectedHands.right ? 'scale-105' : 'opacity-50'}`}
                style={{
                  backgroundColor: detectedHands.right ? 'rgba(78, 205, 196, 0.85)' : 'rgba(50, 50, 50, 0.7)',
                  color: '#FFFFFF',
                  boxShadow: detectedHands.right ? '0 0 12px rgba(78, 205, 196, 0.5)' : 'none',
                }}
              >
                <span className={`w-2 h-2 rounded-full ${detectedHands.right ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
                RIGHT
              </div>
            </div>
          )}

          {/* 우상단 - 스코어 스타일 카운터 */}
          {!isLoading && analysis && (
            <div
              className="absolute top-3 right-3 px-4 py-2 rounded-xl backdrop-blur-sm"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                border: `2px solid ${colors.primary}`,
                boxShadow: `0 0 20px ${colors.primary}40`,
              }}
            >
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider">REPS</p>
                <p className="text-2xl font-black text-white">
                  <span style={{ color: colors.primary }}>{analysis.repCount}</span>
                  <span className="text-gray-500 text-lg">/{exerciseInfo.targetReps}</span>
                </p>
              </div>
            </div>
          )}

          {/* 하단 - 피드백 + XP 바 스타일 진행률 */}
          {!isLoading && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
              {/* 피드백 메시지 */}
              <p
                className={`text-center font-bold text-lg mb-3 transition-all duration-300 ${analysis?.isCorrectGesture ? 'scale-105' : ''}`}
                style={{
                  color: analysis?.isCorrectGesture ? '#4ECDC4' : '#FFFFFF',
                  textShadow: analysis?.isCorrectGesture ? '0 0 20px rgba(78, 205, 196, 0.7)' : 'none',
                }}
              >
                {analysis?.feedback || '운동을 시작하세요'}
              </p>

              {/* XP 바 스타일 진행률 */}
              <div className="relative">
                <div
                  className="h-4 rounded-full overflow-hidden"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500 relative"
                    style={{
                      width: `${analysis?.progress || 0}%`,
                      background: `linear-gradient(90deg, ${colors.primary}, ${colors.primary}dd)`,
                      boxShadow: `0 0 10px ${colors.primary}80`,
                    }}
                  >
                    {/* 광택 효과 */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full" />
                  </div>
                </div>
                {/* 진행률 텍스트 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow-lg">
                    {Math.round(analysis?.progress || 0)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 미션 스타일 운동 단계 */}
        {!isLoading && definition.steps && (
          <div
            className="mt-4 p-4 rounded-xl max-w-2xl mx-auto"
            style={{
              backgroundColor: 'var(--background-secondary)',
              border: '1px solid var(--background-tertiary)',
            }}
          >
            <p className="text-xs text-center mb-3 uppercase tracking-widest" style={{ color: 'var(--foreground-hint)' }}>
              Mission Progress
            </p>
            <div className="flex items-center justify-center gap-1">
              {definition.steps.map((step, index) => {
                const isCurrent = (analysis?.currentStep || 0) === index;
                const isCompleted = (analysis?.currentStep || 0) > index;
                return (
                  <div key={index} className="flex items-center">
                    {/* 단계 노드 */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${isCurrent ? 'scale-110' : ''}`}
                      style={{
                        backgroundColor: isCompleted ? colors.primary : isCurrent ? colors.primary : 'var(--background)',
                        color: isCompleted || isCurrent ? '#FFFFFF' : 'var(--foreground-secondary)',
                        boxShadow: isCurrent ? `0 0 15px ${colors.primary}60` : 'none',
                        border: `2px solid ${isCompleted || isCurrent ? colors.primary : 'var(--background-tertiary)'}`,
                      }}
                      title={step}
                    >
                      {isCompleted ? 'V' : index + 1}
                    </div>
                    {/* 연결선 */}
                    {index < definition.steps.length - 1 && (
                      <div
                        className="w-6 h-0.5 transition-all duration-300"
                        style={{
                          backgroundColor: isCompleted ? colors.primary : 'var(--background-tertiary)',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {/* 현재 단계 텍스트 */}
            <p className="text-center mt-3 text-sm" style={{ color: colors.primary }}>
              {definition.steps[analysis?.currentStep || 0]}
            </p>
          </div>
        )}

        {/* 완료 모달 */}
        {isCompleted && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div
              className="mx-4 p-6 rounded-2xl text-center max-w-sm w-full"
              style={{ backgroundColor: 'var(--background)' }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: colors.primary }}
              >
                <Icon name="checkmark" size={36} color="#FFFFFF" />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                운동 완료!
              </h2>
              <p className="mb-4" style={{ color: 'var(--foreground-secondary)' }}>
                {exerciseInfo.koreanName} {exerciseInfo.targetReps}회를 완료했습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsCompleted(false);
                    setShowNPCDialogue(false);
                    lastRepCountRef.current = 0;
                    if (analyzerRef.current) {
                      analyzerRef.current.reset();
                    }
                  }}
                  className="flex-1 px-4 py-3 rounded-xl font-medium"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    color: 'var(--foreground)',
                  }}
                >
                  다시하기
                </button>
                <button
                  onClick={() => router.push('/exercise')}
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-white"
                  style={{ backgroundColor: colors.primary }}
                >
                  목록으로
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NPC 대화 */}
        {showNPCDialogue && (
          <NPCDialogue
            dialogue={npcDialogue}
            worldview={currentWorldview}
            onComplete={() => setShowNPCDialogue(false)}
            autoHideDelay={isCompleted ? 5000 : 3000}
          />
        )}
      </main>
    </div>
  );
}
