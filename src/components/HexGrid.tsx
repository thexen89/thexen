'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
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

interface GridItem {
  product: Product;
  baseX: number;
  baseY: number;
}

// PC 버전 설정 - 모바일과 동일한 구조, 크기만 다름
const CONFIG = {
  maxSize: 140,
  minSize: 60,
  xRadius: 80,
  yRadius: 150,
  fringeWidth: 120,
  gutter: 10,
};

const ROWS = 15;
const COLS_ODD = 5;
const COLS_EVEN = 4;
const FRICTION = 0.94;
const MIN_VELOCITY = 0.5;

export default function HexGrid({ products, onProductClick }: HexGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const renderRequestRef = useRef<number | null>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dpr, setDpr] = useState(1);

  const offsetRef = useRef({ y: 0 });
  const isDraggingRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef(0);
  const lastMoveTimeRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  // 그리드 생성
  const gridItems = useMemo(() => {
    const items: GridItem[] = [];
    const sortedProducts = [...products].sort((a, b) => a.priority - b.priority);
    const count = sortedProducts.length;

    if (count === 0) return items;

    const positions: { baseX: number; baseY: number }[] = [];
    const baseSpacing = CONFIG.maxSize + CONFIG.gutter;
    const verticalSpacing = baseSpacing * 0.85;

    for (let row = -Math.floor(ROWS / 2); row <= Math.floor(ROWS / 2); row++) {
      const isOddRow = Math.abs(row) % 2 === 1;
      const cols = isOddRow ? COLS_ODD : COLS_EVEN;

      for (let col = 0; col < cols; col++) {
        const colOffset = col - (cols - 1) / 2;
        positions.push({
          baseX: colOffset * baseSpacing,
          baseY: row * verticalSpacing,
        });
      }
    }

    positions.sort((a, b) => {
      const distA = Math.sqrt(a.baseX ** 2 + a.baseY ** 2);
      const distB = Math.sqrt(b.baseX ** 2 + b.baseY ** 2);
      return distA - distB;
    });

    for (let i = 0; i < Math.min(count, positions.length); i++) {
      items.push({
        product: sortedProducts[i],
        baseX: positions[i].baseX,
        baseY: positions[i].baseY,
      });
    }

    return items;
  }, [products]);

  // 버블 변환 - 모바일과 동일한 로직
  const calculateBubbleTransform = useCallback((baseX: number, baseY: number, offsetY: number, centerX: number, centerY: number) => {
    const x = baseX;
    const y = baseY + offsetY;

    const yDistance = Math.abs(y);
    const yDistanceToMiddle = Math.max(0, yDistance - CONFIG.yRadius);

    const xDistance = Math.abs(x);
    const xDistanceToMiddle = Math.max(0, xDistance - CONFIG.xRadius);

    const totalDistanceToMiddle = Math.sqrt(
      Math.pow(xDistanceToMiddle, 2) +
      Math.pow(yDistanceToMiddle, 2)
    );

    let size: number;
    let opacity: number;

    if (totalDistanceToMiddle <= 0) {
      size = CONFIG.maxSize;
      opacity = 1;
    } else if (totalDistanceToMiddle <= CONFIG.fringeWidth) {
      const progress = totalDistanceToMiddle / CONFIG.fringeWidth;
      size = CONFIG.maxSize - (CONFIG.maxSize - CONFIG.minSize) * Math.pow(progress, 0.8);
      opacity = 1 - progress * 0.3;
    } else {
      const outerProgress = Math.min((totalDistanceToMiddle - CONFIG.fringeWidth) / 60, 1);
      size = CONFIG.minSize * (1 - outerProgress * 0.3);
      opacity = Math.max(0.7 - outerProgress * 0.6, 0.1);
    }

    let translateY = 0;
    if (yDistanceToMiddle > 0) {
      const pullStrength = Math.min(yDistanceToMiddle / CONFIG.fringeWidth, 1) * 15;
      translateY = -Math.sign(y) * pullStrength;
    }

    return {
      screenX: centerX + x,
      screenY: centerY + y + translateY,
      size: Math.max(size, 20),
      opacity,
      scale: size / CONFIG.maxSize,
    };
  }, []);

  // 렌더 함수
  const renderFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    renderFnRef.current = () => {
      const canvas = canvasRef.current;
      if (!canvas || dimensions.width === 0) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const w = dimensions.width;
      const h = dimensions.height;
      const centerX = w / 2;
      const centerY = h / 2;
      const offsetY = offsetRef.current.y;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      const itemsWithTransform = gridItems.map((item) => {
        const transformed = calculateBubbleTransform(item.baseX, item.baseY, offsetY, centerX, centerY);
        return { item, ...transformed };
      });

      itemsWithTransform.sort((a, b) => a.size - b.size);

      for (const { item, screenX, screenY, size, opacity, scale } of itemsWithTransform) {
        if (opacity < 0.08 || scale < 0.3) continue;

        const radius = size / 2;

        if (screenX < -radius || screenX > w + radius ||
            screenY < -radius || screenY > h + radius) {
          continue;
        }

        ctx.save();
        ctx.globalAlpha = opacity;

        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();

        const img = imagesRef.current.get(item.product.id);
        if (img?.complete) {
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, screenX - radius, screenY - radius, size, size);
        }

        ctx.restore();
      }

      // 비네트 효과
      const vignetteGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(w, h) * 0.6);
      vignetteGrad.addColorStop(0, 'transparent');
      vignetteGrad.addColorStop(0.5, 'transparent');
      vignetteGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.4)');
      vignetteGrad.addColorStop(0.9, 'rgba(0, 0, 0, 0.8)');
      vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
      ctx.fillStyle = vignetteGrad;
      ctx.fillRect(0, 0, w, h);
    };
  }, [gridItems, dimensions, dpr, calculateBubbleTransform]);

  const requestRender = useCallback(() => {
    if (renderRequestRef.current) return;
    renderRequestRef.current = requestAnimationFrame(() => {
      renderRequestRef.current = null;
      renderFnRef.current();
    });
  }, []);

  // 관성 스크롤
  const animateInertia = useCallback(() => {
    const vy = velocityRef.current;

    if (Math.abs(vy) < MIN_VELOCITY) {
      velocityRef.current = 0;
      animationRef.current = null;
      return;
    }

    offsetRef.current.y += vy;
    velocityRef.current *= FRICTION;

    requestRender();
    animationRef.current = requestAnimationFrame(animateInertia);
  }, [requestRender]);

  // 이미지 로드
  useEffect(() => {
    const size = CONFIG.maxSize * 2;
    products.forEach((product) => {
      if (!imagesRef.current.has(product.id)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = product.images[product.thumbnailIndex] || product.images[0];
        img.onload = () => {
          imagesRef.current.set(product.id, img);
          requestRender();
        };
        img.onerror = () => {
          const placeholder = document.createElement('canvas');
          placeholder.width = size;
          placeholder.height = size;
          const pctx = placeholder.getContext('2d');
          if (pctx) {
            pctx.fillStyle = '#1a1a2e';
            pctx.fillRect(0, 0, size, size);
          }
          const placeholderImg = new Image();
          placeholderImg.src = placeholder.toDataURL();
          imagesRef.current.set(product.id, placeholderImg);
          requestRender();
        };
      }
    });
  }, [products, requestRender]);

  // 리사이즈
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const pixelRatio = window.devicePixelRatio || 1;
        setDpr(pixelRatio);
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 캔버스 설정
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    requestRender();
  }, [dimensions, dpr, requestRender]);

  useEffect(() => {
    requestRender();
  }, [gridItems, dimensions, requestRender]);

  // 아이템 찾기
  const findItemAtPosition = useCallback((clientX: number, clientY: number): { item: GridItem; position: ClickPosition } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const touchX = clientX - rect.left;
    const touchY = clientY - rect.top;
    const w = dimensions.width;
    const h = dimensions.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const offsetY = offsetRef.current.y;

    const itemsWithTransform = gridItems.map((item) => {
      const transformed = calculateBubbleTransform(item.baseX, item.baseY, offsetY, centerX, centerY);
      return { item, ...transformed };
    }).sort((a, b) => b.size - a.size);

    for (const { item, screenX, screenY, size, opacity, scale } of itemsWithTransform) {
      if (opacity < 0.08 || scale < 0.3) continue;

      const radius = size / 2;
      const dist = Math.sqrt((touchX - screenX) ** 2 + (touchY - screenY) ** 2);

      if (dist < radius) {
        return {
          item,
          position: {
            x: rect.left + screenX,
            y: rect.top + screenY,
            size,
          },
        };
      }
    }

    return null;
  }, [dimensions, gridItems, calculateBubbleTransform]);

  // 마우스 이벤트 - 모바일과 동일하게
  const handleMouseDown = (e: React.MouseEvent) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    isDraggingRef.current = true;
    lastTouchRef.current = { x: e.clientX, y: e.clientY };
    touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    velocityRef.current = 0;
    lastMoveTimeRef.current = Date.now();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return; // 드래그 중이 아니면 아무것도 안 함

    const dy = e.clientY - lastTouchRef.current.y;
    offsetRef.current.y += dy;

    const now = Date.now();
    const dt = now - lastMoveTimeRef.current;
    if (dt > 0) {
      velocityRef.current = dy / dt * 16;
    }
    lastMoveTimeRef.current = now;
    lastTouchRef.current = { x: e.clientX, y: e.clientY };

    requestRender();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = Date.now() - touchStartRef.current.time;

    if (distance < 10 && duration < 300) {
      const result = findItemAtPosition(e.clientX, e.clientY);
      if (result) {
        onProductClick(result.item.product, result.position);
      }
    } else {
      if (Math.abs(velocityRef.current) > MIN_VELOCITY) {
        animationRef.current = requestAnimationFrame(animateInertia);
      }
    }
  };

  const handleMouseLeave = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (Math.abs(velocityRef.current) > MIN_VELOCITY) {
        animationRef.current = requestAnimationFrame(animateInertia);
      }
    }
  };

  // 휠 스크롤
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      offsetRef.current.y -= e.deltaY;
      requestRender();
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [requestRender]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />

      <div className="absolute bottom-6 left-6 text-white/40 text-sm">
        <p>드래그: 탐색 | 클릭: 상세보기</p>
      </div>
    </div>
  );
}
