import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/common/Toast";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "HearO Web - AI 재활 운동",
  description: "AI 포즈 인식과 3D 캐릭터, 게이미피케이션을 결합한 재활 운동 웹 애플리케이션. 실시간 자세 교정, 스토리 기반 동기 부여, 상세한 진행 리포트를 제공합니다.",
  keywords: ["재활", "운동", "AI", "포즈 인식", "3D", "VRM", "게이미피케이션", "헬스케어", "물리치료"],
  authors: [{ name: "HearO Team" }],
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/favicon-192x192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // iOS Safe Area 지원
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKr.variable} font-sans antialiased`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
