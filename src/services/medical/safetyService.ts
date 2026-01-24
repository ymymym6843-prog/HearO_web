/**
 * 안전 기능 서비스 (Red Flags)
 *
 * 재활 운동 중 위험 신호 감지 및 알림
 *
 * Red Flags:
 * 1. 심한 통증 (VAS >= 7)
 * 2. 과도한 ROM (> 120% of normal)
 * 3. 좌우 비대칭 (> 30도 차이)
 * 4. 급격한 ROM 감소 (> 20% 감소)
 * 5. 보상 동작 감지
 */

import { createLogger } from '@/lib/logger';
import type { ROMMeasurement } from './romService';
import { romService } from './romService';

const logger = createLogger('SafetyService');

// ============================================================
// 타입 정의
// ============================================================

/** Red Flag 타입 */
export type RedFlagType =
  | 'severe_pain'           // 심한 통증
  | 'excessive_rom'         // 과도한 ROM
  | 'asymmetry'             // 좌우 비대칭
  | 'rom_decrease'          // ROM 감소
  | 'compensation'          // 보상 동작
  | 'rapid_movement'        // 급격한 움직임
  | 'fatigue';              // 피로 징후

/** Red Flag 심각도 */
export type RedFlagSeverity = 'warning' | 'caution' | 'stop';

/** Red Flag 알림 */
export interface RedFlagAlert {
  id: string;
  type: RedFlagType;
  severity: RedFlagSeverity;
  title: string;
  message: string;
  recommendation: string;
  detectedAt: Date;
  data?: Record<string, unknown>;
}

/** 통증 레벨 (VAS 0-10) */
export type VASLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** 안전 상태 */
export interface SafetyStatus {
  isOK: boolean;
  activeAlerts: RedFlagAlert[];
  shouldStop: boolean;
  shouldPause: boolean;
  painLevel: VASLevel;
  lastCheckAt: Date;
}

/** 안전 설정 */
export interface SafetyConfig {
  painThreshold: {
    warning: VASLevel;      // 주의 (기본 5)
    stop: VASLevel;         // 중단 (기본 7)
  };
  romThreshold: {
    maxPercent: number;     // 최대 허용 ROM % (기본 120)
    minPercent: number;     // 최소 유지 ROM % (기본 50)
    decreaseWarning: number; // 감소 경고 % (기본 20)
  };
  asymmetryThreshold: number; // 좌우 비대칭 경고 (기본 30도)
  compensationSensitivity: number; // 보상 동작 감지 민감도 (0-1, 기본 0.7)
}

// ============================================================
// 상수 정의
// ============================================================

/** 기본 안전 설정 */
export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  painThreshold: {
    warning: 5,
    stop: 7,
  },
  romThreshold: {
    maxPercent: 120,
    minPercent: 50,
    decreaseWarning: 20,
  },
  asymmetryThreshold: 30,
  compensationSensitivity: 0.7,
};

/** Red Flag 메시지 */
const RED_FLAG_MESSAGES: Record<RedFlagType, {
  title: string;
  message: string;
  recommendation: string;
}> = {
  severe_pain: {
    title: '심한 통증 감지',
    message: '운동 중 심한 통증이 보고되었습니다.',
    recommendation: '즉시 운동을 중단하고 의료 전문가와 상담하세요.',
  },
  excessive_rom: {
    title: '과도한 움직임',
    message: '정상 범위를 초과하는 움직임이 감지되었습니다.',
    recommendation: '움직임의 범위를 줄이고 천천히 진행하세요.',
  },
  asymmetry: {
    title: '좌우 불균형',
    message: '양측 관절의 가동 범위에 큰 차이가 있습니다.',
    recommendation: '환측(영향받은 쪽)에 더 집중하여 운동하세요.',
  },
  rom_decrease: {
    title: 'ROM 감소',
    message: '이전 측정에 비해 가동 범위가 감소했습니다.',
    recommendation: '염증이나 부종이 있는지 확인하고, 필요시 휴식하세요.',
  },
  compensation: {
    title: '보상 동작 감지',
    message: '다른 부위를 사용한 보상 동작이 감지되었습니다.',
    recommendation: '정확한 자세로 천천히 운동을 수행하세요.',
  },
  rapid_movement: {
    title: '급격한 움직임',
    message: '너무 빠른 속도로 움직이고 있습니다.',
    recommendation: '천천히, 컨트롤된 움직임으로 진행하세요.',
  },
  fatigue: {
    title: '피로 징후',
    message: '운동 정확도가 지속적으로 떨어지고 있습니다.',
    recommendation: '잠시 휴식을 취하세요.',
  },
};

// ============================================================
// 안전 서비스 클래스
// ============================================================

