'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Product } from '@/lib/types';

interface MobileHexGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

interface GridItem {
  product: Product;
  baseX: number;
  baseY: number;
}

// 애플워치 스타일 허니컴 그리드 + 피쉬아이 렌즈 효과
const BASE_SIZE = 85; // 기본 아이콘 크기 (더 크게)
const ROWS = 21; // 충분한 행 수 (스크롤용)
const COLS = 5; // 열 수 (3-4 패턴에 맞게)
const FRICTION = 0.95;
const MIN_VELOCITY = 0.1;
const MAX_RADIUS = 220; // 피쉬아이 효과 반경 (더 넓게)
const FISHEYE_STRENGTH = 0.5; // 피쉬아이 강도 (조금 약하게)

export default function MobileHexGrid({ products, onProductClick }: MobileHexGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const renderRequestRef = useRef<number | null>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dpr, setDpr] = useState(1);

  // 스크롤 오프셋 (X, Y 모두)
  const offsetRef = useRef({ x: 0, y: 0 });
  // 드래그 상태
  const isDraggingRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });
  // 관성 스크롤
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastMoveTimeRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  // 터치 시작 위치
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  // 허니컴 그리드 좌표 생성 (3-4-3-4 패턴)
  const gridItems = useMemo(() => {
    const items: GridItem[] = [];
    const sortedProducts = [...products].sort((a, b) => a.priority - b.priority);
    const count = sortedProducts.length;

    if (count === 0) return items;

    // 3-4-3-4 패턴 그리드 생성
    const positions: { baseX: number; baseY: number }[] = [];
    const cellHeight = BASE_SIZE * 0.866; // 벌집 높이 비율

    for (let row = -Math.floor(ROWS / 2); row <= Math.floor(ROWS / 2); row++) {
      const isEvenRow = Math.abs(row) % 2 === 0;
      const colsInRow = isEvenRow ? 3 : 4; // 짝수행 3개, 홀수행 4개
      const rowOffset = isEvenRow ? 0 : -BASE_SIZE * 0.5; // 홀수행은 왼쪽으로 반칸

      for (let col = 0; col < colsInRow; col++) {
        // 중앙 정렬
        const startX = -(colsInRow - 1) * BASE_SIZE / 2;
        positions.push({
          baseX: startX + col * BASE_SIZE + rowOffset,
          baseY: row * cellHeight,
        });
      }
    }

    // 중앙에서 가까운 순으로 정렬
    positions.sort((a, b) => {
      const distA = Math.sqrt(a.baseX ** 2 + a.baseY ** 2);
      const distB = Math.sqrt(b.baseX ** 2 + b.baseY ** 2);
      return distA - distB;
    });

    // 제품 할당
    for (let i = 0; i < Math.min(count, positions.length); i++) {
      items.push({
        product: sortedProducts[i],
        baseX: positions[i].baseX,
        baseY: positions[i].baseY,
      });
    }

    return items;
  }, [products]);

  // 피쉬아이 렌즈 효과 적용
  const applyFisheye = useCallback((baseX: number, baseY: number, offsetX: number, offsetY: number, centerX: number, centerY: number) => {
    const x = baseX + offsetX;
    const y = baseY + offsetY;

    const dx = x;
    const dy = y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return {
        screenX: centerX,
        screenY: centerY,
        scale: 1,
        opacity: 1,
      };
    }

    // 피쉬아이 왜곡
    const normalizedDist = Math.min(distance / MAX_RADIUS, 1.5);
    const distortion = Math.pow(normalizedDist, 1.5) * FISHEYE_STRENGTH;
    const newDistance = distance * (1 + distortion);

    const angle = Math.atan2(dy, dx);
    const screenX = centerX + Math.cos(angle) * newDistance;
    const screenY = centerY + Math.sin(angle) * newDistance;

    // 스케일: 중앙에서 크고 가장자리에서 작음
    const scale = Math.max(0.3, 1 - normalizedDist * 0.6);

    // 투명도: 가장자리에서 페이드 아웃
    const opacity = Math.max(0, 1 - Math.pow(normalizedDist, 2) * 0.8);

    return { screenX, screenY, scale, opacity };
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
      const offset = offsetRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 배경
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // 아이템 그리기 (피쉬아이 효과 적용)
      // 먼저 스케일 작은 것부터 그려서 큰 것이 위에 오도록
      const itemsWithTransform = gridItems.map((item) => {
        const transformed = applyFisheye(item.baseX, item.baseY, offset.x, offset.y, centerX, centerY);
        return { item, ...transformed };
      });

      // 스케일 작은 것부터 그리기 (큰 것이 위에)
      itemsWithTransform.sort((a, b) => a.scale - b.scale);

      itemsWithTransform.forEach(({ item, screenX, screenY, scale, opacity }) => {
        // 투명도가 너무 낮으면 그리지 않음
        if (opacity < 0.05) return;

        const size = BASE_SIZE * scale;
        const radius = size / 2;

        // 화면 밖 체크
        if (screenX < -radius || screenX > w + radius ||
            screenY < -radius || screenY > h + radius) {
          return;
        }

        ctx.save();
        ctx.globalAlpha = opacity;

        // 원 배경
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();

        // 이미지
        const img = imagesRef.current.get(item.product.id);
        if (img?.complete) {
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, screenX - radius, screenY - radius, size, size);
        }

        ctx.restore();

        // 테두리 (투명도 적용)
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // 비네트 효과 (가장자리 어둡게)
      const vignetteGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(w, h) * 0.6);
      vignetteGrad.addColorStop(0, 'transparent');
      vignetteGrad.addColorStop(0.5, 'transparent');
      vignetteGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.5)');
      vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
      ctx.fillStyle = vignetteGrad;
      ctx.fillRect(0, 0, w, h);
    };
  }, [gridItems, dimensions, dpr, applyFisheye]);

  const requestRender = useCallback(() => {
    if (renderRequestRef.current) return;
    renderRequestRef.current = requestAnimationFrame(() => {
      renderRequestRef.current = null;
      renderFnRef.current();
    });
  }, []);

  // 관성 스크롤 (X, Y 모두)
  const animateInertia = useCallback(() => {
    const vx = velocityRef.current.x;
    const vy = velocityRef.current.y;

    if (Math.abs(vx) < MIN_VELOCITY && Math.abs(vy) < MIN_VELOCITY) {
      velocityRef.current = { x: 0, y: 0 };
      animationRef.current = null;
      return;
    }

    offsetRef.current.x += vx;
    offsetRef.current.y += vy;
    velocityRef.current.x *= FRICTION;
    velocityRef.current.y *= FRICTION;

    requestRender();
    animationRef.current = requestAnimationFrame(animateInertia);
  }, [requestRender]);

  // 이미지 로드
  useEffect(() => {
    const size = BASE_SIZE * 2; // 고해상도용
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

  // 아이템 찾기 (피쉬아이 변환된 위치 기준)
  const findItemAtPosition = useCallback((clientX: number, clientY: number) => {
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

    // 스케일 큰 것부터 검사 (위에 그려진 것이 우선)
    const itemsWithTransform = gridItems.map((item) => {
      const transformed = applyFisheye(item.baseX, item.baseY, offset.x, offset.y, centerX, centerY);
      return { item, ...transformed };
    }).sort((a, b) => b.scale - a.scale);

    for (const { item, screenX, screenY, scale, opacity } of itemsWithTransform) {
      if (opacity < 0.05) continue;

      const size = BASE_SIZE * scale;
      const radius = size / 2;
      const dist = Math.sqrt((touchX - screenX) ** 2 + (touchY - screenY) ** 2);

      if (dist < radius) {
        return item;
      }
    }

    return null;
  }, [dimensions, gridItems, applyFisheye]);

  // 터치 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
      velocityRef.current = { x: 0, y: 0 };
      lastMoveTimeRef.current = Date.now();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 1 && isDraggingRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - lastTouchRef.current.x;
      const dy = touch.clientY - lastTouchRef.current.y;

      offsetRef.current.x += dx;
      offsetRef.current.y += dy;

      const now = Date.now();
      const dt = now - lastMoveTimeRef.current;
      if (dt > 0) {
        velocityRef.current.x = dx / dt * 16;
        velocityRef.current.y = dy / dt * 16;
      }
      lastMoveTimeRef.current = now;
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

      requestRender();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      isDraggingRef.current = false;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = Date.now() - touchStartRef.current.time;

      if (distance < 15 && duration < 300) {
        const item = findItemAtPosition(touch.clientX, touch.clientY);
        if (item) {
          onProductClick(item.product);
        }
      } else {
        const speed = Math.sqrt(velocityRef.current.x ** 2 + velocityRef.current.y ** 2);
        if (speed > MIN_VELOCITY) {
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
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastTouchRef.current.x;
    const dy = e.clientY - lastTouchRef.current.y;

    offsetRef.current.x += dx;
    offsetRef.current.y += dy;

    const now = Date.now();
    const dt = now - lastMoveTimeRef.current;
    if (dt > 0) {
      velocityRef.current.x = dx / dt * 16;
      velocityRef.current.y = dy / dt * 16;
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

    if (distance < 15 && duration < 300) {
      const item = findItemAtPosition(e.clientX, e.clientY);
      if (item) {
        onProductClick(item.product);
      }
    } else {
      const speed = Math.sqrt(velocityRef.current.x ** 2 + velocityRef.current.y ** 2);
      if (speed > MIN_VELOCITY) {
        animationRef.current = requestAnimationFrame(animateInertia);
      }
    }
  };

  const handleMouseLeave = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      const speed = Math.sqrt(velocityRef.current.x ** 2 + velocityRef.current.y ** 2);
      if (speed > MIN_VELOCITY) {
        animationRef.current = requestAnimationFrame(animateInertia);
      }
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-black touch-none">
      <canvas
        ref={canvasRef}
        className="cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
}
