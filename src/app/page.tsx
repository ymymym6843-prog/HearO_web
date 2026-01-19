'use client';

/**
 * HearO Web - 환영 화면 (WelcomeScreen)
 * 앱 첫 화면 - 여정 시작하기 버튼으로 세계관 선택 페이지로 이동
 */

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';
import { BRAND_COLORS } from '@/constants/themes';

// 특징 아이템 컴포넌트
function FeatureItem({ icon, text }: { icon: IconName; text: string }) {
  return (
    <motion.div
      className="flex items-center gap-3 px-5 py-3 rounded-xl bg-hearo-surface min-w-[260px]"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Icon name={icon} size={24} color={BRAND_COLORS.primary} />
      <span className="text-hearo-text font-medium">{text}</span>
    </motion.div>
  );
}

export default function WelcomePage() {
  const router = useRouter();

  const handleStart = () => {
    router.push('/worldview');
  };

  return (
    <div className="min-h-screen bg-hearo-bg flex flex-col justify-between py-12">
      {/* 배경 글로우 효과 */}
      <div
        className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full opacity-10 pointer-events-none"
        style={{ backgroundColor: BRAND_COLORS.primary }}
      />

      {/* 메인 콘텐츠 */}
      <motion.main
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex-1 flex flex-col items-center justify-center px-6"
      >
        {/* 로고 */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <div
            className="w-[120px] h-[120px] rounded-full flex items-center justify-center border-[3px]"
            style={{
              backgroundColor: 'var(--background-secondary)',
              borderColor: BRAND_COLORS.primary,
            }}
          >
            <Image
              src="/images/logo/logo-icon.png"
              alt="HearO"
              width={64}
              height={64}
              priority
              className="drop-shadow-lg"
            />
          </div>
        </motion.div>

        {/* 타이틀 */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-5xl font-bold tracking-wider mb-2"
          style={{ color: 'var(--foreground-primary)' }}
        >
          HearO
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg font-medium mb-8"
          style={{ color: BRAND_COLORS.primaryLight }}
        >
          듣는 영웅의 여정
        </motion.p>

        {/* 설명 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-hearo-text/70 leading-relaxed mb-10"
        >
          운동과 스토리가 하나가 되는
          <br />
          새로운 재활 경험을 시작하세요
        </motion.p>

        {/* 특징 목록 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-3"
        >
          <FeatureItem icon="fitness-outline" text="AI 기반 맞춤 운동" />
          <FeatureItem icon="mic-outline" text="몰입형 오디오 스토리" />
          <FeatureItem icon="trophy-outline" text="게임처럼 즐기는 재활" />
        </motion.div>
      </motion.main>

      {/* 시작 버튼 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="px-6 flex flex-col items-center"
      >
        <motion.button
          onClick={handleStart}
          className="w-full max-w-[320px] py-4 rounded-xl text-xl font-bold text-white mb-4"
          style={{
            backgroundColor: BRAND_COLORS.primary,
            boxShadow: `0 8px 32px ${BRAND_COLORS.primary}40`,
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          animate={{
            scale: [1, 1.02, 1],
          }}
          transition={{
            scale: {
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
        >
          여정 시작하기
        </motion.button>

        <p className="text-sm text-hearo-text/50">
          탭하여 영웅의 여정을 시작하세요
        </p>
      </motion.div>
    </div>
  );
}
