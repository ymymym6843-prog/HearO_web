'use client';

/**
 * Red Flag Alert 컴포넌트
 *
 * 운동 중 위험 신호 감지 시 표시되는 알림
 * - 심각도별 다른 스타일
 * - 권장 조치 표시
 * - 해제/확인 기능
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RedFlagAlert as RedFlagAlertType, RedFlagSeverity, RedFlagType } from '@/services/medical';

// ============================================================
// 타입 정의
// ============================================================

export interface RedFlagAlertProps {
  /** 알림 데이터 */
  alert: RedFlagAlertType;
  /** 해제 콜백 */
  onDismiss?: (alertId: string) => void;
  /** 자동 해제 시간 (ms, 0이면 자동 해제 안함) */
  autoDismiss?: number;
  /** 위치 */
  position?: 'top' | 'center' | 'bottom';
  /** 전체 화면 오버레이 */
  fullscreen?: boolean;
}

export interface RedFlagBannerProps {
  /** 활성 알림 목록 */
  alerts: RedFlagAlertType[];
  /** 해제 콜백 */
  onDismiss?: (alertId: string) => void;
  /** 최대 표시 개수 */
  maxVisible?: number;
}

// ============================================================
// 상수
// ============================================================

const SEVERITY_STYLES: Record<RedFlagSeverity, {
  bg: string;
  border: string;
  text: string;
  icon: string;
  iconBg: string;
}> = {
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    text: 'text-yellow-800',
    icon: '⚠️',
    iconBg: 'bg-yellow-100',
  },
  caution: {
    bg: 'bg-orange-50',
    border: 'border-orange-400',
    text: 'text-orange-800',
    icon: '🟠',
    iconBg: 'bg-orange-100',
  },
  stop: {
    bg: 'bg-red-50',
    border: 'border-red-500',
    text: 'text-red-800',
    icon: '🛑',
    iconBg: 'bg-red-100',
  },
};

const TYPE_ICONS: Record<RedFlagType, string> = {
  severe_pain: '😣',
  excessive_rom: '📐',
  asymmetry: '⚖️',
  rom_decrease: '📉',
  compensation: '🔄',
  rapid_movement: '⚡',
  fatigue: '😴',
};

// ============================================================
// 단일 알림 컴포넌트
// ============================================================

export function RedFlagAlert({
  alert,
  onDismiss,
  autoDismiss = 0,
  position = 'top',
  fullscreen = false,
}: RedFlagAlertProps) {
  const [isVisible, setIsVisible] = useState(true);
  const styles = SEVERITY_STYLES[alert.severity];

  // 자동 해제
  useEffect(() => {
    if (autoDismiss > 0 && alert.severity !== 'stop') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss?.(alert.id), 300);
      }, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, alert.id, alert.severity, onDismiss]);

  // 해제 핸들러
  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(alert.id), 300);
  };

  // 위치 클래스
  const positionClasses = {
    top: 'top-4',
    center: 'top-1/2 -translate-y-1/2',
    bottom: 'bottom-4',
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {fullscreen && alert.severity === 'stop' ? (
        // 전체 화면 오버레이 (심각한 경고)
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className={`
              max-w-md w-full mx-4 p-6 rounded-2xl shadow-2xl
              ${styles.bg} ${styles.border} border-2
            `}
          >
            {/* 아이콘 */}
            <div className="flex justify-center mb-4">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className={`
                  w-20 h-20 rounded-full flex items-center justify-center
                  ${styles.iconBg}
                `}
              >
                <span className="text-5xl">{TYPE_ICONS[alert.type]}</span>
              </motion.div>
            </div>

            {/* 내용 */}
            <div className="text-center">
              <h3 className={`text-xl font-bold mb-2 ${styles.text}`}>
                {alert.title}
              </h3>
              <p className={`mb-4 ${styles.text} opacity-80`}>
                {alert.message}
              </p>

              {/* 권장 조치 */}
              <div className={`
                p-3 rounded-lg mb-4
                ${styles.iconBg}
              `}>
                <p className={`text-sm font-medium ${styles.text}`}>
                  💡 {alert.recommendation}
                </p>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDismiss}
                  className={`
                    px-6 py-2 rounded-full font-medium
                    bg-white ${styles.text} border ${styles.border}
                    hover:opacity-80 transition-opacity
                  `}
                >
                  확인했습니다
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        // 일반 알림 배너
        <motion.div
          initial={{ opacity: 0, y: position === 'bottom' ? 20 : -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === 'bottom' ? 20 : -20, scale: 0.95 }}
          className={`
            fixed left-4 right-4 ${positionClasses[position]} z-40
            max-w-lg mx-auto
          `}
        >
          <div className={`
            flex items-start gap-3 p-4 rounded-xl shadow-lg
            ${styles.bg} ${styles.border} border
          `}>
            {/* 아이콘 */}
            <div className={`
              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
              ${styles.iconBg}
            `}>
              <span className="text-xl">{TYPE_ICONS[alert.type]}</span>
            </div>

            {/* 내용 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className={`font-semibold ${styles.text}`}>
                  {alert.title}
                </h4>
                {alert.severity !== 'stop' && (
                  <button
                    onClick={handleDismiss}
                    className={`
                      flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                      hover:bg-black/10 transition-colors
                      ${styles.text}
                    `}
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className={`text-sm mt-1 ${styles.text} opacity-80`}>
                {alert.message}
              </p>
              <p className={`text-xs mt-2 ${styles.text} opacity-60`}>
                💡 {alert.recommendation}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// 알림 배너 (여러 알림 관리)
// ============================================================

export function RedFlagBanner({
  alerts,
  onDismiss,
  maxVisible = 3,
}: RedFlagBannerProps) {
  // 심각도 순으로 정렬 (stop > caution > warning)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder: Record<RedFlagSeverity, number> = {
      stop: 3,
      caution: 2,
      warning: 1,
    };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  // 최대 개수 제한
  const visibleAlerts = sortedAlerts.slice(0, maxVisible);
  const hiddenCount = alerts.length - maxVisible;

  // stop 레벨 알림이 있으면 전체 화면 (향후 전체화면 모드 구현 시 사용)
  const _hasStopAlert = visibleAlerts.some((a) => a.severity === 'stop');

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-40 space-y-2 max-w-lg mx-auto">
      <AnimatePresence>
        {visibleAlerts.map((alert, index) => (
          <RedFlagAlert
            key={alert.id}
            alert={alert}
            onDismiss={onDismiss}
            autoDismiss={alert.severity === 'warning' ? 5000 : 0}
            fullscreen={alert.severity === 'stop' && index === 0}
          />
        ))}
      </AnimatePresence>

      {/* 숨겨진 알림 카운터 */}
      {hiddenCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <span className="text-sm text-gray-600 bg-white/80 px-3 py-1 rounded-full">
            +{hiddenCount}개의 알림 더 있음
          </span>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// 간단한 토스트 알림
// ============================================================

export function SafetyToast({
  message,
  type = 'info',
  onClose,
}: {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const typeStyles = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  const typeIcons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={`
            flex items-center gap-2 px-4 py-2 rounded-full shadow-lg
            ${typeStyles[type]} text-white
          `}>
            <span>{typeIcons[type]}</span>
            <span className="text-sm font-medium">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default RedFlagAlert;
