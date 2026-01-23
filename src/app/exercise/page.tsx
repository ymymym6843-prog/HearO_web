'use client';

/**
 * 운동 목록 페이지
 * 부위별 분류 + 비활성화 운동 접기
 */

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWorldStore } from '@/stores/useWorldStore';
import { WORLDVIEW_COLORS, STATE_COLORS, WORLDVIEW_INFO } from '@/constants/themes';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { ExerciseType } from '@/types/exercise';
import type { HandRehabExercise } from '@/types/hand';
import type { WorldviewType } from '@/types/vrm';

// 세계관별 아이콘 매핑
const WORLDVIEW_ICONS: Record<WorldviewType, IconName> = {
  fantasy: 'shield-outline',
  sports: 'trophy-outline',
  idol: 'mic-outline',
  sf: 'rocket-outline',
  zombie: 'skull-outline',
  spy: 'eye-outline',
};

type TabType = 'body' | 'hand';

// 부위 카테고리
type BodyCategory = 'upper' | 'lower' | 'core';

interface CategoryInfo {
  id: BodyCategory;
  name: string;
  icon: IconName;
  description: string;
}

const BODY_CATEGORIES: CategoryInfo[] = [
  { id: 'upper', name: '상체', icon: 'barbell-outline', description: '팔, 어깨 운동' },
  { id: 'lower', name: '하체', icon: 'walk-outline', description: '다리, 엉덩이 운동' },
  { id: 'core', name: '전신/코어', icon: 'body-outline', description: '전신, 유연성 운동' },
];

interface ExerciseInfo {
  id: ExerciseType;
  name: string;
  koreanName: string;
  description: string;
  category: BodyCategory;
  difficulty: 'easy' | 'normal' | 'hard';
  implemented: boolean;
}

interface HandExerciseInfo {
  id: HandRehabExercise;
  name: string;
  koreanName: string;
  description: string;
  icon: IconName;
  difficulty: 'easy' | 'normal' | 'hard';
  implemented: boolean;
}

// MVP 전신 운동 목록 (14개) - 웹캠 환경/재활 안전성/인식 안정성 기준
// koreanName: 기존 영어식 유지 (스토리/TTS 싱크)
// description: 사용자 친화적 설명
const bodyExercises: ExerciseInfo[] = [
  // === 하체 운동 (6개) ===
  {
    id: 'squat',
    name: 'Squat',
    koreanName: '스쿼트',
    description: '의자에 앉듯이 앉았다 일어나기',
    category: 'lower',
    difficulty: 'normal',
    implemented: true,
  },
  {
    id: 'wall_squat',
    name: 'Wall Squat',
    koreanName: '벽 스쿼트',
    description: '벽에 등을 대고 앉은 자세 유지하기',
    category: 'lower',
    difficulty: 'easy',
    implemented: true,
  },
  {
    id: 'chair_stand',
    name: 'Chair Stand',
    koreanName: '의자 앉았다 일어나기',
    description: '의자에서 앉았다 일어서기 반복',
    category: 'lower',
    difficulty: 'easy',
    implemented: true,
  },
  {
    id: 'straight_leg_raise',
    name: 'Straight Leg Raise',
    koreanName: '누워서 다리 들기',
    description: '누운 자세에서 다리를 들어 올리기',
    category: 'lower',
    difficulty: 'easy',
    implemented: true,
  },
  {
    id: 'standing_march_slow',
    name: 'Standing March Slow',
    koreanName: '서서 천천히 행진',
    description: '서서 제자리에서 천천히 행진하기',
    category: 'lower',
    difficulty: 'easy',
    implemented: true,
  },
  {
    id: 'seated_knee_lift',
    name: 'Seated Knee Lift',
    koreanName: '앉아서 무릎 들기',
    description: '앉아서 무릎을 들어 올리기',
    category: 'lower',
    difficulty: 'easy',
    implemented: true,
  },

  // === 상체 운동 (4개) ===
  {
    id: 'standing_arm_raise_front',
    name: 'Standing Arm Raise Front',
    koreanName: '팔 앞으로 들기',
    description: '팔을 앞으로 들어올리기',
    category: 'upper',
    difficulty: 'easy',
    implemented: true,
  },
  {
    id: 'shoulder_abduction',
    name: 'Shoulder Abduction',
    koreanName: '어깨 벌리기',
    description: '팔을 옆으로 벌려 들어올리기',
    category: 'upper',
    difficulty: 'easy',
    implemented: true,
  },
  {
    id: 'elbow_flexion',
    name: 'Elbow Flexion',
    koreanName: '팔꿈치 굽히기',
    description: '팔꿈치를 천천히 굽혔다 펴기',
    category: 'upper',
    difficulty: 'easy',
    implemented: true,
  },
  {
    id: 'wall_push',
    name: 'Wall Push',
    koreanName: '벽 밀기',
    description: '벽에 손을 대고 밀기',
    category: 'upper',
    difficulty: 'easy',
    implemented: true,
  },

  // === 코어 운동 (4개) ===
  {
    id: 'seated_core_hold',
    name: 'Seated Core Hold',
    koreanName: '앉아서 코어 버티기',
    description: '앉아서 코어에 힘을 주고 유지하기',
    category: 'core',
    difficulty: 'easy',
    implemented: true,
  },
  {
    id: 'standing_anti_extension_hold',
    name: 'Standing Anti Extension Hold',
    koreanName: '서서 허리 버티기',
    description: '서서 허리를 중립으로 유지하기',
    category: 'core',
    difficulty: 'easy',
    implemented: true,
  },
  {
    id: 'standing_arm_raise_core',
    name: 'Standing Arm Raise Core',
    koreanName: '코어 유지하며 팔 들기',
    description: '코어 안정화하면서 팔 들기',
    category: 'core',
    difficulty: 'easy',
    implemented: true,
  },
  {
    id: 'bridge',
    name: 'Bridge',
    koreanName: '브릿지',
    description: '누워서 엉덩이 들어올리기',
    category: 'core',
    difficulty: 'easy',
    implemented: true,
  },
];

