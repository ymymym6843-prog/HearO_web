/**
 * Theme Demo Page
 *
 * 6개 세계관별 테마 미리보기 및 테스트 페이지
 */

'use client';

import React, { useState } from 'react';
import { ThemeProvider, useTheme, useDialogueBoxClass, useButtonClass } from '@/contexts/ThemeContext';
import { ThemedDialogueBox, ThemedButton, ParticleEffect } from '@/components/themed';
import type { WorldviewId } from '@/constants/worldviews';
import { WORLDVIEW_THEMES } from '@/constants/themes';

// 세계관별 데모 텍스트
const DEMO_TEXTS: Record<WorldviewId, { speaker: string; text: string }> = {
  fantasy: {
    speaker: '마법사 엘리나',
    text: '용사의 재활 퀘스트가 시작됩니다. 팔을 들어 올려 마법을 발동하세요. 당신의 용기가 왕국을 구할 것입니다!',
  },
  sports: {
    speaker: '코치 김',
    text: '미션 시작! 어깨를 올려 슛을 성공시키세요. 당신은 최고의 선수가 될 수 있습니다!',
  },
  idol: {
    speaker: '매니저 수진',
    text: '드디어 첫 무대네요! 당신의 노력이 헛되지 않았다는 걸 보여줄 시간이에요. 준비됐나요?',
  },
  sf: {
    speaker: 'AI 시스템',
    text: 'MISSION 01 : 팔을 들어 올려 시스템을 활성화하십시오. 우주 탐사 준비가 완료되었습니다.',
  },
  spy: {
    speaker: '본부 요원',
    text: 'TARGET LOCKED — 천천히 팔을 이동하세요. 작전 성공을 위해 침착함을 유지하십시오.',
  },
  zombie: {
    speaker: '생존자 리더',
    text: '좀비가 접근 중입니다. 재활 동작으로 탈출하세요. 우리의 생존이 달려있습니다!',
  },
};

// 세계관 목록
const WORLDVIEWS: WorldviewId[] = ['fantasy', 'sports', 'idol', 'sf', 'zombie', 'spy'];

