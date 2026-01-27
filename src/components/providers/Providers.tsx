'use client';

import dynamic from 'next/dynamic';
import { BGMProvider } from '@/contexts/BGMContext';
import type { ReactNode } from 'react';

const ToastProvider = dynamic(
  () => import('@/components/common/Toast').then((mod) => mod.ToastProvider),
  { ssr: false }
);

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <BGMProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </BGMProvider>
  );
}
