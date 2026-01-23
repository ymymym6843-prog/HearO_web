'use client';

/**
 * 운동 실행 페이지
 * 3D 캐릭터 + 카메라 + 운동 감지 + VN/오디오 시스템
 */

import { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useWorldStore } from '@/stores/useWorldStore';
import { useExerciseStore } from '@/stores/useExerciseStore';
import { useCharacterStore } from '@/stores/useCharacterStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { WORLDVIEW_COLORS } from '@/constants/themes';
import { WORLDVIEW_MODELS } from '@/types/vrm';
import { RepCounter, PhaseIndicator, AccuracyMeter, CoachingMessage, HoldTimer } from '@/components/feedback';
import { NPCDialogue } from '@/components/story/NPCDialogue';
import {
  ExerciseCompleteScreen,
  ExerciseStartOverlay,
  InlineSessionRecoveryModal,
  CalibrationOverlay,
} from '@/components/exercise';
import { sfxService } from '@/services/sfxService';
import { ttsService } from '@/services/ttsService';
import { storyService } from '@/services/storyService';
import { hapticService } from '@/services/hapticService';
import {
  sessionRecoveryService,
  type SavedSessionState,
} from '@/services/sessionRecoveryService';
import {
  getRandomCompletionAnimation,
  getExpressionForAccuracy,
  type ExpressionState,
} from '@/services/vrmFeedbackService';
import { getRandomDialogue, getPerformanceDialogue } from '@/constants/npcDialogueTemplates';
import { getDetectorForExercise, resetDetector, type BaseDetector, type ExercisePhase as DetectorPhase } from '@/lib/exercise/detection';
import type { ExerciseType, ExercisePhase, PerformanceRating } from '@/types/exercise';
import type { Landmark } from '@/types/pose';
import { MediaErrorBoundary } from '@/components/common';
import { Icon } from '@/components/ui/Icon';
import { useSceneSettings } from '@/hooks/useSceneSettings';
import { SceneSettingsPanel } from '@/components/three/SceneSettingsPanel';

// 클라이언트에서만 로드 (SSR 비활성화)
const Scene = dynamic(() => import('@/components/three/Scene'), { ssr: false });
const WebCamera = dynamic(() => import('@/components/camera/WebCamera'), { ssr: false });

// MVP 운동 정보 (14개 - 전신 Pose 운동)
const exerciseInfo: Partial<Record<ExerciseType, { koreanName: string; description: string; targetReps: number }>> = {
  // 하체 운동 (6개)
  squat: {
    koreanName: '스쿼트',
    description: '의자에 앉듯이 앉았다 일어나기',
    targetReps: 10
  },
  wall_squat: {
    koreanName: '벽 스쿼트',
    description: '벽에 등을 대고 앉은 자세 유지하기',
    targetReps: 1  // 홀드 운동
  },
  chair_stand: {
    koreanName: '의자 앉았다 일어나기',
    description: '의자에서 앉았다 일어서기 반복',
    targetReps: 10
  },
  straight_leg_raise: {
    koreanName: '누워서 다리 들기',
    description: '누운 자세에서 다리를 들어 올리기',
    targetReps: 10
  },
  standing_march_slow: {
    koreanName: '서서 천천히 행진',
    description: '서서 제자리에서 천천히 행진하기',
    targetReps: 20
  },
  seated_knee_lift: {
    koreanName: '앉아서 무릎 들기',
    description: '앉아서 무릎을 들어 올리기',
    targetReps: 10
  },
  // 상체 운동 (4개)
  standing_arm_raise_front: {
    koreanName: '팔 앞으로 들기',
    description: '팔을 앞으로 들어올리기',
    targetReps: 10
  },
  shoulder_abduction: {
    koreanName: '어깨 벌리기',
    description: '팔을 옆으로 벌려 들어올리기',
    targetReps: 10
  },
  elbow_flexion: {
    koreanName: '팔꿈치 굽히기',
    description: '팔꿈치를 천천히 굽혔다 펴기',
    targetReps: 10
  },
  wall_push: {
    koreanName: '벽 밀기',
    description: '벽에 손을 대고 밀기',
    targetReps: 10
  },
  // 코어 운동 (4개)
  seated_core_hold: {
    koreanName: '앉아서 코어 버티기',
    description: '앉아서 코어에 힘을 주고 유지하기',
    targetReps: 1  // 홀드 운동
  },
  standing_anti_extension_hold: {
    koreanName: '서서 허리 버티기',
    description: '서서 허리를 중립으로 유지하기',
    targetReps: 1  // 홀드 운동
  },
  standing_arm_raise_core: {
    koreanName: '코어 유지하며 팔 들기',
    description: '코어 안정화하면서 팔 들기',
    targetReps: 10
  },
  bridge: {
    koreanName: '브릿지',
    description: '누워서 엉덩이 들어올리기',
    targetReps: 10
  },
};

