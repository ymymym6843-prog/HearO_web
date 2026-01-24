/**
 * SFX Service - 웹용 효과음 재생 서비스
 * Web Audio API 기반
 */

import { createLogger } from '@/lib/logger';
import type { WorldviewType } from '@/types/vrm';

const _logger = createLogger('SFXService');

// Safari 호환을 위한 webkitAudioContext 타입 선언
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// 공통 효과음 타입
export type CommonSFXType =
  | 'tap'
  | 'success'
  | 'complete'
  | 'error'
  | 'countdown'
  | 'achievement'
  | 'level_up'
  | 'streak';

// 세계관별 효과음 타입
export type WorldviewSFXType =
  // Fantasy
  | 'clang'
  | 'shield_block'
  | 'spell_cast'
  | 'warning_horn'
  // SF
  | 'laser_shot'
  | 'spark'
  | 'hydraulic_move'
  | 'error_beep'
  // Zombie
  | 'zombie_groan'
  | 'heartbeat'
  | 'breath'
  | 'footstep'
  | 'punch_hit'
  // Sports
  | 'whistle'
  | 'buzzer'
  | 'crowd_cheer'
  | 'coach_shout'
  // Spy
  | 'silenced_shot'
  | 'gadget_beep'
  | 'radio_static'
  | 'alarm'
  // Idol
  | 'sparkle'
  | 'applause'
  | 'aww'
  | 'success_chime'
  | 'wrong_buzzer';

// BGM 타입
export type BGMType = 'prologue_bgm' | 'exercise_bgm';

// SFX 상태
interface SFXState {
  sfxEnabled: boolean;
  bgmEnabled: boolean;
  sfxVolume: number;
  bgmVolume: number;
}

class SFXService {
  private audioContext: AudioContext | null = null;
  private audioCache: Map<string, AudioBuffer> = new Map();
  private cacheAccessOrder: string[] = []; // LRU 순서 추적
  private readonly MAX_CACHE_SIZE = 50;    // 최대 캐시 항목 수
  private currentBGM: {
    source: AudioBufferSourceNode;
    gainNode: GainNode;
  } | null = null;

  private state: SFXState = {
    sfxEnabled: true,
    bgmEnabled: true,
    sfxVolume: 0.7,
    bgmVolume: 0.5,
  };

  /**
   * AudioContext 초기화 (사용자 인터랙션 후 호출 필요)
   */
  init(): void {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
  }