// 메인 데모 컴포넌트
function ThemeDemoContent() {
  const { theme, worldviewId, setTheme } = useTheme();
  const dialogueClass = useDialogueBoxClass();
  const buttonClass = useButtonClass();
  const [showParticles, setShowParticles] = useState(true);

  const demoText = DEMO_TEXTS[worldviewId];

  return (
    <div
      className="min-h-screen relative overflow-hidden transition-colors duration-500"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.backgroundSecondary} 100%)`,
      }}
    >
      {/* 파티클 효과 */}
      {showParticles && <ParticleEffect density={40} />}

      {/* 헤더 */}
      <header className="relative z-10 p-6 border-b" style={{ borderColor: theme.colors.border }}>
        <h1
          className="text-3xl font-bold"
          style={{
            fontFamily: theme.fonts.title,
            color: theme.colors.primary,
          }}
        >
          HearO Theme Demo
        </h1>
        <p className="mt-2" style={{ color: theme.colors.textSecondary }}>
          세계관별 테마 미리보기
        </p>
      </header>

      {/* 세계관 선택 */}
      <nav className="relative z-10 p-6 flex flex-wrap gap-3">
        {WORLDVIEWS.map((wv) => (
          <button
            key={wv}
            onClick={() => setTheme(wv)}
            className={`
              px-4 py-2 rounded-lg transition-all duration-200
              ${worldviewId === wv ? 'ring-2 ring-offset-2 scale-105' : 'opacity-70 hover:opacity-100'}
            `}
            style={{
              background: WORLDVIEW_THEMES[wv].colors.primary,
              color: wv === 'spy' ? '#fff' : WORLDVIEW_THEMES[wv].colors.background,
              fontFamily: WORLDVIEW_THEMES[wv].fonts.title,
              '--tw-ring-color': WORLDVIEW_THEMES[wv].colors.primary,
            } as React.CSSProperties}
          >
            {wv.toUpperCase()}
          </button>
        ))}
      </nav>

      {/* 파티클 토글 */}
      <div className="relative z-10 px-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showParticles}
            onChange={(e) => setShowParticles(e.target.checked)}
            className="w-5 h-5"
          />
          <span style={{ color: theme.colors.text }}>파티클 효과</span>
        </label>
      </div>

      {/* 메인 콘텐츠 */}
      <main className="relative z-10 p-6 max-w-4xl mx-auto space-y-8">
        {/* 테마 정보 */}
        <section
          className="p-6 rounded-lg"
          style={{
            background: theme.colors.backgroundSecondary,
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <h2
            className="text-2xl font-bold mb-4"
            style={{ color: theme.colors.primary, fontFamily: theme.fonts.title }}
          >
            {theme.name} 테마
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div style={{ color: theme.colors.textSecondary }}>Primary Font</div>
              <div style={{ fontFamily: theme.fonts.primary, color: theme.colors.text }}>
                {theme.fonts.primary}
              </div>
            </div>
            <div>
              <div style={{ color: theme.colors.textSecondary }}>대화창 스타일</div>
              <div style={{ color: theme.colors.text }}>{theme.ui.dialogueBox}</div>
            </div>
            <div>
              <div style={{ color: theme.colors.textSecondary }}>파티클 효과</div>
              <div style={{ color: theme.colors.text }}>{theme.ui.particleEffect}</div>
            </div>
            <div>
              <div style={{ color: theme.colors.textSecondary }}>애니메이션</div>
              <div style={{ color: theme.colors.text }}>{theme.ui.animation}</div>
            </div>
          </div>

          {/* 컬러 팔레트 */}
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(theme.colors).slice(0, 8).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center gap-2 px-3 py-1 rounded text-xs"
                style={{ background: 'rgba(0,0,0,0.3)' }}
              >
                <div
                  className="w-4 h-4 rounded"
                  style={{ background: typeof value === 'string' ? value : '#000' }}
                />
                <span style={{ color: theme.colors.text }}>{key}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 대화창 데모 */}
        <section className="space-y-4">
          <h2
            className="text-xl font-bold"
            style={{ color: theme.colors.text, fontFamily: theme.fonts.title }}
          >
            대화창 컴포넌트
          </h2>
          <ThemedDialogueBox
            text={demoText.text}
            speakerName={demoText.speaker}
            typingSpeed={30}
            onComplete={() => console.log('Typing complete')}
            onClick={() => console.log('Next clicked')}
          />
        </section>

        {/* 버튼 데모 */}
        <section className="space-y-4">
          <h2
            className="text-xl font-bold"
            style={{ color: theme.colors.text, fontFamily: theme.fonts.title }}
          >
            버튼 컴포넌트
          </h2>
          <div className="flex flex-wrap gap-4">
            <ThemedButton variant="primary">Primary 버튼</ThemedButton>
            <ThemedButton variant="secondary">Secondary 버튼</ThemedButton>
            <ThemedButton variant="outline">Outline 버튼</ThemedButton>
            <ThemedButton variant="ghost">Ghost 버튼</ThemedButton>
          </div>
          <div className="flex flex-wrap gap-4">
            <ThemedButton size="sm">Small</ThemedButton>
            <ThemedButton size="md">Medium</ThemedButton>
            <ThemedButton size="lg">Large</ThemedButton>
            <ThemedButton loading>Loading</ThemedButton>
          </div>
        </section>

        {/* 타이포그래피 데모 */}
        <section className="space-y-4">
          <h2
            className="text-xl font-bold"
            style={{ color: theme.colors.text, fontFamily: theme.fonts.title }}
          >
            타이포그래피
          </h2>
          <div
            className="p-6 rounded-lg"
            style={{
              background: theme.colors.backgroundSecondary,
              border: `1px solid ${theme.colors.border}`,
            }}
          >
            <p
              className="text-4xl mb-4"
              style={{ fontFamily: theme.fonts.title, color: theme.colors.primary }}
            >
              타이틀 폰트
            </p>
            <p
              className="text-lg mb-4"
              style={{ fontFamily: theme.fonts.body, color: theme.colors.text }}
            >
              본문 폰트: 운동을 통해 건강을 되찾으세요. HearO와 함께라면 재활도 재미있게!
            </p>
            <p
              className="text-2xl"
              style={{ fontFamily: theme.fonts.numeric, color: theme.colors.accent }}
            >
              숫자 폰트: 12345 / Score: 98.5%
            </p>
          </div>
        </section>

        {/* 애니메이션 데모 */}
        <section className="space-y-4">
          <h2
            className="text-xl font-bold"
            style={{ color: theme.colors.text, fontFamily: theme.fonts.title }}
          >
            애니메이션 효과
          </h2>
          <div className="flex flex-wrap gap-4">
            {worldviewId === 'sf' && (
              <div
                className="animate-glitch p-4 rounded"
                style={{ background: theme.colors.primary, color: theme.colors.background }}
              >
                글리치 효과
              </div>
            )}
            {worldviewId === 'zombie' && (
              <div
                className="animate-flicker p-4 rounded"
                style={{ background: theme.colors.primary, color: theme.colors.background }}
              >
                깜빡임 효과
              </div>
            )}
            {worldviewId === 'idol' && (
              <div
                className="animate-neon-pulse p-4 rounded"
                style={{ background: 'transparent', border: `2px solid ${theme.colors.primary}`, color: theme.colors.primary }}
              >
                네온 펄스
              </div>
            )}
            {worldviewId === 'fantasy' && (
              <div
                className="animate-magic-glow p-4 rounded"
                style={{ background: theme.colors.primary, color: theme.colors.background }}
              >
                마법 글로우
              </div>
            )}
            <div
              className="animate-pulse-glow p-4 rounded"
              style={{ background: theme.colors.primary, color: theme.colors.background }}
            >
              펄스 글로우
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer
        className="relative z-10 p-6 mt-8 text-center border-t"
        style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}
      >
        HearO Theme System Demo - Master Prompt Implementation
      </footer>
    </div>
  );
}

// 페이지 컴포넌트
export default function ThemeDemoPage() {
  return (
    <ThemeProvider initialWorldview="fantasy">
      <ThemeDemoContent />
    </ThemeProvider>
  );
}
