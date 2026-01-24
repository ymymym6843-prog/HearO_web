/**
 * 소셜 공유 서비스
 * 운동 결과 및 성과 공유 기능
 */

// XSS 방지를 위한 텍스트 sanitize
function sanitizeText(text: string, maxLength: number = 200): string {
  if (!text) return '';
  return text
    .replace(/[<>]/g, '') // HTML 태그 제거
    .replace(/javascript:/gi, '') // javascript: 스킴 제거
    .replace(/on\w+=/gi, '') // 이벤트 핸들러 제거
    .trim()
    .slice(0, maxLength);
}

// 공유 가능한 데이터 타입
export interface ShareableResult {
  type: 'exercise' | 'achievement' | 'streak';
  title: string;
  description: string;
  stats?: {
    reps?: number;
    accuracy?: number;
    duration?: number;
    streak?: number;
  };
  imageUrl?: string;
}

// 공유 옵션
export interface ShareOptions {
  platform?: 'native' | 'twitter' | 'facebook' | 'kakao' | 'clipboard';
  includeImage?: boolean;
}

class ShareService {
  /**
   * 운동 결과 공유
   */
  async shareResult(
    result: ShareableResult,
    options: ShareOptions = {}
  ): Promise<{ success: boolean; error?: Error }> {
    const shareText = this.generateShareText(result);
    const shareUrl = this.generateShareUrl(result);

    // 플랫폼 선택
    const platform = options.platform || 'native';

    try {
      switch (platform) {
        case 'native':
          return await this.nativeShare(shareText, shareUrl, result.title);
        case 'twitter':
          return this.shareToTwitter(shareText, shareUrl);
        case 'facebook':
          return this.shareToFacebook(shareUrl);
        case 'kakao':
          return this.shareToKakao(result, shareUrl);
        case 'clipboard':
          return await this.copyToClipboard(shareText);
        default:
          return { success: false, error: new Error('지원하지 않는 플랫폼') };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('공유 실패'),
      };
    }
  }

  /**
   * 공유 텍스트 생성
   */
  private generateShareText(result: ShareableResult): string {
    // XSS 방지를 위한 입력 검증
    const title = sanitizeText(result.title, 100);
    const description = sanitizeText(result.description, 200);

    let text = '';

    switch (result.type) {
      case 'exercise':
        text = `🏋️ HearO 운동 완료!\n\n`;
        text += `${title}\n`;
        if (result.stats) {
          if (result.stats.reps) text += `💪 ${Math.min(result.stats.reps, 9999)}회 완료\n`;
          if (result.stats.accuracy) text += `🎯 정확도 ${Math.min(Math.max(result.stats.accuracy, 0), 100)}%\n`;
          if (result.stats.duration) {
            const mins = Math.floor(Math.min(result.stats.duration, 36000) / 60);
            text += `⏱️ ${mins}분 소요\n`;
          }
        }
        break;

      case 'achievement':
        text = `🏆 HearO 업적 달성!\n\n`;
        text += `${title}\n`;
        text += `${description}\n`;
        break;

      case 'streak':
        text = `🔥 HearO 연속 운동!\n\n`;
        const streak = Math.min(Math.max(result.stats?.streak || 0, 0), 9999);
        text += `${streak}일 연속 운동 중!\n`;
        text += `꾸준함이 최고의 재활입니다 💪\n`;
        break;
    }

    text += `\n#HearO #재활운동 #홈트레이닝`;
    return text;
  }

  /**
   * 공유 URL 생성
   */
  private generateShareUrl(_result: ShareableResult): string {
    // 실제 배포 URL로 변경 필요 (result 파라미터는 향후 개인화 URL 생성에 사용)
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hearo.app';
    return `${baseUrl}?ref=share`;
  }

  /**
   * 네이티브 공유 (Web Share API)
   */
  private async nativeShare(
    text: string,
    url: string,
    title: string
  ): Promise<{ success: boolean; error?: Error }> {
    if (typeof navigator === 'undefined' || !navigator.share) {
      // Web Share API가 없으면 클립보드로 대체
      return this.copyToClipboard(text);
    }

    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return { success: true };
    } catch (error) {
      // 사용자가 취소한 경우
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: new Error('공유가 취소되었습니다') };
      }
      return { success: false, error: error instanceof Error ? error : new Error('공유 실패') };
    }
  }

  /**
   * 트위터 공유
   */
  private shareToTwitter(text: string, url: string): { success: boolean; error?: Error } {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

    if (typeof window !== 'undefined') {
      window.open(twitterUrl, '_blank', 'width=600,height=400');
      return { success: true };
    }

    return { success: false, error: new Error('브라우저 환경이 아닙니다') };
  }

  /**
   * 페이스북 공유
   */
  private shareToFacebook(url: string): { success: boolean; error?: Error } {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

    if (typeof window !== 'undefined') {
      window.open(facebookUrl, '_blank', 'width=600,height=400');
      return { success: true };
    }

    return { success: false, error: new Error('브라우저 환경이 아닙니다') };
  }

  /**
   * 카카오 공유 (Kakao SDK 필요)
   */
  private shareToKakao(
    result: ShareableResult,
    url: string
  ): { success: boolean; error?: Error } {
    // Kakao SDK가 로드되어 있는지 확인
    const Kakao = typeof window !== 'undefined' ? window.Kakao : null;

    if (!Kakao || !Kakao.isInitialized()) {
      // 카카오 SDK가 없으면 클립보드로 대체
      console.warn('Kakao SDK not initialized, falling back to clipboard');
      return this.copyToClipboardSync(this.generateShareText(result));
    }

    try {
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: result.title,
          description: result.description,
          imageUrl: result.imageUrl || 'https://hearo.app/og-image.png',
          link: {
            mobileWebUrl: url,
            webUrl: url,
          },
        },
        buttons: [
          {
            title: 'HearO 시작하기',
            link: {
              mobileWebUrl: url,
              webUrl: url,
            },
          },
        ],
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error('카카오 공유 실패') };
    }
  }

  /**
   * 클립보드에 복사 (async)
   */
  private async copyToClipboard(text: string): Promise<{ success: boolean; error?: Error }> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return this.copyToClipboardSync(text);
    }

    try {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } catch (_error) {
      return { success: false, error: new Error('클립보드 복사 실패') };
    }
  }

  /**
   * 클립보드에 복사 (sync fallback)
   */
  private copyToClipboardSync(text: string): { success: boolean; error?: Error } {
    if (typeof document === 'undefined') {
      return { success: false, error: new Error('브라우저 환경이 아닙니다') };
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return { success: true };
    } catch (_error) {
      return { success: false, error: new Error('클립보드 복사 실패') };
    }
  }

  /**
   * 공유 가능 여부 확인
   */
  canShare(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.share;
  }

  /**
   * 이미지 포함 공유 (캔버스 -> 이미지)
   */
  async shareWithImage(
    canvas: HTMLCanvasElement,
    result: ShareableResult
  ): Promise<{ success: boolean; error?: Error }> {
    if (!this.canShare()) {
      return { success: false, error: new Error('공유 기능을 사용할 수 없습니다') };
    }

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (!blob) {
        return { success: false, error: new Error('이미지 생성 실패') };
      }

      const file = new File([blob], 'hearo-result.png', { type: 'image/png' });
      const shareText = this.generateShareText(result);

      await navigator.share({
        title: result.title,
        text: shareText,
        files: [file],
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('이미지 공유 실패'),
      };
    }
  }
}

// 싱글톤 인스턴스
export const shareService = new ShareService();
export default shareService;