  /**
   * AudioContext resume (일부 브라우저에서 필요)
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * 오디오 파일 로드 및 캐싱 (LRU 캐시 적용)
   */
  private async loadAudio(url: string): Promise<AudioBuffer | null> {
    if (!this.audioContext) {
      this.init();
    }

    // 캐시 확인
    if (this.audioCache.has(url)) {
      // LRU 순서 업데이트 (최근 사용으로 이동)
      this.updateCacheAccessOrder(url);
      return this.audioCache.get(url)!;
    }

    // 캐시 크기 제한 적용 (LRU 방식으로 오래된 항목 제거)
    if (this.audioCache.size >= this.MAX_CACHE_SIZE) {
      this.evictLRUCacheEntry();
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);

      // 캐시에 추가
      this.audioCache.set(url, audioBuffer);
      this.cacheAccessOrder.push(url);

      return audioBuffer;
    } catch (error) {
      console.error(`Failed to load audio: ${url}`, error);
      return null;
    }
  }

  /**
   * LRU 캐시 접근 순서 업데이트
   */
  private updateCacheAccessOrder(url: string): void {
    const index = this.cacheAccessOrder.indexOf(url);
    if (index > -1) {
      this.cacheAccessOrder.splice(index, 1);
    }
    this.cacheAccessOrder.push(url);
  }

  /**
   * LRU 방식으로 가장 오래된 캐시 항목 제거
   */
  private evictLRUCacheEntry(): void {
    if (this.cacheAccessOrder.length > 0) {
      const oldestUrl = this.cacheAccessOrder.shift();
      if (oldestUrl) {
        this.audioCache.delete(oldestUrl);
        console.debug(`Audio cache evicted: ${oldestUrl}`);
      }
    }
  }

  /**
   * 오디오 재생
   */
  private async playAudio(
    url: string,
    volume: number,
    loop: boolean = false
  ): Promise<AudioBufferSourceNode | null> {
    if (!this.audioContext) {
      this.init();
    }

    await this.resume();

    const buffer = await this.loadAudio(url);
    if (!buffer) return null;

    const source = this.audioContext!.createBufferSource();
    const gainNode = this.audioContext!.createGain();

    source.buffer = buffer;
    source.loop = loop;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext!.destination);

    source.start(0);
    return source;
  }

  /**
   * 공통 효과음 재생
   */
  async playCommonSFX(type: CommonSFXType): Promise<void> {
    if (!this.state.sfxEnabled) return;

    const url = `/assets/sounds/common/${type}.wav`;
    await this.playAudio(url, this.state.sfxVolume);
  }

  /**
   * 세계관별 효과음 재생
   */
  async playWorldviewSFX(worldview: WorldviewType, type: WorldviewSFXType): Promise<void> {
    if (!this.state.sfxEnabled) return;

    const url = `/assets/sounds/${worldview}/${type}.wav`;
    await this.playAudio(url, this.state.sfxVolume);
  }

  /**
   * 운동 성공 효과음 재생
   */
  async playExerciseSuccessSFX(worldview: WorldviewType): Promise<void> {
    await this.playCommonSFX('success');

    // 세계관별 추가 효과음
    const worldviewSFX: Partial<Record<WorldviewType, WorldviewSFXType>> = {
      fantasy: 'spell_cast',
      sports: 'crowd_cheer',
      idol: 'sparkle',
      sf: 'spark',
      zombie: 'punch_hit',
      spy: 'gadget_beep',
    };

    const sfx = worldviewSFX[worldview];
    if (sfx) {
      setTimeout(() => {
        this.playWorldviewSFX(worldview, sfx);
      }, 200);
    }
  }

  /**
   * 운동 경고 효과음 재생
   */
  async playExerciseWarningSFX(worldview: WorldviewType): Promise<void> {
    const worldviewSFX: Partial<Record<WorldviewType, WorldviewSFXType>> = {
      fantasy: 'warning_horn',
      sports: 'whistle',
      idol: 'wrong_buzzer',
      sf: 'error_beep',
      zombie: 'heartbeat',
      spy: 'alarm',
    };

    const sfx = worldviewSFX[worldview];
    if (sfx) {
      await this.playWorldviewSFX(worldview, sfx);
    } else {
      await this.playCommonSFX('error');
    }
  }

  /**
   * 운동 완료 효과음 재생
   */
  async playExerciseCompleteSFX(): Promise<void> {
    await this.playCommonSFX('complete');
    setTimeout(() => {
      this.playCommonSFX('achievement');
    }, 300);
  }

  /**
   * BGM 재생
   */
  async playBGM(worldview: WorldviewType, type: BGMType): Promise<void> {
    if (!this.state.bgmEnabled) return;

    // 기존 BGM 정지
    this.stopBGM();

    const url = `/assets/sounds/${worldview}/${type}.wav`;

    if (!this.audioContext) {
      this.init();
    }
    await this.resume();

    const buffer = await this.loadAudio(url);
    if (!buffer) return;

    const source = this.audioContext!.createBufferSource();
    const gainNode = this.audioContext!.createGain();

    source.buffer = buffer;
    source.loop = true;
    gainNode.gain.value = this.state.bgmVolume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext!.destination);

    source.start(0);

    this.currentBGM = { source, gainNode };
  }

  /**
   * BGM 정지
   */
  stopBGM(): void {
    if (this.currentBGM) {
      try {
        this.currentBGM.source.stop();
      } catch {
        // 이미 정지된 경우 무시
      }
      this.currentBGM = null;
    }
  }

  /**
   * BGM 페이드아웃
   */
  async fadeOutBGM(duration: number = 1000): Promise<void> {
    if (!this.currentBGM || !this.audioContext) return;

    const { gainNode } = this.currentBGM;
    const currentTime = this.audioContext.currentTime;

    gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
    gainNode.gain.linearRampToValueAtTime(0, currentTime + duration / 1000);

    setTimeout(() => {
      this.stopBGM();
    }, duration);
  }

  /**
   * BGM 일시정지
   */
  pauseBGM(): void {
    if (this.audioContext?.state === 'running') {
      this.audioContext.suspend();
    }
  }

  /**
   * BGM 재개
   */
  resumeBGM(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * 설정 업데이트
   */
  setSettings(settings: Partial<SFXState>): void {
    this.state = { ...this.state, ...settings };

    // BGM 볼륨 실시간 적용
    if (this.currentBGM && settings.bgmVolume !== undefined) {
      this.currentBGM.gainNode.gain.value = settings.bgmVolume;
    }
  }

  /**
   * 현재 설정 반환
   */
  getSettings(): SFXState {
    return { ...this.state };
  }

  /**
   * SFX 활성화/비활성화
   */
  setSFXEnabled(enabled: boolean): void {
    this.state.sfxEnabled = enabled;
  }

  /**
   * BGM 활성화/비활성화
   */
  setBGMEnabled(enabled: boolean): void {
    this.state.bgmEnabled = enabled;
    if (!enabled) {
      this.stopBGM();
    }
  }

  /**
   * 캐시 정리
   */
  clearCache(): void {
    this.audioCache.clear();
    this.cacheAccessOrder = [];
  }

  /**
   * 캐시 상태 조회
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.audioCache.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.stopBGM();
    this.clearCache();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// 싱글톤 인스턴스
export const sfxService = new SFXService();

export default sfxService;
