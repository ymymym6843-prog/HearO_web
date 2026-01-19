'use client';

/**
 * 공통 버튼 컴포넌트
 * 일관된 버튼 스타일과 접근성 제공
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
  leftIcon?: IconName;
  rightIcon?: IconName;
  isLoading?: boolean;
  isFullWidth?: boolean;
  animate?: boolean;
}

// 스타일 설정
const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-hearo-primary hover:bg-hearo-primary/90 text-white',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
  tertiary: 'bg-white/10 hover:bg-white/20 text-white',
  ghost: 'bg-transparent hover:bg-white/10 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
};

const sizeStyles: Record<ButtonSize, { button: string; icon: number; text: string }> = {
  sm: { button: 'px-3 py-1.5 rounded-lg', icon: 16, text: 'text-sm' },
  md: { button: 'px-4 py-2.5 rounded-xl', icon: 18, text: 'text-base' },
  lg: { button: 'px-6 py-3.5 rounded-xl', icon: 20, text: 'text-lg' },
  xl: { button: 'px-8 py-4 rounded-2xl', icon: 24, text: 'text-xl' },
};

const disabledStyles = 'opacity-50 cursor-not-allowed';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      children,
      leftIcon,
      rightIcon,
      isLoading = false,
      isFullWidth = false,
      animate = true,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;
    const styles = sizeStyles[size];

    const buttonContent = (
      <>
        {/* 로딩 스피너 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="border-2 border-white/30 border-t-white rounded-full animate-spin"
              style={{ width: styles.icon, height: styles.icon }}
            />
          </div>
        )}

        {/* 버튼 콘텐츠 */}
        <span className={`flex items-center justify-center gap-2 ${isLoading ? 'invisible' : ''}`}>
          {leftIcon && <Icon name={leftIcon} size={styles.icon} color="currentColor" />}
          {children}
          {rightIcon && <Icon name={rightIcon} size={styles.icon} color="currentColor" />}
        </span>
      </>
    );

    const baseClassName = `
      relative inline-flex items-center justify-center font-medium transition-colors
      focus:outline-none focus:ring-2 focus:ring-hearo-primary focus:ring-offset-2 focus:ring-offset-slate-900
      ${variantStyles[variant]}
      ${styles.button}
      ${styles.text}
      ${isFullWidth ? 'w-full' : ''}
      ${isDisabled ? disabledStyles : ''}
      ${className}
    `.trim();

    if (animate && !isDisabled) {
      return (
        <motion.button
          ref={ref}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={baseClassName}
          disabled={isDisabled}
          aria-busy={isLoading}
          {...(props as HTMLMotionProps<'button'>)}
        >
          {buttonContent}
        </motion.button>
      );
    }

    return (
      <button
        ref={ref}
        className={baseClassName}
        disabled={isDisabled}
        aria-busy={isLoading}
        {...props}
      >
        {buttonContent}
      </button>
    );
  }
);

Button.displayName = 'Button';

// 아이콘 전용 버튼
interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon'> {
  icon: IconName;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', className = '', ...props }, ref) => {
    const iconSizes: Record<ButtonSize, number> = {
      sm: 16,
      md: 20,
      lg: 24,
      xl: 28,
    };

    const paddingSizes: Record<ButtonSize, string> = {
      sm: 'p-1.5',
      md: 'p-2',
      lg: 'p-2.5',
      xl: 'p-3',
    };

    return (
      <Button
        ref={ref}
        size={size}
        className={`${paddingSizes[size]} ${className}`}
        {...props}
      >
        <Icon name={icon} size={iconSizes[size]} color="currentColor" />
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default Button;
