'use client';

import { useEffect, useRef } from 'react';

type EffectType = 'snow' | 'cherry' | 'leaves' | 'fireworks' | null;

interface SeasonalEffectsProps {
  effect: EffectType;
  enabled: boolean;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  rotation?: number;
  rotationSpeed?: number;
  color?: string;
  side: 'left' | 'right'; // 어느 쪽 영역에 속하는지
}

export default function SeasonalEffects({ effect, enabled }: SeasonalEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !effect) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      particlesRef.current = [];
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 사이드 영역 너비 (화면의 약 20%)
    const SIDE_WIDTH = canvas.width * 0.22;

    // 사이드 영역에서 랜덤 X 좌표 생성
    const getRandomX = (side: 'left' | 'right'): number => {
      if (side === 'left') {
        return Math.random() * SIDE_WIDTH;
      } else {
        return canvas.width - SIDE_WIDTH + Math.random() * SIDE_WIDTH;
      }
    };

    const createParticle = (forceSide?: 'left' | 'right'): Particle => {
      const side = forceSide || (Math.random() > 0.5 ? 'left' : 'right');

      switch (effect) {
        case 'snow':
          return {
            x: getRandomX(side),
            y: -10,
            size: Math.random() * 4 + 2,
            speedX: Math.random() * 2 - 1,
            speedY: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.5,
            side,
          };
        case 'cherry':
          return {
            x: getRandomX(side),
            y: -10,
            size: Math.random() * 8 + 6,
            speedX: Math.random() * 2 - 0.5,
            speedY: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.4 + 0.6,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 4 - 2,
            color: `hsl(${340 + Math.random() * 20}, 80%, ${70 + Math.random() * 20}%)`,
            side,
          };
        case 'leaves':
          const colors = ['#e67e22', '#d35400', '#f39c12', '#c0392b', '#8e44ad'];
          return {
            x: getRandomX(side),
            y: -10,
            size: Math.random() * 12 + 8,
            speedX: Math.random() * 3 - 1,
            speedY: Math.random() * 2 + 1,
            opacity: Math.random() * 0.3 + 0.7,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 6 - 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            side,
          };
        case 'fireworks':
          return {
            x: getRandomX(side),
            y: canvas.height + 10,
            size: Math.random() * 3 + 2,
            speedX: 0,
            speedY: -(Math.random() * 8 + 6),
            opacity: 1,
            color: `hsl(${Math.random() * 360}, 100%, 60%)`,
            side,
          };
        default:
          return {
            x: 0,
            y: 0,
            size: 0,
            speedX: 0,
            speedY: 0,
            opacity: 0,
            side,
          };
      }
    };

    const particleCount = effect === 'fireworks' ? 3 : effect === 'snow' ? 100 : 50;

    // Initialize particles
    particlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      const particle = createParticle();
      particle.y = Math.random() * canvas.height;
      particlesRef.current.push(particle);
    }

    const drawSnow = (p: Particle) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      ctx.fill();
    };

    const drawCherry = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(((p.rotation || 0) * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;

      // Draw petal shape
      ctx.beginPath();
      ctx.fillStyle = p.color || '#ffb7c5';
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        p.size / 2, -p.size / 2,
        p.size, -p.size / 4,
        p.size, 0
      );
      ctx.bezierCurveTo(
        p.size, p.size / 4,
        p.size / 2, p.size / 2,
        0, 0
      );
      ctx.fill();

      ctx.restore();
    };

    const drawLeaf = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(((p.rotation || 0) * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;

      // Draw leaf shape
      ctx.beginPath();
      ctx.fillStyle = p.color || '#e67e22';
      ctx.moveTo(0, -p.size / 2);
      ctx.bezierCurveTo(
        p.size / 2, -p.size / 4,
        p.size / 2, p.size / 4,
        0, p.size / 2
      );
      ctx.bezierCurveTo(
        -p.size / 2, p.size / 4,
        -p.size / 2, -p.size / 4,
        0, -p.size / 2
      );
      ctx.fill();

      // Leaf vein
      ctx.strokeStyle = `rgba(0, 0, 0, 0.2)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -p.size / 2);
      ctx.lineTo(0, p.size / 2);
      ctx.stroke();

      ctx.restore();
    };

    const drawFirework = (p: Particle) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color || '#fff';
      ctx.globalAlpha = p.opacity;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const fireworkExplosions: { x: number; y: number; particles: Particle[]; life: number }[] = [];

    const createExplosion = (x: number, y: number) => {
      const explosionParticles: Particle[] = [];
      const color = `hsl(${Math.random() * 360}, 100%, 60%)`;
      for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30;
        const speed = Math.random() * 4 + 2;
        explosionParticles.push({
          x,
          y,
          size: Math.random() * 2 + 1,
          speedX: Math.cos(angle) * speed,
          speedY: Math.sin(angle) * speed,
          opacity: 1,
          color,
        });
      }
      fireworkExplosions.push({ x, y, particles: explosionParticles, life: 60 });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p, index) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
          p.rotation += p.rotationSpeed;
        }

        // Draw based on effect type
        switch (effect) {
          case 'snow':
            drawSnow(p);
            break;
          case 'cherry':
            drawCherry(p);
            break;
          case 'leaves':
            drawLeaf(p);
            break;
          case 'fireworks':
            drawFirework(p);
            // Check for explosion
            if (p.speedY >= -2) {
              createExplosion(p.x, p.y);
              particlesRef.current[index] = createParticle(p.side);
            }
            p.speedY += 0.15; // gravity
            break;
        }

        // Reset particle if out of bounds (같은 사이드에서 재생성)
        if (effect !== 'fireworks') {
          if (p.y > canvas.height + 20 || p.x < -20 || p.x > canvas.width + 20) {
            particlesRef.current[index] = createParticle(p.side);
          }
        } else {
          if (p.y > canvas.height + 20) {
            particlesRef.current[index] = createParticle(p.side);
          }
        }
      });

      // Draw and update firework explosions
      if (effect === 'fireworks') {
        fireworkExplosions.forEach((explosion, expIndex) => {
          explosion.life--;
          explosion.particles.forEach((p) => {
            p.x += p.speedX;
            p.y += p.speedY;
            p.speedY += 0.05;
            p.opacity = explosion.life / 60;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color || '#fff';
            ctx.globalAlpha = p.opacity;
            ctx.fill();
            ctx.globalAlpha = 1;
          });

          if (explosion.life <= 0) {
            fireworkExplosions.splice(expIndex, 1);
          }
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [effect, enabled]);

  if (!enabled || !effect) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9999 }}
    />
  );
}