// 손 재활 운동 목록 (8개 MVP)
const handExercises: HandExerciseInfo[] = [
  // === ROM/가동성 (3개) ===
  {
    id: 'finger_flexion',
    name: 'Finger Flexion',
    koreanName: '손가락 굽히기/펴기',
    description: '손가락을 천천히 굽혔다 펴는 운동',
    icon: 'hand-left-outline',
    difficulty: 'easy',
    implemented: true,
  },
  {
    id: 'finger_spread',
    name: 'Finger Spread',
    koreanName: '손가락 벌리기',
    description: '손가락을 최대한 벌리는 운동',
    icon: 'hand-left-outline',
    difficulty: 'easy',
    implemented: true,
  },
  {
    id: 'wrist_flexion',
    name: 'Wrist Flexion',
    koreanName: '손목 굽히기/펴기',
    description: '손목을 천천히 굽혔다 펴는 운동',
    icon: 'hand-left-outline',
    difficulty: 'easy',
    implemented: true,
  },

  // === 협응/힘줄 (3개) ===
  {
    id: 'tendon_glide',
    name: 'Tendon Glide',
    koreanName: '힘줄 글라이딩',
    description: '5단계 손 모양으로 힘줄 스트레칭',
    icon: 'hand-left-outline',
    difficulty: 'normal',
    implemented: true,
  },
  {
    id: 'thumb_opposition',
    name: 'Thumb Opposition',
    koreanName: '엄지-손가락 터치',
    description: '엄지를 각 손가락 끝에 터치',
    icon: 'pulse-outline',
    difficulty: 'easy',
    implemented: true,
  },
  {
    id: 'grip_squeeze',
    name: 'Grip Squeeze',
    koreanName: '주먹 쥐기',
    description: '주먹을 꽉 쥐었다 풀기',
    icon: 'hand-left-outline',
    difficulty: 'easy',
    implemented: true,
  },

  // === 정밀/기능 (2개) ===
  {
    id: 'pinch_hold',
    name: 'Pinch Hold',
    koreanName: '집게 집기 유지',
    description: '엄지와 검지로 집는 자세 유지',
    icon: 'hand-left-outline',
    difficulty: 'normal',
    implemented: true,
  },
  {
    id: 'finger_tap_sequence',
    name: 'Finger Tap Sequence',
    koreanName: '손가락 순차 터치',
    description: '엄지로 각 손가락을 순서대로 터치',
    icon: 'hand-left-outline',
    difficulty: 'normal',
    implemented: true,
  },
];

const difficultyConfig = {
  easy: { color: STATE_COLORS.success, label: '쉬움' },
  normal: { color: STATE_COLORS.warning, label: '보통' },
  hard: { color: STATE_COLORS.error, label: '어려움' },
};

