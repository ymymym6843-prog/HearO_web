/**
 * ThemedButton - 세계관별 버튼 컴포넌트
 *
 * 각 세계관의 고유한 버튼 스타일 자동 적용
 */

'use client';

import React, { forwardRef, type ButtonHTMLAttributes } from 'react';
import { useTheme, useButtonClass } from '@/contexts/ThemeContext';

// ============================================
// Types
// ============================================

interface ThemedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 버튼 변형 */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /** 버튼 크기 */
  size?: 'sm' | 'md' | 'lg';
  /** 로딩 상태 */
  loading?: boolean;
  /** 전체 너비 */
  fullWidth?: boolean;
}

// ============================================
// Component
// ============================================

export const ThemedButton = forwardRef<HTMLButtonElement, ThemedButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const { theme, worldviewId } = useTheme();
    const themeButtonClass = useButtonClass();

    // 크기별 스타일
    const sizeStyles = {
      sm: 'px-4 py-2 text-sm min-h-[36px]',
      md: 'px-6 py-3 text-base min-h-[44px]',
      lg: 'px-8 py-4 text-lg min-h-[52px]',
    };

    // 변형별 기본 스타일
    const getVariantStyles = () => {
      if (variant === 'primary') {
        return themeButtonClass;
      }

      switch (variant) {
        case 'secondary':
          return `
            bg-opacity-20 border border-current
            hover:bg-opacity-30
          `;
        case 'outline':
          return `
            bg-transparent border-2
            hover:bg-opacity-10
          `;
        case 'ghost':
          return `
            bg-transparent border-none
            hover:bg-opacity-10
          `;
        default:
          return '';
      }
    };

    return (
      <button
        ref={ref}
        className={`
          relative inline-flex items-center justify-center
          font-semibold rounded-lg
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeStyles[size]}
          ${variant === 'primary' ? themeButtonClass : getVariantStyles()}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        disabled={disabled || loading}
        style={{
          fontFamily: theme.fonts.title,
          '--tw-ring-color': theme.colors.primary,
          borderColor: variant !== 'primary' ? theme.colors.primary : undefined,
          color: variant !== 'primary' ? theme.colors.primary : undefined,
          backgroundColor: variant === 'secondary' ? theme.colors.primary : undefined,
        } as React.CSSProperties}
        {...props}
      >
        {loading ? (
          <>
            <LoadingSpinner className="mr-2" />
            <span className="opacity-70">{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

ThemedButton.displayName = 'ThemedButton';

// ============================================
// Loading Spinner
// ============================================

function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-5 w-5 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default ThemedButton;
