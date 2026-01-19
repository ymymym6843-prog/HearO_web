/**
 * 프로필 설정 페이지
 * 사용자 프로필 정보 조회 및 수정
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/useAuthStore';
import { ConfirmModal, AlertModal } from '@/components/common/ConfirmModal';
import type { WorldviewType } from '@/types/vrm';

// 세계관 옵션
const WORLDVIEW_OPTIONS: Array<{ value: WorldviewType; label: string; icon: IconName }> = [
  { value: 'fantasy', label: '판타지', icon: 'sparkles-outline' },
  { value: 'sports', label: '스포츠', icon: 'fitness-outline' },
  { value: 'idol', label: '아이돌', icon: 'star-outline' },
  { value: 'sf', label: 'SF', icon: 'rocket-outline' },
  { value: 'zombie', label: '좀비', icon: 'skull-outline' },
  { value: 'spy', label: '스파이', icon: 'eye-outline' },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, updateProfile, isLoading } = useAuthStore();

  // 폼 상태
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [preferredWorldview, setPreferredWorldview] = useState<WorldviewType>('fantasy');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNotSupportedAlert, setShowNotSupportedAlert] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setFullName(profile.full_name || '');
      setPreferredWorldview((profile.preferred_worldview as WorldviewType) || 'fantasy');
    }
  }, [profile]);

  // 미인증 사용자 리다이렉트
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  // 저장 처리
  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const success = await updateProfile({
        username: username.trim() || null,
        full_name: fullName.trim() || null,
        preferred_worldview: preferredWorldview,
      });

      if (success) {
        setSaveMessage({ type: 'success', text: '프로필이 저장되었습니다.' });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage({ type: 'error', text: '저장에 실패했습니다.' });
      }
    } catch {
      setSaveMessage({ type: 'error', text: '오류가 발생했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  // 변경사항 확인
  const hasChanges = profile && (
    (profile.username || '') !== username ||
    (profile.full_name || '') !== fullName ||
    (profile.preferred_worldview || 'fantasy') !== preferredWorldview
  );

  if (isLoading || !user) {
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
          <h1 className="text-xl font-bold text-white">프로필 설정</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* 아바타 섹션 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-hearo-primary to-blue-600 flex items-center justify-center mb-4">
            <span className="text-4xl font-bold text-white">
              {username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <p className="text-sm text-gray-400">{user.email}</p>
        </motion.section>

        {/* 기본 정보 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Icon name="person-outline" size={20} color="#00D9FF" />
            기본 정보
          </h2>

          <div className="space-y-4">
            {/* 사용자명 */}
            <div className="bg-hearo-surface rounded-xl p-4">
              <label className="block text-sm text-gray-400 mb-2">사용자명</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="사용자명을 입력하세요"
                className="w-full bg-white/10 text-white px-4 py-3 rounded-lg border border-white/20 focus:border-hearo-primary outline-none transition-colors"
                maxLength={30}
              />
              <p className="text-xs text-gray-500 mt-2">다른 사용자에게 표시되는 이름입니다.</p>
            </div>

            {/* 전체 이름 */}
            <div className="bg-hearo-surface rounded-xl p-4">
              <label className="block text-sm text-gray-400 mb-2">전체 이름</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full bg-white/10 text-white px-4 py-3 rounded-lg border border-white/20 focus:border-hearo-primary outline-none transition-colors"
                maxLength={50}
              />
            </div>
          </div>
        </motion.section>

        {/* 선호 세계관 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Icon name="sparkles-outline" size={20} color="#00D9FF" />
            선호 세계관
          </h2>

          <p className="text-sm text-gray-400 mb-4">
            운동 시 기본으로 사용할 세계관을 선택하세요.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {WORLDVIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setPreferredWorldview(option.value)}
                className={`
                  p-4 rounded-xl border-2 transition-all text-left
                  ${preferredWorldview === option.value
                    ? 'border-hearo-primary bg-hearo-primary/20'
                    : 'border-white/10 bg-hearo-surface hover:border-white/30'
                  }
                `}
              >
                <Icon name={option.icon} size={28} color={preferredWorldview === option.value ? '#00D9FF' : '#9CA3AF'} className="mb-2" />
                <span className="font-semibold text-white">{option.label}</span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* 저장 메시지 */}
        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
              p-4 rounded-xl text-center
              ${saveMessage.type === 'success'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
              }
            `}
          >
            {saveMessage.text}
          </motion.div>
        )}

        {/* 저장 버튼 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="w-full py-4 px-6 bg-hearo-primary hover:bg-hearo-primary/90 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition-colors"
          >
            {isSaving ? '저장 중...' : hasChanges ? '변경사항 저장' : '변경사항 없음'}
          </button>
        </motion.div>

        {/* 계정 관리 링크 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Icon name="shield-outline" size={20} color="#00D9FF" />
            계정 관리
          </h2>

          <div className="bg-hearo-surface rounded-xl divide-y divide-white/10">
            <button
              onClick={() => router.push('/auth/reset-password')}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors rounded-t-xl"
            >
              <span className="text-white">비밀번호 변경</span>
              <Icon name="chevron-forward" size={20} color="#9CA3AF" />
            </button>
            <button
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors rounded-b-xl text-red-400"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <span>계정 삭제</span>
              <Icon name="close-circle" size={20} color="#EF4444" />
            </button>
          </div>
        </motion.section>

        {/* 하단 여백 */}
        <div className="h-8" />
      </main>

      {/* 계정 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="계정 삭제"
        message="정말로 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          setShowNotSupportedAlert(true);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* 미지원 기능 알림 */}
      <AlertModal
        isOpen={showNotSupportedAlert}
        title="안내"
        message="계정 삭제 기능은 추후 지원될 예정입니다."
        variant="info"
        onConfirm={() => setShowNotSupportedAlert(false)}
      />
    </div>
  );
}
