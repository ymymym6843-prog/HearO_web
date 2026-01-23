'use client';

/**
 * 회원가입 페이지
 * HearO - 카드 형식 UI + 의료 앱 필수 약관 동의
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';
import { BRAND_COLORS } from '@/constants/themes';
import { useAuthStore } from '@/stores/useAuthStore';
import { authService } from '@/services/authService';
import type { OAuthProvider } from '@/services/authService';
import { TermsModal } from '@/components/auth/TermsModal';
import {
  SERVICE_TERMS,
  PRIVACY_POLICY,
  HEALTH_INFO_CONSENT,
  MARKETING_CONSENT,
  type TermsContent,
} from '@/constants/terms';

// 약관 동의 항목 타입
interface ConsentItem {
  id: string;
  label: string;
  required: boolean;
  description?: string;
  termsContent: TermsContent;
}

// 의료 재활 앱 필수 약관 항목
const CONSENT_ITEMS: ConsentItem[] = [
  {
    id: 'terms',
    label: '서비스 이용약관 동의',
    required: true,
    termsContent: SERVICE_TERMS,
  },
  {
    id: 'privacy',
    label: '개인정보 수집 및 이용 동의',
    required: true,
    description: '이름, 이메일, 프로필 정보 등',
    termsContent: PRIVACY_POLICY,
  },
  {
    id: 'health',
    label: '민감정보(건강정보) 수집 및 이용 동의',
    required: true,
    description: '운동 기록, ROM 측정 데이터, 통증 기록 등',
    termsContent: HEALTH_INFO_CONSENT,
  },
  {
    id: 'marketing',
    label: '마케팅 정보 수신 동의',
    required: false,
    description: '이벤트, 프로모션 알림 (선택)',
    termsContent: MARKETING_CONSENT,
  },
];

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, isLoading, error, clearError } = useAuthStore();

  // 단계 관리 (1: 약관동의, 2: 정보입력)
  const [step, setStep] = useState(1);

  // 약관 동의 상태
  const [consents, setConsents] = useState<Record<string, boolean>>({
    terms: false,
    privacy: false,
    health: false,
    marketing: false,
  });

  // 입력 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);

  // 약관 모달 상태
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [selectedTerms, setSelectedTerms] = useState<TermsContent | null>(null);

  // 약관 모달 열기
  const openTermsModal = (termsContent: TermsContent) => {
    setSelectedTerms(termsContent);
    setTermsModalOpen(true);
  };

  // 필수 약관 모두 동의했는지 확인
  const allRequiredConsented = CONSENT_ITEMS
    .filter(item => item.required)
    .every(item => consents[item.id]);

  // 전체 동의 토글
  const toggleAllConsents = () => {
    const allChecked = Object.values(consents).every(v => v);
    const newValue = !allChecked;
    setConsents({
      terms: newValue,
      privacy: newValue,
      health: newValue,
      marketing: newValue,
    });
  };

  // 개별 동의 토글
  const toggleConsent = (id: string) => {
    setConsents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 다음 단계로
  const handleNextStep = () => {
    if (!allRequiredConsented) {
      setLocalError('필수 약관에 모두 동의해주세요.');
      return;
    }
    setLocalError(null);
    setStep(2);
  };

  // 회원가입 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!fullName.trim()) {
      setLocalError('이름을 입력해주세요.');
      return;
    }

    if (!birthdate) {
      setLocalError('생년월일을 입력해주세요.');
      return;
    }

    if (!gender) {
      setLocalError('성별을 선택해주세요.');
      return;
    }

    if (!username.trim()) {
      setLocalError('닉네임을 입력해주세요.');
      return;
    }

    const success = await signUp({
      email,
      password,
      username: username.trim(),
      fullName: fullName.trim(),
      birthdate,
      gender,
      consents: {
        terms: consents.terms,
        privacy: consents.privacy,
        health: consents.health,
        marketing: consents.marketing,
      },
    });
    if (success) {
      router.push('/worldview');
    }
  };

  // OAuth 로그인
  const handleOAuthLogin = async (provider: OAuthProvider) => {
    if (!allRequiredConsented) {
      setLocalError('필수 약관에 모두 동의해주세요.');
      return;
    }

    setOauthLoading(provider);
    clearError();
    setLocalError(null);

    const { error } = await authService.signInWithOAuth(provider);
    if (error) {
      console.error('OAuth signup error:', error);
    }
    setOauthLoading(null);
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-hearo-bg flex flex-col items-center justify-center py-8 px-4">
      {/* 배경 글로우 */}
      <div
        className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full opacity-10 pointer-events-none"
        style={{ backgroundColor: BRAND_COLORS.primary }}
      />

      {/* 로고 */}
      <Link href="/" className="mb-6">
        <Image
          src="/images/logo/logo-icon.png"
          alt="HearO"
          width={60}
          height={60}
        />
      </Link>

      {/* 메인 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-hearo-surface rounded-2xl shadow-xl overflow-hidden"
      >
        {/* 카드 헤더 */}
        <div
          className="px-6 py-5"
          style={{ backgroundColor: `${BRAND_COLORS.primary}15` }}
        >
          <h1 className="text-xl font-bold text-hearo-text">회원가입</h1>
          <p className="text-sm text-hearo-text/60 mt-1">
            {step === 1 ? '서비스 이용을 위한 약관에 동의해주세요' : '계정 정보를 입력해주세요'}
          </p>

          {/* 단계 표시 */}
          <div className="flex items-center gap-2 mt-4">
            <div
              className={`flex-1 h-1 rounded-full transition-colors ${
                step >= 1 ? 'bg-hearo-primary' : 'bg-hearo-text/20'
              }`}
            />
            <div
              className={`flex-1 h-1 rounded-full transition-colors ${
                step >= 2 ? 'bg-hearo-primary' : 'bg-hearo-text/20'
              }`}
            />
          </div>
        </div>

        {/* 에러 메시지 */}
        <AnimatePresence>
          {displayError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 py-3 bg-red-500/10 border-b border-red-500/20"
            >
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <Icon name="warning-outline" size={16} />
                {displayError}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 카드 내용 */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              /* Step 1: 약관 동의 */
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {/* 전체 동의 */}
                <button
                  type="button"
                  onClick={toggleAllConsents}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-hearo-bg mb-4 hover:bg-hearo-bg/80 transition-colors"
                >
                  <div
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                      Object.values(consents).every(v => v)
                        ? 'bg-hearo-primary border-hearo-primary'
                        : 'border-hearo-text/30'
                    }`}
                  >
                    {Object.values(consents).every(v => v) && (
                      <Icon name="checkmark" size={16} color="white" />
                    )}
                  </div>
                  <span className="font-medium text-hearo-text">전체 동의</span>
                </button>

                {/* 개별 약관 */}
                <div className="space-y-2">
                  {CONSENT_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-hearo-bg/50 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => toggleConsent(item.id)}
                        className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          consents[item.id]
                            ? 'bg-hearo-primary border-hearo-primary'
                            : 'border-hearo-text/30'
                        }`}
                      >
                        {consents[item.id] && (
                          <Icon name="checkmark" size={12} color="white" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-hearo-text">
                            {item.label}
                          </span>
                          {item.required && (
                            <span className="text-xs text-red-400">(필수)</span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-hearo-text/50 mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTermsModal(item.termsContent);
                        }}
                        className="text-xs text-hearo-primary hover:underline shrink-0"
                      >
                        전문보기
                      </button>
                    </div>
                  ))}
                </div>

                {/* 안내 문구 */}
                <div className="mt-4 p-3 bg-blue-500/10 rounded-xl">
                  <p className="text-xs text-blue-400 flex items-start gap-2">
                    <Icon name="information-circle-outline" size={14} className="shrink-0 mt-0.5" />
                    <span>
                      의료 재활 서비스 특성상 건강정보 수집에 대한 동의가 필요합니다.
                      수집된 정보는 암호화되어 안전하게 보관됩니다.
                    </span>
                  </p>
                </div>

                {/* 다음 버튼 */}
                <motion.button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!allRequiredConsented}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-6 py-3 rounded-xl text-white font-bold disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: BRAND_COLORS.primary }}
                >
                  다음
                </motion.button>

                {/* 구분선 */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-hearo-text/20" />
                  <span className="text-xs text-hearo-text/50">간편 가입</span>
                  <div className="flex-1 h-px bg-hearo-text/20" />
                </div>

                {/* 소셜 가입 */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleOAuthLogin('google')}
                    disabled={!!oauthLoading || !allRequiredConsented}
                    className="flex-1 py-3 px-4 bg-white text-gray-800 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    {oauthLoading === 'google' ? (
                      <Icon name="reload-outline" size={20} className="animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    <span className="hidden sm:inline">Google</span>
                  </button>

                  <button
                    onClick={() => handleOAuthLogin('kakao')}
                    disabled={!!oauthLoading || !allRequiredConsented}
                    className="flex-1 py-3 px-4 bg-[#FEE500] text-[#191919] rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#FDD800] transition-colors disabled:opacity-50"
                  >
                    {oauthLoading === 'kakao' ? (
                      <Icon name="reload-outline" size={20} className="animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#191919" d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
                      </svg>
                    )}
                    <span className="hidden sm:inline">카카오</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Step 2: 정보 입력 */
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* 이름 (필수) */}
                  <div>
                    <label className="block text-sm text-hearo-text/70 mb-1">
                      이름 <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="실명을 입력해주세요"
                        required
                        maxLength={50}
                        className="w-full px-4 py-3 pl-11 bg-hearo-bg rounded-xl text-hearo-text placeholder-hearo-text/40 focus:outline-none focus:ring-2 focus:ring-hearo-primary/50"
                      />
                      <Icon
                        name="person-outline"
                        size={20}
                        color="var(--foreground-secondary)"
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                      />
                    </div>
                  </div>

                  {/* 생년월일과 성별 (가로 배치) */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* 생년월일 (필수) */}
                    <div>
                      <label className="block text-sm text-hearo-text/70 mb-1">
                        생년월일 <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={birthdate}
                          onChange={(e) => setBirthdate(e.target.value)}
                          required
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-3 pl-11 bg-hearo-bg rounded-xl text-hearo-text placeholder-hearo-text/40 focus:outline-none focus:ring-2 focus:ring-hearo-primary/50"
                        />
                        <Icon
                          name="calendar-outline"
                          size={20}
                          color="var(--foreground-secondary)"
                          className="absolute left-3 top-1/2 -translate-y-1/2"
                        />
                      </div>
                    </div>

                    {/* 성별 (필수) */}
                    <div>
                      <label className="block text-sm text-hearo-text/70 mb-1">
                        성별 <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other' | '')}
                        required
                        className="w-full px-4 py-3 bg-hearo-bg rounded-xl text-hearo-text focus:outline-none focus:ring-2 focus:ring-hearo-primary/50 appearance-none cursor-pointer"
                      >
                        <option value="">선택</option>
                        <option value="male">남성</option>
                        <option value="female">여성</option>
                        <option value="other">기타</option>
                      </select>
                    </div>
                  </div>

                  {/* 안내 문구 */}
                  <div className="p-3 bg-amber-500/10 rounded-xl">
                    <p className="text-xs text-amber-400 flex items-start gap-2">
                      <Icon name="information-circle-outline" size={14} className="shrink-0 mt-0.5" />
                      <span>
                        연령과 성별 정보는 맞춤형 재활 운동 추천 및 ROM 기준값 설정에 활용됩니다.
                      </span>
                    </p>
                  </div>

                  {/* 닉네임 (필수 - 스토리 내 캐릭터 이름으로 사용) */}
                  <div>
                    <label className="block text-sm text-hearo-text/70 mb-1">
                      닉네임 <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="스토리 속 영웅의 이름"
                        required
                        maxLength={20}
                        className="w-full px-4 py-3 pl-11 bg-hearo-bg rounded-xl text-hearo-text placeholder-hearo-text/40 focus:outline-none focus:ring-2 focus:ring-hearo-primary/50"
                      />
                      <Icon
                        name="happy-outline"
                        size={20}
                        color="var(--foreground-secondary)"
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                      />
                    </div>
                    <p className="text-xs text-hearo-text/50 mt-1">
                      VRM 캐릭터 스토리에서 사용될 이름입니다
                    </p>
                  </div>

                  {/* 이메일 */}
                  <div>
                    <label className="block text-sm text-hearo-text/70 mb-1">
                      이메일 <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        required
                        className="w-full px-4 py-3 pl-11 bg-hearo-bg rounded-xl text-hearo-text placeholder-hearo-text/40 focus:outline-none focus:ring-2 focus:ring-hearo-primary/50"
                      />
                      <Icon
                        name="mail-outline"
                        size={20}
                        color="var(--foreground-secondary)"
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                      />
                    </div>
                  </div>

                  {/* 비밀번호 */}
                  <div>
                    <label className="block text-sm text-hearo-text/70 mb-1">
                      비밀번호 <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="6자 이상"
                        required
                        minLength={6}
                        className="w-full px-4 py-3 pl-11 pr-11 bg-hearo-bg rounded-xl text-hearo-text placeholder-hearo-text/40 focus:outline-none focus:ring-2 focus:ring-hearo-primary/50"
                      />
                      <Icon
                        name="lock-closed-outline"
                        size={20}
                        color="var(--foreground-secondary)"
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <Icon
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color="var(--foreground-secondary)"
                        />
                      </button>
                    </div>
                  </div>

                  {/* 비밀번호 확인 */}
                  <div>
                    <label className="block text-sm text-hearo-text/70 mb-1">
                      비밀번호 확인 <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="비밀번호 재입력"
                        required
                        minLength={6}
                        className="w-full px-4 py-3 pl-11 pr-11 bg-hearo-bg rounded-xl text-hearo-text placeholder-hearo-text/40 focus:outline-none focus:ring-2 focus:ring-hearo-primary/50"
                      />
                      <Icon
                        name="lock-closed-outline"
                        size={20}
                        color="var(--foreground-secondary)"
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                      />
                      {confirmPassword && password === confirmPassword && (
                        <Icon
                          name="checkmark-circle"
                          size={20}
                          color="#22C55E"
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        />
                      )}
                    </div>
                  </div>

                  {/* 버튼 영역 */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-6 py-3 rounded-xl bg-hearo-bg text-hearo-text/70 font-medium hover:bg-hearo-bg/80 transition-colors"
                    >
                      이전
                    </button>
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 py-3 rounded-xl text-white font-bold disabled:opacity-50 transition-colors"
                      style={{ backgroundColor: BRAND_COLORS.primary }}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Icon name="reload-outline" size={20} className="animate-spin" />
                          가입 중...
                        </span>
                      ) : (
                        '가입 완료'
                      )}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* 로그인 링크 */}
      <p className="mt-6 text-sm text-hearo-text/60">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-hearo-primary font-medium hover:underline">
          로그인
        </Link>
      </p>

      {/* 약관 상세 모달 */}
      <TermsModal
        isOpen={termsModalOpen}
        terms={selectedTerms}
        onClose={() => setTermsModalOpen(false)}
        themeColor={BRAND_COLORS.primary}
      />
    </div>
  );
}