// 운동 카드 컴포넌트
function ExerciseCard({
  exercise,
  categoryIcon,
  colors,
}: {
  exercise: ExerciseInfo;
  categoryIcon: IconName;
  colors: typeof WORLDVIEW_COLORS[WorldviewType];
}) {
  const difficulty = difficultyConfig[exercise.difficulty];

  return (
    <Link
      href={exercise.implemented ? `/exercise/${exercise.id}` : '#'}
      className={`block ${!exercise.implemented ? 'pointer-events-none' : ''}`}
    >
      <div
        className="rounded-xl p-4 flex items-center gap-4 transition-all duration-200 hover:scale-[1.02]"
        style={{
          backgroundColor: 'var(--background-secondary)',
          border: '1px solid var(--background-tertiary)',
          opacity: exercise.implemented ? 1 : 0.6,
        }}
      >
        {/* 부위별 아이콘 */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: exercise.implemented
              ? colors.surface
              : 'var(--background-tertiary)',
          }}
        >
          <Icon
            name={categoryIcon}
            size={24}
            color={exercise.implemented ? colors.primary : 'var(--foreground-hint)'}
          />
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className="font-bold"
              style={{ color: 'var(--foreground)' }}
            >
              {exercise.koreanName}
            </h3>
            <span
              className="px-2 py-0.5 rounded-full text-xs text-white flex-shrink-0"
              style={{ backgroundColor: difficulty.color }}
            >
              {difficulty.label}
            </span>
          </div>
          <p
            className="text-sm mt-0.5 truncate"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            {exercise.description}
          </p>
        </div>

        {/* 화살표 */}
        {exercise.implemented && (
          <div className="flex-shrink-0" style={{ color: colors.primary }}>
            <Icon name="chevron-forward" size={20} />
          </div>
        )}
      </div>
    </Link>
  );
}

// 카테고리 섹션 컴포넌트
function CategorySection({
  category,
  exercises,
  colors,
}: {
  category: CategoryInfo;
  exercises: ExerciseInfo[];
  colors: typeof WORLDVIEW_COLORS[WorldviewType];
}) {
  if (exercises.length === 0) return null;

  return (
    <div className="mb-6">
      {/* 카테고리 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: colors.surface }}
        >
          <Icon name={category.icon} size={18} color={colors.primary} />
        </div>
        <div>
          <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>
            {category.name}
          </h2>
          <p className="text-xs" style={{ color: 'var(--foreground-hint)' }}>
            {category.description}
          </p>
        </div>
        <span
          className="ml-auto text-xs px-2 py-1 rounded-full"
          style={{
            backgroundColor: 'var(--background-tertiary)',
            color: 'var(--foreground-secondary)',
          }}
        >
          {exercises.length}개
        </span>
      </div>

      {/* 운동 목록 */}
      <div className="grid gap-2">
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            categoryIcon={category.icon}
            colors={colors}
          />
        ))}
      </div>
    </div>
  );
}

