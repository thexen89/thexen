'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Product } from '@/lib/types';

interface MobileHexGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

interface CircleItem {
  product: Product;
  baseX: number;
  baseY: number;
  index: number;
}

// 애플워치 스타일 상수
const BASE_CIRCLE_SIZE = 70; // 기본 원 크기
const MIN_SCALE = 0.5; // 최소 스케일
const MAX_SCALE = 1.5; // 최대 스케일
const CIRCLE_GAP = 12; // 원 사이 간격
const FRICTION = 0.92; // 관성 마찰 계수
const MIN_VELOCITY = 0.5; // 최소 속도 (이 이하면 정지)

export default function MobileHexGrid({ products, onProductClick }: MobileHexGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const renderRequestRef = useRef<number | null>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dpr, setDpr] = useState(1);

  // 뷰포트 오프셋 (드래그로 이동)
  const offsetRef = useRef({ x: 0, y: 0 });
  // 줌 레벨
  const zoomRef = useRef(1);
  // 드래그 상태
  const isDraggingRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });
  // 관성 스크롤
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastMoveTimeRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  // 터치 시작 위치 (클릭 감지용)
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  // 핀치 줌
  const initialPinchDistanceRef = useRef(0);
  const initialZoomRef = useRef(1);

  // 벌집 배치 계산 (axial 좌표계 기반 스파이럴)
  const circleItems = useMemo(() => {
    const items: CircleItem[] = [];
    const sortedProducts = [...products].sort((a, b) => a.priority - b.priority);
    const count = sortedProducts.length;

    if (count === 0) return items;

    // axial 좌표 생성 (스파이럴 배치)
    const coords: { q: number; r: number }[] = [];
    coords.push({ q: 0, r: 0 });

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
          coords.push({ q, r });
          q += moves[side].dq;
          r += moves[side].dr;
        }
        if (coords.length >= count) break;
      }
      ring++;
      if (ring > 30) break;
    }

    // axial → pixel 변환
    const d = BASE_CIRCLE_SIZE + CIRCLE_GAP;

    for (let i = 0; i < Math.min(count, coords.length); i++) {
      const coord = coords[i];
      // Hex grid axial to pixel
      const x = d * (coord.q + coord.r * 0.5);
      const y = d * (coord.r * Math.sqrt(3) / 2);

      items.push({
        product: sortedProducts[i],
        baseX: x,
        baseY: y,
        index: i,
      });
    }

    return items;
  }, [products]);

  // 화면 중앙으로부터의 거리에 따른 크기 계산 (애플워치 스타일)
  const getScaleForPosition = useCallback((screenX: number, screenY: number, centerX: number, centerY: number) => {
    const dx = screenX - centerX;
    const dy = screenY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = Math.min(centerX, centerY) * 1.5;

    // 중앙에 가까울수록 크게, 멀수록 작게
    const t = Math.min(distance / maxDistance, 1);
    const scale = 1 - t * (1 - MIN_SCALE);

    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
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
      const zoom = zoomRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 배경
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // 원들 그리기 (뒤에서부터 - z-order)
      const itemsWithScreenPos = circleItems.map((item) => {
        const screenX = (item.baseX * zoom) + centerX + offset.x;
        const screenY = (item.baseY * zoom) + centerY + offset.y;
        const scale = getScaleForPosition(screenX, screenY, centerX, centerY);
        const radius = (BASE_CIRCLE_SIZE / 2) * zoom * scale;

        return { ...item, screenX, screenY, radius, scale };
      });

      // 크기순 정렬 (작은 것부터 그리기 = 큰 게 위에)
      itemsWithScreenPos.sort((a, b) => a.scale - b.scale);

      itemsWithScreenPos.forEach((item) => {
        const { screenX, screenY, radius, scale, product } = item;

        // 화면 밖이면 스킵
        if (screenX < -radius * 2 || screenX > w + radius * 2 ||
            screenY < -radius * 2 || screenY > h + radius * 2) return;

        // 너무 작으면 스킵
        if (radius < 10) return;

        // 원 배경
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();

        // 이미지
        const img = imagesRef.current.get(product.id);
        if (img?.complete) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, screenX - radius, screenY - radius, radius * 2, radius * 2);
          ctx.restore();
        }

        // 테두리 (scale에 따라 투명도 조절)
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + scale * 0.2})`;
        ctx.lineWidth = 1 + scale;
        ctx.stroke();

        // 중앙에 가까운 원은 글로우 효과
        if (scale > 0.85) {
          ctx.save();
          ctx.shadowColor = '#00d4ff';
          ctx.shadowBlur = 10 * (scale - 0.85) * 10;
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 212, 255, ${(scale - 0.85) * 3})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      });

      // 중앙 포커스 인디케이터
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, BASE_CIRCLE_SIZE * zoom * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    };
  }, [circleItems, dimensions, dpr, getScaleForPosition]);

  const requestRender = useCallback(() => {
    if (renderRequestRef.current) return;
    renderRequestRef.current = requestAnimationFrame(() => {
      renderRequestRef.current = null;
      renderFnRef.current();
    });
  }, []);

  // 관성 스크롤 애니메이션
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
          // placeholder
          const placeholder = document.createElement('canvas');
          placeholder.width = 100;
          placeholder.height = 100;
          const pctx = placeholder.getContext('2d');
          if (pctx) {
            pctx.fillStyle = '#1a1a2e';
            pctx.fillRect(0, 0, 100, 100);
          }
          const placeholderImg = new Image();
          placeholderImg.src = placeholder.toDataURL();
          imagesRef.current.set(product.id, placeholderImg);
          requestRender();
        };
      }
    });
  }, [products, requestRender]);

  // 리사이즈 처리
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

  // 아이템 변경 시 렌더
  useEffect(() => {
    requestRender();
  }, [circleItems, dimensions, requestRender]);

  // 터치 이벤트 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (e.touches.length === 1) {
      // 단일 터치 - 드래그 시작
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
    } else if (e.touches.length === 2) {
      // 핀치 줌 시작
      isDraggingRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
      initialZoomRef.current = zoomRef.current;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 1 && isDraggingRef.current) {
      // 드래그
      const touch = e.touches[0];
      const dx = touch.clientX - lastTouchRef.current.x;
      const dy = touch.clientY - lastTouchRef.current.y;

      offsetRef.current.x += dx;
      offsetRef.current.y += dy;

      // 속도 계산
      const now = Date.now();
      const dt = now - lastMoveTimeRef.current;
      if (dt > 0) {
        velocityRef.current = {
          x: dx / dt * 16, // 60fps 기준 속도
          y: dy / dt * 16,
        };
      }
      lastMoveTimeRef.current = now;

      lastTouchRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };

      requestRender();
    } else if (e.touches.length === 2) {
      // 핀치 줌
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (initialPinchDistanceRef.current > 0) {
        const scale = distance / initialPinchDistanceRef.current;
        zoomRef.current = Math.max(0.5, Math.min(2.5, initialZoomRef.current * scale));
        requestRender();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      isDraggingRef.current = false;

      // 클릭 감지 (이동 거리가 작고 시간이 짧으면)
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = Date.now() - touchStartRef.current.time;

      if (distance < 10 && duration < 300) {
        // 클릭으로 처리
        const centerItem = findCenterItem(touch.clientX, touch.clientY);
        if (centerItem) {
          onProductClick(centerItem.product);
        }
      } else {
        // 관성 스크롤 시작
        if (Math.abs(velocityRef.current.x) > MIN_VELOCITY || Math.abs(velocityRef.current.y) > MIN_VELOCITY) {
          animationRef.current = requestAnimationFrame(animateInertia);
        }
      }
    } else if (e.touches.length === 1) {
      // 핀치에서 단일 터치로 전환
      lastTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      isDraggingRef.current = true;
    }
  };

  // 터치 위치에서 가장 가까운 원 찾기
  const findCenterItem = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const touchX = clientX - rect.left;
    const touchY = clientY - rect.top;
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const offset = offsetRef.current;
    const zoom = zoomRef.current;

    let closest: { item: CircleItem; dist: number } | null = null;

    circleItems.forEach((item) => {
      const screenX = (item.baseX * zoom) + centerX + offset.x;
      const screenY = (item.baseY * zoom) + centerY + offset.y;
      const scale = getScaleForPosition(screenX, screenY, centerX, centerY);
      const radius = (BASE_CIRCLE_SIZE / 2) * zoom * scale;

      const dx = touchX - screenX;
      const dy = touchY - screenY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        if (!closest || dist < closest.dist) {
          closest = { item, dist };
        }
      }
    });

    return closest?.item || null;
  };

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-black touch-none">
      <canvas
        ref={canvasRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* 사용 안내 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs text-center">
        <p>드래그하여 탐색 · 핀치하여 확대/축소</p>
        <p>터치하여 상세보기</p>
      </div>
    </div>
  );
}
