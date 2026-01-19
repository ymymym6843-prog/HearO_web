/**
 * 공유 버튼 컴포넌트
 * 다양한 플랫폼으로 결과 공유
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';
import { shareService, type ShareableResult } from '@/services/shareService';

interface ShareButtonProps {
  result: ShareableResult;
  className?: string;
  variant?: 'icon' | 'button' | 'full';
}

// 공유 플랫폼 목록
const SHARE_PLATFORMS: Array<{ id: string; label: string; icon: IconName; color: string }> = [
  { id: 'native', label: '공유하기', icon: 'share-social-outline', color: 'bg-blue-500' },
  { id: 'twitter', label: 'Twitter', icon: 'logo-twitter', color: 'bg-sky-500' },
  { id: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: 'bg-blue-600' },
  { id: 'kakao', label: '카카오톡', icon: 'chatbubble-outline', color: 'bg-yellow-400' },
  { id: 'clipboard', label: '링크 복사', icon: 'copy-outline', color: 'bg-gray-500' },
];

export function ShareButton({
  result,
  className = '',
  variant = 'button',
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareResult, setShareResult] = useState<{ success: boolean; message: string } | null>(
    null
  );

  const handleShare = useCallback(
    async (platform: string) => {
      setIsSharing(true);
      setShareResult(null);

      const { success, error } = await shareService.shareResult(result, {
        platform: platform as 'native' | 'twitter' | 'facebook' | 'kakao' | 'clipboard',
      });

      if (success) {
        setShareResult({
          success: true,
          message: platform === 'clipboard' ? '클립보드에 복사되었습니다!' : '공유되었습니다!',
        });
      } else {
        setShareResult({
          success: false,
          message: error?.message || '공유에 실패했습니다',
        });
      }

      setIsSharing(false);

      // 성공 메시지 자동 숨김
      if (success) {
        setTimeout(() => {
          setShareResult(null);
          setIsOpen(false);
        }, 2000);
      }
    },
    [result]
  );

  // 네이티브 공유 가능하면 바로 실행
  const handleQuickShare = useCallback(async () => {
    if (shareService.canShare()) {
      await handleShare('native');
    } else {
      setIsOpen(true);
    }
  }, [handleShare]);

  // 아이콘만 표시
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleQuickShare}
          className={`p-2 rounded-full hover:bg-white/10 transition-colors ${className}`}
          aria-label="공유하기"
        >
          <Icon name="share-social-outline" size={20} color="#FFFFFF" />
        </button>
        <ShareModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onShare={handleShare}
          isSharing={isSharing}
          shareResult={shareResult}
        />
      </>
    );
  }

  // 버튼 표시
  if (variant === 'button') {
    return (
      <>
        <button
          onClick={handleQuickShare}
          className={`flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20
            rounded-xl transition-colors ${className}`}
        >
          <Icon name="share-social-outline" size={18} color="#FFFFFF" />
          <span>공유</span>
        </button>
        <ShareModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onShare={handleShare}
          isSharing={isSharing}
          shareResult={shareResult}
        />
      </>
    );
  }

  // 전체 공유 옵션 표시
  return (
    <div className={className}>
      <div className="grid grid-cols-5 gap-3">
        {SHARE_PLATFORMS.map((platform) => (
          <button
            key={platform.id}
            onClick={() => handleShare(platform.id)}
            disabled={isSharing}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl
              ${platform.color} hover:opacity-90 transition-opacity disabled:opacity-50`}
          >
            <Icon name={platform.icon} size={24} color="#FFFFFF" />
            <span className="text-xs text-white font-medium">{platform.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {shareResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-4 p-3 rounded-xl text-center text-sm ${
              shareResult.success
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {shareResult.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 공유 모달
function ShareModal({
  isOpen,
  onClose,
  onShare,
  isSharing,
  shareResult,
}: {
  isOpen: boolean;
  onClose: () => void;
  onShare: (platform: string) => void;
  isSharing: boolean;
  shareResult: { success: boolean; message: string } | null;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="w-full max-w-md bg-slate-800 rounded-t-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white text-center mb-6">공유하기</h3>

            <div className="grid grid-cols-4 gap-4">
              {SHARE_PLATFORMS.slice(1).map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => onShare(platform.id)}
                  disabled={isSharing}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl
                    bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <Icon name={platform.icon} size={28} color="#9CA3AF" />
                  <span className="text-xs text-gray-400">{platform.label}</span>
                </button>
              ))}
            </div>

            <AnimatePresence>
              {shareResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`mt-4 p-3 rounded-xl text-center text-sm ${
                    shareResult.success
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {shareResult.message}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={onClose}
              className="w-full mt-4 py-3 text-gray-400 hover:text-white transition-colors"
            >
              취소
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ShareButton;
