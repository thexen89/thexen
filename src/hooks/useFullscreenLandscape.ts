'use client';

import { useState, useEffect, useCallback } from 'react';

interface FullscreenLandscapeState {
  isLandscape: boolean;
  showRotatePrompt: boolean;
  requestFullscreenLandscape: () => Promise<void>;
  dismissRotatePrompt: () => void;
}

export function useFullscreenLandscape(): FullscreenLandscapeState {
  const [isLandscape, setIsLandscape] = useState(false);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);

  // orientation 변경 감지
  useEffect(() => {
    const checkOrientation = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(landscape);
      // 가로모드가 되면 안내 메시지 자동 숨김
      if (landscape) {
        setShowRotatePrompt(false);
      }
    };

    // 초기 체크
    checkOrientation();

    // resize 이벤트로 orientation 변경 감지
    window.addEventListener('resize', checkOrientation);

    // orientationchange 이벤트 (모바일)
    window.addEventListener('orientationchange', () => {
      // orientationchange 후 약간의 딜레이가 필요할 수 있음
      setTimeout(checkOrientation, 100);
    });

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const requestFullscreenLandscape = useCallback(async () => {
    try {
      // 1. Fullscreen API 시도 (다양한 브라우저 지원)
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
        mozRequestFullScreen?: () => Promise<void>;
        msRequestFullscreen?: () => Promise<void>;
      };

      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }

      // 2. Screen Orientation API로 landscape 잠금 시도
      if (screen.orientation && 'lock' in screen.orientation) {
        try {
          await screen.orientation.lock('landscape');
        } catch {
          // orientation lock 실패는 무시 (지원 안 되는 브라우저)
        }
      }
    } catch {
      // Fullscreen 실패 시 (iOS Safari 등)
      // 현재 세로모드면 회전 안내 표시
      if (window.innerWidth < window.innerHeight) {
        setShowRotatePrompt(true);
      }
    }
  }, []);

  const dismissRotatePrompt = useCallback(() => {
    setShowRotatePrompt(false);
  }, []);

  return {
    isLandscape,
    showRotatePrompt,
    requestFullscreenLandscape,
    dismissRotatePrompt,
  };
}
