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
  onReorder?: (products: Product[]) => void;
  backgroundColor?: string;
}

const ITEM_SIZE = 90; // 원 크기
const HORIZONTAL_GAP = 60; // 가로 간격
const VERTICAL_GAP = -12; // 세로 간격
const HOVER_RADIUS = 200; // 마우스 영향 반경
const MAX_SCALE = 1.8; // 최대 확대 비율
const MIN_SCALE = 1.0; // 최소 비율
const PADDING = 60; // 좌우 동일 여백
const MAX_COLS = 6; // 최대 열 개수 (B 스타일 - 한 줄에 6개)

export default function HexGrid({ products, onProductClick, onReorder, backgroundColor = '#000000' }: HexGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(10);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // 드래그 상태 (onReorder가 있을 때만 사용)
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedId) return; // 드래그 중에는 hover 효과 비활성화
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left + containerRef.current.scrollLeft,
        y: e.clientY - rect.top + containerRef.current.scrollTop,
      });
    }
  }, [draggedId]);

  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
  }, []);

  // 아이템별 스케일 계산
  const getItemScale = useCallback((itemRef: HTMLButtonElement | null): number => {
    if (!mousePos || !itemRef || !containerRef.current || draggedId) return MIN_SCALE;

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
  }, [mousePos, draggedId]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.priority - b.priority);
  }, [products]);

  const rows = useMemo(() => {
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
  }, [sortedProducts, cols]);

  const handleClick = (product: Product, e: React.MouseEvent<HTMLButtonElement>) => {
    if (draggedId) return; // 드래그 중 클릭 방지
    const rect = e.currentTarget.getBoundingClientRect();
    onProductClick(product, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      size: ITEM_SIZE,
    });
  };

  // 드래그 핸들러
  const handleDragStart = useCallback((e: React.DragEvent, productId: string) => {
    setDraggedId(productId);
    setMousePos(null);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, productId: string) => {
    e.preventDefault();
    if (draggedId && productId !== draggedId) {
      setDragOverId(productId);
    }
  }, [draggedId]);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId || !onReorder) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const dragIndex = sortedProducts.findIndex(p => p.id === draggedId);
    const dropIndex = sortedProducts.findIndex(p => p.id === targetId);

    if (dragIndex === -1 || dropIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const newProducts = [...sortedProducts];
    const [removed] = newProducts.splice(dragIndex, 1);
    newProducts.splice(dropIndex, 0, removed);

    const updates = newProducts.map((product, i) => ({
      ...product,
      priority: i + 1,
    }));

    onReorder(updates);
    setDraggedId(null);
    setDragOverId(null);
  }, [draggedId, sortedProducts, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

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
      className="w-full h-full overflow-y-auto scrollbar-hide"
      style={{ backgroundColor }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
              const scale = getItemScale(itemRefs.current.get(product.id) || null);
              const isScaled = scale > 1.05;
              const isDragged = draggedId === product.id;
              const isDragOver = dragOverId === product.id;
              const productIndex = sortedProducts.findIndex(p => p.id === product.id);

              return (
                <button
                  key={product.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(product.id, el);
                  }}
                  draggable={!!onReorder}
                  onDragStart={onReorder ? (e) => handleDragStart(e, product.id) : undefined}
                  onDragOver={onReorder ? (e) => handleDragOver(e, product.id) : undefined}
                  onDragLeave={onReorder ? handleDragLeave : undefined}
                  onDrop={onReorder ? (e) => handleDrop(e, product.id) : undefined}
                  onDragEnd={onReorder ? handleDragEnd : undefined}
                  onClick={(e) => handleClick(product, e)}
                  className={`group relative rounded-full flex-shrink-0 focus:outline-none ${
                    isDragged ? 'opacity-50 scale-90' : ''
                  } ${isDragOver ? 'ring-4 ring-white' : ''}`}
                  style={{
                    width: ITEM_SIZE,
                    height: ITEM_SIZE,
                    zIndex: isDragOver ? 200 : Math.round(scale * 100),
                    transform: isDragged ? 'scale(0.9)' : isDragOver ? 'scale(1.3)' : `scale(${scale})`,
                    transition: onReorder && (isDragged || isDragOver)
                      ? 'transform 0.2s ease-out, opacity 0.2s ease-out'
                      : 'transform 0.15s ease-out, box-shadow 0.15s ease-out, z-index 0s',
                    boxShadow: isDragOver
                      ? '0 0 40px 15px rgba(255,255,255,0.5)'
                      : isScaled
                        ? '6px 8px 30px rgba(0, 0, 0, 0.7), 3px 4px 15px rgba(0, 0, 0, 0.5)'
                        : '4px 6px 15px rgba(0, 0, 0, 0.5), 2px 3px 8px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {/* 이미지 */}
                  <div className="absolute inset-0 rounded-full overflow-hidden">
                    <Image
                      src={product.images[product.thumbnailIndex] || product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes={`${Math.round(ITEM_SIZE * MAX_SCALE)}px`}
                      quality={90}
                      draggable={false}
                    />
                  </div>

                  {/* 테두리 */}
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      border: isDragOver ? '2px solid white' : '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  />

                  {/* 순서 번호 (어드민 모드) */}
                  {onReorder && (
                    <div className={`
                      absolute top-0 left-0 w-6 h-6 rounded-full flex items-center justify-center
                      text-[10px] font-bold z-10 pointer-events-none
                      ${productIndex === 0 ? 'bg-white text-black' : 'bg-black/70 text-white'}
                    `}>
                      {productIndex + 1}
                    </div>
                  )}

                  {/* 드래그 오버 안내 */}
                  {isDragOver && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full pointer-events-none">
                      <span className="text-white text-xs font-medium">이동</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
