/**
 * 웹 햅틱 피드백 서비스
 * Web Vibration API 기반 (Android Chrome 지원, iOS 미지원)
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('HapticService');

// 진동 패턴 타입
type VibrationPattern = number | number[];

// 햅틱 피드백 강도
type HapticIntensity = 'light' | 'medium' | 'heavy';

// 사전 정의된 햅틱 패턴 (mutable 타입으로 정의)
const HAPTIC_PATTERNS: Record<string, VibrationPattern> = {
  // 기본 패턴
  tap: 10,
  click: 20,

  // 성공/실패
  success: [50, 50, 50],
  error: [100, 50, 100, 50, 100],
  warning: [80, 50, 80],

  // 운동 관련
  repComplete: [30, 30, 80],
  setComplete: [50, 50, 50, 50, 150],
  exerciseComplete: [100, 100, 100, 100, 200],
  countdown: 50,
  holdStart: 30,
  holdEnd: [50, 30, 50],

  // 피드백
  positionCorrect: [20, 20, 20],
  positionWrong: [100, 30, 100],

  // 알림
  notification: [80, 80, 80],
  reminder: [50, 100, 50, 100, 50],
};

type HapticType =
  | 'tap' | 'click'
  | 'success' | 'error' | 'warning'
  | 'repComplete' | 'setComplete' | 'exerciseComplete'
  | 'countdown' | 'holdStart' | 'holdEnd'
  | 'positionCorrect' | 'positionWrong'
  | 'notification' | 'reminder';

class HapticService {
  private isSupported: boolean;
  private isEnabled: boolean = true;

  constructor() {
    // Vibration API 지원 여부 체크
    this.isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

    if (!this.isSupported) {
      console.info('Haptic feedback not supported on this device');
    }
  }

  /**
   * 햅틱 지원 여부 확인
   */
  checkSupport(): boolean {
    return this.isSupported;
  }

  /**
   * 햅틱 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * 햅틱 활성화 여부
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * 기본 진동 실행
   */
  vibrate(pattern: VibrationPattern): boolean {
    if (!this.isSupported || !this.isEnabled) {
      return false;
    }

    try {
      return navigator.vibrate(pattern);
    } catch (error) {
      console.warn('Haptic vibration failed:', error);
      return false;
    }
  }

  /**
   * 진동 중지
   */
  stop(): boolean {
    if (!this.isSupported) {
      return false;
    }

    try {
      return navigator.vibrate(0);
    } catch {
      return false;
    }
  }

  /**
   * 강도 기반 진동
   */
  impact(intensity: HapticIntensity = 'medium'): boolean {
    const durations: Record<HapticIntensity, number> = {
      light: 10,
      medium: 30,
      heavy: 50,
    };
    return this.vibrate(durations[intensity]);
  }

  /**
   * 사전 정의된 패턴 실행
   */
  trigger(type: HapticType): boolean {
    const pattern = HAPTIC_PATTERNS[type];
    if (!pattern) return false;
    return this.vibrate(pattern);
  }

  // 편의 메서드들
  tap(): boolean {
    return this.trigger('tap');
  }

  click(): boolean {
    return this.trigger('click');
  }

  success(): boolean {
    return this.trigger('success');
  }

  error(): boolean {
    return this.trigger('error');
  }

  warning(): boolean {
    return this.trigger('warning');
  }

  // 운동 관련 편의 메서드
  repComplete(): boolean {
    return this.trigger('repComplete');
  }

  setComplete(): boolean {
    return this.trigger('setComplete');
  }

  exerciseComplete(): boolean {
    return this.trigger('exerciseComplete');
  }

  countdown(): boolean {
    return this.trigger('countdown');
  }

  holdStart(): boolean {
    return this.trigger('holdStart');
  }

  holdEnd(): boolean {
    return this.trigger('holdEnd');
  }

  positionCorrect(): boolean {
    return this.trigger('positionCorrect');
  }

  positionWrong(): boolean {
    return this.trigger('positionWrong');
  }

  notification(): boolean {
    return this.trigger('notification');
  }

  reminder(): boolean {
    return this.trigger('reminder');
  }

  /**
   * 커스텀 패턴 생성 헬퍼
   * @param pulses 펄스 수
   * @param duration 각 펄스 지속 시간 (ms)
   * @param gap 펄스 간 간격 (ms)
   */
  createPattern(pulses: number, duration: number = 50, gap: number = 50): number[] {
    const pattern: number[] = [];
    for (let i = 0; i < pulses; i++) {
      pattern.push(duration);
      if (i < pulses - 1) {
        pattern.push(gap);
      }
    }
    return pattern;
  }

  /**
   * 점진적 강도 증가 패턴
   * @param steps 단계 수
   * @param maxDuration 최대 지속 시간
   */
  escalatingPattern(steps: number = 3, maxDuration: number = 100): number[] {
    const pattern: number[] = [];
    for (let i = 1; i <= steps; i++) {
      pattern.push(Math.round((maxDuration / steps) * i));
      if (i < steps) {
        pattern.push(50); // 간격
      }
    }
    return pattern;
  }
}

// 싱글톤 인스턴스
export const hapticService = new HapticService();
export type { HapticType, HapticIntensity, VibrationPattern };
