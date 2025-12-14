'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { Product } from '@/lib/types';

interface ClickPosition {
  x: number;
  y: number;
  size: number;
}

interface HexGridProps {
  products: Product[];
  onProductClick: (product: Product, position?: ClickPosition) => void;
}

const ITEM_SIZE = 110;
const HORIZONTAL_GAP = 12;
const VERTICAL_GAP = 12;

export default function HexGrid({ products, onProductClick }: HexGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(10);

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

  const rows = useMemo(() => {
    const sortedProducts = [...products].sort((a, b) => a.priority - b.priority);
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
  }, [products, cols]);

  const handleClick = (product: Product, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onProductClick(product, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      size: ITEM_SIZE,
    });
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto bg-black"
    >
      <div className="relative py-6 px-2">
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
            {row.products.map((product) => (
              <button
                key={product.id}
                onClick={(e) => handleClick(product, e)}
                className="group relative rounded-full overflow-hidden flex-shrink-0 transition-all duration-300 ease-out hover:scale-[1.15] hover:z-20 focus:outline-none"
                style={{
                  width: ITEM_SIZE,
                  height: ITEM_SIZE,
                  zIndex: rows.length - rowIndex,
                }}
              >
                {/* 이미지 */}
                <Image
                  src={product.images[product.thumbnailIndex] || product.images[0]}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  sizes={`${ITEM_SIZE}px`}
                />

                {/* 호버 시 글로우 효과 */}
                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    boxShadow: '0 0 30px 10px rgba(255,255,255,0.3), inset 0 0 20px rgba(255,255,255,0.1)',
                  }}
                />

                {/* 호버 시 테두리 */}
                <div className="absolute inset-0 rounded-full border-2 border-white/0 group-hover:border-white/40 transition-all duration-300" />
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="fixed bottom-6 left-6 text-white/40 text-sm pointer-events-none">
        <p>스크롤: 탐색 | 클릭: 상세보기</p>
      </div>
    </div>
  );
}
