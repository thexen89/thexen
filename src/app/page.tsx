'use client';

import { useState, useEffect, useCallback } from 'react';
import HexGrid from '@/components/HexGrid';
import MobileHexGrid from '@/components/MobileHexGrid';
import Modal from '@/components/Modal';
import { Product } from '@/lib/types';
import { useFullscreenLandscape } from '@/hooks/useFullscreenLandscape';

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
  const { isLandscape, showRotatePrompt, requestFullscreenLandscape, dismissRotatePrompt } = useFullscreenLandscape();

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
  const handleLandingClick = useCallback(async () => {
    // 모바일에서 전체화면 + 가로모드 요청
    if (isMobile) {
      await requestFullscreenLandscape();
    }

    setViewState('collapsing');

    setTimeout(() => {
      setViewState('expanding');

      setTimeout(() => {
        setViewState('grid');
      }, 600);
    }, 400);
  }, [isMobile, requestFullscreenLandscape]);

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
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // 랜딩 페이지
  if (viewState === 'landing' || viewState === 'collapsing') {
    return (
      <main
        className="h-screen w-screen overflow-hidden relative bg-black cursor-pointer"
        onClick={viewState === 'landing' ? handleLandingClick : undefined}
      >
        {/* 노이즈 텍스처 */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* 메인 콘텐츠 */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${
            viewState === 'collapsing' ? 'scale-50 opacity-0' : ''
          }`}
        >
          {/* 로고 */}
          <div className="relative">
            <h1 className="text-7xl md:text-[12rem] font-black text-white tracking-tighter leading-none">
              THEXEN
            </h1>
            {/* 글리치 효과 레이어 */}
            <h1
              className="absolute inset-0 text-7xl md:text-[12rem] font-black tracking-tighter leading-none text-white/10 blur-[2px]"
              style={{ transform: 'translate(4px, 4px)' }}
            >
              THEXEN
            </h1>
          </div>

          {/* 서브 텍스트 */}
          <div className="mt-6 md:mt-8 flex items-center gap-4">
            <div className="h-[1px] w-12 bg-white/30" />
            <p className="text-white/50 text-xs md:text-sm tracking-[0.3em] uppercase">
              Premium Goods Manufacturing
            </p>
            <div className="h-[1px] w-12 bg-white/30" />
          </div>

          {/* 클릭 유도 */}
          <div className="absolute bottom-16 md:bottom-20 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center animate-bounce">
              <svg
                className="w-5 h-5 text-white/60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <p className="text-white/30 text-xs tracking-widest uppercase">Enter</p>
          </div>
        </div>

        {/* 코너 장식 */}
        <div className={`absolute top-8 left-8 w-16 h-16 border-l border-t border-white/10 transition-opacity duration-300 ${viewState === 'collapsing' ? 'opacity-0' : ''}`} />
        <div className={`absolute top-8 right-8 w-16 h-16 border-r border-t border-white/10 transition-opacity duration-300 ${viewState === 'collapsing' ? 'opacity-0' : ''}`} />
        <div className={`absolute bottom-8 left-8 w-16 h-16 border-l border-b border-white/10 transition-opacity duration-300 ${viewState === 'collapsing' ? 'opacity-0' : ''}`} />
        <div className={`absolute bottom-8 right-8 w-16 h-16 border-r border-b border-white/10 transition-opacity duration-300 ${viewState === 'collapsing' ? 'opacity-0' : ''}`} />

        {/* 수렴 시 중앙 점 */}
        {viewState === 'collapsing' && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-white" />
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden relative">

      {/* Header - Mobile */}
      {isMobile && (
        <header className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto">
            <h1 className="text-lg font-black text-white tracking-tighter">
              THEXEN
            </h1>
          </div>
        </header>
      )}

      {/* Hex Grid - PC or Mobile (with expanding animation) */}
      <div className={`w-full h-full ${viewState === 'expanding' ? 'animate-expand-from-center' : ''}`}>
        {isMobile && !isLandscape ? (
          <MobileHexGrid products={products} onProductClick={handleProductClick} />
        ) : (
          <HexGrid products={products} onProductClick={handleProductClick} />
        )}
      </div>

      {/* 회전 안내 오버레이 - 모바일 세로모드에서 표시 */}
      {showRotatePrompt && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8">
          {/* 회전 아이콘 */}
          <div className="mb-8 relative">
            <svg
              className="w-24 h-24 text-white animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {/* 폰 아이콘 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-10 border-2 border-white rounded-lg rotate-90" />
            </div>
          </div>

          <h2 className="text-white text-xl font-bold mb-2">
            가로로 회전해주세요
          </h2>
          <p className="text-white/50 text-sm text-center mb-8">
            더 나은 포트폴리오 경험을 위해<br />
            기기를 가로로 돌려주세요
          </p>

          <button
            onClick={dismissRotatePrompt}
            className="px-6 py-3 border border-white/30 text-white/70 rounded-lg hover:bg-white/10 transition-colors"
          >
            이대로 보기
          </button>
        </div>
      )}

      {/* Product Modal */}
      <Modal
        product={selectedProduct}
        onClose={handleCloseModal}
        originPosition={clickPosition}
      />


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
