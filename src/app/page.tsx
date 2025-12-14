'use client';

import { useState, useEffect, useCallback } from 'react';
import HexGrid from '@/components/HexGrid';
import MobileHexGrid from '@/components/MobileHexGrid';
import Modal from '@/components/Modal';
import { Product } from '@/lib/types';

type ViewState = 'landing' | 'collapsing' | 'expanding' | 'grid';

interface ClickPosition {
  x: number;
  y: number;
  size: number;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [clickPosition, setClickPosition] = useState<ClickPosition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [viewState, setViewState] = useState<ViewState>('landing');

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load products:', err);
        setIsLoading(false);
      });
  }, []);

  // 랜딩 클릭 → 수렴 → 펼침 애니메이션
  const handleLandingClick = useCallback(() => {
    setViewState('collapsing');

    setTimeout(() => {
      setViewState('expanding');

      setTimeout(() => {
        setViewState('grid');
      }, 600);
    }, 400);
  }, []);

  // 제품 클릭 핸들러 (위치 정보 포함)
  const handleProductClick = useCallback((product: Product, position?: ClickPosition) => {
    setSelectedProduct(product);
    setClickPosition(position || null);
  }, []);

  // 모달 닫기
  const handleCloseModal = useCallback(() => {
    setSelectedProduct(null);
    setClickPosition(null);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  // 랜딩 페이지
  if (viewState === 'landing' || viewState === 'collapsing') {
    return (
      <main
        className="h-screen w-screen overflow-hidden relative bg-[#0f0f1a] cursor-pointer"
        onClick={viewState === 'landing' ? handleLandingClick : undefined}
      >
        {/* 배경 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-radial from-[#1a1a3e] via-[#0f0f1a] to-[#0a0a12]" />

        {/* 장식용 원형 패턴 */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`absolute rounded-full bg-[#00d4ff]/5 transition-all duration-500 ${
                viewState === 'collapsing' ? 'scale-0 opacity-0' : ''
              }`}
              style={{
                width: `${150 + i * 100}px`,
                height: `${150 + i * 100}px`,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                transitionDelay: `${i * 30}ms`,
              }}
            />
          ))}
        </div>

        {/* 메인 콘텐츠 */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-400 ${
            viewState === 'collapsing' ? 'scale-0 opacity-0' : ''
          }`}
        >
          {/* 로고 */}
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-bold text-white tracking-wider">
              THE<span className="text-[#00d4ff]">X</span>EN
            </h1>
            <p className="text-center text-white/50 mt-4 text-lg">
              ODM/OEM 굿즈 전문 제조
            </p>
          </div>

          {/* 클릭 유도 */}
          <div className="mt-12 flex flex-col items-center gap-4 animate-pulse">
            <div className="w-12 h-12 rounded-full border-2 border-[#00d4ff]/50 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-[#00d4ff]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            <p className="text-white/40 text-sm">화면을 클릭하세요</p>
          </div>
        </div>

        {/* 수렴 시 중앙 점 */}
        {viewState === 'collapsing' && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 rounded-full bg-[#00d4ff] animate-ping" />
            <div className="absolute inset-0 w-4 h-4 rounded-full bg-[#00d4ff]" />
          </div>
        )}

        <style jsx>{`
          .bg-gradient-radial {
            background: radial-gradient(ellipse at center, var(--tw-gradient-from) 0%, var(--tw-gradient-via) 50%, var(--tw-gradient-to) 100%);
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden relative">

      {/* Header - Mobile */}
      {isMobile && (
        <header className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto">
            <h1 className="text-lg font-bold text-white tracking-wider">
              THE<span className="text-[#00d4ff]">X</span>EN
            </h1>
          </div>

        </header>
      )}

      {/* Hex Grid - PC or Mobile (with expanding animation) */}
      <div className={`w-full h-full ${viewState === 'expanding' ? 'animate-expand-from-center' : ''}`}>
        {isMobile ? (
          <MobileHexGrid products={products} onProductClick={handleProductClick} />
        ) : (
          <HexGrid products={products} onProductClick={handleProductClick} />
        )}
      </div>

      {/* Product Modal */}
      <Modal
        product={selectedProduct}
        onClose={handleCloseModal}
        originPosition={clickPosition}
      />

      {/* Product count - PC only */}
      {!isMobile && viewState === 'grid' && (
        <div className="absolute top-20 left-6 text-white/40 text-sm">
          {products.length}개의 포트폴리오
        </div>
      )}

      <style jsx>{`
        @keyframes expand-from-center {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-expand-from-center {
          animation: expand-from-center 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </main>
  );
}
