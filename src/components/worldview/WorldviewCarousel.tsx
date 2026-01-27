'use client';

/**
 * 세계관 선택 캐러셀
 * 기존 프로젝트의 WorldSelectScreen을 웹용으로 변환
 */

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WORLDVIEWS,
  getAllWorldviews,
  type WorldviewId,
  type Worldview,
} from '@/constants/worldviews';

// 아이콘 컴포넌트 (간단한 SVG)
const WorldviewIcon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => {
  const svgClass = className || 'w-6 h-6';

  const icons: Record<string, React.ReactNode> = {
    shield: (
      <svg viewBox="0 0 24 24" fill="currentColor" className={svgClass} style={style}>
        <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm6 9.09c0 4-2.55 7.7-6 8.83-3.45-1.13-6-4.82-6-8.83V6.31l6-2.12 6 2.12v4.78z"/>
      </svg>
    ),
    rocket: (
      <svg viewBox="0 0 24 24" fill="currentColor" className={svgClass} style={style}>
        <path d="M9.19 6.35c-2.04 2.29-3.44 5.58-3.57 5.89L2 10.69l4.05-4.05c.47-.47 1.15-.68 1.81-.55l1.33.26zM11.17 17c0 .51-.19 1.03-.54 1.41L7 22l1.62-3.62c.31-.14 3.6-1.53 5.89-3.57l.26 1.33c.13.66-.08 1.34-.55 1.81l-4.05 4.05zm9.06-6.38a17.9 17.9 0 0 0-4.63-4.63L22 3 9.81 6.38c-.77.77-.98 1.93-.56 2.92l-.32.14c-1.51.53-2.71 1.69-3.25 3.19l-.31.9 4.97 4.97.9-.31c1.5-.54 2.66-1.74 3.19-3.25l.14-.32c.99.42 2.15.21 2.92-.56L22 3z"/>
      </svg>
    ),
    skull: (
      <svg viewBox="0 0 24 24" fill="currentColor" className={svgClass} style={style}>
        <path d="M12 2C6.48 2 2 6.48 2 12v8h4v-2h2v2h8v-2h2v2h4v-8c0-5.52-4.48-10-10-10zm-2 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm4 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
      </svg>
    ),
    trophy: (
      <svg viewBox="0 0 24 24" fill="currentColor" className={svgClass} style={style}>
        <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
      </svg>
    ),
    eye: (
      <svg viewBox="0 0 24 24" fill="currentColor" className={svgClass} style={style}>
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      </svg>
    ),
    star: (
      <svg viewBox="0 0 24 24" fill="currentColor" className={svgClass} style={style}>
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
    ),
  };

  return icons[name] || null;
};

interface WorldviewCarouselProps {
  onSelect: (worldviewId: WorldviewId) => void;
  selectedWorldview?: WorldviewId;
}

