'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { Product } from '@/lib/types';

interface ModalProps {
  product: Product | null;
  onClose: () => void;
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

export default function Modal({ product, onClose, originPosition }: ModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationState, setAnimationState] = useState<'entering' | 'visible' | 'exiting'>('entering');
  const modalRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setAnimationState('exiting');
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  const goToPrev = useCallback(() => {
    if (!product) return;
    setCurrentIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  }, [product]);

  const goToNext = useCallback(() => {
    if (!product) return;
    setCurrentIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
  }, [product]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    },
    [handleClose, goToPrev, goToNext]
  );

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

      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [product, handleEscape]);

  if (!product) return null;

  const images = product.images;
  const hasMultipleImages = images.length > 1;
  const currentMedia = images[currentIndex];
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
      borderRadius: '1rem',
    };
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        animationState === 'exiting' ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${
          animationState === 'entering' ? 'opacity-0' : animationState === 'exiting' ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-black max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl transition-all duration-300 ease-out"
        style={getAnimationStyle()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
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

        {/* Image/Video - 전체 화면 */}
        <div className="relative w-full h-full min-h-[50vh] max-h-[90vh] bg-black flex items-center justify-center">
          {videoEmbed ? (
            <iframe
              src={
                videoEmbed.type === 'youtube'
                  ? `https://www.youtube.com/embed/${videoEmbed.id}?autoplay=1`
                  : `https://player.vimeo.com/video/${videoEmbed.id}?autoplay=1`
              }
              className="w-full aspect-video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <img
              src={currentMedia}
              alt={`${product.name} - ${currentIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain"
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

          {/* Image Counter */}
          {hasMultipleImages && (
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/50 text-white text-sm rounded-full">
              {currentIndex + 1} / {images.length}
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
                <p className="text-white/50 text-sm mt-2 line-clamp-2">
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
