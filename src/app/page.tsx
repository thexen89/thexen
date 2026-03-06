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

const IDLE_TIMEOUT = 300000; // 5분

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [clickPosition, setClickPosition] = useState<ClickPosition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [viewState, setViewState] = useState<ViewState>('landing');
  const [seasonalEffect, setSeasonalEffect] = useState<EffectType>(null);
  const [effectEnabled, setEffectEnabled] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyImages, setCompanyImages] = useState<string[]>([]);
  const [companyDescription, setCompanyDescription] = useState<string | null>(null);
  const [landingLogoImage, setLandingLogoImage] = useState<string | null>(null);
  const [landingBackgroundImage, setLandingBackgroundImage] = useState<string | null>(null);
  const [landingBackgroundType, setLandingBackgroundType] = useState<'tile' | 'cover'>('tile');
  const [landingEnterImage, setLandingEnterImage] = useState<string | null>(null);
  const [gridBackgroundColor, setGridBackgroundColor] = useState('#000000');
  const [headerLogoImage, setHeaderLogoImage] = useState<string | null>(null);
  const [externalLinks, setExternalLinks] = useState<{image: string, url: string}[]>([]);
  const [leftPanelPositionX, setLeftPanelPositionX] = useState(50);
  const [leftPanelPositionY, setLeftPanelPositionY] = useState(50);
  const [rightPanelPositionX, setRightPanelPositionX] = useState(50);
  const [rightPanelPositionY, setRightPanelPositionY] = useState(50);
  const [gridIdleCountdown, setGridIdleCountdown] = useState<number | null>(null);
  const gridIdleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gridCountdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 제품 + 설정 병렬 로드
  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(res => res.json()),
      fetch('/api/settings').then(res => res.json()),
    ]).then(([productsData, settingsData]) => {
      setProducts(productsData.products || []);
      setSeasonalEffect(settingsData.seasonalEffect as EffectType);
      setEffectEnabled(settingsData.effectEnabled);
      setCompanyImages(settingsData.companyImages || []);
      setCompanyDescription(settingsData.companyDescription || null);
      setLandingLogoImage(settingsData.landingLogoImage || null);
      setLandingBackgroundImage(settingsData.landingBackgroundImage || null);
      setLandingBackgroundType(settingsData.landingBackgroundType || 'tile');
      setLandingEnterImage(settingsData.landingEnterImage || null);
      setGridBackgroundColor(settingsData.gridBackgroundColor || '#000000');
      setHeaderLogoImage(settingsData.headerLogoImage || null);
      setExternalLinks(settingsData.externalLinks || []);
      setLeftPanelPositionX(settingsData.leftPanelPositionX ?? 50);
      setLeftPanelPositionY(settingsData.leftPanelPositionY ?? 50);
      setRightPanelPositionX(settingsData.rightPanelPositionX ?? 50);
      setRightPanelPositionY(settingsData.rightPanelPositionY ?? 50);
      setIsLoading(false);

      // 백그라운드에서 모든 제품 이미지 프리로드
      const allProducts = productsData.products || [];
      allProducts.forEach((p: Product) => {
        (p.images || []).forEach((url: string) => {
          if (url) {
            const img = new window.Image();
            img.src = url;
          }
        });
      });
    }).catch((err) => {
      console.error('Failed to load data:', err);
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
  }, [isMobile]);

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

  // 랜딩 페이지로 이동 (idle 타이머에 의해 호출)
  const handleReturnToLanding = useCallback(() => {
    setSelectedProduct(null);
    setClickPosition(null);
    setGridIdleCountdown(null);
    setShowCompanyModal(false);
    setViewState('landing');
  }, []);

  // 그리드 화면 idle 타이머 리셋
  const resetGridIdleTimer = useCallback(() => {
    setGridIdleCountdown(null);

    if (gridIdleTimerRef.current) {
      clearTimeout(gridIdleTimerRef.current);
    }
    if (gridCountdownIntervalRef.current) {
      clearInterval(gridCountdownIntervalRef.current);
    }

    // 7초 후 카운트다운 시작
    gridIdleTimerRef.current = setTimeout(() => {
      setGridIdleCountdown(3);
      gridCountdownIntervalRef.current = setInterval(() => {
        setGridIdleCountdown((prev) => {
          if (prev === null || prev <= 1) {
            return prev;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT - 3000);
  }, []);

  // 그리드 화면 idle 타이머 - viewState가 grid일 때만 활성화
  useEffect(() => {
    // 모달이 열려있으면 그리드 타이머 비활성화 (모달이 자체 타이머 가짐)
    if (viewState !== 'grid' || selectedProduct || showCompanyModal) {
      if (gridIdleTimerRef.current) {
        clearTimeout(gridIdleTimerRef.current);
      }
      if (gridCountdownIntervalRef.current) {
        clearInterval(gridCountdownIntervalRef.current);
      }
      setGridIdleCountdown(null);
      return;
    }

    // idle 타이머 시작
    resetGridIdleTimer();

    const handleActivity = () => {
      resetGridIdleTimer();
    };

    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('click', handleActivity);
    document.addEventListener('scroll', handleActivity);
    document.addEventListener('keydown', handleActivity);

    return () => {
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('scroll', handleActivity);
      document.removeEventListener('keydown', handleActivity);

      if (gridIdleTimerRef.current) {
        clearTimeout(gridIdleTimerRef.current);
      }
      if (gridCountdownIntervalRef.current) {
        clearInterval(gridCountdownIntervalRef.current);
      }
    };
  }, [viewState, selectedProduct, showCompanyModal, resetGridIdleTimer]);

  // 그리드 카운트다운이 끝나면 랜딩으로 이동
  useEffect(() => {
    if (gridIdleCountdown === 1) {
      const timer = setTimeout(() => {
        handleReturnToLanding();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gridIdleCountdown, handleReturnToLanding]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <SeasonalEffects effect={seasonalEffect} enabled={effectEnabled} />
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
        {/* 커스텀 배경 이미지 */}
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

        {/* 시즌 효과 */}
        <SeasonalEffects effect={seasonalEffect} enabled={effectEnabled} />

        {/* 노이즈 텍스처 - 커스텀 배경이 없을 때만 표시 */}
        {!landingBackgroundImage && (
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        )}

        {/* 메인 콘텐츠 */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${
            viewState === 'collapsing' ? 'scale-50 opacity-0' : ''
          }`}
        >
          {/* 로고 - 커스텀 이미지 또는 기본 텍스트 */}
          {landingLogoImage ? (
            <div className="relative">
              <img
                src={landingLogoImage}
                alt="Logo"
                className="max-h-44 md:max-h-64 object-contain"
              />
            </div>
          ) : (
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
          )}

          {/* 서브 텍스트 - 커스텀 로고가 없을 때만 표시 */}
          {!landingLogoImage && (
            <div className="mt-6 md:mt-8 flex items-center gap-4">
              <div className="h-[1px] w-12 bg-white/30" />
              <p className="text-white/50 text-xs md:text-sm tracking-[0.3em] uppercase">
                Premium Goods Manufacturing
              </p>
              <div className="h-[1px] w-12 bg-white/30" />
            </div>
          )}

          {/* 클릭 유도 */}
          <div className="absolute bottom-16 md:bottom-20 flex flex-col items-center gap-3">
            <div className="animate-bounce">
              {landingEnterImage ? (
                <img
                  src={landingEnterImage}
                  alt="Enter"
                  className="w-10 h-10 md:w-12 md:h-12 object-contain"
                />
              ) : (
                <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white/60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-white/30 text-xs tracking-widest uppercase">Enter</p>
          </div>
        </div>

        {/* 코너 장식 - 커스텀 배경이 없을 때만 표시 */}
        {!landingBackgroundImage && (
          <>
            <div className={`absolute top-8 left-8 w-16 h-16 border-l border-t border-white/10 transition-opacity duration-300 ${viewState === 'collapsing' ? 'opacity-0' : ''}`} />
            <div className={`absolute top-8 right-8 w-16 h-16 border-r border-t border-white/10 transition-opacity duration-300 ${viewState === 'collapsing' ? 'opacity-0' : ''}`} />
            <div className={`absolute bottom-8 left-8 w-16 h-16 border-l border-b border-white/10 transition-opacity duration-300 ${viewState === 'collapsing' ? 'opacity-0' : ''}`} />
            <div className={`absolute bottom-8 right-8 w-16 h-16 border-r border-b border-white/10 transition-opacity duration-300 ${viewState === 'collapsing' ? 'opacity-0' : ''}`} />
          </>
        )}

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
    <main className={`h-screen w-screen overflow-hidden relative flex ${isMobile ? 'flex-col' : 'flex-row'}`} style={{ backgroundColor: gridBackgroundColor }}>
      {/* 시즌 효과 */}
      <SeasonalEffects effect={seasonalEffect} enabled={effectEnabled} />

      {/* 모바일: 헤더 (가로/세로 모두 표시) */}
      {isMobile && (
        <header
          className="flex-shrink-0 z-20 px-4 flex items-center justify-between"
          style={{ height: 60, backgroundColor: gridBackgroundColor }}
        >
          <button
            onClick={() => setShowCompanyModal(true)}
            className="transition-colors hover:opacity-80 cursor-pointer"
          >
            {headerLogoImage ? (
              <img src={headerLogoImage} alt="Logo" className="h-12 w-12 object-contain" />
            ) : (
              <span className="text-lg font-black text-white tracking-tighter">THEXEN</span>
            )}
          </button>
          <div className="flex items-center gap-2">
            {externalLinks.filter(link => link.image).map((link, idx) =>
              link.url ? (
                <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="w-7 h-7 rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                  <img src={link.image} alt={`Link ${idx + 1}`} className="w-full h-full object-cover" />
                </a>
              ) : (
                <div key={idx} className="w-7 h-7 rounded-lg overflow-hidden">
                  <img src={link.image} alt={`Link ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              )
            )}
          </div>
        </header>
      )}

      {/* PC: 왼쪽 영역 - About / 로고 */}
      {!isMobile && (
        <div className="flex-1 min-w-[60px] z-20 relative">
          <div
            className="absolute"
            style={{ left: `${leftPanelPositionX}%`, top: `${leftPanelPositionY}%`, transform: `translate(-50%, -50%)` }}
          >
            <button
              onClick={() => setShowCompanyModal(true)}
              className="transition-colors hover:opacity-80 cursor-pointer"
              style={{ writingMode: 'vertical-rl' }}
            >
              {headerLogoImage ? (
                <img src={headerLogoImage} alt="Logo" className="max-h-[140px] max-w-8 object-contain" />
              ) : (
                <span className="text-sm font-black text-white tracking-widest">About THEXEN</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 중앙 - 포트폴리오 그리드 (최대 1200px) */}
      <div
        className={`overflow-hidden ${isMobile ? 'flex-1' : 'w-full max-w-[1200px]'} ${viewState === 'expanding' ? 'animate-expand-from-center' : ''}`}
      >
        {isMobile ? (
          <MobileHexGrid products={products} onProductClick={handleProductClick} backgroundColor={gridBackgroundColor} />
        ) : (
          <HexGrid products={products} onProductClick={handleProductClick} backgroundColor={gridBackgroundColor} />
        )}
      </div>

      {/* PC: 오른쪽 영역 - 외부 링크 */}
      {!isMobile && (
        <div className="flex-1 min-w-[60px] z-20 relative">
          <div
            className="absolute"
            style={{ left: `${rightPanelPositionX}%`, top: `${rightPanelPositionY}%`, transform: `translate(-50%, -50%)` }}
          >
            <div className="flex items-center gap-3">
              {externalLinks.filter(link => link.image).map((link, idx) =>
                link.url ? (
                  <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg overflow-hidden hover:opacity-80 transition-opacity border border-white/20">
                    <img src={link.image} alt={`Link ${idx + 1}`} className="w-full h-full object-cover" />
                  </a>
                ) : (
                  <div key={idx} className="w-10 h-10 rounded-lg overflow-hidden border border-white/20">
                    <img src={link.image} alt={`Link ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          <Modal
            product={selectedProduct}
            onClose={handleCloseModal}
            onReturnToLanding={handleReturnToLanding}
            originPosition={clickPosition}
          />
        </Suspense>
      </ErrorBoundary>

      {/* Company Modal */}
      <Suspense fallback={null}>
        <CompanyModal
          isOpen={showCompanyModal}
          onClose={() => setShowCompanyModal(false)}
          onReturnToLanding={handleReturnToLanding}
          images={companyImages}
          description={companyDescription}
        />
      </Suspense>

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