// 운동별 카메라 비율 설정 (portrait: 세로, landscape: 가로)
type CameraOrientation = 'portrait' | 'landscape';

const exerciseCameraOrientation: Partial<Record<ExerciseType, CameraOrientation>> = {
  // 하체 운동 → 세로 비율 (머리~발끝)
  squat: 'portrait',
  wall_squat: 'portrait',
  chair_stand: 'portrait',
  straight_leg_raise: 'landscape',  // 누운 자세 (가로)
  standing_march_slow: 'portrait',
  seated_knee_lift: 'portrait',

  // 상체 운동 → 가로 비율 (팔 전체 + 어깨가 보여야 함)
  standing_arm_raise_front: 'landscape',
  shoulder_abduction: 'landscape',
  elbow_flexion: 'landscape',
  wall_push: 'landscape',

  // 코어 운동
  seated_core_hold: 'portrait',
  standing_anti_extension_hold: 'portrait',
  standing_arm_raise_core: 'landscape',
  bridge: 'landscape',  // 누운 자세 (가로)
};

// 카메라 크기 계산 (PIP 모드)
// 낮은 해상도 = 더 넓은 화각 (웹캠 특성)
function getCameraDimensions(orientation: CameraOrientation, isPip: boolean) {
  if (!isPip) {
    // 전체 화면 모드 - 낮은 해상도로 넓은 화각 확보
    return orientation === 'portrait'
      ? { width: 480, height: 640 }   // 세로: 전신 촬영용
      : { width: 640, height: 480 };  // 가로: 상체 운동용 (넓은 화각)
  }

  // PIP 모드 - 크기 증가 (자세 확인 용이하게)
  return orientation === 'portrait'
    ? { width: 300, height: 400 }  // 세로: 3:4 비율 (기존 240x320)
    : { width: 400, height: 300 }; // 가로: 4:3 비율 (기존 320x240)
}

interface ExercisePageProps {
  params: Promise<{ id: string }>;
}

