/**
 * VRM 피드백 서비스
 * 운동 완료 시 애니메이션 재생 및 실시간 표정 변화
 */

import type { VRM } from '@pixiv/three-vrm';
import type { PerformanceRating } from '@/types/exercise';

// ============================================================================
// 타입 정의
// ============================================================================

export type VRMExpressionName =
  | 'happy'
  | 'angry'
  | 'sad'
  | 'relaxed'
  | 'surprised'
  | 'neutral';

export interface AnimationConfig {
  url: string;
  duration?: number; // 재생 시간 (ms), 없으면 전체 재생
}

// ============================================================================
// 등급별 애니메이션 매핑
// ============================================================================

export const COMPLETION_ANIMATIONS: Record<PerformanceRating, AnimationConfig[]> = {
  perfect: [
    { url: '/animations/Clapping.vrma' },
    { url: '/animations/Happy.vrma' },
    { url: '/animations/PeaceSign.vrma' },
  ],
  good: [
    { url: '/animations/Liked.vrma' },
    { url: '/animations/Greeting.vrma' },
  ],
  normal: [
    { url: '/animations/Thinking.vrma' },
    { url: '/animations/Relax.vrma' },
  ],
};

// 대기/아이들 애니메이션
export const IDLE_ANIMATIONS: AnimationConfig[] = [
  { url: '/animations/Waiting.vrma' },
  { url: '/animations/LookAround.vrma' },
  { url: '/animations/Thinking.vrma' },
];

// 시작/종료 애니메이션
export const GREETING_ANIMATIONS = {
  start: { url: '/animations/Greeting.vrma' },
  end: { url: '/animations/Goodbye.vrma' },
};

// ============================================================================
// 정확도별 표정 매핑
// ============================================================================

export interface ExpressionState {
  name: VRMExpressionName;
  intensity: number; // 0~1
}

/**
 * 정확도에 따른 표정 결정
 * @param accuracy 0~100
 */
export function getExpressionForAccuracy(accuracy: number): ExpressionState {
  if (accuracy >= 85) {
    return { name: 'happy', intensity: 0.8 };
  } else if (accuracy >= 70) {
    return { name: 'happy', intensity: 0.5 };
  } else if (accuracy >= 50) {
    return { name: 'neutral', intensity: 0 };
  } else if (accuracy >= 30) {
    return { name: 'surprised', intensity: 0.4 };
  } else {
    return { name: 'sad', intensity: 0.3 };
  }
}

/**
 * 운동 단계에 따른 표정 결정
 */
export function getExpressionForPhase(
  phase: string,
  accuracy: number
): ExpressionState {
  switch (phase) {
    case 'hold':
      // 홀드 중에는 집중하는 표정
      return accuracy >= 70
        ? { name: 'happy', intensity: 0.3 }
        : { name: 'neutral', intensity: 0 };

    case 'rest':
      return { name: 'relaxed', intensity: 0.6 };

    default:
      return getExpressionForAccuracy(accuracy);
  }
}

// ============================================================================
// VRM 표정 제어 함수
// ============================================================================

/**
 * VRM 표정 설정
 */
export function setVRMExpression(
  vrm: VRM | null,
  expression: ExpressionState,
  transitionTime: number = 200
): void {
  if (!vrm?.expressionManager) return;

  const manager = vrm.expressionManager;

  // 모든 표정 리셋
  const allExpressions: VRMExpressionName[] = [
    'happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral'
  ];

  // VRM 표정명 매핑 (VRM 1.0 스펙)
  const vrmExpressionMap: Record<VRMExpressionName, string> = {
    happy: 'happy',
    angry: 'angry',
    sad: 'sad',
    relaxed: 'relaxed',
    surprised: 'surprised',
    neutral: 'neutral',
  };

  // 기존 표정 서서히 줄이기
  allExpressions.forEach((exp) => {
    const vrmExpName = vrmExpressionMap[exp];
    const currentValue = manager.getValue(vrmExpName) ?? 0;
    if (currentValue > 0 && exp !== expression.name) {
      manager.setValue(vrmExpName, Math.max(0, currentValue - 0.1));
    }
  });

  // 새 표정 설정
  if (expression.name !== 'neutral') {
    const targetExp = vrmExpressionMap[expression.name];
    manager.setValue(targetExp, expression.intensity);
  }
}