export default function ExerciseListPage() {
  const { currentWorldview } = useWorldStore();
  const colors = WORLDVIEW_COLORS[currentWorldview];
  const [activeTab, setActiveTab] = useState<TabType>('body');

  // 모든 운동이 활성화됨 (웹캠 지원 운동만 포함)
  const activeExercises = bodyExercises;

  // 카테고리별 활성화 운동 그룹화
  const getExercisesByCategory = (category: BodyCategory, exercises: ExerciseInfo[]) =>
    exercises.filter((e) => e.category === category);

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* 헤더 */}
      <header
        className="sticky top-0 z-10 p-4 flex items-center"
        style={{
          background: 'var(--background)',
          borderBottom: '1px solid var(--background-tertiary)',
        }}
      >
        <Link
          href="/worldview"
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          <Icon name="chevron-back" size={20} />
          <span>뒤로</span>
        </Link>

        <div className="flex-1 flex items-center justify-center gap-2">
          <Image
            src="/images/logo-icon.png"
            alt="HearO"
            width={28}
            height={28}
          />
          <h1
            className="text-lg font-bold"
            style={{ color: 'var(--foreground)' }}
          >
            운동 선택
          </h1>
        </div>

        <Link
          href="/settings"
          className="flex items-center gap-1 px-3 py-2 rounded-lg transition-colors"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          <Icon name="settings-outline" size={20} color="currentColor" />
          <span className="text-sm">설정</span>
        </Link>
      </header>

      {/* 세계관 테마 표시 */}
      <div
        className="mx-4 mt-4 p-3 rounded-xl flex items-center gap-3"
        style={{ backgroundColor: colors.background }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: colors.primary }}
        >
          <Icon
            name={WORLDVIEW_ICONS[currentWorldview]}
            size={22}
            color="#FFFFFF"
          />
        </div>
        <div>
          <p className="text-sm" style={{ color: colors.text, opacity: 0.7 }}>
            현재 세계관
          </p>
          <p className="font-semibold" style={{ color: colors.text }}>
            {WORLDVIEW_INFO[currentWorldview].koreanName}
          </p>
        </div>
      </div>

      {/* 탭 */}
      <div className="mx-4 mt-4 flex rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--background-secondary)' }}>
        <button
          className="flex-1 py-3 px-4 font-medium transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: activeTab === 'body' ? colors.primary : 'transparent',
            color: activeTab === 'body' ? '#FFFFFF' : 'var(--foreground-secondary)',
          }}
          onClick={() => setActiveTab('body')}
        >
          <Icon name="body-outline" size={18} color="currentColor" />
          <span>전신 운동</span>
        </button>
        <button
          className="flex-1 py-3 px-4 font-medium transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: activeTab === 'hand' ? colors.primary : 'transparent',
            color: activeTab === 'hand' ? '#FFFFFF' : 'var(--foreground-secondary)',
          }}
          onClick={() => setActiveTab('hand')}
        >
          <Icon name="hand-left-outline" size={18} color="currentColor" />
          <span>손 재활</span>
        </button>
      </div>

      {/* 운동 목록 */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-sm mb-4" style={{ color: 'var(--foreground-hint)' }}>
          {activeTab === 'body'
            ? `${activeExercises.length}개의 운동을 선택하여 3D 캐릭터와 함께 시작하세요`
            : '손 재활 운동을 선택하세요 (카메라로 손을 인식합니다)'
          }
        </p>

        {activeTab === 'body' ? (
          <>
            {/* 부위별 운동 */}
            {BODY_CATEGORIES.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                exercises={getExercisesByCategory(category.id, activeExercises)}
                colors={colors}
              />
            ))}
          </>
        ) : (
          // 손 재활 운동 목록
          <div className="grid gap-2">
            {handExercises.map((exercise) => {
              const difficulty = difficultyConfig[exercise.difficulty];

              return (
                <Link
                  key={exercise.id}
                  href={exercise.implemented ? `/exercise/hand/${exercise.id}` : '#'}
                  className={`block ${!exercise.implemented ? 'pointer-events-none' : ''}`}
                >
                  <div
                    className="rounded-xl p-4 flex items-center gap-4 transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      backgroundColor: 'var(--background-secondary)',
                      border: '1px solid var(--background-tertiary)',
                      opacity: exercise.implemented ? 1 : 0.5,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: exercise.implemented
                          ? colors.surface
                          : 'var(--background-tertiary)',
                      }}
                    >
                      <Icon
                        name={exercise.icon}
                        size={24}
                        color={exercise.implemented ? colors.primary : 'var(--foreground-hint)'}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className="font-bold"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {exercise.koreanName}
                        </h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs text-white"
                          style={{ backgroundColor: difficulty.color }}
                        >
                          {difficulty.label}
                        </span>
                      </div>
                      <p
                        className="text-sm mt-0.5 truncate"
                        style={{ color: 'var(--foreground-secondary)' }}
                      >
                        {exercise.description}
                      </p>
                    </div>

                    {exercise.implemented && (
                      <div className="flex-shrink-0" style={{ color: colors.primary }}>
                        <Icon name="chevron-forward" size={20} />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* 안내 */}
        <div
          className="mt-8 p-4 rounded-xl text-center"
          style={{
            backgroundColor: 'var(--background-secondary)',
            border: `1px solid ${colors.primary}30`,
          }}
        >
          <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            {activeTab === 'body'
              ? '운동 중 카메라가 사용됩니다.'
              : '손 재활 운동 시 손이 잘 보이도록 카메라를 조정해 주세요.'
            }
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--foreground-hint)' }}>
            카메라 권한을 허용해 주세요
          </p>
        </div>
      </main>
    </div>
  );
}