export default function ExercisePage({ params }: ExercisePageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const exerciseId = resolvedParams.id as ExerciseType;

  const { currentWorldview } = useWorldStore();
  const {
    currentRep,
    targetReps,
    currentSet,
    targetSets,
    phase,
    accuracy,
    feedback,
    isActive,
    setExercise,
    startSession,
    incrementReps,
    setPhase,
    updateAccuracy,
    updateAngle,
    setFeedback,
  } = useExerciseStore();
  const {
    isLoaded: isCharacterLoaded,
    isCalibrating,
    isCalibrated,
    resetCalibration,
    setPoseLandmarks,
  } = useCharacterStore();
  const { show3DCharacter, updateSetting } = useSettingsStore();

  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showNPCDialogue, setShowNPCDialogue] = useState(false);
  const [npcDialogue, setNpcDialogue] = useState('');
  const [npcEmotion, setNpcEmotion] = useState<'normal' | 'happy' | 'serious'>('normal');
  const [isComplete, setIsComplete] = useState(false);
  const [performanceRating, setPerformanceRating] = useState<PerformanceRating>('normal');
  const [completionStory, setCompletionStory] = useState<string>('');
  const [detectorError, setDetectorError] = useState<string | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveredReps, setRecoveredReps] = useState(0);

  // VRM 애니메이션/표정 상태
  const [vrmAnimationUrl, setVrmAnimationUrl] = useState<string | null>(null);
  const [vrmExpression, setVrmExpression] = useState<ExpressionState | null>(null);

  // MediaPipe 초기화 후 3D 로드를 위한 지연 상태
  const [mediaPipeReady, setMediaPipeReady] = useState(false);
  const [canLoad3D, setCanLoad3D] = useState(false);

  // 캘리브레이션 플로우 상태
  const [showCalibration, setShowCalibration] = useState(false);
  const [currentLandmarks, setCurrentLandmarks] = useState<Landmark[] | null>(null);

  // 운동 감지기 참조
  const detectorRef = useRef<BaseDetector | null>(null);
  const lastRepCountRef = useRef(0);
  const accumulatedAccuracyRef = useRef<number[]>([]);

  // 상태 업데이트 throttle (10fps로 제한하여 성능 향상)
  const lastUpdateTimeRef = useRef(0);
  const THROTTLE_MS = 100; // 100ms = 10fps

  // 세션 복구용 시간 추적
  const elapsedSecondsRef = useRef(0);
  const sessionStartTimeRef = useRef<number | null>(null);

  // 홀드 타이머 상태 (홀드 운동용)
  const [holdTime, setHoldTime] = useState(0);
  const holdExercises: ExerciseType[] = ['wall_squat', 'seated_core_hold', 'standing_anti_extension_hold'];
  const isHoldExercise = holdExercises.includes(exerciseId);
  const targetHoldTime = exerciseId === 'wall_squat' ? 30 : 10; // wall_squat: 30초, 코어: 10초

  // 씬 설정 (Utonics 벤치마킹: 조명/카메라/헬퍼)
  const [showSceneSettings, setShowSceneSettings] = useState(false);
  const sceneSettings = useSceneSettings();

  const colors = WORLDVIEW_COLORS[currentWorldview];

  // SFX 초기화 (사용자 인터랙션 후)
  const initAudio = useCallback(() => {
    sfxService.init();
  }, []);
  const modelUrl = WORLDVIEW_MODELS[currentWorldview].modelUrl;
  const info = exerciseInfo[exerciseId] || { koreanName: exerciseId, targetReps: 10 };

  // 운동 설정 및 감지기 초기화
  useEffect(() => {
    setExercise(exerciseId);
    setDetectorError(null);

    // 감지기 초기화
    try {
      resetDetector(exerciseId);
      detectorRef.current = getDetectorForExercise(exerciseId);
      lastRepCountRef.current = 0;
      accumulatedAccuracyRef.current = [];
    } catch (error) {
      console.error('감지기 초기화 실패:', error);
      setDetectorError(
        error instanceof Error
          ? `운동 감지기 초기화 실패: ${error.message}`
          : '운동 감지기를 초기화할 수 없습니다'
      );
    }

    return () => {
      // 컴포넌트 언마운트 시 감지기 리셋
      resetDetector(exerciseId);
      detectorRef.current = null;
    };
  }, [exerciseId, setExercise]);

  // 세션 복구 확인
  useEffect(() => {
    const recoverable = sessionRecoveryService.checkRecoverableSession();
    if (recoverable && recoverable.canRecover) {
      // 같은 운동인 경우에만 복구 모달 표시
      if (recoverable.sessionState.exerciseType === exerciseId) {
        setShowRecoveryModal(true);
      }
    }
  }, [exerciseId]);

  // 세션 상태 getter (자동 저장용)
  const getSessionState = useCallback((): SavedSessionState => {
    const elapsed = sessionStartTimeRef.current
      ? Math.floor((Date.now() - sessionStartTimeRef.current) / 1000) + elapsedSecondsRef.current
      : elapsedSecondsRef.current;

    return {
      id: `session-${exerciseId}-${Date.now()}`,
      exerciseType: exerciseId,
      worldview: currentWorldview,
      targetReps,
      currentRep,
      completedReps: accumulatedAccuracyRef.current.map((_, i) => i + 1),
      elapsedSeconds: elapsed,
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      status: 'in_progress',
      repData: accumulatedAccuracyRef.current.map((accuracy, i) => ({
        repNumber: i + 1,
        accuracy,
      })),
    };
  }, [exerciseId, currentWorldview, targetReps, currentRep]);

  // 세션 복구 처리
  const handleSessionRecover = useCallback((recoveredState: SavedSessionState) => {
    // 복구된 데이터 적용
    setRecoveredReps(recoveredState.currentRep);
    elapsedSecondsRef.current = recoveredState.elapsedSeconds;
    lastRepCountRef.current = recoveredState.currentRep;

    // 정확도 데이터 복구
    accumulatedAccuracyRef.current = recoveredState.repData.map(r => r.accuracy);

    setShowRecoveryModal(false);
  }, []);

  // 세션 복구 취소 (새로 시작)
  const handleSessionDiscard = useCallback(() => {
    sessionRecoveryService.clearSessionState();
    setShowRecoveryModal(false);
  }, []);

  // 시작 카운트다운
  const handleStart = () => {
    initAudio();
    sfxService.playCommonSFX('tap');

    // 캘리브레이션 리셋
    resetCalibration();

    // 시작 대사 표시
    setNpcDialogue(getRandomDialogue(currentWorldview, 'exercise_start'));
    setNpcEmotion('normal');
    setShowNPCDialogue(true);

    // 2초 후 바로 카운트다운 시작 (캘리브레이션 건너뛰기 - 테스트용)
    // TODO: 테스트 완료 후 캘리브레이션 로직 복원
    setTimeout(() => {
      setShowNPCDialogue(false);
      // 캘리브레이션 건너뛰고 바로 카운트다운
      setCountdown(3);
    }, 2500);
  };

  // 캘리브레이션 완료 콜백
  const handleCalibrationComplete = () => {
    setShowCalibration(false);
    sfxService.playCommonSFX('success');
    // 캘리브레이션 완료 후 카운트다운 시작
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      sfxService.playCommonSFX('countdown');
      ttsService.speakCountdown(countdown);
      hapticService.countdown(); // 카운트다운 햅틱
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // setTimeout으로 감싸서 동기적 setState 호출 방지
      const timer = setTimeout(() => {
        setCountdown(null);

        // 복구된 반복 횟수 적용
        const startingReps = recoveredReps > 0 ? recoveredReps : 0;
        startSession(info.targetReps, 3);

        // 복구된 경우 rep 카운터 조정
        if (startingReps > 0) {
          for (let i = 0; i < startingReps; i++) {
            incrementReps();
          }
        }

        setIsReady(true);

        // 세션 시작 시간 기록 및 자동 저장 시작
        sessionStartTimeRef.current = Date.now();
        sessionRecoveryService.startAutoSave(getSessionState, 5000);

        // BGM 시작
        sfxService.playBGM(currentWorldview, 'exercise_bgm');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [countdown, startSession, info.targetReps, currentWorldview, getSessionState, recoveredReps, incrementReps]);

  // 운동 완료 처리
  const handleExerciseComplete = useCallback(async (rating: PerformanceRating) => {
    setPerformanceRating(rating);
    setIsComplete(true);

    // VRM 완료 애니메이션 재생
    const animationUrl = getRandomCompletionAnimation(rating);
    setVrmAnimationUrl(animationUrl);

    // 완료 표정 설정
    const expressionMap: Record<PerformanceRating, ExpressionState> = {
      perfect: { name: 'happy', intensity: 1.0 },
      good: { name: 'happy', intensity: 0.7 },
      normal: { name: 'relaxed', intensity: 0.5 },
    };
    setVrmExpression(expressionMap[rating]);

    // 세션 복구 데이터 정리
    sessionRecoveryService.stopAutoSave();
    sessionRecoveryService.clearSessionState();

    // BGM 페이드아웃
    sfxService.fadeOutBGM(1000);

    // 효과음 재생
    sfxService.playExerciseCompleteSFX();

    // 운동 완료 햅틱
    hapticService.exerciseComplete();

    // 완료 대사 표시
    setNpcDialogue(getPerformanceDialogue(currentWorldview, rating));
    setNpcEmotion(rating === 'perfect' ? 'happy' : rating === 'good' ? 'normal' : 'serious');
    setShowNPCDialogue(true);

    // TTS 재생
    ttsService.playPrerenderedTTS(currentWorldview, exerciseId, rating);

    // 프리렌더링된 스토리 로드
    try {
      const story = await storyService.getStory(currentWorldview, exerciseId, rating);
      if (story) {
        setCompletionStory(story);
      } else {
        setCompletionStory(storyService.getDefaultStory(rating));
      }
    } catch (error) {
      console.error('Failed to load story:', error);
      setCompletionStory(storyService.getDefaultStory(rating));
    }
  }, [currentWorldview, exerciseId]);

  // 운동 성공 시 효과음
  const playSuccessSFX = useCallback(() => {
    sfxService.playExerciseSuccessSFX(currentWorldview);
  }, [currentWorldview]);

  // 감지기 상태를 스토어 상태로 변환
  const mapDetectorPhaseToStore = (detectorPhase: DetectorPhase): ExercisePhase => {
    const phaseMap: Record<DetectorPhase, ExercisePhase> = {
      'IDLE': 'ready',
      'READY': 'ready',
      'MOVING': 'down',
      'HOLDING': 'hold',
      'RETURNING': 'up',
      'COOLDOWN': 'rest',
    };
    return phaseMap[detectorPhase] || 'ready';
  };

  // 포즈 감지 콜백 (throttle 적용)
  const handlePoseDetected = useCallback((landmarks: Landmark[] | null) => {
    // MediaPipe가 포즈 데이터를 반환하면 준비 완료
    if (landmarks && !mediaPipeReady) {
      console.log('[3D Loading] MediaPipe detected pose, setting mediaPipeReady=true');
      setMediaPipeReady(true);
    }

    // 현재 랜드마크 저장 (캘리브레이션용)
    // 주의: WebCamera가 이미 setPoseLandmarks(landmarks2D, worldLandmarks3D)를 호출하므로
    // 여기서 중복 호출하면 worldLandmarks가 null로 덮어써짐
    if (landmarks) {
      setCurrentLandmarks(landmarks);
    }

    if (!landmarks || !isActive || !detectorRef.current) return;

    const now = Date.now();

    // 운동 감지 처리 (매 프레임 실행 - 정확한 rep 카운트를 위해)
    const result = detectorRef.current.processFrame(landmarks);

    // 반복 완료 체크 (즉시 처리 - throttle 대상 아님)
    const currentRepCount = detectorRef.current.getRepCount();
    if (currentRepCount > lastRepCountRef.current) {
      lastRepCountRef.current = currentRepCount;
      accumulatedAccuracyRef.current.push(result.accuracy);

      // 반복 증가, 효과음 및 햅틱
      incrementReps();
      playSuccessSFX();
      hapticService.repComplete(); // 반복 완료 햅틱

      // 세트 완료 체크 (targetReps 도달 시)
      if (currentRepCount >= targetReps) {
        // 평균 정확도 계산
        const avgAccuracy = accumulatedAccuracyRef.current.length > 0
          ? accumulatedAccuracyRef.current.reduce((a, b) => a + b, 0) / accumulatedAccuracyRef.current.length
          : 0;

        // 성과 등급 결정
        let rating: 'perfect' | 'good' | 'normal' = 'normal';
        if (avgAccuracy >= 85) rating = 'perfect';
        else if (avgAccuracy >= 65) rating = 'good';

        // 운동 완료 처리
        handleExerciseComplete(rating);
      }
    }

    // UI 업데이트 throttle (10fps)
    if (now - lastUpdateTimeRef.current < THROTTLE_MS) {
      return;
    }
    lastUpdateTimeRef.current = now;

    // 스토어 업데이트 (throttled)
    const storePhase = mapDetectorPhaseToStore(result.phase);
    setPhase(storePhase);
    updateAccuracy(result.accuracy);
    updateAngle(result.currentAngle);
    setFeedback(result.feedback);

    // VRM 표정 업데이트 (운동 중, 완료 애니메이션 재생 중이 아닐 때)
    if (!isComplete && !vrmAnimationUrl) {
      const newExpression = getExpressionForAccuracy(result.accuracy);
      setVrmExpression(newExpression);
    }

    // 홀드 타이머 업데이트 (플랭크, 사이드 플랭크)
    if (isHoldExercise && result.holdProgress !== undefined) {
      setHoldTime(result.holdProgress * targetHoldTime);
    }
  }, [isActive, setPhase, updateAccuracy, updateAngle, setFeedback, incrementReps, playSuccessSFX, targetReps, handleExerciseComplete, isHoldExercise, targetHoldTime, mediaPipeReady, setPoseLandmarks, isComplete, vrmAnimationUrl]);

  // MediaPipe 준비 후 3D 로드 활성화 (WebGL 컨텍스트 충돌 방지)
  // canLoad3D를 의존성에서 제외하여 타이머가 취소되지 않도록 함
  const canLoad3DTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 3D 설정이 비활성화되면 즉시 해제
    if (!show3DCharacter) {
      if (canLoad3DTimerRef.current) {
        clearTimeout(canLoad3DTimerRef.current);
        canLoad3DTimerRef.current = null;
      }
      setCanLoad3D(false);
      return;
    }

    // MediaPipe 준비되면 3D 로드 활성화
    if (mediaPipeReady && show3DCharacter) {
      console.log('[3D Loading] MediaPipe ready, scheduling 3D load in 1 second...');
      canLoad3DTimerRef.current = setTimeout(() => {
        console.log('[3D Loading] Timer fired, enabling 3D...');
        setCanLoad3D(true);
      }, 1000);

      return () => {
        if (canLoad3DTimerRef.current) {
          clearTimeout(canLoad3DTimerRef.current);
          canLoad3DTimerRef.current = null;
        }
      };
    }
  }, [mediaPipeReady, show3DCharacter]);

  // 종료
  const handleEnd = () => {
    sfxService.stopBGM();
    ttsService.stop();
    router.push('/exercise');
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      sfxService.stopBGM();
      ttsService.stop();
      sessionRecoveryService.stopAutoSave();
    };
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ backgroundColor: colors.background }}>
      {/* 3D 캐릭터 영역 (MediaPipe 초기화 후 로드) */}
      {canLoad3D && (
        <div className="absolute inset-0">
          <MediaErrorBoundary>
            <Scene
              modelUrl={modelUrl}
              enableControls={!isActive}
              showGrid={sceneSettings.helpers.showGrid}
              showAxes={sceneSettings.helpers.showAxes}
              backgroundColor={colors.background}
              animationUrl={vrmAnimationUrl}
              onAnimationEnd={() => {
                console.log('[ExercisePage] Animation ended');
                setVrmAnimationUrl(null);
              }}
              expression={vrmExpression}
              lighting={sceneSettings.lighting}
              cameraAngle={sceneSettings.cameraAngle}
            />
          </MediaErrorBoundary>
        </div>
      )}

      {/* 3D 로딩 표시 (설정은 켜졌지만 아직 로드 안됨) */}
      {show3DCharacter && !canLoad3D && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="text-white/60 text-sm">
            {mediaPipeReady ? '3D 캐릭터 로딩 중...' : '카메라 준비 중...'}
          </div>
        </div>
      )}

      {/* 상단 헤더 */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
        <Link
          href="/exercise"
          className="px-4 py-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
        >
          ← 종료
        </Link>

        <div className="text-center">
          <h1 className="text-xl font-bold text-white">{info.koreanName}</h1>
          <p className="text-white/60 text-sm">
            세트 {currentSet}/{targetSets}
          </p>
        </div>

        {/* 3D 토글 + 씬 설정 버튼 */}
        <div className="flex items-center gap-2">
          {/* 씬 설정 버튼 (3D 캐릭터 활성화 시에만 표시) */}
          {show3DCharacter && (
            <button
              onClick={() => setShowSceneSettings(!showSceneSettings)}
              className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                showSceneSettings
                  ? 'bg-purple-500/50 text-white'
                  : 'bg-black/30 text-white/70 hover:bg-black/50'
              }`}
              title="씬 설정"
            >
              <Icon name="settings-outline" size={18} color={showSceneSettings ? '#FFFFFF' : '#FFFFFF99'} />
            </button>
          )}

          {/* 3D 토글 버튼 */}
          <button
            onClick={() => updateSetting('show3DCharacter', !show3DCharacter)}
            className={`px-3 py-2 rounded-full backdrop-blur-sm flex items-center gap-2 transition-colors ${
              show3DCharacter
                ? 'bg-purple-500/50 text-white'
                : 'bg-black/30 text-white/70 hover:bg-black/50'
            }`}
            title={show3DCharacter ? '3D 캐릭터 끄기' : '3D 캐릭터 켜기'}
          >
            <Icon name="cube-outline" size={18} color={show3DCharacter ? '#FFFFFF' : '#FFFFFF99'} />
            <span className="text-sm font-medium">3D</span>
          </button>
        </div>
      </div>

      {/* 씬 설정 패널 (Utonics 벤치마킹) */}
      {show3DCharacter && showSceneSettings && (
        <div className="absolute top-20 right-4 z-20 w-64">
          <SceneSettingsPanel
            lighting={sceneSettings.lighting}
            lightingPreset={sceneSettings.lightingPreset}
            onLightingPresetChange={sceneSettings.setLightingPreset}
            onAmbientChange={sceneSettings.setAmbientIntensity}
            onDirectionalChange={sceneSettings.setDirectionalIntensity}
            onHemisphereChange={sceneSettings.setHemisphereIntensity}
            cameraAngle={sceneSettings.cameraAngle}
            onCameraAngleChange={sceneSettings.setCameraAngle}
            helpers={sceneSettings.helpers}
            onToggleGrid={sceneSettings.toggleGrid}
            onToggleAxes={sceneSettings.toggleAxes}
            onReset={sceneSettings.resetToDefaults}
            compact
          />
        </div>
      )}

      {/* 카메라 피드 */}
      <div className={`absolute z-10 ${
        show3DCharacter
          ? 'bottom-4 right-4'
          : 'inset-0 flex items-center justify-center'
      }`}>
        <div className={`rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 ${
          show3DCharacter ? '' : 'max-w-2xl max-h-[70vh]'
        }`}>
          <MediaErrorBoundary>
            {(() => {
              const orientation = exerciseCameraOrientation[exerciseId] || 'landscape';
              const { width, height } = getCameraDimensions(orientation, show3DCharacter);
              return (
                <WebCamera
                  width={width}
                  height={height}
                  showSkeleton={true}
                  showHandSkeleton={false}  // 카메라 오버레이는 깔끔하게
                  enableHandTracking={true} // 손 추적은 활성화 (VRM 애니메이션용)
                  worldview={currentWorldview}
                  onPoseDetected={handlePoseDetected}
                />
              );
            })()}
          </MediaErrorBoundary>
        </div>
      </div>

      {/* 게이미피케이션 HUD 오버레이 */}
      {isReady && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* 좌상단 - 세트 정보 배지 */}
          <div
            className="absolute top-20 left-4 px-4 py-2 rounded-xl backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              border: `2px solid ${colors.primary}`,
              boxShadow: `0 0 15px ${colors.primary}40`,
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: colors.primary }}
              />
              <span className="text-xs text-gray-400 uppercase tracking-wider">SET</span>
              <span className="text-lg font-black text-white">
                {currentSet}<span className="text-gray-500 text-sm">/{targetSets}</span>
              </span>
            </div>
          </div>

          {/* 우상단 - 스코어 스타일 카운터 */}
          <div
            className="absolute top-20 right-4 px-5 py-3 rounded-xl backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              border: `2px solid ${colors.primary}`,
              boxShadow: `0 0 20px ${colors.primary}40`,
            }}
          >
            <div className="text-center">
              {isHoldExercise ? (
                <>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">HOLD</p>
                  <p className="text-3xl font-black text-white">
                    <span style={{ color: colors.primary }}>{Math.round(holdTime)}</span>
                    <span className="text-gray-500 text-lg">/{targetHoldTime}s</span>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">REPS</p>
                  <p className="text-3xl font-black text-white">
                    <span style={{ color: colors.primary }}>{currentRep}</span>
                    <span className="text-gray-500 text-lg">/{targetReps}</span>
                  </p>
                </>
              )}
            </div>
          </div>

          {/* 좌측 중앙 - 운동 단계 표시 (미션 스타일) */}
          <div
            className="absolute left-4 top-1/2 -translate-y-1/2 px-4 py-3 rounded-xl backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              border: `1px solid ${colors.primary}50`,
            }}
          >
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">PHASE</p>
            <div className="flex flex-col gap-1">
              {['ready', 'down', 'hold', 'up', 'rest'].map((p, index) => {
                const isActive = phase === p;
                const labels: Record<string, string> = {
                  ready: 'READY',
                  down: 'DOWN',
                  hold: 'HOLD',
                  up: 'UP',
                  rest: 'REST',
                };
                return (
                  <div
                    key={p}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${isActive ? 'scale-105' : 'opacity-40'}`}
                    style={{
                      backgroundColor: isActive ? `${colors.primary}30` : 'transparent',
                      boxShadow: isActive ? `0 0 10px ${colors.primary}40` : 'none',
                    }}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${isActive ? 'animate-pulse' : ''}`}
                      style={{ backgroundColor: isActive ? colors.primary : 'rgba(255,255,255,0.3)' }}
                    />
                    <span
                      className="text-xs font-bold"
                      style={{ color: isActive ? colors.primary : 'rgba(255,255,255,0.5)' }}
                    >
                      {labels[p]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 하단 - XP 바 스타일 정확도 */}
          <div
            className="absolute bottom-4 left-4 right-4 px-4 py-3 rounded-xl backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              border: `1px solid ${colors.primary}40`,
            }}
          >
            {/* 정확도 레이블 */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wider">ACCURACY</span>
              <span
                className="text-sm font-bold"
                style={{ color: accuracy >= 80 ? '#22C55E' : accuracy >= 50 ? '#F59E0B' : '#EF4444' }}
              >
                {Math.round(accuracy)}%
              </span>
            </div>

            {/* XP 바 */}
            <div
              className="h-3 rounded-full overflow-hidden"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div
                className="h-full rounded-full transition-all duration-500 relative"
                style={{
                  width: `${accuracy}%`,
                  background: accuracy >= 80
                    ? 'linear-gradient(90deg, #22C55E, #16A34A)'
                    : accuracy >= 50
                    ? 'linear-gradient(90deg, #F59E0B, #D97706)'
                    : 'linear-gradient(90deg, #EF4444, #DC2626)',
                  boxShadow: `0 0 10px ${accuracy >= 80 ? '#22C55E' : accuracy >= 50 ? '#F59E0B' : '#EF4444'}80`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full" />
              </div>
            </div>

            {/* 피드백 메시지 */}
            {feedback && (
              <div
                className="mt-3 text-center text-sm font-medium py-2 px-4 rounded-lg"
                style={{
                  backgroundColor: `${colors.primary}20`,
                  color: colors.primary,
                }}
              >
                {feedback}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 시작 오버레이 */}
      {!isReady && countdown === null && (
        <ExerciseStartOverlay
          exerciseName={info.koreanName}
          isCharacterLoaded={show3DCharacter ? isCharacterLoaded : true}
          detectorError={detectorError}
          themeColors={{ primary: colors.primary, secondary: colors.secondary }}
          onStart={handleStart}
          onBack={() => router.push('/exercise')}
        />
      )}

      {/* 캘리브레이션 오버레이 */}
      {showCalibration && (
        <CalibrationOverlay
          themeColor={colors.primary}
          duration={5}
          currentLandmarks={currentLandmarks}
          onComplete={handleCalibrationComplete}
        />
      )}

      {/* 카운트다운 오버레이 */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
          <span
            className="text-9xl font-bold animate-pulse"
            style={{ color: colors.primary }}
          >
            {countdown}
          </span>
        </div>
      )}

      {/* NPC 대화창 */}
      {showNPCDialogue && (
        <div className="absolute bottom-32 left-0 right-0 z-30 px-4">
          <NPCDialogue
            worldview={currentWorldview}
            emotion={npcEmotion}
            dialogue={npcDialogue}
            position="left"
            ttsEnabled={true}
            autoHideDelay={0}
            visible={showNPCDialogue}
            onTap={() => setShowNPCDialogue(false)}
          />
        </div>
      )}

      {/* 운동 완료 화면 */}
      {isComplete && (
        <ExerciseCompleteScreen
          currentRep={currentRep}
          targetReps={targetReps}
          accuracy={accuracy}
          performanceRating={performanceRating}
          completionStory={completionStory}
          currentWorldview={currentWorldview}
          themeColor={colors.primary}
          onEnd={handleEnd}
          onRetry={() => {
            // 감지기 리셋
            if (detectorRef.current) {
              detectorRef.current.reset();
              lastRepCountRef.current = 0;
              accumulatedAccuracyRef.current = [];
            }
            setIsComplete(false);
            setIsReady(false);
            setShowNPCDialogue(false);
            setCompletionStory('');
          }}
        />
      )}

      {/* 세션 복구 모달 */}
      {showRecoveryModal && (
        <InlineSessionRecoveryModal
          exerciseName={info.koreanName}
          onRecover={handleSessionRecover}
          onDiscard={handleSessionDiscard}
        />
      )}
    </div>
  );
}
