'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface FullscreenLandscapeState {
  isLandscape: boolean;
  showRotatePrompt: boolean;
  requestFullscreenLandscape: () => Promise<void>;
  dismissRotatePrompt: () => void;
}

// 전체화면 요청 헬퍼 함수
const requestFullscreen = async () => {
  const docEl = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
  };

  try {
    if (docEl.requestFullscreen) {
      await docEl.requestFullscreen();
    } else if (docEl.webkitRequestFullscreen) {
      await docEl.webkitRequestFullscreen();
    } else if (docEl.mozRequestFullScreen) {
      await docEl.mozRequestFullScreen();
    } else if (docEl.msRequestFullscreen) {
      await docEl.msRequestFullscreen();
    }
    return true;
  } catch {
    return false;
  }
};

// 전체화면 여부 체크
const isFullscreen = () => {
  return !!(
    document.fullscreenElement ||
    (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
    (document as unknown as { mozFullScreenElement?: Element }).mozFullScreenElement ||
    (document as unknown as { msFullscreenElement?: Element }).msFullscreenElement
  );
};

export function useFullscreenLandscape(): FullscreenLandscapeState {
  const [isLandscape, setIsLandscape] = useState(false);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);
  const hasEnteredPortfolio = useRef(false); // 포트폴리오 진입 여부

  // orientation 변경 감지 및 가로모드 시 자동 전체화면
  useEffect(() => {
    const checkOrientationAndFullscreen = async () => {
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(landscape);

      // 가로모드가 되면 안내 메시지 자동 숨김
      if (landscape) {
        setShowRotatePrompt(false);

        // 포트폴리오 진입 후 가로모드이고 전체화면 아니면 → 전체화면 요청
        // (사용자 제스처 없이는 실패할 수 있음 - 그래도 시도)
        if (hasEnteredPortfolio.current && !isFullscreen()) {
          await requestFullscreen();
        }
      }
    };

    // 초기 체크
    checkOrientationAndFullscreen();

    // resize 이벤트로 orientation 변경 감지
    window.addEventListener('resize', checkOrientationAndFullscreen);

    // orientationchange 이벤트 (모바일)
    const handleOrientationChange = () => {
      setTimeout(checkOrientationAndFullscreen, 100);
    };
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', checkOrientationAndFullscreen);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  const requestFullscreenLandscape = useCallback(async () => {
    // 포트폴리오 진입 표시
    hasEnteredPortfolio.current = true;

    try {
      // 1. Fullscreen API 시도
      const success = await requestFullscreen();

      if (success) {
        // 2. Screen Orientation API로 landscape 잠금 시도
        if (screen.orientation && 'lock' in screen.orientation) {
          try {
            await screen.orientation.lock('landscape');
          } catch {
            // orientation lock 실패는 무시 (지원 안 되는 브라우저)
          }
        }
      } else {
        // Fullscreen 실패 시 (iOS Safari 등)
        // 현재 세로모드면 회전 안내 표시
        if (window.innerWidth < window.innerHeight) {
          setShowRotatePrompt(true);
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
