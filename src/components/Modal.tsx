'use client';

import { useEffect, useCallback } from 'react';
import { Product } from '@/lib/types';

interface ModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function Modal({ product, onClose }: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (product) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [product, handleEscape]);

  if (!product) return null;

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

        {/* Image */}
        <div className="relative aspect-square bg-[#0f0f1a]">
          <img
            src={product.image}
            alt={product.name}
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

          {/* Priority badge */}
          <div className="absolute top-4 left-4 px-3 py-1 bg-[#00d4ff] text-black text-sm font-bold rounded-full">
            #{product.priority}
          </div>
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
