'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { Product } from '@/lib/types';

interface ModalProps {
  product: Product | null;
  onClose: () => void;
  onReturnToLanding?: () => void;
  originPosition?: { x: number; y: number; size: number } | null;
}

// 유튜브/비메오 URL 감지
const getVideoEmbed = (url: string): { type: 'youtube' | 'vimeo'; id: string } | null => {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { type: 'youtube', id: ytMatch[1] };

  // Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) return { type: 'vimeo', id: vimeoMatch[1] };

  return null;
};

const IDLE_TIMEOUT = 300000; // 5분

export default function Modal({ product, onClose, onReturnToLanding, originPosition }: ModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationState, setAnimationState] = useState<'entering' | 'visible' | 'exiting'>('entering');
  const [idleCountdown, setIdleCountdown] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // idle 타이머 초기화
  const resetIdleTimer = useCallback(() => {
    // 카운트다운 숨기기
    setIdleCountdown(null);

    // 기존 타이머 제거
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // 새 타이머 시작 (7초 후 카운트다운 시작, 10초 후 닫기)
    idleTimerRef.current = setTimeout(() => {
      // 3초 카운트다운 시작
      setIdleCountdown(3);
      countdownIntervalRef.current = setInterval(() => {
        setIdleCountdown((prev) => {
          if (prev === null || prev <= 1) {
            return prev;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT - 3000); // 7초 후 카운트다운 시작
  }, []);

  const handleClose = useCallback(() => {
    // 타이머 정리
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    setAnimationState('exiting');
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  const goToPrev = useCallback(() => {
    if (!product) return;
    const totalItems = (product.videoUrl ? 1 : 0) + product.images.length;
    setCurrentIndex((prev) => (prev === 0 ? totalItems - 1 : prev - 1));
  }, [product]);

  const goToNext = useCallback(() => {
    if (!product) return;
    const totalItems = (product.videoUrl ? 1 : 0) + product.images.length;
    setCurrentIndex((prev) => (prev === totalItems - 1 ? 0 : prev + 1));
  }, [product]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goToNext();
      else goToPrev();
      resetIdleTimer();
    }
  }, [goToNext, goToPrev, resetIdleTimer]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      resetIdleTimer(); // 키보드 입력 시 타이머 리셋
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    },
    [handleClose, goToPrev, goToNext, resetIdleTimer]
  );

  // 카운트다운이 0이 되면 메인페이지로 이동
  useEffect(() => {
    if (idleCountdown === 1) {
      const closeTimer = setTimeout(() => {
        // 타이머 정리
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        // 랜딩 페이지로 이동 (있으면), 없으면 단순히 닫기
        if (onReturnToLanding) {
          onReturnToLanding();
        } else {
          handleClose();
        }
      }, 1000);
      return () => clearTimeout(closeTimer);
    }
  }, [idleCountdown, handleClose, onReturnToLanding]);

  useEffect(() => {
    if (product) {
      setCurrentIndex(0);
      setAnimationState('entering');
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';

      // 진입 애니메이션 완료
      const timer = setTimeout(() => {
        setAnimationState('visible');
      }, 300);

      // idle 타이머 시작
      resetIdleTimer();

      // 마우스 움직임 감지
      const handleActivity = () => {
        resetIdleTimer();
      };
      document.addEventListener('mousemove', handleActivity);
      document.addEventListener('click', handleActivity);
      document.addEventListener('scroll', handleActivity);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('mousemove', handleActivity);
        document.removeEventListener('click', handleActivity);
        document.removeEventListener('scroll', handleActivity);
        document.body.style.overflow = '';

        // 타이머 정리
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [product, handleEscape, resetIdleTimer]);

  if (!product) return null;

  // 이미지 배열에 비디오 URL이 있으면 맨 뒤에 추가
  const mediaItems = product.videoUrl
    ? [...product.images, product.videoUrl]
    : product.images;
  const hasMultipleMedia = mediaItems.length > 1;
  const currentMedia = mediaItems[currentIndex];
  const videoEmbed = getVideoEmbed(currentMedia);

  // 애니메이션 스타일 계산
  const getAnimationStyle = () => {
    if (!originPosition) {
      // originPosition이 없으면 기본 애니메이션
      return {};
    }

    if (animationState === 'entering') {
      return {
        transform: `translate(${originPosition.x - window.innerWidth / 2}px, ${originPosition.y - window.innerHeight / 2}px) scale(0.1)`,
        opacity: 0,
        borderRadius: '50%',
      };
    }

    if (animationState === 'exiting') {
      return {
        transform: `translate(${originPosition.x - window.innerWidth / 2}px, ${originPosition.y - window.innerHeight / 2}px) scale(0.1)`,
        opacity: 0,
        borderRadius: '50%',
      };
    }

    return {
      transform: 'translate(0, 0) scale(1)',
      opacity: 1,
      borderRadius: '0',
    };
  };

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center transition-opacity duration-300 ${
        animationState === 'exiting' ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      {/* Backdrop - 반투명 어두운 배경 */}
      <div
        className={`absolute inset-0 bg-black/90 transition-opacity duration-300 ${
          animationState === 'entering' ? 'opacity-0' : animationState === 'exiting' ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Modal - 이미지만 표시 (배경/테두리 없음) */}
      <div
        ref={modalRef}
        className="relative max-w-[90vw] max-h-[90vh] transition-all duration-300 ease-out"
        style={getAnimationStyle()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button (X) */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-white/20 text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Image/Video with Navigation */}
        <div className="relative flex items-center justify-center" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {/* Navigation Arrows - 바깥쪽에 배치 */}
          {hasMultipleMedia && (
            <button
              onClick={goToPrev}
              className="absolute left-2 md:-left-16 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-white/20 text-white transition-colors z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Media Content */}
          <div className="relative">
            {videoEmbed ? (
              <iframe
                src={
                  videoEmbed.type === 'youtube'
                    ? `https://www.youtube.com/embed/${videoEmbed.id}?autoplay=1`
                    : `https://player.vimeo.com/video/${videoEmbed.id}?autoplay=1`
                }
                className="w-[80vw] max-w-[960px] aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <img
                src={currentMedia}
                alt={product.imageAlts?.[currentIndex] || `${product.name} - ${currentIndex + 1}`}
                className="max-w-[80vw] max-h-[85vh] object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `data:image/svg+xml,${encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
                      <rect fill="#111" width="400" height="300"/>
                      <text fill="#444" font-family="sans-serif" font-size="20" text-anchor="middle" x="200" y="150">${product.name}</text>
                    </svg>
                  `)}`;
                }}
              />
            )}
          </div>

          {/* Navigation Arrow - Right */}
          {hasMultipleMedia && (
            <button
              onClick={goToNext}
              className="absolute right-2 md:-right-16 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-white/20 text-white transition-colors z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Dots Indicator */}
          {hasMultipleMedia && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {mediaItems.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Info Overlay - showInfo가 true일 때만 표시 */}
          {product.showInfo && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <h2 className="text-xl font-bold text-white mb-1">
                {product.name}
              </h2>
              <p className="text-white/70 text-sm">{product.client}</p>
              {product.description && (
                <p className="text-white/50 text-sm mt-2 whitespace-pre-line">
                  {product.description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
