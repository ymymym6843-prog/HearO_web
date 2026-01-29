'use client';

/**
 * 운동 실행 페이지
 * HybridScene 기반 4단계 Phase 시스템:
 * - intro: 2D NPC + VN 대화
 * - transition: 2D→3D 전환
 * - exercise: 3D VRM + 카메라 + 운동 감지
 * - epilogue: 결과 화면
 */

import { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useWorldStore } from '@/stores/useWorldStore';
import { useExerciseStore } from '@/stores/useExerciseStore';
import { useCharacterStore } from '@/stores/useCharacterStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { usePhaseStore, useCurrentPhase, useLayerVisibility } from '@/stores/usePhaseStore';
import { useStoryProgressStore } from '@/stores/useStoryProgressStore';
import { WORLDVIEW_COLORS } from '@/constants/themes';
import { WORLDVIEW_MODELS } from '@/types/vrm';
import { createExerciseIntroDialogue } from '@/constants/exerciseDialogues';
import { getWorldviewOnboardingDialogue } from '@/constants/worldviewIntros';
import { getContextualGreeting, type StoryContext } from '@/constants/dialogueVariants';
import { NPCDialogue } from '@/components/story/NPCDialogue';
import {
  ExerciseCompleteScreen,
  InlineSessionRecoveryModal,
  CalibrationOverlay,
} from '@/components/exercise';
import { sfxService } from '@/services/sfxService';
import { ttsService } from '@/services/ttsService';
import { stop as stopHybridTTS } from '@/services/tts/hybridTTS';
import { useBGM } from '@/contexts/BGMContext';
import { storyService } from '@/services/storyService';
import { hapticService } from '@/services/hapticService';
import {
  sessionRecoveryService,
  type SavedSessionState,
} from '@/services/sessionRecoveryService';
import {
  getRandomCompletionAnimation,
} from '@/services/vrmFeedbackService';
import { getPerformanceDialogue } from '@/constants/npcDialogueTemplates';
import { getDetectorForExercise, resetDetector, type BaseDetector, type ExercisePhase as DetectorPhase } from '@/lib/exercise/detection';
import type { ExerciseType, ExercisePhase, PerformanceRating } from '@/types/exercise';
import type { Landmark } from '@/types/pose';
import { MediaErrorBoundary } from '@/components/common';
import { Icon } from '@/components/ui/Icon';
import { VoiceCommandButton } from '@/components/ui/VoiceCommandButton';
import { useSceneSettings } from '@/hooks/useSceneSettings';
import { SceneSettingsPanel } from '@/components/three/SceneSettingsPanel';
import type { AnimationPreset, TrackingMode } from '@/components/three/VRMCharacter';

