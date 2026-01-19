/**
 * 재사용 가능한 확인 모달
 * alert/confirm을 대체하는 브랜드 일관성 있는 UI
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'info' | 'warning' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig: Record<'info' | 'warning' | 'danger', {
  icon: IconName;
  iconBg: string;
  iconColor: string;
  buttonBg: string;
}> = {
  info: {
    icon: 'information-circle',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    buttonBg: 'bg-blue-600 hover:bg-blue-500',
  },
  warning: {
    icon: 'warning',
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400',
    buttonBg: 'bg-yellow-600 hover:bg-yellow-500',
  },
  danger: {
    icon: 'alert-circle',
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    buttonBg: 'bg-red-600 hover:bg-red-500',
  },
};

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'info',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const config = variantConfig[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm bg-slate-800 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 아이콘 & 타이틀 */}
            <div className="p-6 text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${config.iconBg} flex items-center justify-center`}>
                <Icon name={config.icon} className={`w-8 h-8 ${config.iconColor}`} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
              <p className="text-gray-400 whitespace-pre-line">{message}</p>
            </div>

            {/* 버튼 */}
            <div className="p-4 bg-slate-700/30 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600
                  transition-colors font-medium text-white"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-3 px-4 rounded-xl ${config.buttonBg}
                  transition-colors font-semibold text-white`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 단순 알림 모달 (확인 버튼만)
 */
export interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'info' | 'warning' | 'danger';
  onConfirm: () => void;
}

export function AlertModal({
  isOpen,
  title,
  message,
  confirmText = '확인',
  variant = 'info',
  onConfirm,
}: AlertModalProps) {
  const config = variantConfig[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onConfirm}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm bg-slate-800 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 아이콘 & 타이틀 */}
            <div className="p-6 text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${config.iconBg} flex items-center justify-center`}>
                <Icon name={config.icon} className={`w-8 h-8 ${config.iconColor}`} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
              <p className="text-gray-400 whitespace-pre-line">{message}</p>
            </div>

            {/* 버튼 */}
            <div className="p-4 bg-slate-700/30">
              <button
                onClick={onConfirm}
                className={`w-full py-3 px-4 rounded-xl ${config.buttonBg}
                  transition-colors font-semibold text-white`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ConfirmModal;
