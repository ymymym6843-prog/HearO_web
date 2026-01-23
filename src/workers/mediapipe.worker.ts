/**
 * MediaPipe Web Worker
 *
 * MediaPipe 연산을 메인 스레드에서 분리하여
 * Three.js 렌더링과 병렬 처리
 *
 * 목표: 모바일 환경에서 30fps 유지
 *
 * 구조:
 * Main Thread:
 *   - Three.js 렌더링
 *   - UI 업데이트
 *   - 사용자 입력 처리
 *
 * Worker Thread:
 *   - 비디오 프레임 처리
 *   - MediaPipe 포즈 추정
 *   - 랜드마크 필터링
 */

// Worker 타입 정의
interface WorkerMessage {
  type: 'INIT' | 'PROCESS_FRAME' | 'UPDATE_CONFIG' | 'TERMINATE';
  payload?: unknown;
}

interface WorkerResponse {
  type: 'INITIALIZED' | 'POSE_RESULT' | 'HAND_RESULT' | 'ERROR' | 'PERFORMANCE';
  payload: unknown;
  timestamp: number;
}

interface PoseResult {
  poseLandmarks: Array<{ x: number; y: number; z: number; visibility?: number }>;
  worldLandmarks: Array<{ x: number; y: number; z: number; visibility?: number }>;
  confidence: number;
}

interface HandResult {
  left?: Array<{ x: number; y: number; z: number }>;
  right?: Array<{ x: number; y: number; z: number }>;
}

interface ProcessConfig {
  enablePose: boolean;
  enableHands: boolean;
  modelComplexity: 0 | 1 | 2;
  smoothLandmarks: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
}

// Worker 상태
let isInitialized = false;
let config: ProcessConfig = {
  enablePose: true,
  enableHands: false,
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

// 성능 측정
let frameCount = 0;
let lastFpsTime = performance.now();
let currentFps = 0;

// One Euro Filter 상태 (노이즈 감소)
interface FilterState {
  x: number;
  dx: number;
  lastTime: number;
}

const landmarkFilters: Map<string, FilterState> = new Map();

/**
 * One Euro Filter 구현
 */
function oneEuroFilter(
  key: string,
  value: number,
  timestamp: number,
  minCutoff = 1.0,
  beta = 0.007,
  dCutoff = 1.0
): number {
  let state = landmarkFilters.get(key);

  if (!state) {
    state = { x: value, dx: 0, lastTime: timestamp };
    landmarkFilters.set(key, state);
    return value;
  }

  const dt = Math.max((timestamp - state.lastTime) / 1000, 0.001);
  const dx = (value - state.x) / dt;

  // Derivative filtering
  const edx = exponentialSmoothing(dx, state.dx, smoothingFactor(dt, dCutoff));

  // Value filtering
  const cutoff = minCutoff + beta * Math.abs(edx);
  const filteredValue = exponentialSmoothing(value, state.x, smoothingFactor(dt, cutoff));

  // Update state
  state.x = filteredValue;
  state.dx = edx;
  state.lastTime = timestamp;

  return filteredValue;
}

function smoothingFactor(dt: number, cutoff: number): number {
  const r = 2 * Math.PI * cutoff * dt;
  return r / (r + 1);
}

function exponentialSmoothing(value: number, prev: number, alpha: number): number {
  return alpha * value + (1 - alpha) * prev;
}

/**
 * 랜드마크 필터링
 */
function filterLandmarks(
  landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>,
  prefix: string,
  timestamp: number
): Array<{ x: number; y: number; z: number; visibility?: number }> {
  if (!config.smoothLandmarks) return landmarks;

  return landmarks.map((lm, i) => ({
    x: oneEuroFilter(`${prefix}_${i}_x`, lm.x, timestamp),
    y: oneEuroFilter(`${prefix}_${i}_y`, lm.y, timestamp),
    z: oneEuroFilter(`${prefix}_${i}_z`, lm.z, timestamp),
    visibility: lm.visibility,
  }));
}

/**
 * 프레임 처리 시뮬레이션
 * (실제 MediaPipe 처리는 메인 스레드에서 수행되므로,
 *  여기서는 후처리 및 필터링만 담당)
 */
function processFrame(data: {
  poseLandmarks?: Array<{ x: number; y: number; z: number; visibility?: number }>;
  worldLandmarks?: Array<{ x: number; y: number; z: number; visibility?: number }>;
  leftHand?: Array<{ x: number; y: number; z: number }>;
  rightHand?: Array<{ x: number; y: number; z: number }>;
  timestamp: number;
}): { pose?: PoseResult; hands?: HandResult } {
  const timestamp = data.timestamp;
  const result: { pose?: PoseResult; hands?: HandResult } = {};

  // 포즈 처리
  if (config.enablePose && data.poseLandmarks && data.worldLandmarks) {
    const filteredPose = filterLandmarks(data.poseLandmarks, 'pose', timestamp);
    const filteredWorld = filterLandmarks(data.worldLandmarks, 'world', timestamp);

    // 신뢰도 계산
    const avgVisibility =
      filteredPose.reduce((sum, lm) => sum + (lm.visibility ?? 1), 0) / filteredPose.length;

    result.pose = {
      poseLandmarks: filteredPose,
      worldLandmarks: filteredWorld,
      confidence: avgVisibility,
    };
  }

  // 손 처리
  if (config.enableHands) {
    result.hands = {};

    if (data.leftHand) {
      result.hands.left = filterLandmarks(
        data.leftHand.map((lm) => ({ ...lm, visibility: 1 })),
        'left_hand',
        timestamp
      );
    }

    if (data.rightHand) {
      result.hands.right = filterLandmarks(
        data.rightHand.map((lm) => ({ ...lm, visibility: 1 })),
        'right_hand',
        timestamp
      );
    }
  }

  // FPS 계산
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsTime = now;

    // 성능 보고
    self.postMessage({
      type: 'PERFORMANCE',
      payload: { fps: currentFps },
      timestamp: now,
    } as WorkerResponse);
  }

  return result;
}