// HybridScene 컴포넌트 (lazy load)
const HybridScene = dynamic(() => import('@/components/hybrid/HybridScene'), { ssr: false });
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
  arm_raise_front: {
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

// 운동별 카메라 비율 설정
type CameraOrientation = 'portrait' | 'landscape';

const exerciseCameraOrientation: Partial<Record<ExerciseType, CameraOrientation>> = {
  squat: 'portrait',
  wall_squat: 'portrait',
  chair_stand: 'portrait',
  straight_leg_raise: 'landscape',
  standing_march_slow: 'portrait',
  seated_knee_lift: 'portrait',
  arm_raise_front: 'landscape',
  shoulder_abduction: 'landscape',
  elbow_flexion: 'landscape',
  wall_push: 'landscape',
  seated_core_hold: 'portrait',
  standing_anti_extension_hold: 'portrait',
  standing_arm_raise_core: 'landscape',
  bridge: 'landscape',
};

// 위로 먼저 움직이는 운동 (big_is_up: MOVING = UP)
// 이 운동들은 READY → UP → HOLD → DOWN → REST 순서
const UPWARD_FIRST_EXERCISES = new Set<ExerciseType>([
  'arm_raise_front',
  'shoulder_abduction',
  'straight_leg_raise',
  'seated_knee_lift',
  'standing_arm_raise_core',
  'bridge',
]);

// 카메라 크기 계산 (PIP 모드)
function getCameraDimensions(orientation: CameraOrientation, isPip: boolean) {
  if (!isPip) {
    return orientation === 'portrait'
      ? { width: 480, height: 640 }
      : { width: 640, height: 480 };
  }

  return orientation === 'portrait'
    ? { width: 300, height: 400 }
    : { width: 400, height: 300 };
}

interface ExercisePageProps {
  params: Promise<{ id: string }>;
}

export default function ExercisePage({ params }: ExercisePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const exerciseId = resolvedParams.id as ExerciseType;
  const romDebugEnabled = searchParams.get('romDebug') === 'true';

  const { currentWorldview, isFirstVisit, markVisited } = useWorldStore();
  const { getProgress, advanceEpisode } = useStoryProgressStore();
  const {
    currentRep,
    targetReps,
    currentSet,
    targetSets,
    phase,
    accuracy,
    progress,
    feedback,
    isActive,
    setExercise,
    startSession,
    incrementReps,
    setPhase,
    updateAccuracy,
    updateProgress,
    updateAngle,
    setFeedback,
  } = useExerciseStore();
  const {
    resetCalibration,
  } = useCharacterStore();
  const { show3DCharacter, ttsEnabled, updateSetting } = useSettingsStore();

  // Phase Store (HybridScene용)
  const {
    setPhase: setWorkflowPhase,
    startTransition,
    startDialogue,
    addEventListener,
  } = usePhaseStore();
  const currentWorkflowPhase = useCurrentPhase();
  const layers = useLayerVisibility();

  // BGM Context (전역 BGM 관리)
  const { playBGM, crossFadeTo, fadeOut: fadeOutBGM, stop: stopBGM, init: initBGM } = useBGM();

  // 로컬 상태
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showNPCDialogue, setShowNPCDialogue] = useState(false);
  const [npcDialogue, setNpcDialogue] = useState('');
  const [npcEmotion, setNpcEmotion] = useState<'normal' | 'happy' | 'serious'>('normal');
  const [isComplete, setIsComplete] = useState(false);
  const [performanceRating, setPerformanceRating] = useState<PerformanceRating>('normal');
  const [completionStory, setCompletionStory] = useState<string>('');
  const [detectorError, setDetectorError] = useState<string | null>(null);
  const [animationPreset, setAnimationPreset] = useState<AnimationPreset>('A'); // 기본: 등장 → 대기
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('animation'); // 기본: 애니메이션 모드
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveredReps, setRecoveredReps] = useState(0);

  // VRM 애니메이션/표정 상태 (향후 HybridScene에 전달 예정)
  const [_vrmAnimationUrl, setVrmAnimationUrl] = useState<string | null>(null);

  // MediaPipe 초기화 상태
  const [mediaPipeReady, setMediaPipeReady] = useState(false);

  // 캘리브레이션 플로우 상태
  const [showCalibration, setShowCalibration] = useState(false);
  const [currentLandmarks, setCurrentLandmarks] = useState<Landmark[] | null>(null);

  // 운동 감지기 참조
  const detectorRef = useRef<BaseDetector | null>(null);
  const lastRepCountRef = useRef(0);
  const accumulatedAccuracyRef = useRef<number[]>([]);

  // 상태 업데이트 throttle
  const lastUpdateTimeRef = useRef(0);
  const THROTTLE_MS = 100;

  // 세션 복구용 시간 추적
  const elapsedSecondsRef = useRef(0);
  const sessionStartTimeRef = useRef<number | null>(null);

  // 운동 완료 중복 호출 방지
  const completionGuardRef = useRef(false);

  // 홀드 타이머 상태
  const [holdTime, setHoldTime] = useState(0);
  const holdExercises: ExerciseType[] = ['wall_squat', 'seated_core_hold', 'standing_anti_extension_hold'];
  const isHoldExercise = holdExercises.includes(exerciseId);
  const targetHoldTime = exerciseId === 'wall_squat' ? 30 : 10;

  // 씬 설정
  const [showSceneSettings, setShowSceneSettings] = useState(false);
  const sceneSettings = useSceneSettings();

  // 배경 관리 (HybridScene에서 노출된 컨트롤 사용)
  const [bgControl, setBgControl] = useState<{
    randomBackground: () => void;
    currentIndex: number;
    totalCount: number;
  } | null>(null);

  const colors = WORLDVIEW_COLORS[currentWorldview];
  const modelUrl = WORLDVIEW_MODELS[currentWorldview].modelUrl;
  const info = exerciseInfo[exerciseId] || { koreanName: exerciseId, targetReps: 10 };

  // SFX 초기화
  const initAudio = useCallback(() => {
    sfxService.init();
  }, []);

  // 운동 설정 및 감지기 초기화
  useEffect(() => {
    setExercise(exerciseId);

    const initializeDetector = () => {
      try {
        resetDetector(exerciseId);
        detectorRef.current = getDetectorForExercise(exerciseId);
        lastRepCountRef.current = 0;
        accumulatedAccuracyRef.current = [];

        // ROM 디버그 모드 활성화 (URL: ?romDebug=true)
        if (romDebugEnabled && detectorRef.current) {
          detectorRef.current.setDebugMode(true);
          console.log('[ROM-Debug] Enabled via URL parameter');
        }

        return null;
      } catch (error) {
        console.error('감지기 초기화 실패:', error);
        return error instanceof Error
          ? `운동 감지기 초기화 실패: ${error.message}`
          : '운동 감지기를 초기화할 수 없습니다';
      }
    };

    const error = initializeDetector();
    queueMicrotask(() => {
      setDetectorError(error);
    });

    return () => {
      resetDetector(exerciseId);
      detectorRef.current = null;
    };
  }, [exerciseId, setExercise, romDebugEnabled]);

  // 페이지 로드 시 intro phase로 시작 + 대화 시작 + BGM 시작
  useEffect(() => {
    // Phase를 intro로 설정
    setWorkflowPhase('intro');

    // 온보딩 + 인트로 대화 시퀀스 결합
    const firstVisit = isFirstVisit(currentWorldview);
    const exerciseDialogue = createExerciseIntroDialogue(currentWorldview, exerciseId);

    let prefixEntries;
    if (firstVisit) {
      // 첫 방문: 풀 온보딩 다이얼로그
      prefixEntries = getWorldviewOnboardingDialogue(currentWorldview, true);
      markVisited(currentWorldview);
    } else {
      // 재방문: 스토리 진행 기반 컨텍스트 인사
      const progress = getProgress(currentWorldview);
      const storyCtx: StoryContext = {
        chapter: progress.chapter,
        episode: progress.episode,
        totalSessions: progress.totalSessions,
        streakDays: 0, // TODO: 실제 스트릭 데이터 연동
        isFirstVisit: false,
      };
      prefixEntries = getContextualGreeting(currentWorldview, storyCtx);
    }

    const combinedSequence = {
      ...exerciseDialogue,
      id: `onboard-intro-${currentWorldview}-${exerciseId}`,
      entries: [...prefixEntries, ...exerciseDialogue.entries],
    };
    startDialogue(combinedSequence);

    // BGM 초기화 및 프롤로그 BGM 시작
    if (currentWorldview) {
      initBGM().then(() => {
        playBGM(currentWorldview, 'prologue_bgm');
      }).catch((err) => {
        console.error('[BGM] Failed to init/play prologue_bgm:', err);
      });
    }

    return () => {
      // 컴포넌트 언마운트 시 정리
      stopBGM();
      ttsService.stop();
      stopHybridTTS().catch(() => {/* ignore cleanup errors */});
      sessionRecoveryService.stopAutoSave();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorldview, exerciseId, setWorkflowPhase, startDialogue, initBGM, playBGM, stopBGM]);

  // 카운트다운 시작 (대화 완료 또는 스킵 버튼 클릭 시)
  const handleStartCountdown = useCallback(() => {
    initAudio();
    sfxService.playCommonSFX('tap');
    resetCalibration();
    setCountdown(3);
  }, [initAudio, resetCalibration]);

  // Phase 이벤트 리스너
  useEffect(() => {
    const unsubscribe = addEventListener((event) => {
      if (event.type === 'DIALOGUE_COMPLETE') {
        // 대화 완료 시 전환 시작
        startTransition('exercise', { duration: 1000 });
        // 애니메이션 중지 → Kalidokit (사용자 포즈 인식) 활성화
        setAnimationPreset('none');
        // 추적 모드를 포즈로 변경 (운동 중 사용자 움직임 추적)
        setTrackingMode('pose');
      } else if (event.type === 'TRANSITION_COMPLETE') {
        // 전환 완료 시 카운트다운 시작
        handleStartCountdown();
      }
    });

    return unsubscribe;
  }, [addEventListener, startTransition, handleStartCountdown]);

  // 세션 복구 확인
  useEffect(() => {
    const recoverable = sessionRecoveryService.checkRecoverableSession();
    if (recoverable && recoverable.canRecover) {
      if (recoverable.sessionState.exerciseType === exerciseId) {
        queueMicrotask(() => {
          setShowRecoveryModal(true);
        });
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
    setRecoveredReps(recoveredState.currentRep);
    elapsedSecondsRef.current = recoveredState.elapsedSeconds;
    lastRepCountRef.current = recoveredState.currentRep;
    accumulatedAccuracyRef.current = recoveredState.repData.map(r => r.accuracy);
    setShowRecoveryModal(false);
  }, []);

  // 세션 복구 취소
  const handleSessionDiscard = useCallback(() => {
    sessionRecoveryService.clearSessionState();
    setShowRecoveryModal(false);
  }, []);

  // 캘리브레이션 완료 콜백
  const handleCalibrationComplete = () => {
    setShowCalibration(false);
    sfxService.playCommonSFX('success');
    setCountdown(3);
  };

  // 카운트다운 효과
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      sfxService.playCommonSFX('countdown');
      ttsService.speakCountdown(countdown);
      hapticService.countdown();
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setCountdown(null);

        const startingReps = recoveredReps > 0 ? recoveredReps : 0;
        startSession(info.targetReps, 3);

        if (startingReps > 0) {
          for (let i = 0; i < startingReps; i++) {
            incrementReps();
          }
        }

        sessionStartTimeRef.current = Date.now();
        sessionRecoveryService.startAutoSave(getSessionState, 5000);

        // 스토리 BGM → 운동 BGM으로 크로스페이드 (끊김 없음)
        crossFadeTo(currentWorldview, 'exercise_bgm', 2000);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [countdown, startSession, info.targetReps, currentWorldview, getSessionState, recoveredReps, incrementReps, crossFadeTo]);

  // 운동 완료 처리
  const handleExerciseComplete = useCallback(async (rating: PerformanceRating) => {
    // 중복 호출 방지 (리렌더/재시도/중복 트리거 대응)
    if (completionGuardRef.current) return;
    completionGuardRef.current = true;

    setPerformanceRating(rating);
    setIsComplete(true);

    // 스토리 진행 (에피소드 + 챕터 자동 관리)
    advanceEpisode(currentWorldview);

    // 완료 애니메이션 재생을 위해 추적 모드를 animation으로 전환
    setTrackingMode('animation');

    const animationUrl = getRandomCompletionAnimation(rating);
    setVrmAnimationUrl(animationUrl);

    // Note: VRM expression은 현재 HybridScene에서 직접 처리
    // 향후 필요 시 vrmExpression state 추가하여 전달 가능

    sessionRecoveryService.stopAutoSave();
    sessionRecoveryService.clearSessionState();

    // BGM 페이드아웃 (전역 Context 사용)
    fadeOutBGM(1500);
    sfxService.playExerciseCompleteSFX();
    hapticService.exerciseComplete();

    setNpcDialogue(getPerformanceDialogue(currentWorldview, rating));
    setNpcEmotion(rating === 'perfect' ? 'happy' : rating === 'good' ? 'normal' : 'serious');
    setShowNPCDialogue(true);

    ttsService.playPrerenderedTTS(currentWorldview, exerciseId, rating);

    try {
      // 스토리 진행 컨텍스트 구성
      const progress = getProgress(currentWorldview);
      const epilogueContext = {
        chapter: progress.chapter,
        episode: progress.episode,
        totalSessions: progress.totalSessions,
        streakDays: 0, // TODO: 실제 스트릭 데이터 연동
        isFirstVisit: progress.totalSessions <= 1,
        grade: rating,
      };

      const story = await storyService.getStoryWithContext(
        currentWorldview, exerciseId, rating, epilogueContext
      );
      if (story) {
        setCompletionStory(story);
      } else {
        setCompletionStory(storyService.getDefaultStory(rating));
      }
    } catch (error) {
      console.error('Failed to load story:', error);
      setCompletionStory(storyService.getDefaultStory(rating));
    }
  }, [currentWorldview, exerciseId, fadeOutBGM, advanceEpisode, getProgress]);

  // 운동 성공 시 효과음
  const playSuccessSFX = useCallback(() => {
    sfxService.playExerciseSuccessSFX(currentWorldview);
  }, [currentWorldview]);

  // 감지기 상태를 스토어 상태로 변환 (운동 방향 반영)
  const isUpwardFirst = UPWARD_FIRST_EXERCISES.has(exerciseId);

  const mapDetectorPhaseToStore = useCallback((detectorPhase: DetectorPhase): ExercisePhase => {
    const phaseMap: Record<DetectorPhase, ExercisePhase> = {
      'IDLE': 'ready',
      'READY': 'ready',
      'MOVING': isUpwardFirst ? 'up' : 'down',
      'HOLDING': 'hold',
      'RETURNING': isUpwardFirst ? 'down' : 'up',
      'COOLDOWN': 'rest',
    };
    return phaseMap[detectorPhase] || 'ready';
  }, [isUpwardFirst]);

  // 포즈 감지 콜백
  const handlePoseDetected = useCallback((landmarks: Landmark[] | null) => {
    if (landmarks && !mediaPipeReady) {
      setMediaPipeReady(true);
    }

    if (landmarks) {
      setCurrentLandmarks(landmarks);
    }

    if (!landmarks || !isActive || !detectorRef.current) return;

    const now = Date.now();

    const result = detectorRef.current.processFrame(landmarks);

    const currentRepCount = detectorRef.current.getRepCount();
    if (currentRepCount > lastRepCountRef.current) {
      lastRepCountRef.current = currentRepCount;
      accumulatedAccuracyRef.current.push(result.accuracy);

      incrementReps();
      playSuccessSFX();
      hapticService.repComplete();

      if (currentRepCount >= targetReps) {
        const avgAccuracy = accumulatedAccuracyRef.current.length > 0
          ? accumulatedAccuracyRef.current.reduce((a, b) => a + b, 0) / accumulatedAccuracyRef.current.length
          : 0;

        let rating: 'perfect' | 'good' | 'normal' = 'normal';
        if (avgAccuracy >= 85) rating = 'perfect';
        else if (avgAccuracy >= 65) rating = 'good';

        handleExerciseComplete(rating);
      }
    }

    if (now - lastUpdateTimeRef.current < THROTTLE_MS) {
      return;
    }
    lastUpdateTimeRef.current = now;

    const storePhase = mapDetectorPhaseToStore(result.phase);
    setPhase(storePhase);
    updateAccuracy(result.accuracy);
    updateProgress(result.progress);
    updateAngle(result.currentAngle);
    setFeedback(result.feedback);

    // Note: VRM expression 업데이트는 HybridScene에서 처리
    // 향후 실시간 표정 변경 필요 시 여기서 처리

    if (isHoldExercise && result.holdProgress !== undefined) {
      setHoldTime(result.holdProgress * targetHoldTime);
    }
  }, [isActive, setPhase, updateAccuracy, updateProgress, updateAngle, setFeedback, incrementReps, playSuccessSFX, targetReps, handleExerciseComplete, isHoldExercise, targetHoldTime, mediaPipeReady, mapDetectorPhaseToStore]);

  // 종료
  const handleEnd = () => {
    stopBGM();
    ttsService.stop();
    stopHybridTTS().catch(() => {/* ignore cleanup errors */});
    router.push('/exercise');
  };

  // 음성 명령 핸들러들
  const handleVoiceStart = useCallback(() => {
    if (currentWorkflowPhase === 'intro') {
      // 인트로에서 시작 명령 → 대화 스킵 후 운동 시작
      startTransition('exercise', { duration: 500 });
      setAnimationPreset('none');
    }
  }, [currentWorkflowPhase, startTransition]);

  const handleVoiceNext = useCallback(() => {
    // 다음 명령 처리 (필요시 구현)
    console.log('[Voice] Next command');
  }, []);

  const handleVoicePause = useCallback(() => {
    if (isActive) {
      setPhase('rest');
    }
  }, [isActive, setPhase]);

  const handleVoiceRestart = useCallback(() => {
    // 현재 세트 재시작
    if (isActive) {
      // 횟수 초기화 등 필요한 로직
      console.log('[Voice] Restart command');
    }
  }, [isActive]);

  // 운동 중인지 여부 (exercise phase + 카운트다운 완료)
  const isExercising = currentWorkflowPhase === 'exercise' && countdown === null && isActive;

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ backgroundColor: colors.background }}>
      {/* HybridScene - 2D/3D 하이브리드 렌더링 */}
      <HybridScene
        worldview={currentWorldview}
        vrmModelUrl={modelUrl}
        usePanoramaBg={true}
        showBgRandomizer={true}
        initialPhase="intro"
        onPhaseChange={(p) => console.log('[ExercisePage] Phase changed:', p)}
        onVRMLoaded={() => console.log('[ExercisePage] VRM loaded')}
        exposeBackgroundControl={setBgControl}
        lightingSettings={sceneSettings.lighting}
        cameraAngle={sceneSettings.cameraAngle}
        sceneHelpers={sceneSettings.helpers}
        animationPreset={animationPreset}
        trackingMode={trackingMode}
        enableTTS={ttsEnabled}
        className="absolute inset-0"
      >
        {/* Children: 운동 UI 오버레이 */}
      </HybridScene>

      {/* 상단 헤더 */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-30">
        <Link
          href="/exercise"
          className="px-4 py-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
        >
          ← 종료
        </Link>

        <div className="text-center">
          <h1 className="text-xl font-bold text-white">{info.koreanName}</h1>
          {isExercising && (
            <p className="text-white/60 text-sm">
              세트 {currentSet}/{targetSets}
            </p>
          )}
        </div>

        {/* 우측 버튼들 */}
        <div className="flex items-center gap-2">
          {/* exercise phase에서 씬 설정 */}
          {currentWorkflowPhase === 'exercise' && show3DCharacter && (
            <button
              onClick={() => setShowSceneSettings(!showSceneSettings)}
              className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                showSceneSettings
                  ? 'text-white'
                  : 'bg-black/30 text-white/70 hover:bg-black/50'
              }`}
              style={showSceneSettings ? { backgroundColor: `${colors.primary}80` } : undefined}
              title="씬 설정"
            >
              <Icon name="settings-outline" size={18} color={showSceneSettings ? '#FFFFFF' : '#FFFFFF99'} />
            </button>
          )}

          {/* TTS 토글 (프롤로그 + 운동 모든 phase에서 표시) */}
          <button
            onClick={() => updateSetting('ttsEnabled', !ttsEnabled)}
            className={`px-3 py-2 rounded-full backdrop-blur-sm flex items-center gap-2 transition-colors ${
              ttsEnabled
                ? 'text-white'
                : 'bg-black/30 text-white/70 hover:bg-black/50'
            }`}
            style={ttsEnabled ? { backgroundColor: `${colors.primary}80` } : undefined}
            title={ttsEnabled ? 'TTS 끄기' : 'TTS 켜기'}
          >
            <Icon name={ttsEnabled ? 'volume-high-outline' : 'volume-mute-outline'} size={18} color={ttsEnabled ? '#FFFFFF' : '#FFFFFF99'} />
            <span className="text-sm font-medium">TTS</span>
          </button>

          {/* exercise phase에서 3D 토글 */}
          {currentWorkflowPhase === 'exercise' && (
            <button
              onClick={() => updateSetting('show3DCharacter', !show3DCharacter)}
              className={`px-3 py-2 rounded-full backdrop-blur-sm flex items-center gap-2 transition-colors ${
                show3DCharacter
                  ? 'text-white'
                  : 'bg-black/30 text-white/70 hover:bg-black/50'
              }`}
              style={show3DCharacter ? { backgroundColor: `${colors.primary}80` } : undefined}
              title={show3DCharacter ? '3D 캐릭터 끄기' : '3D 캐릭터 켜기'}
            >
              <Icon name="cube-outline" size={18} color={show3DCharacter ? '#FFFFFF' : '#FFFFFF99'} />
              <span className="text-sm font-medium">3D</span>
            </button>
          )}
        </div>
      </div>

      {/* 씬 설정 패널 */}
      {currentWorkflowPhase === 'exercise' && show3DCharacter && showSceneSettings && (
        <div className="absolute top-20 right-4 z-30 w-64">
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
            onRandomizeBackground={bgControl?.randomBackground}
            backgroundIndex={bgControl?.currentIndex}
            backgroundTotal={bgControl?.totalCount}
            animationPreset={animationPreset}
            onAnimationPresetChange={setAnimationPreset}
            onReset={sceneSettings.resetToDefaults}
            compact
          />
        </div>
      )}

      {/* 카메라 피드 (exercise phase에서만 표시) */}
      {layers.mediapipe && currentWorkflowPhase === 'exercise' && (
        <div className={`absolute z-20 ${
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
                    showHandSkeleton={false}
                    enableHandTracking={true}
                    worldview={currentWorldview}
                    onPoseDetected={handlePoseDetected}
                  />
                );
              })()}
            </MediaErrorBoundary>
          </div>
        </div>
      )}

      {/* 게이미피케이션 HUD (exercise phase + 운동 중) */}
      {isExercising && (
        <div className="absolute inset-0 pointer-events-none z-20">
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

          {/* 우상단 - 스코어 카운터 */}
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

          {/* 좌측 중앙 - 운동 단계 */}
          <div
            className="absolute left-4 top-1/2 -translate-y-1/2 px-4 py-3 rounded-xl backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              border: `1px solid ${colors.primary}50`,
            }}
          >
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">PHASE</p>
            <div className="flex flex-col gap-1">
              {(isUpwardFirst
                ? ['ready', 'up', 'hold', 'down', 'rest']
                : ['ready', 'down', 'hold', 'up', 'rest']
              ).map((p) => {
                const isCurrentPhase = phase === p;
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
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${isCurrentPhase ? 'scale-105' : 'opacity-40'}`}
                    style={{
                      backgroundColor: isCurrentPhase ? `${colors.primary}30` : 'transparent',
                      boxShadow: isCurrentPhase ? `0 0 10px ${colors.primary}40` : 'none',
                    }}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${isCurrentPhase ? 'animate-pulse' : ''}`}
                      style={{ backgroundColor: isCurrentPhase ? colors.primary : 'rgba(255,255,255,0.3)' }}
                    />
                    <span
                      className="text-xs font-bold"
                      style={{ color: isCurrentPhase ? colors.primary : 'rgba(255,255,255,0.5)' }}
                    >
                      {labels[p]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 하단 - ROM 진행 바 + 정확도 */}
          <div
            className="absolute bottom-4 left-4 right-4 px-4 py-3 rounded-xl backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              border: `1px solid ${colors.primary}40`,
            }}
          >
            {/* ROM Progress + Accuracy 동시 표시 */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wider">ROM</span>
              <div className="flex items-center gap-3">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: accuracy >= 80 ? '#22C55E20' : accuracy >= 50 ? '#F59E0B20' : '#EF444420',
                    color: accuracy >= 80 ? '#22C55E' : accuracy >= 50 ? '#F59E0B' : '#EF4444',
                  }}
                >
                  정확도 {Math.round(accuracy)}%
                </span>
                <span
                  className="text-sm font-bold"
                  style={{ color: colors.primary }}
                >
                  {Math.round(progress * 100)}%
                </span>
              </div>
            </div>

            <div
              className="h-3 rounded-full overflow-hidden"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div
                className="h-full rounded-full transition-all duration-300 relative"
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  background: `linear-gradient(90deg, ${colors.primary}CC, ${colors.primary})`,
                  boxShadow: `0 0 10px ${colors.primary}80`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full" />
              </div>
            </div>

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
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-40">
          <span
            className="text-9xl font-bold animate-pulse"
            style={{ color: colors.primary }}
          >
            {countdown}
          </span>
        </div>
      )}

      {/* 에러 표시 */}
      {detectorError && currentWorkflowPhase === 'intro' && (
        <div className="absolute bottom-32 left-4 right-4 z-30">
          <div className="bg-red-500/80 backdrop-blur-sm rounded-xl p-4 text-white text-center">
            {detectorError}
          </div>
        </div>
      )}

      {/* NPC 대화창 (운동 완료 시) */}
      {showNPCDialogue && (
        <div className="absolute bottom-32 left-0 right-0 z-30 px-4">
          <NPCDialogue
            worldview={currentWorldview}
            emotion={npcEmotion}
            dialogue={npcDialogue}
            position="left"
            ttsEnabled={ttsEnabled}
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
            if (detectorRef.current) {
              detectorRef.current.reset();
              lastRepCountRef.current = 0;
              accumulatedAccuracyRef.current = [];
            }
            completionGuardRef.current = false;
            setIsComplete(false);
            setShowNPCDialogue(false);
            setCompletionStory('');
            // 추적 모드와 애니메이션 프리셋 리셋
            setTrackingMode('animation');
            setAnimationPreset('A');
            // intro로 다시 시작 (재시도이므로 재방문 컨텍스트 인사)
            setWorkflowPhase('intro');
            const retryProgress = getProgress(currentWorldview);
            const retryCtx: StoryContext = {
              chapter: retryProgress.chapter,
              episode: retryProgress.episode,
              totalSessions: retryProgress.totalSessions,
              streakDays: 0,
              isFirstVisit: false,
            };
            const retryGreeting = getContextualGreeting(currentWorldview, retryCtx);
            const exerciseDialogue = createExerciseIntroDialogue(currentWorldview, exerciseId);
            const retrySequence = {
              ...exerciseDialogue,
              id: `retry-intro-${currentWorldview}-${exerciseId}`,
              entries: [...retryGreeting, ...exerciseDialogue.entries],
            };
            startDialogue(retrySequence);
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

      {/* 음성 명령 버튼 - 운동 화면에서 표시 */}
      {currentWorkflowPhase === 'exercise' && !isComplete && (
        <VoiceCommandButton
          onStart={handleVoiceStart}
          onNext={handleVoiceNext}
          onPause={handleVoicePause}
          onRestart={handleVoiceRestart}
          className="fixed bottom-24 right-4 z-50"
          size="lg"
        />
      )}
    </div>
  );
}
