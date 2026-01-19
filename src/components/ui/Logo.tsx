'use client';

/**
 * HearO 로고 컴포넌트
 * 기존 앱과 동일한 로고 사용
 */

import Image from 'next/image';
import { LOGO_SIZES } from '@/constants/themes';

type LogoSize = keyof typeof LOGO_SIZES;
type LogoVariant = 'color' | 'white';
type LogoType = 'full' | 'icon';

interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  type?: LogoType;
  className?: string;
  priority?: boolean;
}

export function Logo({
  size = 'md',
  variant = 'color',
  type = 'full',
  className = '',
  priority = false,
}: LogoProps) {
  const dimensions = LOGO_SIZES[size];

  // 로고 파일 경로 결정
  const getLogoPath = (): string => {
    const baseName = type === 'icon' ? 'logo-icon' : 'logo';
    const suffix = variant === 'white' ? '-white' : '';
    return `/images/${baseName}${suffix}.png`;
  };

  return (
    <Image
      src={getLogoPath()}
      alt="HearO Logo"
      width={dimensions.width}
      height={dimensions.height}
      className={className}
      priority={priority}
    />
  );
}

// 로고 + 텍스트 조합
export function LogoWithText({
  size = 'md',
  variant = 'color',
  className = '',
}: Omit<LogoProps, 'type'>) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo size={size} variant={variant} type="icon" />
      <span
        className="font-bold tracking-tight"
        style={{
          fontSize: LOGO_SIZES[size].width * 0.4,
          color: variant === 'white' ? '#FFFFFF' : '#e94560',
        }}
      >
        HearO
      </span>
    </div>
  );
}

export default Logo;
