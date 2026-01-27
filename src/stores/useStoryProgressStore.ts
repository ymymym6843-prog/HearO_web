/**
 * 스토리 진행 상태 관리 스토어
 * 세계관별 챕터/에피소드 추적 (로컬 퍼시스트)
 *
 * 규칙:
 * - 에피소드: 세션(운동) 1회 = 에피소드 1개
 * - 챕터: 에피소드 5개 = 챕터 1개
 * - 세계관별 독립 관리
 *
 * DB 연동 전략:
 * - 현재: 클라이언트 로컬(localStorage)이 진행 상태의 주 기준(source of truth).
 *   DB(exercise_sessions.chapter_number/episode_number)는 보조 기록용(nullable).
 * - 향후 다기기/로그인 동기화 필요 시:
 *   DB를 주 기준으로 전환하고, 로컬 상태는 캐시/오프라인 버퍼 역할로 변경.
 *   충돌 시 DB 우선(server wins) 정책 적용 예정.
 *
 * 주의: localStorage 초기화(브라우저 데이터 삭제) 시 진행 데이터 유실됨.
 * DB 동기화 적용 전까지는 예상된 제한 사항.
 *
 * [Server Wins 전환 시 변경 포인트]
 * 1. 로그인/앱 시작 시 DB에서 세계관별 max(totalSessions) 조회 → 로컬 hydrate
 * 2. advanceEpisode 후 DB 즉시 upsert (또는 큐잉 후 배치)
 * 3. 충돌 감지: 로컬 totalSessions < DB totalSessions → DB 우선 (최신 updated_at 기준)
 * 4. 오프라인 모드: 로컬 진행 저장 → 온라인 복귀 시 DB와 merge (server wins)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorldviewType } from '@/types/vrm';

// ============================================================
// 타입 정의
// ============================================================

export interface StoryProgress {
  worldview: WorldviewType;
  /** 현재 챕터 (1-based) - 5회 운동마다 증가 */
  chapter: number;
  /** 현재 에피소드 (1-based, 챕터 내 1~5) */
  episode: number;
  /** 해당 세계관 총 세션 수 */
  totalSessions: number;
}

interface StoryProgressState {
  /** 세계관별 진행 상태 */
  progressByWorldview: Partial<Record<WorldviewType, StoryProgress>>;

  /**
   * 중복 호출 방지용 (defense-in-depth, 1차 방어는 UI 레벨 completionGuardRef)
   * 동일 세계관에서 짧은 시간 내(2초) 연속 advance를 차단.
   * 주의: UI 가드가 주 방어이며, 이 가드는 비정상 경로(이벤트 중복 발생 등) 대응용.
   */
  _lastAdvancedWorldview: string | null;
  _lastAdvancedAt: number;

  /** 특정 세계관 진행 상태 조회 */
  getProgress: (worldview: WorldviewType) => StoryProgress;

  /** 에피소드 진행 (세션 완료 시 호출). 중복 호출 시 현재 상태 반환 (진행 안 함). */
  advanceEpisode: (worldview: WorldviewType) => StoryProgress;

  /** 챕터 전환 발생 여부 확인 (마지막 advanceEpisode가 챕터를 넘겼는지) */
  isChapterTransition: (worldview: WorldviewType) => boolean;
}

// ============================================================
// 상수
// ============================================================

/** 챕터당 에피소드 수 */
export const EPISODES_PER_CHAPTER = 5;

/** 기본 진행 상태 생성 */
function createDefaultProgress(worldview: WorldviewType): StoryProgress {
  return {
    worldview,
    chapter: 1,
    episode: 1,
    totalSessions: 0,
  };
}

// ============================================================
// 스토어
// ============================================================

export const useStoryProgressStore = create<StoryProgressState>()(
  persist(
    (set, get) => ({
      progressByWorldview: {},
      _lastAdvancedWorldview: null,
      _lastAdvancedAt: 0,

      getProgress: (worldview: WorldviewType): StoryProgress => {
        return get().progressByWorldview[worldview] || createDefaultProgress(worldview);
      },

      advanceEpisode: (worldview: WorldviewType): StoryProgress => {
        const current = get().getProgress(worldview);

        // 중복 호출 방지: 동일 세계관에서 2초 이내 재호출 무시
        // (1차 방어: UI completionGuardRef, 2차 방어: 이 쿨다운)
        // 쿨다운은 메모리 전용 (persist 제외), 페이지 리로드 시 리셋됨
        const now = Date.now();
        if (get()._lastAdvancedWorldview === worldview && now - get()._lastAdvancedAt < 2000) {
          console.warn('[StoryProgress] advanceEpisode cooldown - duplicate call ignored', { worldview });
          return current;
        }

        const newTotalSessions = current.totalSessions + 1;

        // 챕터 내 에피소드 번호 계산
        // totalSessions 1~5 → chapter 1, 6~10 → chapter 2, ...
        const newChapter = Math.floor((newTotalSessions - 1) / EPISODES_PER_CHAPTER) + 1;
        const newEpisode = ((newTotalSessions - 1) % EPISODES_PER_CHAPTER) + 1;

        const updated: StoryProgress = {
          worldview,
          chapter: newChapter,
          episode: newEpisode,
          totalSessions: newTotalSessions,
        };

        set((state) => ({
          progressByWorldview: {
            ...state.progressByWorldview,
            [worldview]: updated,
          },
          _lastAdvancedWorldview: worldview,
          _lastAdvancedAt: now,
        }));

        return updated;
      },

      isChapterTransition: (worldview: WorldviewType): boolean => {
        const progress = get().getProgress(worldview);
        // 에피소드가 정확히 챕터의 마지막(5번째)이면 다음 세션에서 챕터 전환
        return progress.episode === EPISODES_PER_CHAPTER;
      },
    }),
    {
      name: 'hearo-story-progress',
      partialize: (state) => ({
        progressByWorldview: state.progressByWorldview,
      }),
    }
  )
);
