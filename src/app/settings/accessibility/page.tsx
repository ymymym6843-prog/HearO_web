'use client';

/**
 * 접근성 설정 페이지
 * 청각장애인 및 다양한 사용자를 위한 맞춤 설정
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';
import { hapticService } from '@/services/hapticService';

// 접근성 설정 타입
interface AccessibilitySettings {
  hearingImpaired: boolean;      // 청각 지원 모드
  hapticFeedback: boolean;       // 햅틱 피드백
  visualAlerts: boolean;         // 시각적 알림
  reduceMotion: boolean;         // 애니메이션 감소
  largeText: boolean;            // 큰 글씨
  highContrast: boolean;         // 고대비
  screenReader: boolean;         // 스크린리더 최적화
  slowAnimations: boolean;       // 느린 애니메이션
}

// 기본 설정
const DEFAULT_SETTINGS: AccessibilitySettings = {
  hearingImpaired: false,
  hapticFeedback: true,
  visualAlerts: true,
  reduceMotion: false,
  largeText: false,
  highContrast: false,
  screenReader: false,
  slowAnimations: false,
};

// 로컬스토리지 키
const STORAGE_KEY = 'hearo-accessibility-settings';

// 설정 항목 정의
const SETTINGS_ITEMS: Array<{
  key: keyof AccessibilitySettings;
  label: string;
  description: string;
  icon: IconName;
  category: 'hearing' | 'visual' | 'motion';
}> = [
  {
    key: 'hearingImpaired',
    label: '청각 지원 모드',
    description: '시각적 피드백과 햅틱을 강화합니다',
    icon: 'ear-outline',
    category: 'hearing',
  },
  {
    key: 'hapticFeedback',
    label: '햅틱 피드백',
    description: '중요 이벤트 시 진동 알림 (지원 기기만)',
    icon: 'phone-portrait-outline',
    category: 'hearing',
  },
  {
    key: 'visualAlerts',
    label: '시각적 알림',
    description: '소리 대신 화면 플래시로 알림',
    icon: 'flash-outline',
    category: 'hearing',
  },
  {
    key: 'largeText',
    label: '큰 글씨',
    description: '텍스트 크기를 20% 확대합니다',
    icon: 'text-outline',
    category: 'visual',
  },
  {
    key: 'highContrast',
    label: '고대비 모드',
    description: '색상 대비를 높여 가독성 향상',
    icon: 'contrast-outline',
    category: 'visual',
  },
  {
    key: 'screenReader',
    label: '스크린리더 최적화',
    description: 'ARIA 레이블 및 알림 강화',
    icon: 'volume-high-outline',
    category: 'visual',
  },
  {
    key: 'reduceMotion',
    label: '애니메이션 감소',
    description: '움직임에 민감한 분을 위한 설정',
    icon: 'pause-outline',
    category: 'motion',
  },
  {
    key: 'slowAnimations',
    label: '느린 애니메이션',
    description: '애니메이션 속도를 50% 감소',
    icon: 'speedometer-outline',
    category: 'motion',
  },
];

// 클라이언트에서만 실행되는 초기 설정 로드 함수
function getInitialSettings(): AccessibilitySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<AccessibilitySettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load accessibility settings:', error);
  }
  return DEFAULT_SETTINGS;
}

export default function AccessibilitySettingsPage() {
  const router = useRouter();
  // Lazy initialization으로 cascading render 방지
  const [settings, setSettings] = useState<AccessibilitySettings>(getInitialSettings);
  const [isLoaded] = useState(true); // 동기적 초기화이므로 즉시 true
  const [hapticSupported] = useState(() => hapticService.checkSupport());

  // 설정 적용 (CSS 변수 및 클래스 업데이트)
  const applySettings = useCallback((settings: AccessibilitySettings) => {
    const root = document.documentElement;

    // 애니메이션 설정
    if (settings.reduceMotion) {
      root.style.setProperty('--animation-duration', '0ms');
      root.style.setProperty('--transition-duration', '0ms');
    } else if (settings.slowAnimations) {
      root.style.setProperty('--animation-duration', '600ms');
      root.style.setProperty('--transition-duration', '600ms');
    } else {
      root.style.setProperty('--animation-duration', '300ms');
      root.style.setProperty('--transition-duration', '300ms');
    }

    // 텍스트 크기
    if (settings.largeText) {
      root.style.setProperty('--text-scale', '1.2');
      root.style.fontSize = '120%';
    } else {
      root.style.setProperty('--text-scale', '1');
      root.style.fontSize = '100%';
    }

    // 고대비 모드
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // 햅틱 서비스 설정
    hapticService.setEnabled(settings.hapticFeedback);
  }, []);

  // 설정 변경 핸들러
  const updateSetting = useCallback(<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value };

      // 로컬스토리지 저장
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      } catch (error) {
        console.error('Failed to save accessibility settings:', error);
      }

      // CSS 변수 업데이트
      applySettings(newSettings);

      // 햅틱 피드백
      if (hapticSupported && newSettings.hapticFeedback) {
        hapticService.tap();
      }

      return newSettings;
    });
  }, [hapticSupported, applySettings]);

  // 초기 설정 적용
  useEffect(() => {
    if (isLoaded) {
      applySettings(settings);
    }
  }, [isLoaded, settings, applySettings]);

  // 청각 지원 모드 활성화 시 관련 설정 자동 활성화
  const handleHearingImpairedChange = useCallback((value: boolean) => {
    updateSetting('hearingImpaired', value);
    if (value) {
      updateSetting('hapticFeedback', true);
      updateSetting('visualAlerts', true);
    }
  }, [updateSetting]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-hearo-bg flex items-center justify-center">
        <div className="animate-pulse text-gray-400">설정 로드 중...</div>
      </div>
    );
  }

  // 카테고리별 그룹화
  const categories: Record<string, { title: string; icon: IconName }> = {
    hearing: { title: '청각 지원', icon: 'ear-outline' },
    visual: { title: '시각 지원', icon: 'eye-outline' },
    motion: { title: '모션 설정', icon: 'move-outline' },
  };

  return (
    <div className="min-h-screen bg-hearo-bg">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-hearo-bg/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            aria-label="뒤로 가기"
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </button>
          <h1 className="text-xl font-bold text-white">접근성 설정</h1>
        </div>
      </header>

      {/* 설정 목록 */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* 안내 메시지 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-hearo-primary/20 rounded-2xl p-4 border border-hearo-primary/30"
        >
          <div className="flex items-start gap-3">
            <Icon name="accessibility-outline" size={24} color="#00D9FF" />
            <div>
              <p className="text-white font-semibold">모든 사용자를 위한 설정</p>
              <p className="text-gray-300 text-sm mt-1">
                HearO는 청각장애인 및 다양한 사용자가 편리하게 사용할 수 있도록
                접근성 기능을 제공합니다.
              </p>
            </div>
          </div>
        </motion.div>

        {/* 카테고리별 설정 */}
        {Object.entries(categories).map(([categoryKey, category], categoryIndex) => (
          <motion.section
            key={categoryKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categoryIndex * 0.1 }}
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Icon name={category.icon} size={20} color="#00D9FF" />
              {category.title}
            </h2>

            <div className="space-y-3">
              {SETTINGS_ITEMS
                .filter((item) => item.category === categoryKey)
                .map((item) => (
                  <SettingToggle
                    key={item.key}
                    label={item.label}
                    description={item.description}
                    icon={item.icon}
                    checked={settings[item.key]}
                    onChange={(value) => {
                      if (item.key === 'hearingImpaired') {
                        handleHearingImpairedChange(value);
                      } else {
                        updateSetting(item.key, value);
                      }
                    }}
                    disabled={item.key === 'hapticFeedback' && !hapticSupported}
                    disabledReason={item.key === 'hapticFeedback' && !hapticSupported
                      ? '이 기기는 햅틱 피드백을 지원하지 않습니다'
                      : undefined
                    }
                  />
                ))}
            </div>
          </motion.section>
        ))}

        {/* 설정 초기화 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="pt-4 border-t border-white/10"
        >
          <button
            onClick={() => {
              setSettings(DEFAULT_SETTINGS);
              localStorage.removeItem(STORAGE_KEY);
              applySettings(DEFAULT_SETTINGS);
              if (hapticSupported) {
                hapticService.tap();
              }
            }}
            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl
              text-gray-400 hover:text-white transition-colors text-center"
          >
            설정 초기화
          </button>
        </motion.div>

        {/* 하단 여백 */}
        <div className="h-8" />
      </main>
    </div>
  );
}

// 설정 토글 컴포넌트
interface SettingToggleProps {
  label: string;
  description: string;
  icon: IconName;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
}

function SettingToggle({
  label,
  description,
  icon,
  checked,
  onChange,
  disabled = false,
  disabledReason,
}: SettingToggleProps) {
  return (
    <label
      className={`
        flex items-center justify-between p-4 bg-hearo-surface rounded-xl
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-hearo-surface-hover'}
        transition-colors
      `}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Icon name={icon} size={22} color={checked ? '#00D9FF' : '#9CA3AF'} />
        </div>
        <div>
          <p className="font-semibold text-white">{label}</p>
          <p className="text-sm text-gray-400 mt-0.5">
            {disabled && disabledReason ? disabledReason : description}
          </p>
        </div>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-5 h-5 rounded accent-hearo-primary cursor-pointer disabled:cursor-not-allowed"
        aria-label={label}
      />
    </label>
  );
}
