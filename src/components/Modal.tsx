'use client';

import { useEffect, useCallback, useState } from 'react';
import { Product } from '@/lib/types';

interface ModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function Modal({ product, onClose }: ModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (product) {
      setCurrentIndex(0);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [product, handleEscape]);

  if (!product) return null;

  const images = product.images;
  const hasMultipleImages = images.length > 1;

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-[#1a1a2e] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
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

        {/* Image Carousel */}
        <div className="relative aspect-square bg-[#0f0f1a]">
          <img
            src={images[currentIndex]}
            alt={`${product.name} - ${currentIndex + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `data:image/svg+xml,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
                  <rect fill="#1a1a2e" width="400" height="400"/>
                  <text fill="#4a4a6a" font-family="sans-serif" font-size="20" text-anchor="middle" x="200" y="200">${product.name}</text>
                </svg>
              `)}`;
            }}
          />

          {/* Navigation Arrows */}
          {hasMultipleImages && (
            <>
              <button
                onClick={goToPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
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
                    idx === currentIndex ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Image Counter */}
          {hasMultipleImages && (
            <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 text-white text-sm rounded-full">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {product.name}
              </h2>
              <p className="text-[#00d4ff] font-medium">{product.client}</p>
            </div>
          </div>

          <p className="text-gray-300 leading-relaxed mb-6">
            {product.description}
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>등록일: {product.createdAt}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes modal-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-modal-in {
          animation: modal-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
