/**
 * Kalman 필터 (노이즈 제거)
 * 각도 측정값의 노이즈를 효과적으로 제거
 *
 * @module angle/filter
 */

import { KALMAN_PARAMS } from './constants';

/**
 * 1D Kalman 필터 클래스
 */
export class KalmanFilter {
  private x: number;         // 상태 추정값
  private p: number;         // 추정 오차 공분산
  private q: number;         // 프로세스 노이즈
  private r: number;         // 측정 노이즈
  private k: number;         // Kalman 이득

  constructor(
    initialValue: number = 0,
    processNoise: number = 0.1,
    measurementNoise: number = 1
  ) {
    this.x = initialValue;
    this.p = 1;
    this.q = processNoise;
    this.r = measurementNoise;
    this.k = 0;
  }

  /**
   * 새 측정값으로 상태 업데이트
   */
  update(measurement: number): number {
    // 예측 단계
    this.p = this.p + this.q;

    // 업데이트 단계
    this.k = this.p / (this.p + this.r);
    this.x = this.x + this.k * (measurement - this.x);
    this.p = (1 - this.k) * this.p;

    return this.x;
  }

  /**
   * 현재 추정값 반환
   */
  getValue(): number {
    return this.x;
  }

  /**
   * 필터 리셋
   */
  reset(value: number = 0): void {
    this.x = value;
    this.p = 1;
    this.k = 0;
  }
}

/**
 * 관절별 Kalman 필터 관리자
 */
class JointKalmanFilters {
  private filters: Map<string, KalmanFilter> = new Map();

  /**
   * 특정 관절의 필터 가져오기 (없으면 생성)
   */
  getFilter(joint: string, side: 'left' | 'right' = 'left'): KalmanFilter {
    const key = `${joint}_${side}`;
    if (!this.filters.has(key)) {
      const params = KALMAN_PARAMS[joint] ?? { processNoise: 0.1, measurementNoise: 1 };
      this.filters.set(key, new KalmanFilter(0, params.processNoise, params.measurementNoise));
    }
    return this.filters.get(key)!;
  }

  /**
   * 필터 적용된 각도 반환
   */
  filter(joint: string, angle: number, side: 'left' | 'right' = 'left'): number {
    const filter = this.getFilter(joint, side);
    return filter.update(angle);
  }

  /**
   * 특정 관절 필터 리셋
   */
  resetFilter(joint: string, side: 'left' | 'right' = 'left'): void {
    const key = `${joint}_${side}`;
    this.filters.get(key)?.reset();
  }

  /**
   * 모든 필터 리셋
   */
  resetAll(): void {
    this.filters.forEach(filter => filter.reset());
  }
}

// 전역 Kalman 필터 인스턴스
export const jointKalmanFilters = new JointKalmanFilters();

export { JointKalmanFilters };