/**
 * 메시지 핸들러
 */
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT':
      isInitialized = true;
      if (payload) {
        config = { ...config, ...(payload as Partial<ProcessConfig>) };
      }
      self.postMessage({
        type: 'INITIALIZED',
        payload: { config },
        timestamp: performance.now(),
      } as WorkerResponse);
      break;

    case 'PROCESS_FRAME':
      if (!isInitialized) {
        self.postMessage({
          type: 'ERROR',
          payload: { message: 'Worker not initialized' },
          timestamp: performance.now(),
        } as WorkerResponse);
        return;
      }

      try {
        const result = processFrame(payload as Parameters<typeof processFrame>[0]);

        if (result.pose) {
          self.postMessage({
            type: 'POSE_RESULT',
            payload: result.pose,
            timestamp: performance.now(),
          } as WorkerResponse);
        }

        if (result.hands) {
          self.postMessage({
            type: 'HAND_RESULT',
            payload: result.hands,
            timestamp: performance.now(),
          } as WorkerResponse);
        }
      } catch (error) {
        self.postMessage({
          type: 'ERROR',
          payload: { message: (error as Error).message },
          timestamp: performance.now(),
        } as WorkerResponse);
      }
      break;

    case 'UPDATE_CONFIG':
      config = { ...config, ...(payload as Partial<ProcessConfig>) };
      break;

    case 'TERMINATE':
      landmarkFilters.clear();
      isInitialized = false;
      self.close();
      break;
  }
};

// Worker 에러 핸들러
self.onerror = (error) => {
  const errorMessage = typeof error === 'string'
    ? error
    : (error as ErrorEvent).message || 'Unknown worker error';

  self.postMessage({
    type: 'ERROR',
    payload: { message: errorMessage },
    timestamp: performance.now(),
  } as WorkerResponse);
};

export {};
