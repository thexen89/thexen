'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
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
const HOVER_RADIUS = 200; // 마우스 영향 반경
const MAX_SCALE = 2; // 최대 확대 비율 1.5배
const MIN_SCALE = 1.0; // 최소 비율
const PADDING = 60; // 좌우 동일 여백
const MAX_COLS = 6; // 최대 열 개수 (B 스타일 - 한 줄에 6개)

export default function HexGrid({ products, onProductClick }: HexGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(10);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const updateCols = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const availableWidth = width - (PADDING * 2); // 좌우 동일 패딩
        const itemWidth = ITEM_SIZE + HORIZONTAL_GAP;
        const calculatedCols = Math.floor(availableWidth / itemWidth);
        // 최대 열 개수 제한으로 오른쪽 여백 확보
        setCols(Math.min(MAX_COLS, Math.max(3, calculatedCols)));
      }
    };

    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left + containerRef.current.scrollLeft,
        y: e.clientY - rect.top + containerRef.current.scrollTop,
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
  }, []);

  // 아이템별 스케일 계산
  const getItemScale = useCallback((itemRef: HTMLButtonElement | null): number => {
    if (!mousePos || !itemRef || !containerRef.current) return MIN_SCALE;

    const rect = itemRef.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    // 아이템 중심 좌표 (컨테이너 기준)
    const itemCenterX = rect.left - containerRect.left + containerRef.current.scrollLeft + rect.width / 2;
    const itemCenterY = rect.top - containerRect.top + containerRef.current.scrollTop + rect.height / 2;

    // 마우스와의 거리
    const distance = Math.sqrt(
      Math.pow(mousePos.x - itemCenterX, 2) +
      Math.pow(mousePos.y - itemCenterY, 2)
    );

    if (distance > HOVER_RADIUS) return MIN_SCALE;

    // 거리에 따른 스케일 (가까울수록 크게)
    const ratio = 1 - (distance / HOVER_RADIUS);
    const eased = ratio * ratio; // easeIn 효과
    return MIN_SCALE + (MAX_SCALE - MIN_SCALE) * eased;
  }, [mousePos]);

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

  // 스케일 업데이트를 위한 강제 리렌더링
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (mousePos) {
      const id = requestAnimationFrame(() => forceUpdate(n => n + 1));
      return () => cancelAnimationFrame(id);
    }
  }, [mousePos]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto bg-black"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative mx-auto" style={{ width: 'fit-content', paddingTop: '10vh', paddingBottom: '10vh' }}>
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
              const scale = getItemScale(itemRefs.current.get(product.id) || null);

              return (
                <button
                  key={product.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(product.id, el);
                  }}
                  onClick={(e) => handleClick(product, e)}
                  className="group relative rounded-full overflow-hidden flex-shrink-0 focus:outline-none"
                  style={{
                    width: ITEM_SIZE,
                    height: ITEM_SIZE,
                    zIndex: Math.round(scale * 100),
                    transform: `scale(${scale})`,
                    transition: 'transform 0.15s ease-out, z-index 0s',
                  }}
                >
                  {/* 이미지 */}
                  <Image
                    src={product.images[product.thumbnailIndex] || product.images[0]}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes={`${ITEM_SIZE}px`}
                  />

                  {/* 글로우 효과 (스케일에 따라) */}
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-150"
                    style={{
                      boxShadow: '0 0 30px 10px rgba(255,255,255,0.3), inset 0 0 20px rgba(255,255,255,0.1)',
                      opacity: Math.max(0, (scale - 1.05) / 0.2),
                    }}
                  />

                  {/* 테두리 (스케일에 따라) */}
                  <div
                    className="absolute inset-0 rounded-full border-2 transition-all duration-150"
                    style={{
                      borderColor: `rgba(255, 255, 255, ${Math.max(0, (scale - 1.05) / 0.2) * 0.4})`,
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
