'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { Product } from '@/lib/types';

type BackgroundTheme =
  | 'dark' | 'darker' | 'checkerboard' | 'dots' | 'gradient'
  | 'spring' | 'summer' | 'autumn' | 'winter'
  | 'ocean' | 'sunset' | 'forest' | 'galaxy'
  | 'minimal' | 'neon' | 'pastel';

interface AdminHexGridProps {
  products: Product[];
  onReorder: (products: Product[]) => void;
  onProductClick: (product: Product) => void;
  bgTheme?: BackgroundTheme;
}

interface CircleItem {
  product: Product;
  x: number;
  y: number;
  size: number;
  ring: number;
  index: number;
}

const BASE_SIZE = 60;
const MIN_SIZE_RATIO = 0.65;
const GAP = 8;

// 링에 따른 크기 계산 (중앙이 크고 바깥이 작음)
const getSizeForRing = (ring: number, maxRing: number): number => {
  if (maxRing === 0) return BASE_SIZE;
  const t = ring / Math.max(maxRing, 3);
  return BASE_SIZE * (1 - (1 - MIN_SIZE_RATIO) * t);
};

export default function AdminHexGrid({ products, onReorder, onProductClick, bgTheme = 'dark' }: AdminHexGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const hoveredRef = useRef<CircleItem | null>(null);
  const renderRequestRef = useRef<number | null>(null);
  const isReorderingRef = useRef(false);
  const draggedItemRef = useRef<CircleItem | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dpr, setDpr] = useState(1);
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

    // 최대 링 계산
    const maxRing = coords.length > 0 ? coords[coords.length - 1].ring : 0;

    // 원 중심 간 거리 = 지름 + GAP
    const d = BASE_SIZE * 2 + GAP;

    for (let i = 0; i < Math.min(count, coords.length); i++) {
      const coord = coords[i];

      // 표준 hexagonal axial → pixel 변환
      const x = d * (coord.q + coord.r * 0.5);
      const y = d * (coord.r * Math.sqrt(3) / 2);

      items.push({
        product: sortedProducts[i],
        x,
        y,
        size: getSizeForRing(coord.ring, maxRing),
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

      const hovered = hoveredRef.current;
      const dragged = draggedItemRef.current;
      const w = dimensions.width;
      const h = dimensions.height;
      const halfW = w / 2;
      const halfH = h / 2;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Draw background based on theme
      switch (bgTheme) {
        case 'darker':
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, w, h);
          break;

        case 'checkerboard':
          ctx.fillStyle = '#0f0f1a';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#1a1a2e';
          const checkSize = 20;
          for (let gy = 0; gy < h; gy += checkSize) {
            for (let gx = 0; gx < w; gx += checkSize) {
              if ((Math.floor(gx / checkSize) + Math.floor(gy / checkSize)) % 2 === 0) {
                ctx.fillRect(gx, gy, checkSize, checkSize);
              }
            }
          }
          break;

        case 'dots':
          ctx.fillStyle = '#0f0f1a';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          const dotSpacing = 20;
          const dotRadius = 1.5;
          for (let dy = dotSpacing / 2; dy < h; dy += dotSpacing) {
            for (let dx = dotSpacing / 2; dx < w; dx += dotSpacing) {
              ctx.beginPath();
              ctx.arc(dx, dy, dotRadius, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;

        case 'gradient': {
          const gradient = ctx.createLinearGradient(0, 0, w, h);
          gradient.addColorStop(0, '#1a1a2e');
          gradient.addColorStop(0.5, '#0f0f1a');
          gradient.addColorStop(1, '#1a1a2e');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, w, h);
          break;
        }

        case 'minimal':
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(0, 0, w, h);
          break;

        case 'spring': {
          // 봄 벚꽃 테마 - 핑크 그라데이션
          const springGrad = ctx.createLinearGradient(0, 0, w, h);
          springGrad.addColorStop(0, '#fce4ec');
          springGrad.addColorStop(0.5, '#f8bbd9');
          springGrad.addColorStop(1, '#f48fb1');
          ctx.fillStyle = springGrad;
          ctx.fillRect(0, 0, w, h);
          // 벚꽃 꽃잎
          ctx.fillStyle = 'rgba(255, 182, 193, 0.4)';
          for (let i = 0; i < 50; i++) {
            const px = (Math.sin(i * 7.3) * 0.5 + 0.5) * w;
            const py = (Math.cos(i * 11.7) * 0.5 + 0.5) * h;
            ctx.beginPath();
            ctx.ellipse(px, py, 8, 5, i * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'summer': {
          // 여름 바다 테마 - 파란 그라데이션
          const summerGrad = ctx.createLinearGradient(0, 0, 0, h);
          summerGrad.addColorStop(0, '#00bcd4');
          summerGrad.addColorStop(0.3, '#0097a7');
          summerGrad.addColorStop(1, '#006064');
          ctx.fillStyle = summerGrad;
          ctx.fillRect(0, 0, w, h);
          // 파도 효과
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 2;
          for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            for (let x = 0; x < w; x += 10) {
              const y = h * 0.3 + i * 50 + Math.sin(x * 0.02 + i) * 20;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          break;
        }

        case 'autumn': {
          // 가을 단풍 테마 - 오렌지/갈색 그라데이션
          const autumnGrad = ctx.createLinearGradient(0, 0, w, h);
          autumnGrad.addColorStop(0, '#5d4037');
          autumnGrad.addColorStop(0.4, '#8d6e63');
          autumnGrad.addColorStop(0.7, '#d84315');
          autumnGrad.addColorStop(1, '#bf360c');
          ctx.fillStyle = autumnGrad;
          ctx.fillRect(0, 0, w, h);
          // 낙엽 점
          const leafColors = ['#ff6f00', '#e65100', '#d84315', '#ffab00'];
          for (let i = 0; i < 40; i++) {
            const lx = (Math.sin(i * 5.1) * 0.5 + 0.5) * w;
            const ly = (Math.cos(i * 8.3) * 0.5 + 0.5) * h;
            ctx.fillStyle = leafColors[i % leafColors.length] + '66';
            ctx.beginPath();
            ctx.arc(lx, ly, 6 + (i % 5), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'winter': {
          // 겨울 눈 테마 - 블루/화이트 그라데이션
          const winterGrad = ctx.createLinearGradient(0, 0, 0, h);
          winterGrad.addColorStop(0, '#e3f2fd');
          winterGrad.addColorStop(0.5, '#bbdefb');
          winterGrad.addColorStop(1, '#90caf9');
          ctx.fillStyle = winterGrad;
          ctx.fillRect(0, 0, w, h);
          // 눈송이
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          for (let i = 0; i < 60; i++) {
            const sx = (Math.sin(i * 9.7) * 0.5 + 0.5) * w;
            const sy = (Math.cos(i * 13.1) * 0.5 + 0.5) * h;
            ctx.beginPath();
            ctx.arc(sx, sy, 2 + (i % 4), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'ocean': {
          // 깊은 바다 테마
          const oceanGrad = ctx.createRadialGradient(halfW, halfH, 0, halfW, halfH, Math.max(w, h) * 0.7);
          oceanGrad.addColorStop(0, '#1a237e');
          oceanGrad.addColorStop(0.5, '#0d47a1');
          oceanGrad.addColorStop(1, '#01579b');
          ctx.fillStyle = oceanGrad;
          ctx.fillRect(0, 0, w, h);
          // 물결 효과
          ctx.strokeStyle = 'rgba(100, 181, 246, 0.1)';
          ctx.lineWidth = 1;
          for (let i = 0; i < 15; i++) {
            ctx.beginPath();
            for (let x = 0; x < w; x += 8) {
              const y = halfH + Math.sin(x * 0.015 + i * 0.8) * (50 + i * 20);
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          break;
        }

        case 'sunset': {
          // 석양 테마
          const sunsetGrad = ctx.createLinearGradient(0, 0, 0, h);
          sunsetGrad.addColorStop(0, '#1a237e');
          sunsetGrad.addColorStop(0.3, '#7b1fa2');
          sunsetGrad.addColorStop(0.5, '#e91e63');
          sunsetGrad.addColorStop(0.7, '#ff5722');
          sunsetGrad.addColorStop(1, '#ff9800');
          ctx.fillStyle = sunsetGrad;
          ctx.fillRect(0, 0, w, h);
          break;
        }

        case 'forest': {
          // 숲 테마
          const forestGrad = ctx.createLinearGradient(0, 0, 0, h);
          forestGrad.addColorStop(0, '#1b5e20');
          forestGrad.addColorStop(0.5, '#2e7d32');
          forestGrad.addColorStop(1, '#33691e');
          ctx.fillStyle = forestGrad;
          ctx.fillRect(0, 0, w, h);
          // 나뭇잎 패턴
          ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
          for (let i = 0; i < 30; i++) {
            const fx = (Math.sin(i * 6.3) * 0.5 + 0.5) * w;
            const fy = (Math.cos(i * 9.1) * 0.5 + 0.5) * h;
            ctx.beginPath();
            ctx.ellipse(fx, fy, 15, 8, i * 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'galaxy': {
          // 우주/은하 테마
          ctx.fillStyle = '#0a0a15';
          ctx.fillRect(0, 0, w, h);
          // 은하수 효과
          const galaxyGrad = ctx.createRadialGradient(halfW * 0.7, halfH * 0.6, 0, halfW, halfH, Math.max(w, h) * 0.6);
          galaxyGrad.addColorStop(0, 'rgba(103, 58, 183, 0.3)');
          galaxyGrad.addColorStop(0.3, 'rgba(63, 81, 181, 0.2)');
          galaxyGrad.addColorStop(0.6, 'rgba(33, 150, 243, 0.1)');
          galaxyGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = galaxyGrad;
          ctx.fillRect(0, 0, w, h);
          // 별들
          for (let i = 0; i < 100; i++) {
            const starX = (Math.sin(i * 7.7) * 0.5 + 0.5) * w;
            const starY = (Math.cos(i * 11.3) * 0.5 + 0.5) * h;
            const starSize = 0.5 + (i % 3) * 0.5;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + (i % 5) * 0.15})`;
            ctx.beginPath();
            ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'neon': {
          // 네온 테마
          ctx.fillStyle = '#0a0a0a';
          ctx.fillRect(0, 0, w, h);
          // 네온 그리드
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          const neonGridSize = 40;
          for (let gx = 0; gx < w; gx += neonGridSize) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, h);
            ctx.stroke();
          }
          for (let gy = 0; gy < h; gy += neonGridSize) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(w, gy);
            ctx.stroke();
          }
          // 네온 글로우 원
          const neonColors = ['#ff00ff', '#00ffff', '#ff0080'];
          for (let i = 0; i < 5; i++) {
            const nx = (Math.sin(i * 4.2) * 0.3 + 0.5) * w;
            const ny = (Math.cos(i * 5.8) * 0.3 + 0.5) * h;
            const neonGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, 150);
            neonGrad.addColorStop(0, neonColors[i % 3] + '30');
            neonGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = neonGrad;
            ctx.fillRect(0, 0, w, h);
          }
          break;
        }

        case 'pastel': {
          // 파스텔 테마
          const pastelGrad = ctx.createLinearGradient(0, 0, w, h);
          pastelGrad.addColorStop(0, '#fce4ec');
          pastelGrad.addColorStop(0.25, '#e1f5fe');
          pastelGrad.addColorStop(0.5, '#f3e5f5');
          pastelGrad.addColorStop(0.75, '#e8f5e9');
          pastelGrad.addColorStop(1, '#fff3e0');
          ctx.fillStyle = pastelGrad;
          ctx.fillRect(0, 0, w, h);
          // 부드러운 원 패턴
          const pastelColors = ['rgba(244, 143, 177, 0.2)', 'rgba(129, 212, 250, 0.2)', 'rgba(206, 147, 216, 0.2)'];
          for (let i = 0; i < 20; i++) {
            const px = (Math.sin(i * 3.7) * 0.5 + 0.5) * w;
            const py = (Math.cos(i * 6.3) * 0.5 + 0.5) * h;
            ctx.fillStyle = pastelColors[i % 3];
            ctx.beginPath();
            ctx.arc(px, py, 30 + (i % 4) * 15, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'dark':
        default:
          ctx.fillStyle = '#0f0f1a';
          ctx.fillRect(0, 0, w, h);
          // Draw subtle grid pattern
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.lineWidth = 1;
          const gridSize = 50;
          const startX = halfW % gridSize;
          const startY = halfH % gridSize;
          for (let gx = startX; gx < w; gx += gridSize) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, h);
            ctx.stroke();
          }
          for (let gy = startY; gy < h; gy += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(w, gy);
            ctx.stroke();
          }
          break;
      }

      // Draw drop zones when dragging
      if (dragged) {
        circleItems.forEach((item) => {
          if (item.product.id === dragged.product.id) return;

          const screenX = item.x + halfW;
          const screenY = item.y + halfH;
          const radius = item.size;

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

        const screenX = item.x + halfW;
        const screenY = item.y + halfH;
        const radius = item.size;

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
        ctx.font = 'bold 11px "Pretendard", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${item.index + 1}`, screenX, screenY + radius + 12);
      }

      // Draw hovered item (when not dragging)
      if (hovered && !dragged) {
        const screenX = hovered.x + halfW;
        const screenY = hovered.y + halfH;
        const radius = hovered.size * 1.08;

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
        const labelY = screenY + radius + 20;
        ctx.font = 'bold 12px "Pretendard", sans-serif';
        const textWidth = ctx.measureText(hovered.product.name).width;
        const labelWidth = Math.max(textWidth + 24, 100);
        const labelHeight = 44;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.beginPath();
        ctx.roundRect(screenX - labelWidth / 2, labelY - labelHeight / 2, labelWidth, labelHeight, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hovered.product.name, screenX, labelY - 6);

        ctx.fillStyle = '#00d4ff';
        ctx.font = '10px "Pretendard", sans-serif';
        ctx.fillText(`#${hovered.index + 1} · ${hovered.product.client}`, screenX, labelY + 10);
      }

      // Draw dragged item last (on top)
      if (dragged) {
        const screenX = dragOffsetRef.current.x;
        const screenY = dragOffsetRef.current.y;
        const radius = dragged.size * 1.15;

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
        ctx.font = 'bold 11px "Pretendard", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('다른 원 위에 놓으면 순서 교체', screenX, screenY + radius + 20);
      }
    };
  }, [circleItems, dimensions, dpr, bgTheme]);

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
        img.src = product.images[product.thumbnailIndex] || product.images[0];
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
  }, [circleItems, dimensions, bgTheme]);

  const findCircleAtPosition = (clientX: number, clientY: number): CircleItem | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const worldX = mouseX - dimensions.width / 2;
    const worldY = mouseY - dimensions.height / 2;

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
    }

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
    }

    isReorderingRef.current = false;
    draggedItemRef.current = null;
    requestRender();
  };

  const handleMouseLeave = () => {
    isReorderingRef.current = false;
    draggedItemRef.current = null;
    if (hoveredRef.current) {
      hoveredRef.current = null;
      requestRender();
    }
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
    </div>
  );
}
