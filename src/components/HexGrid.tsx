'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
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
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const CIRCLE_SIZE = 55; // All circles same size
const CIRCLE_GAP = 8; // Gap between circles

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

  const [hoveredCircle, setHoveredCircle] = useState<CircleItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [clickStart, setClickStart] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Generate Apple Watch honeycomb style positions
  // Uses offset coordinates for hexagonal grid but renders circles
  const generateHoneycombPositions = useCallback((count: number): CircleItem[] => {
    const items: CircleItem[] = [];
    const sortedProducts = [...products].sort((a, b) => a.priority - b.priority);

    if (count === 0) return items;

    // Hexagonal grid spacing
    const diameter = CIRCLE_SIZE * 2;
    const horizontalSpacing = diameter + CIRCLE_GAP;
    const verticalSpacing = (diameter + CIRCLE_GAP) * 0.866; // sqrt(3)/2 for hex grid

    let index = 0;
    let ring = 0;

    // Center position
    if (index < count) {
      items.push({
        product: sortedProducts[index],
        x: 0,
        y: 0,
        size: CIRCLE_SIZE,
      });
      index++;
    }

    // Spiral outward in hexagonal pattern
    while (index < count) {
      ring++;

      // 6 directions for hexagonal grid
      const directions = [
        { dx: 1, dy: 0 },      // right
        { dx: 0.5, dy: 1 },    // bottom-right
        { dx: -0.5, dy: 1 },   // bottom-left
        { dx: -1, dy: 0 },     // left
        { dx: -0.5, dy: -1 },  // top-left
        { dx: 0.5, dy: -1 },   // top-right
      ];

      // Start position for this ring (top-right)
      let q = ring;
      let r = 0;

      for (let side = 0; side < 6; side++) {
        for (let step = 0; step < ring; step++) {
          if (index >= count) break;

          // Convert hex coordinates to pixel position
          const x = q * horizontalSpacing + (r % 2) * (horizontalSpacing / 2);
          const y = r * verticalSpacing;

          items.push({
            product: sortedProducts[index],
            x,
            y,
            size: CIRCLE_SIZE,
          });
          index++;

          // Move to next hex in this direction
          const dir = directions[side];
          q += dir.dx;
          r += dir.dy;
        }
        if (index >= count) break;
      }
    }

    return items;
  }, [products]);

  // Alternative: Pure spiral hex grid (like Apple Watch)
  const generateAppleWatchPositions = useCallback((count: number): CircleItem[] => {
    const items: CircleItem[] = [];
    const sortedProducts = [...products].sort((a, b) => a.priority - b.priority);

    if (count === 0) return items;

    const diameter = CIRCLE_SIZE * 2;
    const spacing = diameter + CIRCLE_GAP;

    // Hex grid with offset rows (Apple Watch style)
    // Calculate positions using axial coordinates
    const hexToPixel = (q: number, r: number) => {
      const x = spacing * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
      const y = spacing * (3 / 2 * r);
      return { x, y };
    };

    // Spiral pattern: center, then rings
    const spiralCoords: { q: number; r: number }[] = [];

    // Center
    spiralCoords.push({ q: 0, r: 0 });

    // Generate rings
    let ring = 1;
    while (spiralCoords.length < count) {
      // Start at top of ring and go clockwise
      let q = 0;
      let r = -ring;

      // 6 sides of the hexagon ring
      const moves = [
        { dq: 1, dr: 0 },   // move right
        { dq: 0, dr: 1 },   // move down-right
        { dq: -1, dr: 1 },  // move down-left
        { dq: -1, dr: 0 },  // move left
        { dq: 0, dr: -1 },  // move up-left
        { dq: 1, dr: -1 },  // move up-right
      ];

      for (let side = 0; side < 6; side++) {
        for (let step = 0; step < ring; step++) {
          if (spiralCoords.length >= count) break;
          spiralCoords.push({ q, r });
          q += moves[side].dq;
          r += moves[side].dr;
        }
        if (spiralCoords.length >= count) break;
      }
      ring++;
      if (ring > 20) break; // Safety limit
    }

    // Convert to items
    for (let i = 0; i < Math.min(count, spiralCoords.length); i++) {
      const coord = spiralCoords[i];
      const pos = hexToPixel(coord.q, coord.r);
      items.push({
        product: sortedProducts[i],
        x: pos.x,
        y: pos.y,
        size: CIRCLE_SIZE,
      });
    }

    return items;
  }, [products]);

  const circleItems = generateAppleWatchPositions(products.length);

  // Load images
  useEffect(() => {
    products.forEach((product) => {
      if (!imagesRef.current.has(product.id)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = product.image;
        img.onload = () => {
          imagesRef.current.set(product.id, img);
        };
        img.onerror = () => {
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
  }, [products]);

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

  // Draw circle with image
  const drawCircle = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      item: CircleItem,
      isHovered: boolean
    ) => {
      const { x, y, size, product } = item;
      const { offsetX, offsetY, scale } = viewState;

      const screenX = (x + offsetX) * scale + dimensions.width / 2;
      const screenY = (y + offsetY) * scale + dimensions.height / 2;
      const currentSize = size * scale * (isHovered ? 1.15 : 1);
      const radius = currentSize;

      // Skip if off screen
      if (
        screenX < -currentSize * 2 ||
        screenX > dimensions.width + currentSize * 2 ||
        screenY < -currentSize * 2 ||
        screenY > dimensions.height + currentSize * 2
      ) {
        return;
      }

      // Draw shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10 * scale;
      ctx.shadowOffsetX = 2 * scale;
      ctx.shadowOffsetY = 2 * scale;

      ctx.beginPath();
      ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();
      ctx.restore();

      // Draw image if loaded
      const img = imagesRef.current.get(product.id);
      if (img && img.complete) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.clip();

        const imgSize = radius * 2;
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
      ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isHovered ? '#00d4ff' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = isHovered ? 3 : 1;
      ctx.stroke();

      // Draw hover effects
      if (isHovered) {
        // Glow
        ctx.save();
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Label background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        const labelY = screenY + radius + 15 * scale;
        const labelHeight = 36 * scale;
        const labelWidth = Math.max(ctx.measureText(product.name).width + 20 * scale, 80 * scale);

        ctx.beginPath();
        ctx.roundRect(
          screenX - labelWidth / 2,
          labelY - labelHeight / 2,
          labelWidth,
          labelHeight,
          6 * scale
        );
        ctx.fill();

        // Product name
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(11, 12 * scale)}px "Pretendard", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(product.name, screenX, labelY - 5 * scale);

        // Client name
        ctx.fillStyle = '#00d4ff';
        ctx.font = `${Math.max(9, 10 * scale)}px "Pretendard", sans-serif`;
        ctx.fillText(product.client, screenX, labelY + 9 * scale);
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

      // Background
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Draw all circles (back to front based on y position for proper overlap)
      const sortedForDraw = [...circleItems].sort((a, b) => {
        if (hoveredCircle?.product.id === a.product.id) return 1;
        if (hoveredCircle?.product.id === b.product.id) return -1;
        return a.y - b.y;
      });

      sortedForDraw.forEach((item) => {
        const isHovered = hoveredCircle?.product.id === item.product.id;
        drawCircle(ctx, item, isHovered);
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [circleItems, hoveredCircle, viewState, dimensions, drawCircle]);

  // Find circle at position
  const findCircleAtPosition = useCallback(
    (clientX: number, clientY: number): CircleItem | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      const worldX = (mouseX - dimensions.width / 2) / viewState.scale - viewState.offsetX;
      const worldY = (mouseY - dimensions.height / 2) / viewState.scale - viewState.offsetY;

      // Check all items, prioritize by distance
      let closest: CircleItem | null = null;
      let closestDist = Infinity;

      for (const item of circleItems) {
        const dx = worldX - item.x;
        const dy = worldY - item.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < item.size && distance < closestDist) {
          closest = item;
          closestDist = distance;
        }
      }

      return closest;
    },
    [circleItems, viewState, dimensions]
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
      const circle = findCircleAtPosition(e.clientX, e.clientY);
      setHoveredCircle(circle);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = Math.abs(e.clientX - clickStart.x);
      const dy = Math.abs(e.clientY - clickStart.y);

      if (dx < 5 && dy < 5) {
        const circle = findCircleAtPosition(e.clientX, e.clientY);
        if (circle) {
          onProductClick(circle.product);
        }
      }
    }
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoveredCircle(null);
  };

  // Wheel handler for zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewState.scale * delta));

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
        const circle = findCircleAtPosition(
          e.changedTouches[0].clientX,
          e.changedTouches[0].clientY
        );
        if (circle) {
          onProductClick(circle.product);
        }
      }
    }
    touchRef.current = null;
    touchStartRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-[#0a0a12]"
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
          className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-xl transition-colors backdrop-blur-sm"
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
          className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-xl transition-colors backdrop-blur-sm"
        >
          -
        </button>
        <button
          onClick={() =>
            setViewState({ offsetX: 0, offsetY: 0, scale: 1 })
          }
          className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-[10px] transition-colors backdrop-blur-sm"
        >
          Reset
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-6 left-6 text-white/40 text-sm">
        <p>드래그: 이동 | 스크롤: 확대/축소 | 클릭: 상세보기</p>
      </div>
    </div>
  );
}
