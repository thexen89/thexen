'use client';

import { useState, useEffect } from 'react';
import HexGrid from '@/components/HexGrid';
import MobileHexGrid from '@/components/MobileHexGrid';
import Modal from '@/components/Modal';
import { Product } from '@/lib/types';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

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

  return (
    <main className="h-screen w-screen overflow-hidden relative">
      {/* Header - PC */}
      {!isMobile && (
        <header className="absolute top-0 left-0 right-0 z-10 p-6 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto">
            <h1 className="text-2xl font-bold text-white tracking-wider">
              THE<span className="text-[#00d4ff]">X</span>EN
            </h1>
            <p className="text-xs text-white/50 mt-1">ODM/OEM 굿즈 전문 제조</p>
          </div>

          <nav className="pointer-events-auto flex items-center gap-4">
            <a
              href="/admin"
              className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              관리자
            </a>
            <a
              href="mailto:contact@thexen.co.kr"
              className="px-4 py-2 bg-[#00d4ff] text-black text-sm font-medium rounded-lg hover:bg-[#00b8e0] transition-colors"
            >
              문의하기
            </a>
          </nav>
        </header>
      )}

      {/* Header - Mobile */}
      {isMobile && (
        <header className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto">
            <h1 className="text-lg font-bold text-white tracking-wider">
              THE<span className="text-[#00d4ff]">X</span>EN
            </h1>
          </div>

          <nav className="pointer-events-auto flex items-center gap-2">
            <a
              href="/admin"
              className="p-2 text-white/70"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </a>
            <a
              href="mailto:contact@thexen.co.kr"
              className="p-2 bg-[#00d4ff] text-black rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
          </nav>
        </header>
      )}

      {/* Hex Grid - PC or Mobile */}
      {isMobile ? (
        <MobileHexGrid products={products} onProductClick={setSelectedProduct} />
      ) : (
        <HexGrid products={products} onProductClick={setSelectedProduct} />
      )}

      {/* Product Modal */}
      <Modal product={selectedProduct} onClose={() => setSelectedProduct(null)} />

      {/* Product count - PC only */}
      {!isMobile && (
        <div className="absolute top-20 left-6 text-white/40 text-sm">
          {products.length}개의 포트폴리오
        </div>
      )}
    </main>
  );
}
