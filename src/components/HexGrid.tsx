'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Product, ViewState } from '@/lib/types';
import { generateSpiralPositions, getHexVertices } from '@/lib/hexLayout';

interface HexGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

interface HexItem {
  product: Product;
  x: number;
  y: number;
  q: number;
  r: number;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
const HEX_SIZE_BASE = 80;
const HEX_GAP = 4;

export default function HexGrid({ products, onProductClick }: HexGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const animationRef = useRef<number>();

  const [viewState, setViewState] = useState<ViewState>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  });

  const [hoveredHex, setHoveredHex] = useState<HexItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [clickStart, setClickStart] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Sort products by priority and generate hex positions
  const sortedProducts = [...products].sort((a, b) => a.priority - b.priority);
  const hexSize = HEX_SIZE_BASE + HEX_GAP;
  const positions = generateSpiralPositions(sortedProducts.length, hexSize);

  const hexItems: HexItem[] = sortedProducts.map((product, index) => ({
    product,
    x: positions[index]?.x || 0,
    y: positions[index]?.y || 0,
    q: positions[index]?.q || 0,
    r: positions[index]?.r || 0,
  }));

  // Load images
  useEffect(() => {
    sortedProducts.forEach((product) => {
      if (!imagesRef.current.has(product.id)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = product.image;
        img.onload = () => {
          imagesRef.current.set(product.id, img);
        };
        img.onerror = () => {
          // Create placeholder for failed images
          const placeholder = document.createElement('canvas');
          placeholder.width = 200;
          placeholder.height = 200;
          const ctx = placeholder.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, 200, 200);
            ctx.fillStyle = '#4a4a6a';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(product.name, 100, 100);
          }
          const placeholderImg = new Image();
          placeholderImg.src = placeholder.toDataURL();
          imagesRef.current.set(product.id, placeholderImg);
        };
      }
    });
  }, [sortedProducts]);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
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

  // Draw hexagon with image
  const drawHex = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      hexItem: HexItem,
      isHovered: boolean
    ) => {
      const { x, y, product } = hexItem;
      const { offsetX, offsetY, scale } = viewState;

      const screenX = (x + offsetX) * scale + dimensions.width / 2;
      const screenY = (y + offsetY) * scale + dimensions.height / 2;
      const currentSize = HEX_SIZE_BASE * scale * (isHovered ? 1.08 : 1);

      // Skip if off screen
      if (
        screenX < -currentSize * 2 ||
        screenX > dimensions.width + currentSize * 2 ||
        screenY < -currentSize * 2 ||
        screenY > dimensions.height + currentSize * 2
      ) {
        return;
      }

      const vertices = getHexVertices(screenX, screenY, currentSize);

      // Create hex path
      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      ctx.closePath();

      // Draw background
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();

      // Draw image if loaded
      const img = imagesRef.current.get(product.id);
      if (img && img.complete) {
        ctx.save();
        ctx.clip();

        const imgSize = currentSize * 1.8;
        ctx.drawImage(
          img,
          screenX - imgSize / 2,
          screenY - imgSize / 2,
          imgSize,
          imgSize
        );

        ctx.restore();
      }

      // Draw border
      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      ctx.closePath();
      ctx.strokeStyle = isHovered ? '#00d4ff' : '#2a2a4a';
      ctx.lineWidth = isHovered ? 3 : 1.5;
      ctx.stroke();

      // Draw hover overlay
      if (isHovered) {
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
          ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();

        const gradient = ctx.createRadialGradient(
          screenX,
          screenY,
          0,
          screenX,
          screenY,
          currentSize
        );
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0.3)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw product name
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${14 * scale}px "Pretendard", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Background for text
        const textY = screenY + currentSize * 0.6;
        const textMetrics = ctx.measureText(product.name);
        const padding = 8 * scale;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(
          screenX - textMetrics.width / 2 - padding,
          textY - 10 * scale,
          textMetrics.width + padding * 2,
          20 * scale
        );

        ctx.fillStyle = '#ffffff';
        ctx.fillText(product.name, screenX, textY);

        // Draw client name
        ctx.font = `${11 * scale}px "Pretendard", sans-serif`;
        ctx.fillStyle = '#00d4ff';
        ctx.fillText(product.client, screenX, textY + 18 * scale);
      }
    },
    [viewState, dimensions]
  );

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Draw background
      ctx.fillStyle = '#0f0f1a';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Draw grid pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 50 * viewState.scale;
      const offsetGridX = (viewState.offsetX * viewState.scale) % gridSize;
      const offsetGridY = (viewState.offsetY * viewState.scale) % gridSize;

      for (let x = offsetGridX; x < dimensions.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, dimensions.height);
        ctx.stroke();
      }
      for (let y = offsetGridY; y < dimensions.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(dimensions.width, y);
        ctx.stroke();
      }

      // Draw hexagons (from outer to inner for proper layering)
      const sortedForDraw = [...hexItems].sort(
        (a, b) => b.product.priority - a.product.priority
      );

      sortedForDraw.forEach((hexItem) => {
        const isHovered = hoveredHex?.product.id === hexItem.product.id;
        if (!isHovered) {
          drawHex(ctx, hexItem, false);
        }
      });

      // Draw hovered hex last (on top)
      if (hoveredHex) {
        drawHex(ctx, hoveredHex, true);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [hexItems, hoveredHex, viewState, dimensions, drawHex]);

  // Find hex at position
  const findHexAtPosition = useCallback(
    (clientX: number, clientY: number): HexItem | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      // Convert to world coordinates
      const worldX = (mouseX - dimensions.width / 2) / viewState.scale - viewState.offsetX;
      const worldY = (mouseY - dimensions.height / 2) / viewState.scale - viewState.offsetY;

      // Find closest hex
      for (const hexItem of hexItems) {
        const dx = worldX - hexItem.x;
        const dy = worldY - hexItem.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < HEX_SIZE_BASE * 0.9) {
          return hexItem;
        }
      }

      return null;
    },
    [hexItems, viewState, dimensions]
  );

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setClickStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      setViewState((prev) => ({
        ...prev,
        offsetX: prev.offsetX + dx / prev.scale,
        offsetY: prev.offsetY + dy / prev.scale,
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    } else {
      const hex = findHexAtPosition(e.clientX, e.clientY);
      setHoveredHex(hex);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = Math.abs(e.clientX - clickStart.x);
      const dy = Math.abs(e.clientY - clickStart.y);

      // If it was a click (not a drag)
      if (dx < 5 && dy < 5) {
        const hex = findHexAtPosition(e.clientX, e.clientY);
        if (hex) {
          onProductClick(hex.product);
        }
      }
    }
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoveredHex(null);
  };

  // Wheel handler for zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewState.scale * delta));

    // Zoom towards mouse position
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - dimensions.width / 2) / viewState.scale - viewState.offsetX;
    const worldY = (mouseY - dimensions.height / 2) / viewState.scale - viewState.offsetY;

    const newOffsetX = (mouseX - dimensions.width / 2) / newScale - worldX;
    const newOffsetY = (mouseY - dimensions.height / 2) / newScale - worldY;

    setViewState({
      offsetX: newOffsetX,
      offsetY: newOffsetY,
      scale: newScale,
    });
  };

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
      touchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        distance: 0,
      };
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
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

    if (e.touches.length === 1) {
      // Pan
      const dx = e.touches[0].clientX - touchRef.current.x;
      const dy = e.touches[0].clientY - touchRef.current.y;

      setViewState((prev) => ({
        ...prev,
        offsetX: prev.offsetX + dx / prev.scale,
        offsetY: prev.offsetY + dy / prev.scale,
      }));

      touchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        distance: 0,
      };
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const newDistance = getTouchDistance(e.touches);
      const delta = newDistance / touchRef.current.distance;

      const newScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, viewState.scale * delta)
      );

      setViewState((prev) => ({
        ...prev,
        scale: newScale,
      }));

      touchRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        distance: newDistance,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length === 1 && touchStartRef.current) {
      const dx = Math.abs(e.changedTouches[0].clientX - touchStartRef.current.x);
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);

      if (dx < 10 && dy < 10) {
        const hex = findHexAtPosition(
          e.changedTouches[0].clientX,
          e.changedTouches[0].clientY
        );
        if (hex) {
          onProductClick(hex.product);
        }
      }
    }
    touchRef.current = null;
    touchStartRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-[#0f0f1a]"
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
        <button
          onClick={() =>
            setViewState((prev) => ({
              ...prev,
              scale: Math.min(MAX_SCALE, prev.scale * 1.2),
            }))
          }
          className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white text-xl transition-colors"
        >
          +
        </button>
        <button
          onClick={() =>
            setViewState((prev) => ({
              ...prev,
              scale: Math.max(MIN_SCALE, prev.scale / 1.2),
            }))
          }
          className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white text-xl transition-colors"
        >
          -
        </button>
        <button
          onClick={() =>
            setViewState({ offsetX: 0, offsetY: 0, scale: 1 })
          }
          className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white text-xs transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-6 left-6 text-white/50 text-sm">
        <p>드래그: 이동 | 스크롤: 확대/축소 | 클릭: 상세보기</p>
      </div>
    </div>
  );
}
