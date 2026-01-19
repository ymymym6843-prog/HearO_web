import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        hearo: {
          primary: 'var(--hearo-primary)',
          'primary-light': 'var(--hearo-primary-light)',
          'primary-dark': 'var(--hearo-primary-dark)',
          // Dark theme backgrounds
          bg: 'var(--background)',
          'bg-secondary': 'var(--background-secondary)',
          'bg-tertiary': 'var(--background-tertiary)',
          surface: 'var(--background-secondary)',
          // Text colors
          text: 'var(--foreground)',
          'text-secondary': 'var(--foreground-secondary)',
          'text-tertiary': 'var(--foreground-tertiary)',
          // Border
          border: 'var(--background-tertiary)',
        },
        // Worldviews
        fantasy: {
          primary: 'var(--fantasy-primary)',
          secondary: 'var(--fantasy-secondary)',
          accent: 'var(--fantasy-accent)',
          bg: 'var(--fantasy-background)',
        },
        sports: {
          primary: 'var(--sports-primary)',
          secondary: 'var(--sports-secondary)',
          accent: 'var(--sports-accent)',
          bg: 'var(--sports-background)',
        },
        idol: {
          primary: 'var(--idol-primary)',
          secondary: 'var(--idol-secondary)',
          accent: 'var(--idol-accent)',
          bg: 'var(--idol-background)',
        },
        sf: {
          primary: 'var(--sf-primary)',
          secondary: 'var(--sf-secondary)',
          accent: 'var(--sf-accent)',
          bg: 'var(--sf-background)',
        },
        zombie: {
          primary: 'var(--zombie-primary)',
          secondary: 'var(--zombie-secondary)',
          accent: 'var(--zombie-accent)',
          bg: 'var(--zombie-background)',
        },
        spy: {
          primary: 'var(--spy-primary)',
          secondary: 'var(--spy-secondary)',
          accent: 'var(--spy-accent)',
          bg: 'var(--spy-background)',
        },
        // Grades
        grade: {
          s: 'var(--grade-s)',
          a: 'var(--grade-a)',
          b: 'var(--grade-b)',
          c: 'var(--grade-c)',
          d: 'var(--grade-d)',
        },
        // State
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      spacing: {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
      },
      fontSize: {
        xs: ['var(--font-size-xs)', { lineHeight: '1.5' }],
        sm: ['var(--font-size-sm)', { lineHeight: '1.5' }],
        base: ['var(--font-size-base)', { lineHeight: '1.5' }],
        lg: ['var(--font-size-lg)', { lineHeight: '1.6' }],
        xl: ['var(--font-size-xl)', { lineHeight: '1.6' }],
        '2xl': ['var(--font-size-2xl)', { lineHeight: '1.4' }],
        '3xl': ['var(--font-size-3xl)', { lineHeight: '1.4' }],
        '4xl': ['var(--font-size-4xl)', { lineHeight: '1.2' }],
      },
      animation: {
        'fade-in': 'fadeIn var(--duration-normal) ease-out',
        'slide-up': 'slideUp var(--duration-normal) ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      minHeight: {
        touch: 'var(--touch-minimum)',
        'touch-lg': 'var(--touch-large)',
      },
    },
  },
  plugins: [],
}

export default config