export function WorldviewCarousel({ onSelect, selectedWorldview }: WorldviewCarouselProps) {
  const worldviews = getAllWorldviews();
  const [hoveredId, setHoveredId] = useState<WorldviewId | null>(null);
  const [comingSoonWorld, setComingSoonWorld] = useState<Worldview | null>(null);

  const handleSelect = useCallback((worldview: Worldview) => {
    if (worldview.available) {
      onSelect(worldview.id);
    } else {
      setComingSoonWorld(worldview);
    }
  }, [onSelect]);

  return (
    <div className="w-full">
      {/* 캐러셀 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {worldviews.map((worldview, index) => {
          const isActive = worldview.available;
          const isSelected = selectedWorldview === worldview.id;
          const isHovered = hoveredId === worldview.id;

          return (
            <motion.div
              key={worldview.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="relative"
            >
              <button
                onClick={() => handleSelect(worldview)}
                onMouseEnter={() => setHoveredId(worldview.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`
                  relative w-full aspect-[4/5] rounded-2xl overflow-hidden
                  transition-all duration-300 group cursor-pointer
                  ${!isActive ? 'opacity-60' : ''}
                  ${isSelected ? 'ring-4 ring-offset-2 ring-offset-hearo-bg' : ''}
                `}
                style={{
                  boxShadow: isSelected
                    ? `0 0 30px ${worldview.colors.primary}40`
                    : 'none',
                  ...(isSelected && { ringColor: worldview.colors.primary }),
                }}
              >
                {/* 배경 이미지 */}
                <div className="absolute inset-0">
                  <Image
                    src={worldview.cardImage}
                    alt={worldview.name}
                    fill
                    className={`
                      object-cover transition-transform duration-500
                      ${isHovered && isActive ? 'scale-110' : 'scale-100'}
                    `}
                  />
                  {/* 그라디언트 오버레이 */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(to top, ${worldview.colors.primary}CC 0%, transparent 60%)`,
                    }}
                  />
                </div>

                {/* 컨텐츠 */}
                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                  {/* 아이콘 */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${worldview.colors.primary}40` }}
                  >
                    <WorldviewIcon
                      name={worldview.iconName}
                      className="w-6 h-6 text-white"
                    />
                  </div>

                  {/* 텍스트 */}
                  <h3 className="text-lg font-bold text-white mb-1">
                    {worldview.name}
                  </h3>
                  <p className="text-sm text-white/70">
                    {worldview.subtitle}
                  </p>
                </div>

                {/* 선택 체크마크 */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: worldview.colors.primary }}
                    >
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Coming Soon 뱃지 */}
                {!isActive && (
                  <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                    SOON
                  </div>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* 선택된 세계관 상세 정보 */}
      <AnimatePresence mode="wait">
        {selectedWorldview && (
          <motion.div
            key={selectedWorldview}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-6 p-6 rounded-2xl border"
            style={{
              borderColor: WORLDVIEWS[selectedWorldview].colors.primary,
              backgroundColor: `${WORLDVIEWS[selectedWorldview].colors.primary}10`,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <WorldviewIcon
                name={WORLDVIEWS[selectedWorldview].iconName}
                className="w-6 h-6"
                style={{ color: WORLDVIEWS[selectedWorldview].colors.primary } as React.CSSProperties}
              />
              <h4
                className="text-xl font-bold"
                style={{ color: WORLDVIEWS[selectedWorldview].colors.primary }}
              >
                {WORLDVIEWS[selectedWorldview].name}
              </h4>
            </div>
            <p className="text-hearo-text/80 leading-relaxed">
              {WORLDVIEWS[selectedWorldview].description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coming Soon 모달 */}
      <AnimatePresence>
        {comingSoonWorld && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setComingSoonWorld(null)}
          >
            {/* 배경 딤 */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* 모달 */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${comingSoonWorld.colors.gradient[0]}, ${comingSoonWorld.colors.gradient[1]})`,
                border: `1px solid ${comingSoonWorld.colors.primary}40`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 상단 장식 바 */}
              <div
                className="h-1.5 w-full"
                style={{ background: `linear-gradient(90deg, ${comingSoonWorld.colors.primary}, ${comingSoonWorld.colors.secondary})` }}
              />

              <div className="p-6">
                {/* 아이콘 + 잠금 */}
                <div className="flex justify-center mb-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center relative"
                    style={{ backgroundColor: `${comingSoonWorld.colors.primary}20` }}
                  >
                    <WorldviewIcon
                      name={comingSoonWorld.iconName}
                      className="w-8 h-8"
                      style={{ color: comingSoonWorld.colors.primary }}
                    />
                    <div
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: comingSoonWorld.colors.primary }}
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* 제목 */}
                <h3
                  className="text-xl font-bold text-center mb-1"
                  style={{ color: comingSoonWorld.colors.primary }}
                >
                  {comingSoonWorld.name}
                </h3>
                <p className="text-center text-white/50 text-sm mb-4">
                  {comingSoonWorld.subtitle}
                </p>

                {/* 설명 */}
                <p className="text-white/70 text-sm leading-relaxed text-center mb-5">
                  {comingSoonWorld.description}
                </p>

                {/* Coming Soon 뱃지 */}
                <div className="flex justify-center mb-5">
                  <div
                    className="px-4 py-2 rounded-full text-sm font-bold tracking-wider"
                    style={{
                      backgroundColor: `${comingSoonWorld.colors.primary}20`,
                      color: comingSoonWorld.colors.primary,
                      border: `1px solid ${comingSoonWorld.colors.primary}40`,
                    }}
                  >
                    COMING SOON
                  </div>
                </div>

                {/* 닫기 버튼 */}
                <button
                  onClick={() => setComingSoonWorld(null)}
                  className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: `${comingSoonWorld.colors.primary}20`,
                    color: comingSoonWorld.colors.primary,
                  }}
                >
                  확인
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WorldviewCarousel;
