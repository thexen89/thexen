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
const getVideoEmbed = (url: string | undefined): { type: 'youtube' | 'vimeo'; id: string } | null => {
  if (!url) return null;

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
  
  // 💡 [추가] 모바일에서 정보창이 열려있는지 확인하는 상태
  const [showMobileInfo, setShowMobileInfo] = useState(false); 
  
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

  // 모달 닫기 핸들러
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
    }, 1000); // 닫힐 때 대기 시간 (1000ms = 1초)
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
    if (product) {
      setCurrentIndex(0);
      setShowMobileInfo(false); // 💡 다른 상품을 누르면 모바일 정보창 상태 초기화
      setAnimationState('entering');
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';

      // 30ms의 미세한 딜레이 후 바로 애니메이션 동작 시작
      const timer = setTimeout(() => {
        setAnimationState('visible');
      }, 30);

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
  }, [product, handleEscape, resetIdleTimer]);

  if (!product) return null;

  const validImages = (product.images || []).filter(img => img && img.trim() !== '');
  const mediaItems = product.videoUrl
    ? [...validImages, product.videoUrl]
    : validImages;

  if (mediaItems.length === 0) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90" onClick={handleClose}>
        <p className="text-white/50">이미지가 없습니다</p>
      </div>
    );
  }

  const safeIndex = Math.min(currentIndex, mediaItems.length - 1);
  const hasMultipleMedia = mediaItems.length > 1;
  const currentMedia = mediaItems[safeIndex];
  const videoEmbed = getVideoEmbed(currentMedia);

  const getAnimationStyle = () => {
    if (!originPosition) return {};

    if (animationState === 'entering' || animationState === 'exiting') {
      return {
        transform: `translate(${originPosition.x - window.innerWidth / 2}px, ${originPosition.y - window.innerHeight / 2}px) scale(0.05)`,
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
      className={`fixed inset-0 z-[200] flex items-center justify-center transition-opacity duration-[1000ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
        animationState === 'exiting' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/90 transition-opacity duration-[1000ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          animationState === 'entering' || animationState === 'exiting' ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Modal 본체 */}
      <div
        ref={modalRef}
        className="relative max-w-[90vw] max-h-[90vh] transition-all duration-[1000ms] ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden"
        style={getAnimationStyle()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close (X) */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-white/20 text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image/Video with Navigation */}
        <div className="relative flex items-center justify-center min-w-[300px] min-h-[200px]" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {hasMultipleMedia && (
            <button
  onClick={goToPrev}
  className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 items-center justify-center rounded-full bg-black/50 hover:bg-white/20 text-white transition-colors z-20"
>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}






          {/* Media Content */}
          <div className="relative flex items-center justify-center">
            {mediaItems.map((media, idx) => {
              const isVideo = getVideoEmbed(media);
              const isActive = idx === currentIndex;

              return (
                <div
                  key={idx}
                  className={`transition-opacity duration-500 ease-in-out ${
                    isActive ? 'opacity-100 relative z-10' : 'opacity-0 absolute z-0 pointer-events-none'
                  }`}
                >
                  {isVideo ? (
                    // 비디오는 뒤에서 소리가 겹쳐서 재생되지 않도록, 활성화되었을 때만 렌더링합니다.
                    isActive && (
                      <iframe
                        src={
                          isVideo.type === 'youtube'
                            ? `https://www.youtube.com/embed/${isVideo.id}?autoplay=1`
                            : `https://player.vimeo.com/video/${isVideo.id}?autoplay=1`
                        }
                        className="w-[80vw] max-w-[960px] aspect-video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    )
                  ) : (
                    <img
                      src={media}
                      alt={product.imageAlts?.[idx] || `${product.name} - ${idx + 1}`}
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
              );
            })}
          </div>

          {/* Navigation Arrow - Right */}
          {hasMultipleMedia && (
            <button
  onClick={goToNext}
  className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 items-center justify-center rounded-full bg-black/50 hover:bg-white/20 text-white transition-colors z-20"
>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Dots Indicator */}
          {hasMultipleMedia && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
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

          {/* 💡 [추가] 모바일 전용 정보 토글 & 데스크톱 오버레이 영역 */}
          {product.showInfo && (
            <>
              {/* 모바일 정보 보기 [i] 버튼 (태블릿/PC에서는 숨김) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMobileInfo((prev) => !prev);
                }}
                className={`md:hidden absolute bottom-4 right-4 z-30 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 ${
                  showMobileInfo ? 'bg-white text-black' : 'bg-black/60 hover:bg-white/20 text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </button>

              {/* 정보 오버레이 (모바일: 버튼클릭 시 위로 스르륵 등장 / PC: 항상 표시) */}
              <div
                className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-10 ${
                  showMobileInfo 
                    ? 'translate-y-0 opacity-100 pointer-events-auto' 
                    : 'translate-y-4 opacity-0 pointer-events-none md:translate-y-0 md:opacity-100 md:pointer-events-auto'
                }`}
              >
                <h2 className="text-xl font-bold text-white mb-1 pr-10">{product.name}</h2>
                <p className="text-white/70 text-sm">{product.client}</p>
                {product.description && (
                  <p className="text-white/50 text-sm mt-2 whitespace-pre-line">{product.description}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
