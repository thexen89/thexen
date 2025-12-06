'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { Product } from '@/lib/types';

interface HexGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

interface CircleItem {
  product: Product;
  x: number;
  y: number;
  size: number;
  ring: number;
}

const BASE_SIZE = 60;
const MIN_SIZE_RATIO = 0.65;
const GAP = 8;

// 링에 따른 크기 계산 (중앙이 크고 바깥이 작음)
const getSizeForRing = (ring: number, maxRing: number): number => {
  if (maxRing === 0) return BASE_SIZE;
  const t = ring / Math.max(maxRing, 3);
  return BASE_SIZE * (1 - (1 - MIN_SIZE_RATIO) * t);
};

export default function HexGrid({ products, onProductClick }: HexGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const circleCanvasRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const hoveredRef = useRef<CircleItem | null>(null);
  const renderRequestRef = useRef<number | null>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dpr, setDpr] = useState(1);

  // Memoize circle positions - only recalculate when products change
  const circleItems = useMemo(() => {
    const items: CircleItem[] = [];
    const sortedProducts = [...products].sort((a, b) => a.priority - b.priority);
    const count = products.length;

    if (count === 0) return items;

    const coords: { q: number; r: number; ring: number }[] = [];
    coords.push({ q: 0, r: 0, ring: 0 });

    let ring = 1;
    while (coords.length < count) {
      let q = 0;
      let r = -ring;

      const moves = [
        { dq: 1, dr: 0 },
        { dq: 0, dr: 1 },
        { dq: -1, dr: 1 },
        { dq: -1, dr: 0 },
        { dq: 0, dr: -1 },
        { dq: 1, dr: -1 },
      ];

      for (let side = 0; side < 6; side++) {
        for (let step = 0; step < ring; step++) {
          if (coords.length >= count) break;
          coords.push({ q, r, ring });
          q += moves[side].dq;
          r += moves[side].dr;
        }
        if (coords.length >= count) break;
      }
      ring++;
      if (ring > 20) break;
    }

    // 최대 링 계산
    const maxRing = coords.length > 0 ? coords[coords.length - 1].ring : 0;

    // 원 중심 간 거리 = 지름 + GAP
    const d = BASE_SIZE * 2 + GAP;

    for (let i = 0; i < Math.min(count, coords.length); i++) {
      const coord = coords[i];

      // 표준 hexagonal axial → pixel 변환
      const x = d * (coord.q + coord.r * 0.5);
      const y = d * (coord.r * Math.sqrt(3) / 2);

      items.push({
        product: sortedProducts[i],
        x,
        y,
        size: getSizeForRing(coord.ring, maxRing),
        ring: coord.ring,
      });
    }

    return items;
  }, [products]);

  // Precomputed sorted items for hit testing (center items = higher priority)
  const sortedForHitTest = useMemo(() => {
    return [...circleItems].sort((a, b) => a.ring - b.ring);
  }, [circleItems]);

  // Render function stored in ref to avoid dependency issues
  const renderFnRef = useRef<() => void>(() => {});

  // Update render function when dependencies change
  useEffect(() => {
    renderFnRef.current = () => {
      const canvas = canvasRef.current;
      if (!canvas || dimensions.width === 0) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const hovered = hoveredRef.current;
      const w = dimensions.width;
      const h = dimensions.height;
      const halfW = w / 2;
      const halfH = h / 2;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // Draw non-hovered items first
      for (let i = circleItems.length - 1; i >= 0; i--) {
        const item = circleItems[i];
        if (hovered?.product.id === item.product.id) continue;

        const screenX = item.x + halfW;
        const screenY = item.y + halfH;
        const radius = item.size;

        // Frustum culling
        if (screenX < -radius || screenX > w + radius ||
            screenY < -radius || screenY > h + radius) continue;

        // Draw cached circular image
        const cachedCanvas = circleCanvasRef.current.get(item.product.id);
        if (cachedCanvas) {
          ctx.drawImage(cachedCanvas, screenX - radius, screenY - radius, radius * 2, radius * 2);
        } else {
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.fillStyle = '#1a1a2e';
          ctx.fill();
        }

        // Simple border
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw hovered item last with effects
      if (hovered) {
        const screenX = hovered.x + halfW;
        const screenY = hovered.y + halfH;
        const radius = hovered.size * 1.12;

        // Glow
        ctx.save();
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.restore();

        // Draw cached circular image
        const cachedCanvas = circleCanvasRef.current.get(hovered.product.id);
        if (cachedCanvas) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(cachedCanvas, screenX - radius, screenY - radius, radius * 2, radius * 2);
          ctx.restore();
        }

        // Border
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Label
        const labelY = screenY + radius + 16;
        ctx.font = 'bold 12px "Pretendard", sans-serif';
        const textWidth = ctx.measureText(hovered.product.name).width;
        const labelWidth = Math.max(textWidth + 20, 80);
        const labelHeight = 36;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.beginPath();
        ctx.roundRect(screenX - labelWidth / 2, labelY - labelHeight / 2, labelWidth, labelHeight, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hovered.product.name, screenX, labelY - 5);

        ctx.fillStyle = '#00d4ff';
        ctx.font = '10px "Pretendard", sans-serif';
        ctx.fillText(hovered.product.client, screenX, labelY + 9);
      }
    };
  }, [circleItems, dimensions, dpr]);

  // Request render - lightweight function
  const requestRender = () => {
    if (renderRequestRef.current) return;
    renderRequestRef.current = requestAnimationFrame(() => {
      renderRequestRef.current = null;
      renderFnRef.current();
    });
  };

  // Load images and pre-render to circular canvases
  useEffect(() => {
    const size = BASE_SIZE * 2 * 2; // 2x for retina

    circleItems.forEach((item) => {
      if (circleCanvasRef.current.has(item.product.id)) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = item.product.image;
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = size;
        offscreen.height = size;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, 0, 0, size, size);
        }
        circleCanvasRef.current.set(item.product.id, offscreen);
        requestRender();
      };
      img.onerror = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = size;
        offscreen.height = size;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#1a1a2e';
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        circleCanvasRef.current.set(item.product.id, offscreen);
        requestRender();
      };
    });
  }, [circleItems]);

  // Handle resize
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

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    requestRender();
  }, [dimensions, dpr]);

  // Trigger render when items change
  useEffect(() => {
    requestRender();
  }, [circleItems, dimensions]);

  // Find circle at position - use precomputed sorted array
  const findCircleAtPosition = (clientX: number, clientY: number): CircleItem | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const worldX = mouseX - dimensions.width / 2;
    const worldY = mouseY - dimensions.height / 2;

    for (const item of sortedForHitTest) {
      const dx = worldX - item.x;
      const dy = worldY - item.y;
      if (dx * dx + dy * dy < item.size * item.size) {
        return item;
      }
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left - dimensions.width / 2;
    const mouseY = e.clientY - rect.top - dimensions.height / 2;

    let found: CircleItem | null = null;
    for (const item of sortedForHitTest) {
      const dx = mouseX - item.x;
      const dy = mouseY - item.y;
      if (dx * dx + dy * dy < item.size * item.size) {
        found = item;
        break;
      }
    }

    if (found?.product.id !== hoveredRef.current?.product.id) {
      hoveredRef.current = found;
      requestRender();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const circle = findCircleAtPosition(e.clientX, e.clientY);
    if (circle) {
      onProductClick(circle.product);
    }
  };

  const handleMouseLeave = () => {
    if (hoveredRef.current) {
      hoveredRef.current = null;
      requestRender();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length === 1) {
      const circle = findCircleAtPosition(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      if (circle) onProductClick(circle.product);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="cursor-pointer"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
        onTouchEnd={handleTouchEnd}
      />

      <div className="absolute bottom-6 left-6 text-white/40 text-sm">
        <p>클릭: 상세보기</p>
      </div>
    </div>
  );
}
