/**
 * Story Service - 프리렌더링된 스토리 로드 및 제공 서비스
 * 운동 완료 후 세계관별 스토리 텍스트 제공
 */

import { createLogger } from '@/lib/logger';
import type { WorldviewType } from '@/types/vrm';
import type { ExerciseType, PerformanceRating } from '@/types/exercise';
import {
  determineEpilogueType,
  getEpilogueByType,
  isSpecialEpilogue,
  type EpilogueStoryContext,
} from '@/constants/epilogueTemplates';

const _logger = createLogger('StoryService');

// 스토리 데이터 구조
type StoryData = Record<WorldviewType, Record<ExerciseType, Record<PerformanceRating, string>>>;

class StoryService {
  private stories: StoryData | null = null;
  private isLoading: boolean = false;
  private loadPromise: Promise<void> | null = null;

  /**
   * 스토리 데이터 로드
   */
  async loadStories(): Promise<void> {
    // 이미 로드된 경우
    if (this.stories) return;

    // 로드 중인 경우 기존 Promise 반환
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.isLoading = true;
    this.loadPromise = this.fetchStories();

    try {
      await this.loadPromise;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * 실제 fetch 로직
   */
  private async fetchStories(): Promise<void> {
    try {
      const response = await fetch('/assets/prerendered/stories/all_stories.json');
      if (!response.ok) {
        throw new Error(`Failed to load stories: ${response.status}`);
      }
      this.stories = await response.json();
      console.log('[StoryService] Stories loaded successfully');
    } catch (error) {
      console.error('[StoryService] Failed to load stories:', error);
      throw error;
    }
  }

  /**
   * 특정 스토리 가져오기
   */
  async getStory(
    worldview: WorldviewType,
    exercise: ExerciseType,
    rating: PerformanceRating
  ): Promise<string | null> {
    // 스토리 로드 확인
    if (!this.stories) {
      try {
        await this.loadStories();
      } catch {
        return null;
      }
    }

    if (!this.stories) return null;

    try {
      const worldviewStories = this.stories[worldview];
      if (!worldviewStories) {
        console.warn(`[StoryService] No stories for worldview: ${worldview}`);
        return null;
      }

      const exerciseStories = worldviewStories[exercise];
      if (!exerciseStories) {
        console.warn(`[StoryService] No stories for exercise: ${exercise}`);
        return null;
      }

      const story = exerciseStories[rating];
      if (!story) {
        console.warn(`[StoryService] No story for rating: ${rating}`);
        return null;
      }

      return story;
    } catch (error) {
      console.error('[StoryService] Error getting story:', error);
      return null;
    }
  }

  /**
   * 특정 세계관의 모든 운동 스토리 가져오기
   */
  async getWorldviewStories(
    worldview: WorldviewType
  ): Promise<Record<ExerciseType, Record<PerformanceRating, string>> | null> {
    if (!this.stories) {
      try {
        await this.loadStories();
      } catch {
        return null;
      }
    }

    return this.stories?.[worldview] || null;
  }

  /**
   * 특정 운동의 모든 등급 스토리 가져오기
   */
  async getExerciseStories(
    worldview: WorldviewType,
    exercise: ExerciseType
  ): Promise<Record<PerformanceRating, string> | null> {
    if (!this.stories) {
      try {
        await this.loadStories();
      } catch {
        return null;
      }
    }

    return this.stories?.[worldview]?.[exercise] || null;
  }

  /**
   * 스토리 로드 여부 확인
   */
  isLoaded(): boolean {
    return this.stories !== null;
  }

  /**
   * 로딩 중 여부 확인
   */
  getIsLoading(): boolean {
    return this.isLoading;
  }

  /**
   * 스토리 캐시 초기화
   */
  clearCache(): void {
    this.stories = null;
  }

  /**
   * 컨텍스트 기반 스토리 가져오기
   * 에필로그 타입에 따라 특별 스토리 또는 기존 프리렌더드 스토리 반환
   */
  async getStoryWithContext(
    worldview: WorldviewType,
    exercise: ExerciseType,
    rating: PerformanceRating,
    context?: EpilogueStoryContext
  ): Promise<string | null> {
    // 컨텍스트가 있으면 에필로그 타입 결정
    if (context) {
      const epilogueType = determineEpilogueType(context);

      // 특별 에필로그인 경우 해당 템플릿 사용
      if (isSpecialEpilogue(epilogueType)) {
        const specialStory = getEpilogueByType(worldview, epilogueType, context);
        if (specialStory) {
          console.log('[StoryService] Using special epilogue', { epilogueType, worldview });
          return specialStory;
        }
      }
    }

    // 기본: 프리렌더드 스토리
    return this.getStory(worldview, exercise, rating);
  }

  /**
   * 기본 스토리 반환 (로드 실패 시 폴백)
   */
  getDefaultStory(rating: PerformanceRating): string {
    const defaultStories: Record<PerformanceRating, string> = {
      perfect: '완벽한 운동이었어요! 정말 대단합니다. 오늘의 노력이 내일의 건강으로 이어질 거예요.',
      good: '잘했어요! 꾸준한 노력이 중요합니다. 조금씩 더 나아지고 있어요.',
      normal: '좋은 시작이에요! 포기하지 말고 계속 도전해보세요. 연습하면 분명 나아질 거예요.',
    };
    return defaultStories[rating];
  }
}

// 싱글톤 인스턴스
export const storyService = new StoryService();

export default storyService;
