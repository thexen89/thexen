'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Product } from '@/lib/types';

interface HexGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

interface GridItem {
  product: Product;
  baseX: number;
  baseY: number;
}

// 애플워치 스타일 버블 UI 설정 (PC 버전 - 더 큰 크기)
const CONFIG = {
  maxSize: 180,      // 최대 크기 (PC는 훨씬 크게)
  minSize: 70,       // 최소 크기
  xRadius: 120,      // 가로 중앙 영역
  yRadius: 160,      // 세로 중앙 영역
  fringeWidth: 180,  // 페이드 영역 너비
  gutter: 10,        // 아이콘 간격
};

const ROWS = 15;
const COLS_ODD = 5;   // 홀수행 열 개수
const COLS_EVEN = 4;  // 짝수행 열 개수
const FRICTION = 0.94;
const MIN_VELOCITY = 0.5;
const X_SPRING_BACK = 0.88;

export default function HexGrid({ products, onProductClick }: HexGridProps) {
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
  // 호버 상태
  const hoveredRef = useRef<GridItem | null>(null);

  // 허니컴 그리드 좌표 생성 (6-7-6-7 패턴 - PC 화면에 맞게)
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

  // 버블 변환 계산 - 가로는 위치 고정, 크기만 변화
  const calculateBubbleTransform = useCallback((baseX: number, baseY: number, offsetX: number, offsetY: number, centerX: number, centerY: number) => {
    // X축은 위치 고정, Y축만 스크롤
    const x = baseX;
    const y = baseY + offsetY;

    // 가로 오프셋으로 크기 변화 계산 (위치 이동 없이)
    const xInfluence = baseX + offsetX * 0.3;

    // 세로 거리 계산
    const yDistance = Math.abs(y);
    const yDistanceToMiddle = Math.max(0, yDistance - CONFIG.yRadius);

    // 가로 거리 계산 (크기 변화용)
    const xDistance = Math.abs(xInfluence);
    const xDistanceToMiddle = Math.max(0, xDistance - CONFIG.xRadius);

    // 전체 거리 (크기 계산용)
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
      const outerProgress = Math.min((totalDistanceToMiddle - CONFIG.fringeWidth) / 80, 1);
      size = CONFIG.minSize * (1 - outerProgress * 0.3);
      opacity = Math.max(0.7 - outerProgress * 0.6, 0.1);
    }

    // 컴팩트니스: 작아진 버블을 중앙으로 살짝 당김
    let translateY = 0;
    if (yDistanceToMiddle > 0) {
      const pullStrength = Math.min(yDistanceToMiddle / CONFIG.fringeWidth, 1) * 20;
      translateY = -Math.sign(y) * pullStrength;
    }

    return {
      screenX: centerX + x,
      screenY: centerY + y + translateY,
      size: Math.max(size, 30),
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
      const offset = offsetRef.current;
      const hovered = hoveredRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 배경
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // 아이템 그리기 (버블 효과 적용)
      const itemsWithTransform = gridItems.map((item) => {
        const transformed = calculateBubbleTransform(item.baseX, item.baseY, offset.x, offset.y, centerX, centerY);
        return { item, ...transformed };
      });

      // 스케일 작은 것부터 그리기 (큰 것이 위에)
      itemsWithTransform.sort((a, b) => a.size - b.size);

      itemsWithTransform.forEach(({ item, screenX, screenY, size, opacity, scale }) => {
        // 투명도가 너무 낮으면 그리지 않음
        if (opacity < 0.08 || scale < 0.3) return;

        const isHovered = hovered?.product.id === item.product.id;
        const radius = isHovered ? size / 2 * 1.1 : size / 2;

        // 화면 밖 체크
        if (screenX < -radius || screenX > w + radius ||
            screenY < -radius || screenY > h + radius) {
          return;
        }

        ctx.save();
        ctx.globalAlpha = opacity;

        // 호버 시 글로우 효과
        if (isHovered) {
          ctx.shadowColor = '#00d4ff';
          ctx.shadowBlur = 20;
        }

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
          ctx.drawImage(img, screenX - radius, screenY - radius, radius * 2, radius * 2);
        }

        ctx.restore();

        // 호버 시 테두리
        if (isHovered) {
          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = '#00d4ff';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.restore();

          // 라벨
          const labelY = screenY + radius + 20;
          ctx.save();
          ctx.globalAlpha = 1;
          ctx.font = 'bold 13px "Pretendard", sans-serif';
          const textWidth = ctx.measureText(item.product.name).width;
          const labelWidth = Math.max(textWidth + 24, 90);
          const labelHeight = 42;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
          ctx.beginPath();
          ctx.roundRect(screenX - labelWidth / 2, labelY - labelHeight / 2, labelWidth, labelHeight, 8);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(item.product.name, screenX, labelY - 6);

          ctx.fillStyle = '#00d4ff';
          ctx.font = '11px "Pretendard", sans-serif';
          ctx.fillText(item.product.client, screenX, labelY + 10);
          ctx.restore();
        }

        // 그림자 효과 (큰 것만, 호버 아닐 때)
        if (scale > 0.5 && !isHovered) {
          ctx.save();
          ctx.globalAlpha = opacity * 0.5;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 15 * scale;
          ctx.shadowOffsetY = 5 * scale;
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = 'transparent';
          ctx.stroke();
          ctx.restore();
        }
      });

      // 비네트 효과 (가장자리 어둡게)
      ctx.save();
      const vignetteGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(w, h) * 0.6);
      vignetteGrad.addColorStop(0, 'transparent');
      vignetteGrad.addColorStop(0.5, 'transparent');
      vignetteGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
      vignetteGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.7)');
      vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
      ctx.fillStyle = vignetteGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    };
  }, [gridItems, dimensions, dpr, calculateBubbleTransform]);

  const requestRender = useCallback(() => {
    if (renderRequestRef.current) return;
    renderRequestRef.current = requestAnimationFrame(() => {
      renderRequestRef.current = null;
      renderFnRef.current();
    });
  }, []);

  // 관성 스크롤 (Y축) + X축 스프링백
  const animateInertia = useCallback(() => {
    const vy = velocityRef.current.y;

    // X축 스프링백 (원점으로 복귀)
    const newX = offsetRef.current.x * X_SPRING_BACK;
    if (Math.abs(newX) < 1) {
      offsetRef.current.x = 0;
    } else {
      offsetRef.current.x = newX;
    }

    // Y축 관성 스크롤
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

  // 아이템 찾기 (버블 변환된 위치 기준)
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
    // 호버 감지
    if (!isDraggingRef.current) {
      const item = findItemAtPosition(e.clientX, e.clientY);
      if (item?.product.id !== hoveredRef.current?.product.id) {
        hoveredRef.current = item;
        requestRender();
      }
      return;
    }

    const dx = e.clientX - lastTouchRef.current.x;
    const dy = e.clientY - lastTouchRef.current.y;

    // X축은 제한적으로 이동 (크기 변화용)
    offsetRef.current.x = Math.max(-150, Math.min(150, offsetRef.current.x + dx));
    // Y축은 자유롭게 스크롤
    offsetRef.current.y += dy;

    const now = Date.now();
    const dt = now - lastMoveTimeRef.current;
    if (dt > 0) {
      velocityRef.current.x = 0;
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

    if (distance < 10 && duration < 300) {
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
    hoveredRef.current = null;
    requestRender();

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (Math.abs(velocityRef.current.y) > MIN_VELOCITY || Math.abs(offsetRef.current.x) > 1) {
        animationRef.current = requestAnimationFrame(animateInertia);
      }
    }
  };

  // 휠 스크롤 지원
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    offsetRef.current.y -= e.deltaY;
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
        onWheel={handleWheel}
      />

      <div className="absolute bottom-6 left-6 text-white/40 text-sm">
        <p>드래그 또는 스크롤: 탐색 | 클릭: 상세보기</p>
      </div>
    </div>
  );
}
