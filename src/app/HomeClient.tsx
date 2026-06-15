'use client';

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import HexGrid from '@/components/HexGrid';
import MobileHexGrid from '@/components/MobileHexGrid';
import SeasonalEffects from '@/components/SeasonalEffects';
import { Product } from '@/lib/types';
import ErrorBoundary from '@/components/ErrorBoundary';

const Modal = lazy(() => import('@/components/Modal'));
const CompanyModal = lazy(() => import('@/components/CompanyModal'));

type ViewState = 'landing' | 'collapsing' | 'expanding' | 'grid';
type EffectType = 'snow' | 'cherry' | 'leaves' | 'fireworks' | null;

interface ClickPosition {
  x: number;
  y: number;
  size: number;
}

const IDLE_TIMEOUT = 300000;

export default function HomeClient({ initialProducts, initialSettings }: { initialProducts: Product[], initialSettings: any }) {
  // 서버에서 넘겨받은 수파베이스 데이터를 최초 값으로 즉시 사용합니다.
  const [products] = useState<Product[]>(initialProducts);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [clickPosition, setClickPosition] = useState<ClickPosition | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [viewState, setViewState] = useState<ViewState>('landing');
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  // 초기 세팅값 주입
  const seasonalEffect = initialSettings.seasonalEffect as EffectType || null;
  const effectEnabled = initialSettings.effectEnabled || false;
  const companyImages = initialSettings.companyImages || [];
  const companyDescription = initialSettings.companyDescription || null;
  const landingLogoImage = initialSettings.landingLogoImage || null;
  const landingBackgroundImage = initialSettings.landingBackgroundImage || null;
  const landingBackgroundType = initialSettings.landingBackgroundType || 'tile';
  const landingEnterImage = initialSettings.landingEnterImage || null;
  const gridBackgroundColor = initialSettings.gridBackgroundColor || '#000000';
  const headerLogoImage = initialSettings.headerLogoImage || null;
  const externalLinks = initialSettings.externalLinks || [];
  const leftPanelPositionX = initialSettings.leftPanelPositionX ?? 50;
  const leftPanelPositionY = initialSettings.leftPanelPositionY ?? 50;
  const rightPanelPositionX = initialSettings.rightPanelPositionX ?? 50;
  const rightPanelPositionY = initialSettings.rightPanelPositionY ?? 50;

  const [gridIdleCountdown, setGridIdleCountdown] = useState<number | null>(null);
  const gridIdleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gridCountdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLandingClick = useCallback(() => {
  setViewState('collapsing');
  setTimeout(() => {
    setViewState('expanding');
    setTimeout(() => {
      setViewState('grid');
    }, 1200); // 그리드가 완전히 커지는 시간 (0.6초 -> 1.2초)
  }, 800); // 랜딩 페이지가 작아지며 사라지는 시간 (0.4초 -> 0.8초)
}, []);

  const handleProductClick = useCallback((product: Product, position?: ClickPosition) => {
    setSelectedProduct(product);
    setClickPosition(position || null);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedProduct(null);
    setClickPosition(null);
  }, []);

  const handleReturnToLanding = useCallback(() => {
    setSelectedProduct(null);
    setClickPosition(null);
    setGridIdleCountdown(null);
    setShowCompanyModal(false);
    setViewState('landing');
  }, []);

  const resetGridIdleTimer = useCallback(() => {
    setGridIdleCountdown(null);
    if (gridIdleTimerRef.current) clearTimeout(gridIdleTimerRef.current);
    if (gridCountdownIntervalRef.current) clearInterval(gridCountdownIntervalRef.current);

    gridIdleTimerRef.current = setTimeout(() => {
      setGridIdleCountdown(3);
      gridCountdownIntervalRef.current = setInterval(() => {
        setGridIdleCountdown((prev) => {
          if (prev === null || prev <= 1) return prev;
          return prev - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT - 3000);
  }, []);

  useEffect(() => {
    if (viewState !== 'grid' || selectedProduct || showCompanyModal) {
      if (gridIdleTimerRef.current) clearTimeout(gridIdleTimerRef.current);
      if (gridCountdownIntervalRef.current) clearInterval(gridCountdownIntervalRef.current);
      setGridIdleCountdown(null);
      return;
    }

    resetGridIdleTimer();
    const handleActivity = () => resetGridIdleTimer();

    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('click', handleActivity);
    document.addEventListener('scroll', handleActivity);
    document.addEventListener('keydown', handleActivity);

    return () => {
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('scroll', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      if (gridIdleTimerRef.current) clearTimeout(gridIdleTimerRef.current);
      if (gridCountdownIntervalRef.current) clearInterval(gridCountdownIntervalRef.current);
    };
  }, [viewState, selectedProduct, showCompanyModal, resetGridIdleTimer]);

  useEffect(() => {
    if (gridIdleCountdown === 1) {
      const timer = setTimeout(() => { handleReturnToLanding(); }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gridIdleCountdown, handleReturnToLanding]);

  // 구글 로봇 인덱싱을 위한 조건부 노출 변수
  const isLandingVisible = viewState === 'landing' || viewState === 'collapsing';

  return (
    <div className="w-screen h-screen relative bg-black">
      {/* 1. 랜딩 페이지 영역 (CSS로 숨김/보임 처리하여 코드는 서버가 무조건 굽게 만듭니다) */}
      <main
  className={`h-screen w-screen overflow-hidden absolute inset-0 bg-black cursor-pointer z-50 transition-all duration-[800ms] ${
    isLandingVisible ? 'block' : 'hidden'
  } ${viewState === 'collapsing' ? 'scale-50 opacity-0' : ''}`}
  onClick={viewState === 'landing' ? handleLandingClick : undefined}
>
        {landingBackgroundImage && (
          <div
            className="absolute inset-0"
            style={landingBackgroundType === 'tile' ? {
              backgroundImage: `url(${landingBackgroundImage})`,
              backgroundRepeat: 'repeat',
              backgroundSize: '100px 100px',
            } : {
              backgroundImage: `url(${landingBackgroundImage})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}

        <SeasonalEffects effect={seasonalEffect} enabled={effectEnabled} />

        {!landingBackgroundImage && (
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {landingLogoImage ? (
            <div className="relative">
              <img src={landingLogoImage} alt="Logo" className="max-h-44 md:max-h-64 object-contain" />
            </div>
          ) : (
            <div className="relative">
              <h1 className="text-7xl md:text-[12rem] font-black text-white tracking-tighter leading-none">THEXEN</h1>
              <h1 className="absolute inset-0 text-7xl md:text-[12rem] font-black tracking-tighter leading-none text-white/10 blur-[2px]" style={{ transform: 'translate(4px, 4px)' }}>THEXEN</h1>
            </div>
          )}

          {!landingLogoImage && (
            <div className="mt-6 md:mt-8 flex items-center gap-4">
              <div className="h-[1px] w-12 bg-white/30" />
              <p className="text-white/50 text-xs md:text-sm tracking-[0.3em] uppercase">Premium Goods Manufacturing</p>
              <div className="h-[1px] w-12 bg-white/30" />
            </div>
          )}

          <div className="absolute bottom-16 md:bottom-20 flex flex-col items-center gap-3">
            <div className="animate-bounce">
              {landingEnterImage ? (
                <img src={landingEnterImage} alt="Enter" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-white/30 text-xs tracking-widest uppercase">Enter</p>
          </div>
        </div>

        {!landingBackgroundImage && (
          <>
            <div className="absolute top-8 left-8 w-16 h-16 border-l border-t border-white/10" />
            <div className="absolute top-8 right-8 w-16 h-16 border-r border-t border-white/10" />
            <div className="absolute bottom-8 left-8 w-16 h-16 border-l border-b border-white/10" />
            <div className="absolute bottom-8 right-8 w-16 h-16 border-r border-b border-white/10" />
          </>
        )}

        {viewState === 'collapsing' && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-white" />
          </div>
        )}
      </main>

      {/* 2. 메인 포트폴리오 그리드 영역 (서버가 처음부터 코드를 빌드하여 구글 로봇에게 즉시 제공합니다) */}
      <main 
        className={`h-screen w-screen overflow-hidden absolute inset-0 flex ${isMobile ? 'flex-col' : 'flex-row'} ${
          !isLandingVisible ? 'z-40' : 'z-10'
        }`} 
        style={{ backgroundColor: gridBackgroundColor }}
      >
        <SeasonalEffects effect={seasonalEffect} enabled={effectEnabled} />

        {isMobile && (
          <header className="flex-shrink-0 z-20 px-4 flex items-center justify-between" style={{ height: 60, backgroundColor: gridBackgroundColor }}>
            <button onClick={() => setShowCompanyModal(true)} className="transition-colors hover:opacity-80 cursor-pointer">
              {headerLogoImage ? <img src={headerLogoImage} alt="Logo" className="h-12 w-12 object-contain" /> : <span className="text-lg font-black text-white tracking-tighter">THEXEN</span>}
            </button>
            <div className="flex items-center gap-2">
              {externalLinks.filter(link => link.image).map((link, idx) =>
                link.url ? (
                  <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                    <img src={link.image} alt={`Link ${idx + 1}`} className="w-full h-full object-cover" />
                  </a>
                ) : (
                  <div key={idx} className="w-7 h-7 rounded-lg overflow-hidden"><img src={link.image} alt={`Link ${idx + 1}`} className="w-full h-full object-cover" /></div>
                )
              )}
            </div>
          </header>
        )}

        {!isMobile && (
          <div className="flex-1 min-w-[60px] z-20 relative">
            <div className="absolute" style={{ left: `${leftPanelPositionX}%`, top: `${leftPanelPositionY}%`, transform: `translate(-50%, -50%)` }}>
              <button onClick={() => setShowCompanyModal(true)} className="transition-colors hover:opacity-80 cursor-pointer" style={{ writingMode: 'vertical-rl' }}>
                {headerLogoImage ? <img src={headerLogoImage} alt="Logo" className="max-h-[140px] max-w-8 object-contain" /> : <span className="text-sm font-black text-white tracking-widest">About THEXEN</span>}
              </button>
            </div>
          </div>
        )}

        <div className={`overflow-hidden ${isMobile ? 'flex-1' : 'w-full max-w-[1200px]'} ${
  (viewState === 'landing' || viewState === 'collapsing') ? 'opacity-0 scale-0' : ''
} ${viewState === 'expanding' ? 'animate-expand-from-center' : ''}`}>
  {isMobile ? (
    <MobileHexGrid products={products} onProductClick={handleProductClick} backgroundColor={gridBackgroundColor} />
  ) : (
    <HexGrid products={products} onProductClick={handleProductClick} backgroundColor={gridBackgroundColor} />
  )}
</div>

        {!isMobile && (
          <div className="flex-1 min-w-[60px] z-20 relative">
            <div className="absolute" style={{ left: `${rightPanelPositionX}%`, top: `${rightPanelPositionY}%`, transform: `translate(-50%, -50%)` }}>
              <div className="flex items-center gap-3">
                {externalLinks.filter(link => link.image).map((link, idx) =>
                  link.url ? (
                    <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg overflow-hidden hover:opacity-80 transition-opacity border border-white/20">
                      <img src={link.image} alt={`Link ${idx + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ) : (
                    <div key={idx} className="w-10 h-10 rounded-lg overflow-hidden border border-white/20"><img src={link.image} alt={`Link ${idx + 1}`} className="w-full h-full object-cover" /></div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        <ErrorBoundary>
          <Suspense fallback={null}>
            <Modal product={selectedProduct} onClose={handleCloseModal} onReturnToLanding={handleReturnToLanding} originPosition={clickPosition} />
          </Suspense>
        </ErrorBoundary>

        <Suspense fallback={null}>
          <CompanyModal isOpen={showCompanyModal} onClose={() => setShowCompanyModal(false)} onReturnToLanding={handleReturnToLanding} images={companyImages} description={companyDescription} />
        </Suspense>
      </main>

      <style jsx>{`
  @keyframes expand-from-center {
    0% { transform: scale(0.3); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  .animate-expand-from-center {
    animation: expand-from-center 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
  }
`}</style>
    </div>
  );
}
