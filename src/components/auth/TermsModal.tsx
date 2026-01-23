'use client';

/**
 * 약관 상세 모달
 * 회원가입 시 약관 전문을 보여주는 모달
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';
import type { TermsContent } from '@/constants/terms';

interface TermsModalProps {
  isOpen: boolean;
  terms: TermsContent | null;
  onClose: () => void;
  themeColor?: string;
}

export function TermsModal({ isOpen, terms, onClose, themeColor = '#8B5CF6' }: TermsModalProps) {
  if (!terms) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          {/* 모달 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl sm:max-h-[80vh] bg-hearo-surface rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* 헤더 */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-hearo-text/10"
              style={{ backgroundColor: `${themeColor}10` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${themeColor}20` }}
                >
                  <Icon
                    name={terms.required ? 'clipboard-outline' : 'chatbubble-outline'}
                    size={20}
                    color={themeColor}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-hearo-text">{terms.title}</h2>
                  <p className="text-xs text-hearo-text/60">
                    {terms.required ? '필수 동의' : '선택 동의'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-hearo-text/10 transition-colors"
              >
                <Icon name="close" size={24} color="var(--foreground-secondary)" />
              </button>
            </div>

            {/* 본문 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="prose prose-sm prose-invert max-w-none">
                {terms.fullContent.split('\n').map((line, index) => {
                  // 제목 스타일링
                  if (line.match(/^제\d+조/) || line.match(/^[0-9]+\./)) {
                    return (
                      <p key={index} className="font-bold text-hearo-text mt-4 mb-2">
                        {line}
                      </p>
                    );
                  }
                  // 부제목 스타일링
                  if (line.match(/^\[.*\]$/) || line.match(/^[①-⑩]/)) {
                    return (
                      <p key={index} className="font-semibold text-hearo-text/90 mt-3 mb-1">
                        {line}
                      </p>
                    );
                  }
                  // 경고 스타일링
                  if (line.includes('⚠️') || line.includes('중요') || line.includes('주의')) {
                    return (
                      <p
                        key={index}
                        className="bg-yellow-500/10 border-l-4 border-yellow-500 px-4 py-2 text-yellow-200 my-2"
                      >
                        {line}
                      </p>
                    );
                  }
                  // 리스트 아이템
                  if (line.trim().startsWith('-') || line.trim().startsWith('·')) {
                    return (
                      <p key={index} className="text-hearo-text/70 pl-4 my-1">
                        {line}
                      </p>
                    );
                  }
                  // 빈 줄
                  if (!line.trim()) {
                    return <br key={index} />;
                  }
                  // 일반 텍스트
                  return (
                    <p key={index} className="text-hearo-text/80 my-1">
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="px-6 py-4 border-t border-hearo-text/10">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-bold text-white transition-colors"
                style={{ backgroundColor: themeColor }}
              >
                확인
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default TermsModal;