class SafetyService {
  private config: SafetyConfig = DEFAULT_SAFETY_CONFIG;
  private activeAlerts: RedFlagAlert[] = [];
  private currentPainLevel: VASLevel = 0;
  private previousROMs: Map<string, number[]> = new Map();
  private recentAccuracies: number[] = [];
  private alertHistory: RedFlagAlert[] = [];

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<SafetyConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Safety config updated', { ...this.config } as Record<string, unknown>);
  }

  /**
   * 통증 레벨 설정 및 체크
   */
  setPainLevel(level: VASLevel): RedFlagAlert | null {
    this.currentPainLevel = level;

    // 심한 통증 체크
    if (level >= this.config.painThreshold.stop) {
      return this.createAlert('severe_pain', 'stop', {
        painLevel: level,
        threshold: this.config.painThreshold.stop,
      });
    }

    // 주의 필요 통증
    if (level >= this.config.painThreshold.warning) {
      return this.createAlert('severe_pain', 'warning', {
        painLevel: level,
        threshold: this.config.painThreshold.warning,
      });
    }

    return null;
  }

  /**
   * ROM 측정 체크
   */
  checkROMMeasurement(measurement: ROMMeasurement): RedFlagAlert[] {
    const alerts: RedFlagAlert[] = [];
    const key = `${measurement.jointType}_${measurement.movementType}_${measurement.side}`;

    // 정상 범위 조회
    const normalRange = romService.getNormalRange(
      measurement.jointType,
      measurement.movementType
    );

    if (normalRange) {
      const percentOfNormal = (measurement.angle / normalRange.max) * 100;

      // 과도한 ROM 체크
      if (percentOfNormal > this.config.romThreshold.maxPercent) {
        alerts.push(this.createAlert('excessive_rom', 'caution', {
          angle: measurement.angle,
          maxNormal: normalRange.max,
          percentOfNormal,
        }));
      }
    }

    // 보상 동작 체크
    if (measurement.compensationDetected) {
      alerts.push(this.createAlert('compensation', 'warning', {
        jointType: measurement.jointType,
      }));
    }

    // 이전 ROM과 비교 (감소 체크)
    const previousROMs = this.previousROMs.get(key) || [];
    if (previousROMs.length >= 3) {
      const avgPrevious = previousROMs.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const decreasePercent = ((avgPrevious - measurement.angle) / avgPrevious) * 100;

      if (decreasePercent > this.config.romThreshold.decreaseWarning) {
        alerts.push(this.createAlert('rom_decrease', 'caution', {
          currentAngle: measurement.angle,
          previousAvg: avgPrevious,
          decreasePercent,
        }));
      }
    }

    // ROM 기록 업데이트
    previousROMs.push(measurement.angle);
    if (previousROMs.length > 10) {
      previousROMs.shift();
    }
    this.previousROMs.set(key, previousROMs);

    // 활성 알림 업데이트
    this.activeAlerts = [...this.activeAlerts, ...alerts];

    return alerts;
  }

  /**
   * 좌우 비대칭 체크
   */
  checkAsymmetry(leftAngle: number, rightAngle: number): RedFlagAlert | null {
    const diff = Math.abs(leftAngle - rightAngle);

    if (diff > this.config.asymmetryThreshold) {
      return this.createAlert('asymmetry', 'warning', {
        leftAngle,
        rightAngle,
        difference: diff,
        affectedSide: leftAngle < rightAngle ? 'left' : 'right',
      });
    }

    return null;
  }

  /**
   * 정확도 기반 피로 체크
   */
  checkFatigue(accuracy: number): RedFlagAlert | null {
    this.recentAccuracies.push(accuracy);
    if (this.recentAccuracies.length > 10) {
      this.recentAccuracies.shift();
    }

    // 최소 5회 이상 기록 필요
    if (this.recentAccuracies.length < 5) {
      return null;
    }

    // 최근 5회의 추세 확인
    const recent5 = this.recentAccuracies.slice(-5);
    const firstHalf = (recent5[0] + recent5[1]) / 2;
    const secondHalf = (recent5[3] + recent5[4]) / 2;

    // 15% 이상 감소 시 피로 경고
    if (firstHalf - secondHalf > 15) {
      return this.createAlert('fatigue', 'warning', {
        recentAccuracies: recent5,
        trend: 'decreasing',
      });
    }

    return null;
  }

  /**
   * 움직임 속도 체크
   */
  checkMovementSpeed(
    angleChange: number,
    timeMs: number,
    jointType: string
  ): RedFlagAlert | null {
    // 초당 각도 변화
    const speedDegPerSec = (angleChange / timeMs) * 1000;

    // 관절별 최대 안전 속도 (deg/sec)
    const maxSpeeds: Record<string, number> = {
      shoulder: 120,
      elbow: 150,
      knee: 100,
      hip: 80,
      ankle: 100,
      spine: 60,
      wrist: 200,
    };

    const maxSpeed = maxSpeeds[jointType] || 100;

    if (speedDegPerSec > maxSpeed * 1.5) {
      return this.createAlert('rapid_movement', 'caution', {
        speed: speedDegPerSec,
        maxRecommended: maxSpeed,
        jointType,
      });
    }

    return null;
  }

  /**
   * 현재 안전 상태 조회
   */
  getSafetyStatus(): SafetyStatus {
    const shouldStop = this.activeAlerts.some((a) => a.severity === 'stop');
    const shouldPause = this.activeAlerts.some(
      (a) => a.severity === 'caution' || a.severity === 'warning'
    );

    return {
      isOK: this.activeAlerts.length === 0,
      activeAlerts: [...this.activeAlerts],
      shouldStop,
      shouldPause,
      painLevel: this.currentPainLevel,
      lastCheckAt: new Date(),
    };
  }

  /**
   * 알림 생성
   */
  private createAlert(
    type: RedFlagType,
    severity: RedFlagSeverity,
    data?: Record<string, unknown>
  ): RedFlagAlert {
    const messages = RED_FLAG_MESSAGES[type];
    const alert: RedFlagAlert = {
      id: `${type}_${Date.now()}`,
      type,
      severity,
      title: messages.title,
      message: messages.message,
      recommendation: messages.recommendation,
      detectedAt: new Date(),
      data,
    };

    this.alertHistory.push(alert);
    logger.warn('Red flag detected', { type, severity, data });

    return alert;
  }

  /**
   * 특정 알림 해제
   */
  dismissAlert(alertId: string): void {
    this.activeAlerts = this.activeAlerts.filter((a) => a.id !== alertId);
  }

  /**
   * 모든 활성 알림 해제
   */
  clearAlerts(): void {
    this.activeAlerts = [];
  }

  /**
   * 알림 히스토리 조회
   */
  getAlertHistory(limit?: number): RedFlagAlert[] {
    const sorted = [...this.alertHistory].sort(
      (a, b) => b.detectedAt.getTime() - a.detectedAt.getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * 운동 시작 전 안전 체크
   */
  preExerciseCheck(painLevel: VASLevel): {
    canProceed: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // 통증 레벨 체크
    if (painLevel >= this.config.painThreshold.stop) {
      return {
        canProceed: false,
        warnings: ['현재 통증 수준이 너무 높습니다.'],
        recommendations: ['운동을 시작하기 전에 의료 전문가와 상담하세요.'],
      };
    }

    if (painLevel >= this.config.painThreshold.warning) {
      warnings.push('운동 전 통증이 있습니다.');
      recommendations.push('통증이 악화되면 즉시 중단하세요.');
    }

    // 최근 알림 히스토리 체크
    const recentAlerts = this.getAlertHistory(5);
    const severeAlerts = recentAlerts.filter(
      (a) => a.severity === 'stop' &&
        Date.now() - a.detectedAt.getTime() < 24 * 60 * 60 * 1000
    );

    if (severeAlerts.length > 0) {
      warnings.push('최근 24시간 내 심각한 경고가 있었습니다.');
      recommendations.push('가벼운 운동부터 시작하세요.');
    }

    return {
      canProceed: true,
      warnings,
      recommendations,
    };
  }

  /**
   * 운동 후 상태 요약
   */
  postExerciseSummary(): {
    alertCount: number;
    severityBreakdown: Record<RedFlagSeverity, number>;
    mostCommonType: RedFlagType | null;
    recommendations: string[];
  } {
    const sessionAlerts = this.alertHistory.filter(
      (a) => Date.now() - a.detectedAt.getTime() < 60 * 60 * 1000 // 1시간 이내
    );

    const severityBreakdown: Record<RedFlagSeverity, number> = {
      warning: 0,
      caution: 0,
      stop: 0,
    };

    const typeCount: Record<string, number> = {};

    sessionAlerts.forEach((alert) => {
      severityBreakdown[alert.severity]++;
      typeCount[alert.type] = (typeCount[alert.type] || 0) + 1;
    });

    const mostCommonType = Object.entries(typeCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as RedFlagType | undefined;

    const recommendations: string[] = [];

    if (severityBreakdown.stop > 0) {
      recommendations.push('운동 강도를 낮추는 것을 고려하세요.');
    }
    if (typeCount['fatigue'] > 0) {
      recommendations.push('충분한 휴식을 취하세요.');
    }
    if (typeCount['compensation'] > 0) {
      recommendations.push('올바른 자세에 더 집중하세요.');
    }

    return {
      alertCount: sessionAlerts.length,
      severityBreakdown,
      mostCommonType: mostCommonType || null,
      recommendations,
    };
  }

  /**
   * 상태 초기화
   */
  reset(): void {
    this.activeAlerts = [];
    this.currentPainLevel = 0;
    this.previousROMs.clear();
    this.recentAccuracies = [];
    this.alertHistory = [];
  }
}

// ============================================================
// 싱글톤 인스턴스
// ============================================================

export const safetyService = new SafetyService();
export default safetyService;
