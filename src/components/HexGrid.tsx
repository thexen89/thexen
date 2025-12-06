'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { Product, ViewState } from '@/lib/types';

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

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const BASE_SIZE = 69;
const MIN_SIZE_RATIO = 0.65;
const GAP = 9;

// Calculate size based on ring
const getSizeForRing = (ring: number, maxRing: number): number => {
  if (maxRing === 0) return BASE_SIZE;
  const t = ring / Math.max(maxRing, 3);
  return BASE_SIZE * (1 - (1 - MIN_SIZE_RATIO) * t);
};

export default function HexGrid({ products, onProductClick }: HexGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const viewStateRef = useRef<ViewState>({ offsetX: 0, offsetY: 0, scale: 1 });
  const hoveredRef = useRef<CircleItem | null>(null);
  const renderRequestRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dpr, setDpr] = useState(1);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const clickStartRef = useRef({ x: 0, y: 0 });

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

    const maxRing = Math.max(...coords.map(c => c.ring));

    for (let i = 0; i < Math.min(count, coords.length); i++) {
      const coord = coords[i];
      const size = getSizeForRing(coord.ring, maxRing);
      const innerSize = coord.ring > 0 ? getSizeForRing(coord.ring - 1, maxRing) : size;
      const avgSize = (size + innerSize) / 2;
      const spacing = avgSize * 2 + GAP;

      const x = spacing * (Math.sqrt(3) * coord.q + Math.sqrt(3) / 2 * coord.r);
      const y = spacing * (3 / 2 * coord.r);

      items.push({
        product: sortedProducts[i],
        x,
        y,
        size,
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

      const { offsetX, offsetY, scale } = viewStateRef.current;
      const hovered = hoveredRef.current;
      const w = dimensions.width;
      const h = dimensions.height;
      const halfW = w / 2;
      const halfH = h / 2;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // Draw non-hovered items first (no shadow for performance)
      for (let i = circleItems.length - 1; i >= 0; i--) {
        const item = circleItems[i];
        if (hovered?.product.id === item.product.id) continue;

        const screenX = (item.x + offsetX) * scale + halfW;
        const screenY = (item.y + offsetY) * scale + halfH;
        const radius = item.size * scale;

        // Frustum culling
        if (screenX < -radius || screenX > w + radius ||
            screenY < -radius || screenY > h + radius) continue;

        // Background
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();

        // Image
        const img = imagesRef.current.get(item.product.id);
        if (img?.complete) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, screenX - radius, screenY - radius, radius * 2, radius * 2);
          ctx.restore();
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
        const screenX = (hovered.x + offsetX) * scale + halfW;
        const screenY = (hovered.y + offsetY) * scale + halfH;
        const radius = hovered.size * scale * 1.12;

        // Glow shadow
        ctx.save();
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.restore();

        // Image
        const img = imagesRef.current.get(hovered.product.id);
        if (img?.complete) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, screenX - radius, screenY - radius, radius * 2, radius * 2);
          ctx.restore();
        }

        // Border
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Label
        const labelY = screenY + radius + 16 * scale;
        ctx.font = `bold ${Math.max(11, 12 * scale)}px "Pretendard", sans-serif`;
        const textWidth = ctx.measureText(hovered.product.name).width;
        const labelWidth = Math.max(textWidth + 20 * scale, 80 * scale);
        const labelHeight = 36 * scale;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.beginPath();
        ctx.roundRect(screenX - labelWidth / 2, labelY - labelHeight / 2, labelWidth, labelHeight, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hovered.product.name, screenX, labelY - 5 * scale);

        ctx.fillStyle = '#00d4ff';
        ctx.font = `${Math.max(9, 10 * scale)}px "Pretendard", sans-serif`;
        ctx.fillText(hovered.product.client, screenX, labelY + 9 * scale);
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

  // Load images once
  useEffect(() => {
    products.forEach((product) => {
      if (!imagesRef.current.has(product.id)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = product.image;
        img.onload = () => {
          imagesRef.current.set(product.id, img);
          requestRender();
        };
        img.onerror = () => {
          const placeholder = document.createElement('canvas');
          placeholder.width = 200;
          placeholder.height = 200;
          const pctx = placeholder.getContext('2d');
          if (pctx) {
            pctx.fillStyle = '#1a1a2e';
            pctx.fillRect(0, 0, 200, 200);
          }
          const placeholderImg = new Image();
          placeholderImg.src = placeholder.toDataURL();
          imagesRef.current.set(product.id, placeholderImg);
          requestRender();
        };
      }
    });
  }, [products]);

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
    const { offsetX, offsetY, scale } = viewStateRef.current;
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const worldX = (mouseX - dimensions.width / 2) / scale - offsetX;
    const worldY = (mouseY - dimensions.height / 2) / scale - offsetY;

    for (const item of sortedForHitTest) {
      const dx = worldX - item.x;
      const dy = worldY - item.y;
      if (dx * dx + dy * dy < item.size * item.size) {
        return item;
      }
    }
    return null;
  };

  // Mouse handlers - use refs to avoid re-renders
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    clickStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const { scale } = viewStateRef.current;

      viewStateRef.current.offsetX += dx / scale;
      viewStateRef.current.offsetY += dy / scale;

      dragStartRef.current = { x: e.clientX, y: e.clientY };
      requestRender();
    } else {
      const circle = findCircleAtPosition(e.clientX, e.clientY);
      if (circle?.product.id !== hoveredRef.current?.product.id) {
        hoveredRef.current = circle;
        requestRender();
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      const dx = Math.abs(e.clientX - clickStartRef.current.x);
      const dy = Math.abs(e.clientY - clickStartRef.current.y);

      if (dx < 5 && dy < 5) {
        const circle = findCircleAtPosition(e.clientX, e.clientY);
        if (circle) {
          onProductClick(circle.product);
        }
      }
    }
    isDraggingRef.current = false;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    if (hoveredRef.current) {
      hoveredRef.current = null;
      requestRender();
    }
  };

  // Wheel event - store dimensions in ref for event handler
  const dimensionsRef = useRef(dimensions);
  dimensionsRef.current = dimensions;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const dims = dimensionsRef.current;
      const { scale, offsetX, offsetY } = viewStateRef.current;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * delta));

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - dims.width / 2) / scale - offsetX;
      const worldY = (mouseY - dims.height / 2) / scale - offsetY;

      viewStateRef.current = {
        offsetX: (mouseX - dims.width / 2) / newScale - worldX,
        offsetY: (mouseY - dims.height / 2) / newScale - worldY,
        scale: newScale,
      };

      requestRender();
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  // Touch handlers
  const touchRef = useRef<{ x: number; y: number; distance: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, distance: 0 };
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      touchRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        distance: getTouchDistance(e.touches),
      };
      touchStartRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchRef.current) return;

    const { scale } = viewStateRef.current;

    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchRef.current.x;
      const dy = e.touches[0].clientY - touchRef.current.y;

      viewStateRef.current.offsetX += dx / scale;
      viewStateRef.current.offsetY += dy / scale;

      touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, distance: 0 };
      requestRender();
    } else if (e.touches.length === 2) {
      const newDistance = getTouchDistance(e.touches);
      const delta = newDistance / touchRef.current.distance;
      viewStateRef.current.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * delta));

      touchRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        distance: newDistance,
      };
      requestRender();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length === 1 && touchStartRef.current) {
      const dx = Math.abs(e.changedTouches[0].clientX - touchStartRef.current.x);
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);

      if (dx < 10 && dy < 10) {
        const circle = findCircleAtPosition(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        if (circle) onProductClick(circle.product);
      }
    }
    touchRef.current = null;
    touchStartRef.current = null;
  };

  const handleZoom = (factor: number) => {
    viewStateRef.current.scale = Math.max(
      MIN_SCALE,
      Math.min(MAX_SCALE, viewStateRef.current.scale * factor)
    );
    requestRender();
  };

  const handleReset = () => {
    viewStateRef.current = { offsetX: 0, offsetY: 0, scale: 1 };
    requestRender();
  };

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
      />

      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
        <button
          onClick={() => handleZoom(1.2)}
          className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-xl transition-colors backdrop-blur-sm"
        >
          +
        </button>
        <button
          onClick={() => handleZoom(1 / 1.2)}
          className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-xl transition-colors backdrop-blur-sm"
        >
          -
        </button>
        <button
          onClick={handleReset}
          className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-[10px] transition-colors backdrop-blur-sm"
        >
          Reset
        </button>
      </div>

      <div className="absolute bottom-6 left-6 text-white/40 text-sm">
        <p>드래그: 이동 | 스크롤: 확대/축소 | 클릭: 상세보기</p>
      </div>
    </div>
  );
}
