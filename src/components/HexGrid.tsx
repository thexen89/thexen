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

// 애플워치 스타일 버블 UI 설정 (PC 버전 - 더 큰 크기)
const CONFIG = {
  maxSize: 180,      // 최대 크기 (PC는 훨씬 크게)
  minSize: 70,       // 최소 크기
  focusRadius: 150,  // 마우스 중심 영역 (최대 크기 유지)
  fringeWidth: 250,  // 페이드 영역 너비
  gutter: 10,        // 아이콘 간격
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

  // 스크롤 오프셋 (Y축만)
  const offsetRef = useRef({ y: 0 });
  // 마우스 위치 (화면 좌표)
  const mouseRef = useRef({ x: 0, y: 0 });
  // 드래그 상태
  const isDraggingRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });
  // 관성 스크롤
  const velocityRef = useRef(0);
  const lastMoveTimeRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  // 터치 시작 위치
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  // 호버 상태
  const hoveredRef = useRef<GridItem | null>(null);

  // 허니컴 그리드 좌표 생성
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

    for (let i = 0; i < Math.min(count, positions.length); i++) {
      items.push({
        product: sortedProducts[i],
        baseX: positions[i].baseX,
        baseY: positions[i].baseY,
      });
    }

    return items;
  }, [products]);

  // 마우스 커서 위치 기반 버블 변환 계산
  const calculateBubbleTransform = useCallback((
    baseX: number,
    baseY: number,
    offsetY: number,
    centerX: number,
    centerY: number,
    mouseX: number,
    mouseY: number
  ) => {
    // 화면 좌표
    const screenX = centerX + baseX;
    const screenY = centerY + baseY + offsetY;

    // 마우스와의 거리 계산
    const dx = screenX - mouseX;
    const dy = screenY - mouseY;
    const distanceFromMouse = Math.sqrt(dx * dx + dy * dy);

    let size: number;
    let opacity: number;

    if (distanceFromMouse <= CONFIG.focusRadius) {
      // 마우스 근처: 최대 크기
      size = CONFIG.maxSize;
      opacity = 1;
    } else if (distanceFromMouse <= CONFIG.focusRadius + CONFIG.fringeWidth) {
      // 페이드 영역: 점진적 축소
      const progress = (distanceFromMouse - CONFIG.focusRadius) / CONFIG.fringeWidth;
      const eased = Math.pow(progress, 0.6);
      size = CONFIG.maxSize - (CONFIG.maxSize - CONFIG.minSize) * eased;
      opacity = 1 - progress * 0.4;
    } else {
      // 멀리 있음: 최소 크기
      const outerProgress = Math.min((distanceFromMouse - CONFIG.focusRadius - CONFIG.fringeWidth) / 100, 1);
      size = CONFIG.minSize * (1 - outerProgress * 0.2);
      opacity = Math.max(0.6 - outerProgress * 0.4, 0.2);
    }

    return {
      screenX,
      screenY,
      size: Math.max(size, 40),
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
      const mouse = mouseRef.current;
      const hovered = hoveredRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 배경
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // 아이템 그리기 (버블 효과 적용)
      const itemsWithTransform = gridItems.map((item) => {
        const transformed = calculateBubbleTransform(
          item.baseX, item.baseY, offsetY, centerX, centerY, mouse.x, mouse.y
        );
        return { item, ...transformed };
      });

      // 스케일 작은 것부터 그리기 (큰 것이 위에)
      itemsWithTransform.sort((a, b) => a.size - b.size);

      itemsWithTransform.forEach(({ item, screenX, screenY, size, opacity, scale }) => {
        if (opacity < 0.1 || scale < 0.3) return;

        const isHovered = hovered?.product.id === item.product.id;
        const radius = isHovered ? size / 2 * 1.08 : size / 2;

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
          ctx.shadowBlur = 25;
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
      });

      // 비네트 효과 (가장자리 어둡게)
      ctx.save();
      const vignetteGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(w, h) * 0.65);
      vignetteGrad.addColorStop(0, 'transparent');
      vignetteGrad.addColorStop(0.6, 'transparent');
      vignetteGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.3)');
      vignetteGrad.addColorStop(0.95, 'rgba(0, 0, 0, 0.7)');
      vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
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

  // 관성 스크롤 (Y축)
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

    // 초기 마우스 위치를 화면 중앙으로 설정
    mouseRef.current = { x: dimensions.width / 2, y: dimensions.height / 2 };
    requestRender();
  }, [dimensions, dpr, requestRender]);

  useEffect(() => {
    requestRender();
  }, [gridItems, dimensions, requestRender]);

  // 아이템 찾기 (클릭 위치와 크기 정보 포함)
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
    const mouse = mouseRef.current;

    const itemsWithTransform = gridItems.map((item) => {
      const transformed = calculateBubbleTransform(
        item.baseX, item.baseY, offsetY, centerX, centerY, mouse.x, mouse.y
      );
      return { item, ...transformed };
    }).sort((a, b) => b.size - a.size);

    for (const { item, screenX, screenY, size, opacity, scale } of itemsWithTransform) {
      if (opacity < 0.1 || scale < 0.3) continue;

      const radius = size / 2;
      const dist = Math.sqrt((touchX - screenX) ** 2 + (touchY - screenY) ** 2);

      if (dist < radius) {
        return {
          item,
          position: {
            x: screenX,
            y: screenY,
            size,
          },
        };
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
    velocityRef.current = 0;
    lastMoveTimeRef.current = Date.now();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // 마우스 위치 업데이트 (항상)
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // 호버 감지
    if (!isDraggingRef.current) {
      const result = findItemAtPosition(e.clientX, e.clientY);
      if (result?.item.product.id !== hoveredRef.current?.product.id) {
        hoveredRef.current = result?.item || null;
      }
      requestRender();
      return;
    }

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
    hoveredRef.current = null;
    // 마우스가 나가면 중앙으로 리셋
    mouseRef.current = { x: dimensions.width / 2, y: dimensions.height / 2 };
    requestRender();

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (Math.abs(velocityRef.current) > MIN_VELOCITY) {
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
        className="cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />

      <div className="absolute bottom-6 left-6 text-white/40 text-sm">
        <p>마우스 이동: 포커스 | 스크롤: 탐색 | 클릭: 상세보기</p>
      </div>
    </div>
  );
}
