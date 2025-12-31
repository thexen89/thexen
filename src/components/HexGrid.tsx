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

const ITEM_SIZE = 90; // 원 크기
const HORIZONTAL_GAP = 60; // 가로 간격
const VERTICAL_GAP = -12; // 세로 간격
const HOVER_SCALE = 1.8; // 호버 시 확대 비율
const PADDING = 60; // 좌우 동일 여백
const MAX_COLS = 6; // 최대 열 개수 (B 스타일 - 한 줄에 6개)

export default function HexGrid({ products, onProductClick }: HexGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(10);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const updateCols = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const availableWidth = width - (PADDING * 2);
        const itemWidth = ITEM_SIZE + HORIZONTAL_GAP;
        const calculatedCols = Math.floor(availableWidth / itemWidth);
        setCols(Math.min(MAX_COLS, Math.max(3, calculatedCols)));
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
      const rowCols = isOdd ? cols + 1 : cols;
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
      <div className="relative mx-auto" style={{ width: 'fit-content', paddingTop: '40px', paddingBottom: '10vh' }}>
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex"
            style={{
              gap: HORIZONTAL_GAP,
              marginTop: rowIndex === 0 ? 0 : VERTICAL_GAP,
              marginLeft: row.isOdd ? -(ITEM_SIZE + HORIZONTAL_GAP) / 2 : 0,
            }}
          >
            {row.products.map((product) => {
              const isHovered = hoveredId === product.id;

              return (
                <button
                  key={product.id}
                  onClick={(e) => handleClick(product, e)}
                  onMouseEnter={() => setHoveredId(product.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="group relative rounded-full overflow-hidden flex-shrink-0 focus:outline-none"
                  style={{
                    width: ITEM_SIZE,
                    height: ITEM_SIZE,
                    zIndex: isHovered ? 100 : 1,
                    transform: isHovered ? `scale(${HOVER_SCALE})` : 'scale(1)',
                    transition: 'transform 0.2s ease-out, z-index 0s',
                  }}
                >
                  {/* 이미지 */}
                  <Image
                    src={product.images[product.thumbnailIndex] || product.images[0]}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes={`${Math.round(ITEM_SIZE * HOVER_SCALE)}px`}
                    quality={90}
                  />

                  {/* 그림자 + 테두리 */}
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none transition-all duration-200"
                    style={{
                      boxShadow: isHovered
                        ? '0 12px 40px rgba(0, 0, 0, 0.8), 0 6px 20px rgba(0, 0, 0, 0.6), 0 0 60px rgba(0, 0, 0, 0.4)'
                        : '0 4px 20px rgba(0, 0, 0, 0.6), 0 2px 10px rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