/**
 * VRM 표정 리셋 (중립)
 */
export function resetVRMExpression(vrm: VRM | null): void {
  if (!vrm?.expressionManager) return;

  const expressions = ['happy', 'angry', 'sad', 'relaxed', 'surprised'];
  expressions.forEach((exp) => {
    vrm.expressionManager?.setValue(exp, 0);
  });
}

// ============================================================================
// 랜덤 애니메이션 선택
// ============================================================================

/**
 * 등급에 맞는 랜덤 애니메이션 URL 반환
 */
export function getRandomCompletionAnimation(rating: PerformanceRating): string {
  const animations = COMPLETION_ANIMATIONS[rating];
  const randomIndex = Math.floor(Math.random() * animations.length);
  return animations[randomIndex].url;
}

/**
 * 랜덤 아이들 애니메이션 URL 반환
 */
export function getRandomIdleAnimation(): string {
  const randomIndex = Math.floor(Math.random() * IDLE_ANIMATIONS.length);
  return IDLE_ANIMATIONS[randomIndex].url;
}

// ============================================================================
// VRM 피드백 서비스 클래스
// ============================================================================

export class VRMFeedbackService {
  private vrm: VRM | null = null;
  private expressionUpdateInterval: number | null = null;
  private currentAccuracy: number = 0;
  private currentPhase: string = 'ready';
  private isAnimationPlaying: boolean = false;

  /**
   * VRM 모델 설정
   */
  setVRM(vrm: VRM | null): void {
    this.vrm = vrm;
  }

  /**
   * 실시간 상태 업데이트 (운동 중 호출)
   */
  updateState(accuracy: number, phase: string): void {
    this.currentAccuracy = accuracy;
    this.currentPhase = phase;

    // 애니메이션 재생 중이 아닐 때만 표정 업데이트
    if (!this.isAnimationPlaying) {
      const expression = getExpressionForPhase(phase, accuracy);
      setVRMExpression(this.vrm, expression);
    }
  }

  /**
   * 운동 완료 애니메이션 재생
   * @returns 애니메이션 URL (외부에서 useVRMAAnimation으로 재생)
   */
  getCompletionAnimation(rating: PerformanceRating): string {
    this.isAnimationPlaying = true;

    // 완료 등급에 맞는 표정 설정
    const expressionMap: Record<PerformanceRating, ExpressionState> = {
      perfect: { name: 'happy', intensity: 1.0 },
      good: { name: 'happy', intensity: 0.7 },
      normal: { name: 'relaxed', intensity: 0.5 },
    };

    setVRMExpression(this.vrm, expressionMap[rating]);

    return getRandomCompletionAnimation(rating);
  }

  /**
   * 애니메이션 재생 완료 콜백
   */
  onAnimationComplete(): void {
    this.isAnimationPlaying = false;
    resetVRMExpression(this.vrm);
  }

  /**
   * 인사 애니메이션 URL 반환
   */
  getGreetingAnimation(type: 'start' | 'end'): string {
    return GREETING_ANIMATIONS[type].url;
  }

  /**
   * 아이들 애니메이션 URL 반환
   */
  getIdleAnimation(): string {
    return getRandomIdleAnimation();
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    if (this.expressionUpdateInterval) {
      clearInterval(this.expressionUpdateInterval);
      this.expressionUpdateInterval = null;
    }
    this.vrm = null;
  }
}

// 싱글톤 인스턴스
export const vrmFeedbackService = new VRMFeedbackService();

export default vrmFeedbackService;
