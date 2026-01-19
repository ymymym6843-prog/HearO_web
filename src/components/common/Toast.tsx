/**
 * 토스트 알림 시스템
 * 전역적으로 사용 가능한 알림 컴포넌트
 */

'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, type IconName } from '@/components/ui/Icon';

// 토스트 타입
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// 토스트 데이터
export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// 컨텍스트 타입
interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// 토스트 설정
const toastConfig: Record<ToastType, { icon: IconName; bgColor: string; iconColor: string }> = {
  success: {
    icon: 'checkmark-circle',
    bgColor: 'bg-green-600/90',
    iconColor: 'text-green-200',
  },
  error: {
    icon: 'close-circle',
    bgColor: 'bg-red-600/90',
    iconColor: 'text-red-200',
  },
  warning: {
    icon: 'warning',
    bgColor: 'bg-yellow-600/90',
    iconColor: 'text-yellow-200',
  },
  info: {
    icon: 'information-circle',
    bgColor: 'bg-blue-600/90',
    iconColor: 'text-blue-200',
  },
};

/**
 * 토스트 프로바이더
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: ToastData = { id, type, message, duration };

    setToasts((prev) => [...prev, toast]);

    // 자동 제거
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
}

/**
 * 토스트 컨테이너
 */
function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * 개별 토스트 아이템
 */
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: string) => void;
}) {
  const config = toastConfig[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={`pointer-events-auto px-4 py-3 rounded-xl ${config.bgColor}
        backdrop-blur-sm shadow-lg flex items-center gap-3 max-w-sm`}
      onClick={() => onDismiss(toast.id)}
    >
      <Icon name={config.icon} className={`w-5 h-5 ${config.iconColor} flex-shrink-0`} />
      <span className="text-white text-sm font-medium">{toast.message}</span>
    </motion.div>
  );
}

/**
 * 토스트 훅
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;
