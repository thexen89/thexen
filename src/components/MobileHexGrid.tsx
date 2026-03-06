'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Product } from '@/lib/types';

interface ClickPosition {
  x: number;
  y: number;
  size: number;
}

interface MobileHexGridProps {
  products: Product[];
  onProductClick: (product: Product, position?: ClickPosition) => void;
  onReorder?: (products: Product[]) => void;
  backgroundColor?: string;
}

interface GridItem {
  product: Product;
  baseX: number;
  baseY: number;
  index: number;
}

// 애플워치 스타일 버블 UI 설정
const CONFIG = {
  maxSize: 76,       // 최대 크기
  minSize: 20,       // 최소 크기 (더 작게)
  xRadius: 40,       // 가로 중앙 영역 (좁게)
  yRadius: 80,       // 세로 중앙 영역 (넓게)
  fringeWidth: 70,   // 페이드 영역 너비
  gutter: 5,         // 아이콘 간격
};

const ROWS = 25; // 충분한 행 수 (스크롤용)
const FRICTION = 0.92;
const MIN_VELOCITY = 0.5;
const X_SPRING_BACK = 0.85; // X축 스프링백 계수
const LONG_PRESS_MS = 250; // 롱프레스 시간

export default function MobileHexGrid({ products, onProductClick, onReorder, backgroundColor = '#000000' }: MobileHexGridProps) {
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
  // 콘텐츠 경계 ref (useCallback에서 접근용)
  const contentBoundsRef = useRef({ minOffset: 0, maxOffset: 0 });

  // 롱프레스 + 드래그 순서 변경 상태
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reorderModeRef = useRef(false);
  const [reorderMode, setReorderMode] = useState(false);
  const draggedItemRef = useRef<number | null>(null); // 드래그 중인 아이템 인덱스
  const dragTargetRef = useRef<number | null>(null); // 드롭 대상 아이템 인덱스
  const dragPosRef = useRef({ x: 0, y: 0 }); // 드래그 중인 터치/마우스 위치

  // 허니컴 그리드 좌표 생성 (3-4-3-4 패턴)
  const gridItems = useMemo(() => {
    const items: GridItem[] = [];
    const sortedProducts = [...products].sort((a, b) => a.priority - b.priority);
    const count = sortedProducts.length;

    if (count === 0) return items;

    // 3-4-3-4 패턴 그리드 생성
    // 간격은 최대 크기 기준으로 고정 (크기 변해도 간격 일정)
    const positions: { baseX: number; baseY: number }[] = [];
    const baseSpacing = CONFIG.maxSize + CONFIG.gutter; // 고정 간격
    const verticalSpacing = baseSpacing * 0.85; // 고정 세로 간격

    for (let row = -Math.floor(ROWS / 2); row <= Math.floor(ROWS / 2); row++) {
      const isOddRow = Math.abs(row) % 2 === 1;
      const cols = isOddRow ? 4 : 3; // 홀수행 4개, 짝수행 3개

      for (let col = 0; col < cols; col++) {
        const colOffset = col - (cols - 1) / 2;
        positions.push({
          baseX: colOffset * baseSpacing,
          baseY: row * verticalSpacing,
        });
      }
    }

    // 위→아래, 왼→오 순서 정렬 (PC 버전과 동일)
    positions.sort((a, b) => {
      if (a.baseY !== b.baseY) return a.baseY - b.baseY;
      return a.baseX - b.baseX;
    });

    // 제품 할당
    for (let i = 0; i < Math.min(count, positions.length); i++) {
      items.push({
        product: sortedProducts[i],
        baseX: positions[i].baseX,
        baseY: positions[i].baseY,
        index: i,
      });
    }

    return items;
  }, [products]);

  // 콘텐츠 경계 계산 (스크롤 제한용)
  const contentBounds = useMemo(() => {
    if (gridItems.length === 0) return { minOffset: 0, maxOffset: 0 };
    const ys = gridItems.map(item => item.baseY);
    const minBaseY = Math.min(...ys);
    const maxBaseY = Math.max(...ys);
    return {
      minOffset: -(maxBaseY + CONFIG.maxSize),
      maxOffset: -(minBaseY - CONFIG.maxSize),
    };
  }, [gridItems]);

  // contentBounds를 ref에 동기화
  useEffect(() => {
    contentBoundsRef.current = contentBounds;
  }, [contentBounds]);

  // 버블 변환 계산 - Y축 거리 기준 크기 변동, 간격은 고정
  const calculateBubbleTransform = useCallback((baseX: number, baseY: number, offsetX: number, offsetY: number, centerX: number, centerY: number, screenHeight: number) => {
    const x = baseX;
    const y = baseY + offsetY;

    // Y축 거리만으로 크기 계산 (같은 행은 같은 크기)
    const yDistance = Math.abs(y);

    const centerZone = 40;
    const fadeZone = 350;

    let size: number;

    if (yDistance <= centerZone) {
      size = CONFIG.maxSize;
    } else {
      const progress = Math.min((yDistance - centerZone) / fadeZone, 1);
      // 더 급격한 감소 곡선 (끝으로 갈수록 빠르게 작아짐)
      size = CONFIG.maxSize - (CONFIG.maxSize - CONFIG.minSize) * Math.pow(progress, 1.0);
    }

    const opacity = 1;

    return {
      screenX: centerX + x,
      screenY: centerY + y,
      size: Math.max(size, CONFIG.minSize),
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
      const isReorder = reorderModeRef.current;
      const draggedIdx = draggedItemRef.current;
      const targetIdx = dragTargetRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 배경
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // 아이템 그리기 (버블 효과 적용)
      const itemsWithTransform = gridItems.map((item) => {
        const transformed = calculateBubbleTransform(item.baseX, item.baseY, offset.x, offset.y, centerX, centerY, h);
        return { item, ...transformed };
      });

      // 스케일 작은 것부터 그리기 (큰 것이 위에)
      itemsWithTransform.sort((a, b) => a.size - b.size);

      itemsWithTransform.forEach(({ item, screenX, screenY, size, opacity, scale }) => {
        // 투명도가 너무 낮으면 그리지 않음
        if (opacity < 0.08 || scale < 0.3) return;

        const radius = size / 2;
        const isDragged = isReorder && draggedIdx === item.index;
        const isDragTarget = isReorder && targetIdx === item.index && draggedIdx !== null;

        // 화면 밖 체크
        if (screenX < -radius || screenX > w + radius ||
            screenY < -radius || screenY > h + radius) {
          return;
        }

        ctx.save();
        ctx.globalAlpha = isDragged ? 0.4 : opacity;

        // 드래그 대상 글로우
        if (isDragTarget) {
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
          ctx.drawImage(img, screenX - radius, screenY - radius, size, size);
        }

        ctx.restore();

        // 드래그 대상 테두리
        if (isDragTarget) {
          ctx.save();
          ctx.strokeStyle = '#00d4ff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius + 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // 그림자 효과 (큰 것만)
        if (scale > 0.5 && !isDragged) {
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

        // 순서 번호 (어드민 모드)
        if (isReorder && size > 30) {
          const badgeSize = Math.max(14, size * 0.25);
          const badgeX = screenX - radius + badgeSize * 0.3;
          const badgeY = screenY - radius + badgeSize * 0.3;

          ctx.save();
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = item.index === 0 ? '#ffffff' : 'rgba(0,0,0,0.7)';
          ctx.fill();

          ctx.fillStyle = item.index === 0 ? '#000000' : '#ffffff';
          ctx.font = `bold ${Math.round(badgeSize * 0.6)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${item.index + 1}`, badgeX, badgeY);
          ctx.restore();
        }
      });

      // 마스크 없음 - 전체 영역 표시

      // 리오더 모드 안내
      if (isReorder) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        const bannerH = 32;
        ctx.fillRect(0, h - bannerH - 10, w, bannerH);
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('순서 변경 모드 — 드래그하여 순서 변경', w / 2, h - bannerH / 2 - 10);
        ctx.restore();
      }
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

    // 경계 바운스백
    if (offsetRef.current.y < contentBoundsRef.current.minOffset) {
      offsetRef.current.y += (contentBoundsRef.current.minOffset - offsetRef.current.y) * 0.15;
      velocityRef.current.y *= 0.5;
    } else if (offsetRef.current.y > contentBoundsRef.current.maxOffset) {
      offsetRef.current.y += (contentBoundsRef.current.maxOffset - offsetRef.current.y) * 0.15;
      velocityRef.current.y *= 0.5;
    }

    requestRender();
    animationRef.current = requestAnimationFrame(animateInertia);
  }, [requestRender]);

  // 이미지 로드
  useEffect(() => {
    const size = CONFIG.maxSize * 2; // 고해상도용
    products.forEach((product) => {
      if (!imagesRef.current.has(product.id)) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = product.images?.[product.thumbnailIndex] || product.images?.[0] || '';
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
          const placeholderImg = new window.Image();
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
  }, [gridItems, dimensions, requestRender, reorderMode]);

  // 아이템 찾기 (버블 변환된 위치 기준, 클릭 위치와 크기 정보 포함)
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
    const offset = offsetRef.current;

    // 스케일 큰 것부터 검사 (위에 그려진 것이 우선)
    const itemsWithTransform = gridItems.map((item) => {
      const transformed = calculateBubbleTransform(item.baseX, item.baseY, offset.x, offset.y, centerX, centerY, h);
      return { item, ...transformed };
    }).sort((a, b) => b.size - a.size);

    for (const { item, screenX, screenY, size, opacity, scale } of itemsWithTransform) {
      if (opacity < 0.08 || scale < 0.3) continue;

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

  // 롱프레스 시작 → 리오더 모드 진입
  const startLongPressCheck = useCallback((clientX: number, clientY: number) => {
    if (!onReorder) return;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      const result = findItemAtPosition(clientX, clientY);
      if (result) {
        reorderModeRef.current = true;
        setReorderMode(true);
        draggedItemRef.current = result.item.index;
        dragPosRef.current = { x: clientX, y: clientY };
        requestRender();
      }
    }, LONG_PRESS_MS);
  }, [onReorder, findItemAtPosition, requestRender]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // 드래그 중 타겟 갱신
  const updateDragTarget = useCallback((clientX: number, clientY: number) => {
    const result = findItemAtPosition(clientX, clientY);
    const newTarget = result ? result.item.index : null;
    if (newTarget !== dragTargetRef.current) {
      dragTargetRef.current = newTarget;
      requestRender();
    }
  }, [findItemAtPosition, requestRender]);

  // 드롭 → 순서 변경 실행
  const executeDrop = useCallback(() => {
    const draggedIdx = draggedItemRef.current;
    const targetIdx = dragTargetRef.current;

    if (draggedIdx !== null && targetIdx !== null && draggedIdx !== targetIdx && onReorder) {
      const sorted = [...products].sort((a, b) => a.priority - b.priority);
      const [removed] = sorted.splice(draggedIdx, 1);
      sorted.splice(targetIdx, 0, removed);
      const updates = sorted.map((p, i) => ({ ...p, priority: i + 1 }));
      onReorder(updates);
    }

    draggedItemRef.current = null;
    dragTargetRef.current = null;
    reorderModeRef.current = false;
    setReorderMode(false);
    requestRender();
  }, [products, onReorder, requestRender]);

  // 터치 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (e.touches.length === 1) {
      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;

      // 리오더 모드에서 터치 시작 시 드래그 시작
      if (reorderModeRef.current) {
        const result = findItemAtPosition(clientX, clientY);
        if (result) {
          draggedItemRef.current = result.item.index;
          dragPosRef.current = { x: clientX, y: clientY };
          requestRender();
        }
        return;
      }

      isDraggingRef.current = true;
      lastTouchRef.current = { x: clientX, y: clientY };
      touchStartRef.current = { x: clientX, y: clientY, time: Date.now() };
      velocityRef.current = { x: 0, y: 0 };
      lastMoveTimeRef.current = Date.now();

      // 롱프레스 체크 시작
      startLongPressCheck(clientX, clientY);
    }
  };

  // 터치 이벤트는 useEffect에서 non-passive로 등록

  const handleTouchEnd = (e: React.TouchEvent) => {
    cancelLongPress();

    if (e.touches.length === 0) {
      // 리오더 모드에서 드래그 종료
      if (reorderModeRef.current && draggedItemRef.current !== null) {
        executeDrop();
        return;
      }

      isDraggingRef.current = false;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = Date.now() - touchStartRef.current.time;

      if (distance < 15 && duration < 300) {
        // 리오더 모드에서 빈 곳 탭하면 모드 해제
        if (reorderModeRef.current) {
          reorderModeRef.current = false;
          setReorderMode(false);
          draggedItemRef.current = null;
          dragTargetRef.current = null;
          requestRender();
          return;
        }

        const result = findItemAtPosition(touch.clientX, touch.clientY);
        if (result) {
          e.preventDefault(); // 합성 click 이벤트 차단 (모달 즉시 닫힘 방지)
          onProductClick(result.item.product, result.position);
        }
      } else {
        // Y축 속도가 있거나, X축이 원점이 아니면 애니메이션 시작
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

    // 리오더 모드에서 마우스 다운
    if (reorderModeRef.current) {
      const result = findItemAtPosition(e.clientX, e.clientY);
      if (result) {
        draggedItemRef.current = result.item.index;
        dragPosRef.current = { x: e.clientX, y: e.clientY };
        requestRender();
      }
      isDraggingRef.current = true;
      return;
    }

    isDraggingRef.current = true;
    lastTouchRef.current = { x: e.clientX, y: e.clientY };
    touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    velocityRef.current = { x: 0, y: 0 };
    lastMoveTimeRef.current = Date.now();

    startLongPressCheck(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 롱프레스 체크 중 움직임이 크면 취소
    if (longPressTimerRef.current) {
      const dx = e.clientX - touchStartRef.current.x;
      const dy = e.clientY - touchStartRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        cancelLongPress();
      }
    }

    // 리오더 모드에서 드래그 중
    if (reorderModeRef.current && draggedItemRef.current !== null && isDraggingRef.current) {
      dragPosRef.current = { x: e.clientX, y: e.clientY };
      updateDragTarget(e.clientX, e.clientY);
      return;
    }

    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastTouchRef.current.x;
    const dy = e.clientY - lastTouchRef.current.y;

    // X축은 제한적으로 이동 (크기 변화용)
    offsetRef.current.x = Math.max(-100, Math.min(100, offsetRef.current.x + dx));
    // Y축 스크롤 (경계 밖에서 저항)
    const { minOffset, maxOffset } = contentBoundsRef.current;
    if (offsetRef.current.y < minOffset || offsetRef.current.y > maxOffset) {
      offsetRef.current.y += dy * 0.3;
    } else {
      offsetRef.current.y += dy;
    }

    const now = Date.now();
    const dt = now - lastMoveTimeRef.current;
    if (dt > 0) {
      velocityRef.current.x = 0; // X축 속도는 무시
      velocityRef.current.y = dy / dt * 16;
    }
    lastMoveTimeRef.current = now;
    lastTouchRef.current = { x: e.clientX, y: e.clientY };

    requestRender();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    cancelLongPress();

    // 리오더 모드에서 드롭
    if (reorderModeRef.current && draggedItemRef.current !== null) {
      updateDragTarget(e.clientX, e.clientY);
      executeDrop();
      isDraggingRef.current = false;
      return;
    }

    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = Date.now() - touchStartRef.current.time;

    if (distance < 15 && duration < 300) {
      // 리오더 모드에서 빈 곳 클릭하면 모드 해제
      if (reorderModeRef.current) {
        reorderModeRef.current = false;
        setReorderMode(false);
        draggedItemRef.current = null;
        dragTargetRef.current = null;
        requestRender();
        return;
      }

      const result = findItemAtPosition(e.clientX, e.clientY);
      if (result) {
        onProductClick(result.item.product, result.position);
      }
    } else {
      // Y축 속도가 있거나, X축이 원점이 아니면 애니메이션 시작
      if (Math.abs(velocityRef.current.y) > MIN_VELOCITY || Math.abs(offsetRef.current.x) > 1) {
        animationRef.current = requestAnimationFrame(animateInertia);
      }
    }
  };

  const handleMouseLeave = () => {
    cancelLongPress();
    if (reorderModeRef.current && draggedItemRef.current !== null) {
      executeDrop();
    }
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      // Y축 속도가 있거나, X축이 원점이 아니면 애니메이션 시작
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

      if (e.touches.length === 1) {
        const touch = e.touches[0];

        // 롱프레스 체크 중 움직임이 크면 취소
        if (longPressTimerRef.current) {
          const dx = touch.clientX - touchStartRef.current.x;
          const dy = touch.clientY - touchStartRef.current.y;
          if (Math.sqrt(dx * dx + dy * dy) > 10) {
            cancelLongPress();
          }
        }

        // 리오더 모드에서 드래그
        if (reorderModeRef.current && draggedItemRef.current !== null) {
          dragPosRef.current = { x: touch.clientX, y: touch.clientY };
          // 드롭 타겟 갱신
          const canvasEl = canvasRef.current;
          if (canvasEl) {
            const rect = canvasEl.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            const w = dimensions.width;
            const h = dimensions.height;
            const centerX = w / 2;
            const centerY = h / 2;
            const offset = offsetRef.current;

            const itemsWithTransform = gridItems.map((item) => {
              const transformed = calculateBubbleTransform(item.baseX, item.baseY, offset.x, offset.y, centerX, centerY, h);
              return { item, ...transformed };
            }).sort((a, b) => b.size - a.size);

            let newTarget: number | null = null;
            for (const { item, screenX, screenY, size, opacity, scale } of itemsWithTransform) {
              if (opacity < 0.08 || scale < 0.3) continue;
              const radius = size / 2;
              const dist = Math.sqrt((touchX - screenX) ** 2 + (touchY - screenY) ** 2);
              if (dist < radius) {
                newTarget = item.index;
                break;
              }
            }
            if (newTarget !== dragTargetRef.current) {
              dragTargetRef.current = newTarget;
              requestRender();
            }
          }
          return;
        }

        if (isDraggingRef.current) {
          const dx = touch.clientX - lastTouchRef.current.x;
          const dy = touch.clientY - lastTouchRef.current.y;

          offsetRef.current.x = Math.max(-100, Math.min(100, offsetRef.current.x + dx));
          // Y축 스크롤 (경계 밖에서 저항)
          const { minOffset, maxOffset } = contentBoundsRef.current;
          if (offsetRef.current.y < minOffset || offsetRef.current.y > maxOffset) {
            offsetRef.current.y += dy * 0.3;
          } else {
            offsetRef.current.y += dy;
          }

          const now = Date.now();
          const dt = now - lastMoveTimeRef.current;
          if (dt > 0) {
            velocityRef.current.x = 0;
            velocityRef.current.y = dy / dt * 16;
          }
          lastMoveTimeRef.current = now;
          lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

          requestRender();
        }
      }
    };

    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => canvas.removeEventListener('touchmove', handleTouchMove);
  }, [requestRender, cancelLongPress, dimensions, gridItems, calculateBubbleTransform]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden touch-none" style={{ backgroundColor }}>
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
    </div>
  );
}
