'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { Product, ViewState } from '@/lib/types';

interface AdminHexGridProps {
  products: Product[];
  onReorder: (products: Product[]) => void;
  onProductClick: (product: Product) => void;
}

interface CircleItem {
  product: Product;
  x: number;
  y: number;
  size: number;
  ring: number;
  index: number;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const BASE_SIZE = 69;
const MIN_SIZE_RATIO = 0.65;
const GAP = 9;

const getSizeForRing = (ring: number, maxRing: number): number => {
  if (maxRing === 0) return BASE_SIZE;
  const t = ring / Math.max(maxRing, 3);
  return BASE_SIZE * (1 - (1 - MIN_SIZE_RATIO) * t);
};

export default function AdminHexGrid({ products, onReorder, onProductClick }: AdminHexGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const viewStateRef = useRef<ViewState>({ offsetX: 0, offsetY: 0, scale: 1 });
  const hoveredRef = useRef<CircleItem | null>(null);
  const renderRequestRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const isReorderingRef = useRef(false);
  const draggedItemRef = useRef<CircleItem | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dpr, setDpr] = useState(1);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const clickStartRef = useRef({ x: 0, y: 0 });

  // Generate circle positions
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
        index: i,
      });
    }

    return items;
  }, [products]);

  const sortedForHitTest = useMemo(() => {
    return [...circleItems].sort((a, b) => a.ring - b.ring);
  }, [circleItems]);

  const renderFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    renderFnRef.current = () => {
      const canvas = canvasRef.current;
      if (!canvas || dimensions.width === 0) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const { offsetX, offsetY, scale } = viewStateRef.current;
      const hovered = hoveredRef.current;
      const dragged = draggedItemRef.current;
      const w = dimensions.width;
      const h = dimensions.height;
      const halfW = w / 2;
      const halfH = h / 2;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0f0f1a';
      ctx.fillRect(0, 0, w, h);

      // Draw grid pattern for admin feel
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 50 * scale;
      const startX = (halfW + offsetX * scale) % gridSize;
      const startY = (halfH + offsetY * scale) % gridSize;
      for (let x = startX; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = startY; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw drop zones when dragging
      if (dragged) {
        circleItems.forEach((item) => {
          if (item.product.id === dragged.product.id) return;

          const screenX = (item.x + offsetX) * scale + halfW;
          const screenY = (item.y + offsetY) * scale + halfH;
          const radius = item.size * scale;

          // Draw drop zone indicator
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }

      // Draw non-dragged items
      for (let i = circleItems.length - 1; i >= 0; i--) {
        const item = circleItems[i];
        if (dragged?.product.id === item.product.id) continue;
        if (hovered?.product.id === item.product.id && !dragged) continue;

        const screenX = (item.x + offsetX) * scale + halfW;
        const screenY = (item.y + offsetY) * scale + halfH;
        const radius = item.size * scale;

        if (screenX < -radius || screenX > w + radius ||
            screenY < -radius || screenY > h + radius) continue;

        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();

        const img = imagesRef.current.get(item.product.id);
        if (img?.complete) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, screenX - radius, screenY - radius, radius * 2, radius * 2);
          ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw priority number
        ctx.fillStyle = item.index === 0 ? '#00d4ff' : 'rgba(255, 255, 255, 0.6)';
        ctx.font = `bold ${Math.max(10, 11 * scale)}px "Pretendard", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${item.index + 1}`, screenX, screenY + radius + 12 * scale);
      }

      // Draw hovered item (when not dragging)
      if (hovered && !dragged) {
        const screenX = (hovered.x + offsetX) * scale + halfW;
        const screenY = (hovered.y + offsetY) * scale + halfH;
        const radius = hovered.size * scale * 1.08;

        ctx.save();
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.restore();

        const img = imagesRef.current.get(hovered.product.id);
        if (img?.complete) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, screenX - radius, screenY - radius, radius * 2, radius * 2);
          ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Label
        const labelY = screenY + radius + 20 * scale;
        ctx.font = `bold ${Math.max(11, 12 * scale)}px "Pretendard", sans-serif`;
        const textWidth = ctx.measureText(hovered.product.name).width;
        const labelWidth = Math.max(textWidth + 24 * scale, 100 * scale);
        const labelHeight = 44 * scale;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.beginPath();
        ctx.roundRect(screenX - labelWidth / 2, labelY - labelHeight / 2, labelWidth, labelHeight, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hovered.product.name, screenX, labelY - 6 * scale);

        ctx.fillStyle = '#00d4ff';
        ctx.font = `${Math.max(9, 10 * scale)}px "Pretendard", sans-serif`;
        ctx.fillText(`#${hovered.index + 1} · ${hovered.product.client}`, screenX, labelY + 10 * scale);
      }

      // Draw dragged item last (on top)
      if (dragged) {
        const screenX = dragOffsetRef.current.x;
        const screenY = dragOffsetRef.current.y;
        const radius = dragged.size * scale * 1.15;

        ctx.save();
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 25;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.restore();

        const img = imagesRef.current.get(dragged.product.id);
        if (img?.complete) {
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, screenX - radius, screenY - radius, radius * 2, radius * 2);
          ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Drag instruction
        ctx.fillStyle = 'rgba(0, 212, 255, 0.9)';
        ctx.font = `bold ${Math.max(10, 11 * scale)}px "Pretendard", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('다른 원 위에 놓으면 순서 교체', screenX, screenY + radius + 20 * scale);
      }
    };
  }, [circleItems, dimensions, dpr]);

  const requestRender = () => {
    if (renderRequestRef.current) return;
    renderRequestRef.current = requestAnimationFrame(() => {
      renderRequestRef.current = null;
      renderFnRef.current();
    });
  };

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    requestRender();
  }, [dimensions, dpr]);

  useEffect(() => {
    requestRender();
  }, [circleItems, dimensions]);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    const circle = findCircleAtPosition(e.clientX, e.clientY);

    if (circle) {
      // Start reordering
      isReorderingRef.current = true;
      draggedItemRef.current = circle;
      const rect = canvasRef.current!.getBoundingClientRect();
      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    } else {
      // Start panning
      isDraggingRef.current = true;
    }

    dragStartRef.current = { x: e.clientX, y: e.clientY };
    clickStartRef.current = { x: e.clientX, y: e.clientY };
    requestRender();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (isReorderingRef.current && draggedItemRef.current) {
      // Update dragged item position
      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      requestRender();
    } else if (isDraggingRef.current) {
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
    if (isReorderingRef.current && draggedItemRef.current) {
      const dx = Math.abs(e.clientX - clickStartRef.current.x);
      const dy = Math.abs(e.clientY - clickStartRef.current.y);

      if (dx < 5 && dy < 5) {
        // It was a click, open edit modal
        onProductClick(draggedItemRef.current.product);
      } else {
        // Check if dropped on another circle
        const dropTarget = findCircleAtPosition(e.clientX, e.clientY);
        if (dropTarget && dropTarget.product.id !== draggedItemRef.current.product.id) {
          // Swap priorities
          const sortedProducts = [...products].sort((a, b) => a.priority - b.priority);
          const dragIndex = draggedItemRef.current.index;
          const dropIndex = dropTarget.index;

          const newProducts = [...sortedProducts];
          const [removed] = newProducts.splice(dragIndex, 1);
          newProducts.splice(dropIndex, 0, removed);

          const updates = newProducts.map((product, index) => ({
            ...product,
            priority: index + 1,
          }));

          onReorder(updates);
        }
      }
    } else if (isDraggingRef.current) {
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
    isReorderingRef.current = false;
    draggedItemRef.current = null;
    requestRender();
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    isReorderingRef.current = false;
    draggedItemRef.current = null;
    if (hoveredRef.current) {
      hoveredRef.current = null;
      requestRender();
    }
  };

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
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-[#0f0f1a] relative">
      <canvas
        ref={canvasRef}
        className={`${isReorderingRef.current ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ touchAction: 'none' }}
      />

      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-3 text-sm">
        <p className="text-cyan-400 font-medium mb-1">순서 변경 모드</p>
        <p className="text-white/60 text-xs">원을 드래그하여 다른 원 위에 놓으면 순서가 바뀝니다</p>
      </div>

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
    </div>
  );
}
