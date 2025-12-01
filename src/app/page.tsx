'use client';

import { useState, useEffect } from 'react';
import HexGrid from '@/components/HexGrid';
import Modal from '@/components/Modal';
import { Product } from '@/lib/types';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      {/* Header */}
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

      {/* Hex Grid */}
      <HexGrid products={products} onProductClick={setSelectedProduct} />

      {/* Product Modal */}
      <Modal product={selectedProduct} onClose={() => setSelectedProduct(null)} />

      {/* Product count */}
      <div className="absolute top-20 left-6 text-white/40 text-sm">
        {products.length}개의 포트폴리오
      </div>
    </main>
  );
}
