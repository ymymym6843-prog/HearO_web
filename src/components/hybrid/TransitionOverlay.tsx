'use client';

/**
 * TransitionOverlay - Phase 전환 효과 오버레이
 *
 * 2D→3D 전환 시 시각적 연출:
 * - 빛 효과 (세계관 컬러)
 * - 파티클 효과
 * - 페이드 인/아웃
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { WorldviewType } from '@/types/vrm';
import { WORLDVIEWS } from '@/constants/worldviews';

// 파티클 데이터 타입
interface ParticleData {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

// 파티클 초기 데이터 생성 함수 (컴포넌트 외부에서 한 번만 호출)
function createParticles(): ParticleData[] {
  return Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 1,
  }));
}

interface TransitionOverlayProps {
  /** 전환 진행률 (0-1) */
  progress: number;
  /** 세계관 ID */
  worldview: WorldviewType;
}

export function TransitionOverlay({ progress, worldview }: TransitionOverlayProps) {
  const worldviewData = WORLDVIEWS[worldview];
  const primaryColor = worldviewData?.colors.primary || '#8B5CF6';

  // 진행률 기반 opacity 계산 (중간에 최대, 끝에 페이드 아웃)
  const overlayOpacity = useMemo(() => {
    if (progress < 0.3) {
      return progress / 0.3 * 0.6; // 0 → 0.6
    } else if (progress < 0.7) {
      return 0.6; // 유지
    } else {
      return 0.6 * (1 - (progress - 0.7) / 0.3); // 0.6 → 0
    }
  }, [progress]);

  // 빛 줄기 효과
  const lightRays = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * 360,
      delay: i * 0.05,
    }));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 z-50 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 중앙 글로우 */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: overlayOpacity }}
      >
        <div
          className="w-64 h-64 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${primaryColor}80, transparent 70%)`,
            transform: `scale(${1 + progress * 2})`,
          }}
        />
      </motion.div>

      {/* 빛 줄기 효과 */}
      <div className="absolute inset-0 flex items-center justify-center">
        {lightRays.map(({ angle, delay }, index) => (
          <motion.div
            key={index}
            className="absolute w-1 origin-bottom"
            style={{
              height: `${50 + progress * 100}%`,
              background: `linear-gradient(to top, ${primaryColor}60, transparent)`,
              transform: `rotate(${angle}deg)`,
            }}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{
              opacity: overlayOpacity,
              scaleY: progress > delay ? 1 : 0,
            }}
            transition={{ duration: 0.5, delay }}
          />
        ))}
      </div>

      {/* 파티클 효과 */}
      <ParticleEffect progress={progress} color={primaryColor} />

      {/* 텍스트 효과 (전환 중반) */}
      {progress > 0.3 && progress < 0.8 && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="text-2xl font-bold tracking-wider text-center"
            style={{
              color: primaryColor,
              textShadow: `0 0 20px ${primaryColor}, 0 0 40px ${primaryColor}50`,
            }}
          >
            MISSION START
          </div>
        </motion.div>
      )}

      {/* 바깥쪽 비네팅 */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle, transparent 30%, rgba(0,0,0,${overlayOpacity}) 100%)`,
        }}
      />
    </motion.div>
  );
}

/**
 * 파티클 효과 컴포넌트
 */
function ParticleEffect({ progress, color }: { progress: number; color: string }) {
  // useState lazy initialization으로 초기 렌더링 시 한 번만 생성
  const [particles] = useState<ParticleData[]>(createParticles);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: color,
            boxShadow: `0 0 ${particle.size * 2}px ${color}`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: progress > particle.delay ? [0, 1, 0] : 0,
            scale: progress > particle.delay ? [0, 1, 0.5] : 0,
            y: progress > particle.delay ? [0, -50, -100] : 0,
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

export default TransitionOverlay;
