'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { Product } from '@/lib/types';

interface AdminHexGridProps {
  products: Product[];
  onReorder: (products: Product[]) => void;
  onProductClick: (product: Product) => void;
}

const ITEM_SIZE = 110;
const HORIZONTAL_GAP = 12;
const VERTICAL_GAP = 12;

export default function AdminHexGrid({ products, onReorder, onProductClick }: AdminHexGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(10);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    const updateCols = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const itemWidth = ITEM_SIZE + HORIZONTAL_GAP;
        const newCols = Math.floor((width - ITEM_SIZE / 2) / itemWidth) + 1;
        setCols(Math.max(4, newCols));
      }
    };

    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, []);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.priority - b.priority);
  }, [products]);

  const rows = useMemo(() => {
    const result: { products: Product[]; isOdd: boolean }[] = [];
    let index = 0;
    let rowIndex = 0;

    while (index < sortedProducts.length) {
      const isOdd = rowIndex % 2 === 1;
      const rowCols = isOdd ? cols - 1 : cols;
      const rowProducts = sortedProducts.slice(index, index + rowCols);

      if (rowProducts.length > 0) {
        result.push({ products: rowProducts, isOdd });
      }

      index += rowCols;
      rowIndex++;
    }

    return result;
  }, [sortedProducts, cols]);

  // 제품의 전체 인덱스 계산
  const getProductIndex = (productId: string): number => {
    return sortedProducts.findIndex(p => p.id === productId);
  };

  const handleDragStart = (e: React.DragEvent, productId: string) => {
    setDraggedId(productId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, productId: string) => {
    e.preventDefault();
    if (productId !== draggedId) {
      setDragOverId(productId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const dragIndex = getProductIndex(draggedId);
    const dropIndex = getProductIndex(targetId);

    if (dragIndex === -1 || dropIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    // 순서 변경
    const newProducts = [...sortedProducts];
    const [removed] = newProducts.splice(dragIndex, 1);
    newProducts.splice(dropIndex, 0, removed);

    // 우선순위 재할당
    const updates = newProducts.map((product, index) => ({
      ...product,
      priority: index + 1,
    }));

    onReorder(updates);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto bg-black"
    >
      {/* Instructions */}
      <div className="absolute top-20 left-6 z-10 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-3">
        <p className="text-cyan-400 font-medium text-sm mb-1">순서 변경 모드</p>
        <p className="text-white/60 text-xs">드래그하여 순서 변경 | 클릭하여 수정</p>
      </div>

      <div className="relative py-6 px-8 pt-24">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex justify-center"
            style={{
              gap: HORIZONTAL_GAP,
              marginTop: rowIndex === 0 ? 0 : VERTICAL_GAP,
              paddingLeft: row.isOdd ? (ITEM_SIZE + HORIZONTAL_GAP) / 2 : 0,
              paddingRight: row.isOdd ? (ITEM_SIZE + HORIZONTAL_GAP) / 2 : 0,
            }}
          >
            {row.products.map((product) => {
              const productIndex = getProductIndex(product.id);
              const isDragged = draggedId === product.id;
              const isDragOver = dragOverId === product.id;

              return (
                <div
                  key={product.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, product.id)}
                  onDragOver={(e) => handleDragOver(e, product.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, product.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onProductClick(product)}
                  className={`
                    group relative rounded-full overflow-hidden flex-shrink-0 cursor-pointer
                    transition-all duration-200 ease-out
                    ${isDragged ? 'opacity-50 scale-90' : 'hover:scale-[1.15] hover:z-20'}
                    ${isDragOver ? 'ring-4 ring-cyan-400 scale-110' : ''}
                  `}
                  style={{
                    width: ITEM_SIZE,
                    height: ITEM_SIZE,
                    zIndex: isDragOver ? 100 : rows.length - rowIndex,
                  }}
                >
                  {/* 이미지 */}
                  <Image
                    src={product.images[product.thumbnailIndex] || product.images[0]}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    sizes={`${ITEM_SIZE}px`}
                    draggable={false}
                  />

                  {/* 순서 번호 */}
                  <div className={`
                    absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center
                    text-xs font-bold z-10
                    ${productIndex === 0 ? 'bg-cyan-500 text-black' : 'bg-black/70 text-white'}
                  `}>
                    {productIndex + 1}
                  </div>

                  {/* 호버 시 글로우 효과 */}
                  <div className={`
                    absolute inset-0 rounded-full transition-opacity duration-300 pointer-events-none
                    ${isDragOver ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  `}
                    style={{
                      boxShadow: isDragOver
                        ? '0 0 40px 15px rgba(0,212,255,0.5), inset 0 0 20px rgba(0,212,255,0.2)'
                        : '0 0 30px 10px rgba(255,255,255,0.3), inset 0 0 20px rgba(255,255,255,0.1)',
                    }}
                  />

                  {/* 호버 시 테두리 */}
                  <div className={`
                    absolute inset-0 rounded-full border-2 transition-all duration-300
                    ${isDragOver ? 'border-cyan-400' : 'border-white/0 group-hover:border-white/40'}
                  `} />

                  {/* 드래그 오버 시 안내 */}
                  {isDragOver && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                      <span className="text-cyan-400 text-xs font-medium">이동</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Product count */}
      <div className="fixed bottom-6 left-6 text-white/40 text-sm pointer-events-none">
        <p>총 {products.length}개 포트폴리오</p>
      </div>
    </div>
  );
}
