/**
 * 통합 설정 페이지
 * 모든 앱 설정을 한 곳에서 관리
 * Zustand 스토어 사용
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/useAuthStore';
import { hapticService } from '@/services/hapticService';
import { useSettingsStore, DEFAULT_SETTINGS } from '@/stores/useSettingsStore';

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, signOut, isLoading: authLoading } = useAuthStore();

  // Zustand 스토어에서 직접 설정 가져오기
  const settings = useSettingsStore();
  const { updateSetting, resetSettings } = settings;

  // Lazy initialization으로 haptic 지원 여부 확인 (cascading render 방지)
  const [hapticSupported] = useState(() => hapticService.checkSupport());
  const [isLoaded] = useState(true); // 동기적 초기화이므로 즉시 true

  // 설정 변경 시 햅틱 피드백
  const handleUpdateSetting = <K extends keyof typeof DEFAULT_SETTINGS>(
    key: K,
    value: (typeof DEFAULT_SETTINGS)[K]
  ) => {
    updateSetting(key, value);
    if (hapticSupported && settings.hapticEnabled) {
      hapticService.tap();
    }
  };

  // 로그아웃 처리
  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-hearo-bg flex items-center justify-center">
        <div className="animate-pulse text-gray-400">로딩 중...</div>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold text-white">설정</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* 프로필 섹션 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Icon name="person-outline" size={20} color="#00D9FF" />
            계정
          </h2>

          {user ? (
            <div className="bg-hearo-surface rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-hearo-primary to-blue-600 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">
                    {profile?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">
                    {profile?.username || profile?.full_name || '사용자'}
                  </p>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
                <Link
                  href="/settings/profile"
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <Icon name="chevron-forward" size={20} color="#9CA3AF" />
                </Link>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 flex gap-4">
                <button
                  onClick={handleSignOut}
                  disabled={authLoading}
                  className="flex-1 py-2 px-4 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-400 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {authLoading ? '처리 중...' : '로그아웃'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-hearo-surface rounded-xl p-4">
              <p className="text-gray-400 mb-4">
                로그인하여 운동 기록을 저장하고 진행 상황을 추적하세요.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/auth/login"
                  className="flex-1 py-3 px-4 bg-hearo-primary rounded-xl text-white text-center font-medium hover:bg-hearo-primary/90 transition-colors"
                >
                  로그인
                </Link>
                <Link
                  href="/auth/signup"
                  className="flex-1 py-3 px-4 bg-white/10 rounded-xl text-white text-center font-medium hover:bg-white/20 transition-colors"
                >
                  회원가입
                </Link>
              </div>
            </div>
          )}
        </motion.section>

        {/* 사운드 & 피드백 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Icon name="volume-high-outline" size={20} color="#00D9FF" />
            사운드 & 피드백
          </h2>

          <div className="space-y-3">
            <SettingToggle
              label="사운드"
              description="효과음 및 알림 소리"
              checked={settings.soundEnabled}
              onChange={(v) => handleUpdateSetting('soundEnabled', v)}
            />
            <SettingToggle
              label="햅틱 피드백"
              description="진동 피드백 (지원 기기만)"
              checked={settings.hapticEnabled}
              onChange={(v) => handleUpdateSetting('hapticEnabled', v)}
              disabled={!hapticSupported}
              disabledReason="이 기기는 햅틱을 지원하지 않습니다"
            />
            <SettingToggle
              label="음성 안내 (TTS)"
              description="운동 중 음성으로 안내"
              checked={settings.ttsEnabled}
              onChange={(v) => handleUpdateSetting('ttsEnabled', v)}
            />
          </div>
        </motion.section>

        {/* 운동 설정 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Icon name="fitness-outline" size={20} color="#00D9FF" />
            운동 설정
          </h2>

          <div className="space-y-3">
            <SettingSlider
              label="기본 목표 횟수"
              value={settings.defaultTargetReps}
              min={5}
              max={30}
              step={5}
              unit="회"
              onChange={(v) => handleUpdateSetting('defaultTargetReps', v)}
            />
            <SettingSlider
              label="휴식 타이머"
              value={settings.restTimerSeconds}
              min={10}
              max={120}
              step={10}
              unit="초"
              onChange={(v) => handleUpdateSetting('restTimerSeconds', v)}
            />
            <SettingToggle
              label="자동 다음 세트 시작"
              description="휴식 후 자동으로 다음 세트 시작"
              checked={settings.autoStartNextSet}
              onChange={(v) => handleUpdateSetting('autoStartNextSet', v)}
            />
            <SettingToggle
              label="ROM 수치 표시"
              description="운동 중 관절 각도 표시"
              checked={settings.showRomValues}
              onChange={(v) => handleUpdateSetting('showRomValues', v)}
            />
          </div>
        </motion.section>

        {/* 카메라 & 포즈 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Icon name="camera-outline" size={20} color="#00D9FF" />
            카메라 & 포즈
          </h2>

          <div className="space-y-3">
            <SettingSelect
              label="기본 카메라"
              value={settings.cameraPosition}
              options={[
                { value: 'front', label: '전면 카메라' },
                { value: 'back', label: '후면 카메라' },
              ]}
              onChange={(v) => handleUpdateSetting('cameraPosition', v as 'front' | 'back')}
            />
            <SettingToggle
              label="스켈레톤 표시"
              description="포즈 인식 결과 시각화"
              checked={settings.showSkeleton}
              onChange={(v) => handleUpdateSetting('showSkeleton', v)}
            />
            <SettingToggle
              label="정확도 바 표시"
              description="실시간 운동 정확도 표시"
              checked={settings.showAccuracyBar}
              onChange={(v) => handleUpdateSetting('showAccuracyBar', v)}
            />
            <SettingToggle
              label="포즈 품질 알림"
              description="자세가 잘 보이지 않을 때 알림"
              checked={settings.poseQualityAlerts}
              onChange={(v) => handleUpdateSetting('poseQualityAlerts', v)}
            />
          </div>
        </motion.section>

        {/* 3D 캐릭터 설정 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Icon name="cube-outline" size={20} color="#00D9FF" />
            3D 캐릭터
          </h2>

          <div className="space-y-3">
            <SettingToggle
              label="3D 캐릭터 표시"
              description="운동 중 3D 아바타가 동작을 따라합니다"
              checked={settings.show3DCharacter ?? false}
              onChange={(v) => handleUpdateSetting('show3DCharacter', v)}
            />
            <SettingToggle
              label="배경 분리"
              description="카메라 배경을 제거하고 가상 배경 사용"
              checked={settings.backgroundRemoval ?? false}
              onChange={(v) => handleUpdateSetting('backgroundRemoval', v)}
              disabled={!settings.show3DCharacter}
              disabledReason="3D 캐릭터를 먼저 활성화하세요"
            />
            {settings.backgroundRemoval && (
              <div className="p-4 bg-hearo-surface rounded-xl">
                <div className="flex items-center gap-2 text-gray-400">
                  <Icon name="information-circle-outline" size={16} />
                  <p className="text-sm">
                    운동 화면에서 🎲 버튼으로 배경을 랜덤 변경할 수 있습니다
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * 배경 분리는 GPU를 사용하므로 배터리 소모가 증가합니다
                </p>
              </div>
            )}
          </div>
        </motion.section>

        {/* 접근성 (별도 페이지 링크) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Icon name="accessibility-outline" size={20} color="#00D9FF" />
            접근성
          </h2>

          <Link
            href="/settings/accessibility"
            className="flex items-center justify-between p-4 bg-hearo-surface rounded-xl hover:bg-hearo-surface-hover transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon name="settings-outline" size={22} color="#9CA3AF" />
              <div>
                <p className="font-semibold text-white">접근성 설정</p>
                <p className="text-sm text-gray-400">청각 지원, 시각 지원, 모션 설정</p>
              </div>
            </div>
            <Icon name="chevron-forward" size={20} color="#9CA3AF" />
          </Link>
        </motion.section>

        {/* 앱 정보 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Icon name="information-circle-outline" size={20} color="#00D9FF" />
            앱 정보
          </h2>

          <div className="bg-hearo-surface rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">버전</span>
              <span className="text-white">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">빌드</span>
              <span className="text-white">2024.01</span>
            </div>
            <div className="pt-3 border-t border-white/10">
              <Link
                href="/privacy"
                className="block text-gray-400 hover:text-white py-2 transition-colors"
              >
                개인정보 처리방침
              </Link>
              <Link
                href="/terms"
                className="block text-gray-400 hover:text-white py-2 transition-colors"
              >
                이용약관
              </Link>
            </div>
          </div>
        </motion.section>

        {/* 설정 초기화 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="pt-4"
        >
          <button
            onClick={() => {
              resetSettings();
              if (hapticSupported) {
                hapticService.tap();
              }
            }}
            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
          >
            모든 설정 초기화
          </button>
        </motion.div>

        {/* 하단 여백 */}
        <div className="h-8" />
      </main>
    </div>
  );
}

// 토글 컴포넌트
interface SettingToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
}

function SettingToggle({
  label,
  description,
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
      <div>
        <p className="font-semibold text-white">{label}</p>
        {(description || disabledReason) && (
          <p className="text-sm text-gray-400 mt-0.5">
            {disabled && disabledReason ? disabledReason : description}
          </p>
        )}
      </div>

      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-hearo-primary transition-colors" />
        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
      </div>
    </label>
  );
}

// 슬라이더 컴포넌트
interface SettingSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

function SettingSlider({ label, value, min, max, step, unit, onChange }: SettingSliderProps) {
  return (
    <div className="p-4 bg-hearo-surface rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-white">{label}</span>
        <span className="text-hearo-primary font-bold">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-hearo-primary"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

// 셀렉트 컴포넌트
interface SettingSelectProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

function SettingSelect({ label, value, options, onChange }: SettingSelectProps) {
  return (
    <div className="p-4 bg-hearo-surface rounded-xl">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-white">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-white/10 text-white px-3 py-2 rounded-lg border border-white/20 focus:border-hearo-primary outline-none"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gray-800">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
