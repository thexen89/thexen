'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Product } from '@/lib/types';

interface AdminMobileHexGridProps {
  products: Product[];
  onReorder: (products: Product[]) => void;
  onProductClick: (product: Product) => void;
}

interface GridItem {
  product: Product;
  baseX: number;
  baseY: number;
  index: number;
}

// 애플워치 스타일 버블 UI 설정
const CONFIG = {
  maxSize: 76,
  minSize: 36,
  xRadius: 40,
  yRadius: 80,
  fringeWidth: 70,
  gutter: 5,
};

const ROWS = 25;
const FRICTION = 0.92;
const MIN_VELOCITY = 0.5;
const X_SPRING_BACK = 0.85;

export default function AdminMobileHexGrid({ products, onReorder, onProductClick }: AdminMobileHexGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const renderRequestRef = useRef<number | null>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dpr, setDpr] = useState(1);

  const offsetRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastMoveTimeRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  // 롱프레스 및 드래그 순서 변경 상태
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isReorderModeRef = useRef(false);
  const draggedItemRef = useRef<GridItem | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.priority - b.priority);
  }, [products]);

  // 허니컴 그리드 좌표 생성
  const gridItems = useMemo(() => {
    const items: GridItem[] = [];
    const count = sortedProducts.length;

    if (count === 0) return items;

    const positions: { baseX: number; baseY: number }[] = [];
    const baseSpacing = CONFIG.maxSize + CONFIG.gutter;
    const verticalSpacing = baseSpacing * 0.85;

    for (let row = -Math.floor(ROWS / 2); row <= Math.floor(ROWS / 2); row++) {
      const isOddRow = Math.abs(row) % 2 === 1;
      const cols = isOddRow ? 4 : 3;

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
        index: i,
      });
    }

    return items;
  }, [sortedProducts]);

  const calculateBubbleTransform = useCallback((baseX: number, baseY: number, offsetX: number, offsetY: number, centerX: number, centerY: number) => {
    const x = baseX;
    const y = baseY + offsetY;
    const xInfluence = baseX + offsetX * 0.3;

    const yDistance = Math.abs(y);
    const yDistanceToMiddle = Math.max(0, yDistance - CONFIG.yRadius);
    const xDistance = Math.abs(xInfluence);
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
      const offset = offsetRef.current;
      const dragged = draggedItemRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      const itemsWithTransform = gridItems.map((item) => {
        const transformed = calculateBubbleTransform(item.baseX, item.baseY, offset.x, offset.y, centerX, centerY);
        return { item, ...transformed };
      });

      itemsWithTransform.sort((a, b) => a.size - b.size);

      itemsWithTransform.forEach(({ item, screenX, screenY, size, opacity, scale }) => {
        if (opacity < 0.08 || scale < 0.3) return;

        const isDragged = dragged?.product.id === item.product.id;
        if (isDragged) return; // 드래그 중인 아이템은 나중에 그림

        const radius = size / 2;

        if (screenX < -radius || screenX > w + radius ||
            screenY < -radius || screenY > h + radius) {
          return;
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

        // 순서 번호 표시
        if (scale > 0.5) {
          const numRadius = 10;
          ctx.save();
          ctx.beginPath();
          ctx.arc(screenX - radius + numRadius + 4, screenY - radius + numRadius + 4, numRadius, 0, Math.PI * 2);
          ctx.fillStyle = item.index === 0 ? '#00d4ff' : 'rgba(0, 0, 0, 0.7)';
          ctx.fill();
          ctx.fillStyle = item.index === 0 ? '#000' : '#fff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${item.index + 1}`, screenX - radius + numRadius + 4, screenY - radius + numRadius + 4);
          ctx.restore();
        }

        if (scale > 0.5) {
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 12 * scale;
          ctx.shadowOffsetY = 4 * scale;
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = 'transparent';
          ctx.stroke();
          ctx.restore();
        }
      });

      // 드래그 중인 아이템 그리기 (가장 위에)
      if (dragged) {
        const transformed = calculateBubbleTransform(dragged.baseX, dragged.baseY, offset.x, offset.y, centerX, centerY);
        const { screenX, screenY, size } = transformed;
        const radius = size / 2 * 1.2; // 살짝 크게

        ctx.save();
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();

        const img = imagesRef.current.get(dragged.product.id);
        if (img?.complete) {
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, screenX - radius, screenY - radius, radius * 2, radius * 2);
        }

        ctx.restore();

        // 드래그 중 테두리
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // 마스킹
      const maskRadius = Math.min(w, h) * 0.48;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.arc(centerX, centerY, maskRadius, 0, Math.PI * 2, true);
      ctx.fill();

      // 순서 변경 모드 안내
      if (reorderMode) {
        ctx.fillStyle = 'rgba(0, 212, 255, 0.9)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('순서 변경 모드', centerX, 40);
        ctx.font = '10px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText('다른 아이콘 위로 드래그하세요', centerX, 56);
      }
    };
  }, [gridItems, dimensions, dpr, calculateBubbleTransform, reorderMode]);

  const requestRender = useCallback(() => {
    if (renderRequestRef.current) return;
    renderRequestRef.current = requestAnimationFrame(() => {
      renderRequestRef.current = null;
      renderFnRef.current();
    });
  }, []);

  const animateInertia = useCallback(() => {
    const vy = velocityRef.current.y;

    const newX = offsetRef.current.x * X_SPRING_BACK;
    if (Math.abs(newX) < 1) {
      offsetRef.current.x = 0;
    } else {
      offsetRef.current.x = newX;
    }

    if (Math.abs(vy) < MIN_VELOCITY && Math.abs(offsetRef.current.x) < 1) {
      velocityRef.current = { x: 0, y: 0 };
      animationRef.current = null;
      return;
    }

    offsetRef.current.y += vy;
    velocityRef.current.y *= FRICTION;

    requestRender();
    animationRef.current = requestAnimationFrame(animateInertia);
  }, [requestRender]);

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
  }, [dimensions, dpr, requestRender]);

  useEffect(() => {
    requestRender();
  }, [gridItems, dimensions, requestRender]);

  const findItemAtPosition = useCallback((clientX: number, clientY: number): GridItem | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const touchX = clientX - rect.left;
    const touchY = clientY - rect.top;
    const w = dimensions.width;
    const h = dimensions.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const offset = offsetRef.current;

    const itemsWithTransform = gridItems.map((item) => {
      const transformed = calculateBubbleTransform(item.baseX, item.baseY, offset.x, offset.y, centerX, centerY);
      return { item, ...transformed };
    }).sort((a, b) => b.size - a.size);

    for (const { item, screenX, screenY, size, opacity, scale } of itemsWithTransform) {
      if (opacity < 0.08 || scale < 0.3) continue;

      const radius = size / 2;
      const dist = Math.sqrt((touchX - screenX) ** 2 + (touchY - screenY) ** 2);

      if (dist < radius) {
        return item;
      }
    }

    return null;
  }, [dimensions, gridItems, calculateBubbleTransform]);

  // 터치 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      isDraggingRef.current = true;
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      velocityRef.current = { x: 0, y: 0 };
      lastMoveTimeRef.current = Date.now();

      // 롱프레스 감지 (순서 변경 모드)
      const item = findItemAtPosition(touch.clientX, touch.clientY);
      if (item) {
        longPressTimerRef.current = setTimeout(() => {
          isReorderModeRef.current = true;
          draggedItemRef.current = item;
          setReorderMode(true);
          setDraggedIndex(item.index);
          requestRender();
        }, 500);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (e.touches.length === 0) {
      isDraggingRef.current = false;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = Date.now() - touchStartRef.current.time;

      // 드래그 순서 변경 완료
      if (isReorderModeRef.current && draggedItemRef.current) {
        const dropTarget = findItemAtPosition(touch.clientX, touch.clientY);
        if (dropTarget && dropTarget.product.id !== draggedItemRef.current.product.id) {
          // 순서 변경 실행
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

        isReorderModeRef.current = false;
        draggedItemRef.current = null;
        setReorderMode(false);
        setDraggedIndex(null);
        requestRender();
        return;
      }

      if (distance < 15 && duration < 300) {
        const item = findItemAtPosition(touch.clientX, touch.clientY);
        if (item) {
          onProductClick(item.product);
        }
      } else {
        if (Math.abs(velocityRef.current.y) > MIN_VELOCITY || Math.abs(offsetRef.current.x) > 1) {
          animationRef.current = requestAnimationFrame(animateInertia);
        }
      }
    }
  };

  // 마우스 이벤트
  const handleMouseDown = (e: React.MouseEvent) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    isDraggingRef.current = true;
    lastTouchRef.current = { x: e.clientX, y: e.clientY };
    touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    velocityRef.current = { x: 0, y: 0 };
    lastMoveTimeRef.current = Date.now();

    // 롱프레스 감지
    const item = findItemAtPosition(e.clientX, e.clientY);
    if (item) {
      longPressTimerRef.current = setTimeout(() => {
        isReorderModeRef.current = true;
        draggedItemRef.current = item;
        setReorderMode(true);
        setDraggedIndex(item.index);
        requestRender();
      }, 500);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    // 움직임이 있으면 롱프레스 취소
    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      if (longPressTimerRef.current && !isReorderModeRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    const moveDx = e.clientX - lastTouchRef.current.x;
    const moveDy = e.clientY - lastTouchRef.current.y;

    offsetRef.current.x = Math.max(-100, Math.min(100, offsetRef.current.x + moveDx));
    offsetRef.current.y += moveDy;

    const now = Date.now();
    const dt = now - lastMoveTimeRef.current;
    if (dt > 0) {
      velocityRef.current.x = 0;
      velocityRef.current.y = moveDy / dt * 16;
    }
    lastMoveTimeRef.current = now;
    lastTouchRef.current = { x: e.clientX, y: e.clientY };

    requestRender();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    // 드래그 순서 변경 완료
    if (isReorderModeRef.current && draggedItemRef.current) {
      const dropTarget = findItemAtPosition(e.clientX, e.clientY);
      if (dropTarget && dropTarget.product.id !== draggedItemRef.current.product.id) {
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

      isReorderModeRef.current = false;
      draggedItemRef.current = null;
      setReorderMode(false);
      setDraggedIndex(null);
      requestRender();
      return;
    }

    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = Date.now() - touchStartRef.current.time;

    if (distance < 15 && duration < 300) {
      const item = findItemAtPosition(e.clientX, e.clientY);
      if (item) {
        onProductClick(item.product);
      }
    } else {
      if (Math.abs(velocityRef.current.y) > MIN_VELOCITY || Math.abs(offsetRef.current.x) > 1) {
        animationRef.current = requestAnimationFrame(animateInertia);
      }
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false;

      if (isReorderModeRef.current) {
        isReorderModeRef.current = false;
        draggedItemRef.current = null;
        setReorderMode(false);
        setDraggedIndex(null);
      }

      if (Math.abs(velocityRef.current.y) > MIN_VELOCITY || Math.abs(offsetRef.current.x) > 1) {
        animationRef.current = requestAnimationFrame(animateInertia);
      }
    }
  };

  // 터치 이벤트를 non-passive로 등록
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      // 움직임이 있으면 롱프레스 취소
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          if (longPressTimerRef.current && !isReorderModeRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
      }

      if (e.touches.length === 1 && isDraggingRef.current) {
        const touch = e.touches[0];
        const moveDx = touch.clientX - lastTouchRef.current.x;
        const moveDy = touch.clientY - lastTouchRef.current.y;

        offsetRef.current.x = Math.max(-100, Math.min(100, offsetRef.current.x + moveDx));
        offsetRef.current.y += moveDy;

        const now = Date.now();
        const dt = now - lastMoveTimeRef.current;
        if (dt > 0) {
          velocityRef.current.x = 0;
          velocityRef.current.y = moveDy / dt * 16;
        }
        lastMoveTimeRef.current = now;
        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

        requestRender();
      }
    };

    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => canvas.removeEventListener('touchmove', handleTouchMove);
  }, [requestRender]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-black touch-none relative">
      <canvas
        ref={canvasRef}
        className="cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />

      {/* 안내 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <p className="text-white/40 text-xs">길게 누르면 순서 변경</p>
      </div>
    </div>
  );
}
