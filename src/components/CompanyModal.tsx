'use client';

import { useEffect, useCallback, useState, useRef } from 'react';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturnToLanding?: () => void;
  images: string[];
  description?: string | null;
}

const IDLE_TIMEOUT = 300000; // 5분

export default function CompanyModal({ isOpen, onClose, onReturnToLanding, images, description }: CompanyModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationState, setAnimationState] = useState<'entering' | 'visible' | 'exiting'>('entering');
  const [idleCountdown, setIdleCountdown] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // idle 타이머 초기화
  const resetIdleTimer = useCallback(() => {
    setIdleCountdown(null);

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      setIdleCountdown(3);
      countdownIntervalRef.current = setInterval(() => {
        setIdleCountdown((prev) => {
          if (prev === null || prev <= 1) {
            return prev;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT - 3000);
  }, []);

  const handleClose = useCallback(() => {
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
    if (images.length === 0) return;
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    if (images.length === 0) return;
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

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
      resetIdleTimer();
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
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
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
    if (isOpen) {
      setCurrentIndex(0);
      setAnimationState('entering');
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';

      const timer = setTimeout(() => {
        setAnimationState('visible');
      }, 300);

      resetIdleTimer();

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

        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [isOpen, handleEscape, resetIdleTimer]);

  if (!isOpen) return null;

  const hasMultipleImages = images.length > 1;
  const currentMedia = images[currentIndex] || '';

  const getAnimationStyle = () => {
    if (animationState === 'entering') {
      return {
        transform: 'scale(0.9)',
        opacity: 0,
      };
    }

    if (animationState === 'exiting') {
      return {
        transform: 'scale(0.9)',
        opacity: 0,
      };
    }

    return {
      transform: 'scale(1)',
      opacity: 1,
    };
  };

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center transition-opacity duration-300 ${
        animationState === 'exiting' ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/90 transition-opacity duration-300 ${
          animationState === 'entering' ? 'opacity-0' : animationState === 'exiting' ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Modal */}
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

        {/* Image/Content */}
        <div className="relative flex items-center justify-center" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {images.length > 0 ? (
            <img
              src={currentMedia}
              alt={`회사 소개 - ${currentIndex + 1}`}
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `data:image/svg+xml,${encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
                    <rect fill="#111" width="400" height="300"/>
                    <text fill="#444" font-family="sans-serif" font-size="20" text-anchor="middle" x="200" y="150">THEXEN</text>
                  </svg>
                `)}`;
              }}
            />
          ) : (
            <div className="w-[400px] h-[300px] bg-zinc-900 rounded-lg flex items-center justify-center">
              <p className="text-white/50">등록된 이미지가 없습니다</p>
            </div>
          )}

          {/* Navigation Arrows */}
          {hasMultipleImages && (
            <>
              <button
                onClick={goToPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-white/20 text-white transition-colors"
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={goToNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-white/20 text-white transition-colors"
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          {/* Dots Indicator */}
          {hasMultipleImages && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, idx) => (
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

          {/* Description Overlay */}
          {description && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <h2 className="text-xl font-bold text-white mb-2">THEXEN</h2>
              <p className="text-white/70 text-sm whitespace-pre-line">
                {description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
