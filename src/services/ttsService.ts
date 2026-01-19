/**
 * TTS Service - 웹용 음성 재생 서비스
 * 프리렌더링 TTS 파일 재생 + Web Speech API 폴백
 */

import { createLogger } from '@/lib/logger';
import type { WorldviewType } from '@/types/vrm';

const logger = createLogger('TTSService');
import type { ExerciseType, PerformanceRating } from '@/types/exercise';

// TTS 상태
interface TTSState {
  enabled: boolean;
  volume: number;
  rate: number;
}

class TTSService {
  private audioElement: HTMLAudioElement | null = null;
  private state: TTSState = {
    enabled: true,
    volume: 1.0,
    rate: 1.0,
  };
  private isPlaying: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  /**
   * 프리렌더링 TTS 파일 재생
   */
  async playPrerenderedTTS(
    worldview: WorldviewType,
    exercise: ExerciseType,
    rating: PerformanceRating,
    onComplete?: () => void
  ): Promise<boolean> {
    if (!this.state.enabled) {
      onComplete?.();
      return false;
    }

    // 기존 재생 중지
    this.stop();

    const url = `/assets/prerendered/tts/${worldview}/${exercise}_${rating}.wav`;

    try {
      this.audioElement = new Audio(url);
      this.audioElement.volume = this.state.volume;
      this.audioElement.playbackRate = this.state.rate;

      this.audioElement.onended = () => {
        this.isPlaying = false;
        onComplete?.();
      };

      this.audioElement.onerror = () => {
        console.warn(`Prerendered TTS not found: ${url}, falling back to Web Speech`);
        this.isPlaying = false;
        // 폴백: Web Speech API 사용
        this.speakWithWebSpeech(this.getDefaultMessage(rating), onComplete);
      };

      this.isPlaying = true;
      await this.audioElement.play();
      return true;
    } catch (error) {
      console.error('Failed to play prerendered TTS:', error);
      this.isPlaying = false;
      // 폴백
      this.speakWithWebSpeech(this.getDefaultMessage(rating), onComplete);
      return false;
    }
  }

  /**
   * Web Speech API로 텍스트 읽기
   */
  speakWithWebSpeech(text: string, onComplete?: () => void): void {
    if (!this.state.enabled || !('speechSynthesis' in window)) {
      onComplete?.();
      return;
    }

    // 기존 발화 중지
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.volume = this.state.volume;
    utterance.rate = this.state.rate;

    utterance.onend = () => {
      this.isPlaying = false;
      this.currentUtterance = null;
      onComplete?.();
    };

    utterance.onerror = () => {
      this.isPlaying = false;
      this.currentUtterance = null;
      onComplete?.();
    };

    this.currentUtterance = utterance;
    this.isPlaying = true;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * 커스텀 텍스트 읽기 (Web Speech API)
   */
  speak(text: string, onComplete?: () => void): void {
    this.speakWithWebSpeech(text, onComplete);
  }

  /**
   * 재생 중지
   */
  stop(): void {
    // 오디오 요소 중지
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }

    // Web Speech 중지
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    this.isPlaying = false;
    this.currentUtterance = null;
  }

  /**
   * 일시정지
   */
  pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  /**
   * 재개
   */
  resume(): void {
    if (this.audioElement) {
      this.audioElement.play();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }

  /**
   * 기본 메시지 반환
   */
  private getDefaultMessage(rating: PerformanceRating): string {
    const messages: Record<PerformanceRating, string[]> = {
      perfect: [
        '완벽해요! 정말 대단합니다!',
        '최고의 실력이에요!',
        '완벽한 자세였어요!',
      ],
      good: [
        '잘했어요! 조금만 더 힘내세요!',
        '좋아요! 이 조자로 계속해요!',
        '훌륭해요! 계속 노력하세요!',
      ],
      normal: [
        '괜찮아요, 다시 도전해봐요!',
        '좋은 시작이에요! 계속 연습하면 늘어요!',
        '포기하지 마세요! 할 수 있어요!',
      ],
    };

    const list = messages[rating];
    return list[Math.floor(Math.random() * list.length)];
  }

  /**
   * 운동 시작 안내
   */
  speakExerciseStart(exerciseName: string, onComplete?: () => void): void {
    this.speak(`${exerciseName} 운동을 시작합니다. 준비되셨나요?`, onComplete);
  }

  /**
   * 카운트다운
   */
  speakCountdown(count: number, onComplete?: () => void): void {
    this.speak(String(count), onComplete);
  }

  /**
   * 운동 완료 안내
   */
  speakExerciseComplete(reps: number, onComplete?: () => void): void {
    this.speak(`운동 완료! ${reps}회를 수행했습니다. 수고하셨어요!`, onComplete);
  }

  /**
   * 자세 교정 안내
   */
  speakPostureCorrection(message: string, onComplete?: () => void): void {
    this.speak(message, onComplete);
  }

  /**
   * 설정 업데이트
   */
  setSettings(settings: Partial<TTSState>): void {
    this.state = { ...this.state, ...settings };
  }

  /**
   * 현재 설정 반환
   */
  getSettings(): TTSState {
    return { ...this.state };
  }

  /**
   * TTS 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this.state.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  /**
   * 볼륨 설정
   */
  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
    if (this.audioElement) {
      this.audioElement.volume = this.state.volume;
    }
  }

  /**
   * 재생 속도 설정
   */
  setRate(rate: number): void {
    this.state.rate = Math.max(0.5, Math.min(2, rate));
  }

  /**
   * 재생 중 여부
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.stop();
  }
}

// 싱글톤 인스턴스
export const ttsService = new TTSService();

export default ttsService;
