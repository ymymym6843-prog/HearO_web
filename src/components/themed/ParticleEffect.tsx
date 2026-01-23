/**
 * ParticleEffect - 세계관별 파티클 효과 컴포넌트
 *
 * Canvas 기반 파티클 시스템:
 * - Fantasy: 마법 반짝임
 * - Sports: 모션 블러
 * - Idol: 하트
 * - SF: 디지털 비트
 * - Spy: 연기
 * - Zombie: 피 튀김
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { WorldviewId } from '@/constants/worldviews';

// ============================================
// Types
// ============================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: string;
}

interface ParticleEffectProps {
  /** 파티클 밀도 (기본: 30) */
  density?: number;
  /** 활성화 여부 */
  active?: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ============================================
// Component
// ============================================

export function ParticleEffect({
  density = 30,
  active = true,
  className = '',
}: ParticleEffectProps) {
  const { theme, worldviewId } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  // 파티클 생성
  const createParticle = useCallback(
    (canvas: HTMLCanvasElement): Particle => {
      const colors = theme.colors.particles;
      const color = colors[Math.floor(Math.random() * colors.length)];

      const baseParticle: Particle = {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0,
        vy: 0,
        size: 3,
        color,
        alpha: 1,
        life: 0,
        maxLife: 100 + Math.random() * 100,
        type: worldviewId,
      };

      // 세계관별 파티클 특성
      switch (worldviewId) {
        case 'fantasy':
          return {
            ...baseParticle,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.5 - Math.random() * 0.5,
            size: 2 + Math.random() * 4,
            maxLife: 150 + Math.random() * 100,
          };

        case 'sports':
          return {
            ...baseParticle,
            x: 0,
            y: Math.random() * canvas.height,
            vx: 5 + Math.random() * 10,
            vy: (Math.random() - 0.5) * 2,
            size: 2 + Math.random() * 3,
            maxLife: 50 + Math.random() * 30,
          };

        case 'idol':
          return {
            ...baseParticle,
            vx: (Math.random() - 0.5) * 1,
            vy: -1 - Math.random() * 2,
            size: 8 + Math.random() * 8,
            maxLife: 100 + Math.random() * 50,
          };

        case 'sf':
          return {
            ...baseParticle,
            x: Math.random() * canvas.width,
            y: 0,
            vx: (Math.random() - 0.5) * 0.5,
            vy: 1 + Math.random() * 2,
            size: 2 + Math.random() * 2,
            maxLife: 80 + Math.random() * 40,
          };

        case 'zombie':
          return {
            ...baseParticle,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * 5,
            size: 3 + Math.random() * 5,
            maxLife: 60 + Math.random() * 40,
          };

        case 'spy':
          return {
            ...baseParticle,
            y: canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.5 - Math.random() * 0.5,
            size: 20 + Math.random() * 30,
            alpha: 0.3,
            maxLife: 200 + Math.random() * 100,
          };

        default:
          return baseParticle;
      }
    },
    [worldviewId, theme.colors.particles]
  );

  // 파티클 그리기
  const drawParticle = useCallback(
    (ctx: CanvasRenderingContext2D, particle: Particle) => {
      ctx.save();
      ctx.globalAlpha = particle.alpha * (1 - particle.life / particle.maxLife);

      switch (worldviewId) {
        case 'fantasy':
          // 반짝이는 별
          drawStar(ctx, particle.x, particle.y, particle.size, particle.color);
          break;

        case 'sports':
          // 모션 블러 라인
          ctx.strokeStyle = particle.color;
          ctx.lineWidth = particle.size;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(particle.x - particle.vx * 3, particle.y);
          ctx.lineTo(particle.x, particle.y);
          ctx.stroke();
          break;

        case 'idol':
          // 하트
          drawHeart(ctx, particle.x, particle.y, particle.size, particle.color);
          break;

        case 'sf':
          // 디지털 비트 (사각형)
          ctx.fillStyle = particle.color;
          ctx.fillRect(
            particle.x - particle.size / 2,
            particle.y - particle.size / 2,
            particle.size,
            particle.size * 3
          );
          break;

        case 'zombie':
          // 피 방울
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          // 튀김 효과
          ctx.beginPath();
          ctx.arc(particle.x + particle.size, particle.y - particle.size / 2, particle.size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'spy':
          // 연기
          const gradient = ctx.createRadialGradient(
            particle.x,
            particle.y,
            0,
            particle.x,
            particle.y,
            particle.size
          );
          gradient.addColorStop(0, `${particle.color}40`);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        default:
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
      }

      ctx.restore();
    },
    [worldviewId]
  );

  // 애니메이션 루프
  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 크기 설정
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // 초기 파티클 생성
    particlesRef.current = Array.from({ length: density }, () =>
      createParticle(canvas)
    );

    // 애니메이션
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current
        .map((p) => {
          // 위치 업데이트
          p.x += p.vx;
          p.y += p.vy;
          p.life++;

          // 중력/감속 (세계관별)
          if (worldviewId === 'zombie') {
            p.vy += 0.1; // 중력
          } else if (worldviewId === 'spy') {
            p.size += 0.1; // 연기 확장
          }

          return p;
        })
        .filter((p) => {
          // 수명 체크
          if (p.life >= p.maxLife) return false;
          // 화면 밖 체크
          if (p.x < -50 || p.x > canvas.width + 50) return false;
          if (p.y < -50 || p.y > canvas.height + 50) return false;
          return true;
        });

      // 새 파티클 추가
      while (particlesRef.current.length < density) {
        particlesRef.current.push(createParticle(canvas));
      }

      // 그리기
      particlesRef.current.forEach((p) => drawParticle(ctx, p));

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [active, density, worldviewId, createParticle, drawParticle]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

// ============================================
// Helper Functions
// ============================================

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  const spikes = 4;
  const outerRadius = size;
  const innerRadius = size / 2;

  ctx.fillStyle = color;
  ctx.beginPath();

  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }

  ctx.closePath();
  ctx.fill();

  // 글로우 효과
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 2;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  const d = size;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + d / 4);
  ctx.bezierCurveTo(x, y, x - d / 2, y, x - d / 2, y + d / 4);
  ctx.bezierCurveTo(x - d / 2, y + d / 2, x, y + d * 0.75, x, y + d);
  ctx.bezierCurveTo(x, y + d * 0.75, x + d / 2, y + d / 2, x + d / 2, y + d / 4);
  ctx.bezierCurveTo(x + d / 2, y, x, y, x, y + d / 4);
  ctx.fill();
}

export default ParticleEffect;
