'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  spriteIdx: number;
  pulsePhase: number;
  pulseSpeed: number;
}

const PARTICLE_COUNT_DESKTOP = 50;
const PARTICLE_COUNT_MOBILE = 25;
const CONNECTION_DIST = 140;
const CONNECTION_DIST_SQ = CONNECTION_DIST * CONNECTION_DIST;
const MOUSE_RADIUS = 180;
const MOUSE_RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS;
const MOUSE_FORCE = 0.012;
const FRICTION = 0.98;
const BASE_SPEED = 0.25;
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

const WAVE_LAYERS = [
  { amp: 28, freq: 0.003, speed: 0.008, phase: 0, yOff: 0.78 },
  { amp: 22, freq: 0.005, speed: 0.012, phase: 1, yOff: 0.83 },
  { amp: 18, freq: 0.004, speed: 0.006, phase: 2, yOff: 0.87 },
  { amp: 32, freq: 0.002, speed: 0.01, phase: 3.5, yOff: 0.91 },
] as const;

const WAVE_COLORS_LIGHT = [
  'rgba(217,119,6,0.06)',
  'rgba(234,88,12,0.04)',
  'rgba(251,191,36,0.05)',
  'rgba(180,83,9,0.03)',
];
const WAVE_COLORS_DARK = [
  'rgba(245,158,11,0.04)',
  'rgba(251,191,36,0.03)',
  'rgba(217,119,6,0.035)',
  'rgba(245,158,11,0.025)',
];

const CONN_ALPHA_STEPS = 16;
const connColorsLight: string[] = [];
const connColorsDark: string[] = [];
for (let i = 0; i <= CONN_ALPHA_STEPS; i++) {
  const a = ((i / CONN_ALPHA_STEPS) * 0.15).toFixed(4);
  connColorsLight.push(`rgba(180,83,9,${a})`);
  connColorsDark.push(`rgba(245,158,11,${a})`);
}

function createParticle(w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * BASE_SPEED,
    vy: (Math.random() - 0.5) * BASE_SPEED,
    radius: Math.random() * 1.8 + 0.8,
    opacity: Math.random() * 0.4 + 0.3,
    spriteIdx: (Math.random() * 4) | 0,
    pulsePhase: Math.random() * Math.PI * 2,
    pulseSpeed: 0.02 + Math.random() * 0.03,
  };
}

function buildParticleSprites(dark: boolean): HTMLCanvasElement[] {
  const hues = [30, 35, 40, 45];
  return hues.map((hue) => {
    const size = 24;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    const cx = size / 2;

    const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
    if (dark) {
      grad.addColorStop(0, `hsla(${hue},90%,80%,0.85)`);
      grad.addColorStop(0.15, `hsla(${hue},85%,65%,0.6)`);
      grad.addColorStop(0.5, `hsla(${hue},80%,55%,0.2)`);
      grad.addColorStop(1, `hsla(${hue},75%,45%,0)`);
    } else {
      grad.addColorStop(0, `hsla(${hue},95%,55%,0.85)`);
      grad.addColorStop(0.15, `hsla(${hue},90%,45%,0.55)`);
      grad.addColorStop(0.5, `hsla(${hue},85%,40%,0.18)`);
      grad.addColorStop(1, `hsla(${hue},80%,35%,0)`);
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cx, cx, 0, Math.PI * 2);
    ctx.fill();
    return c;
  });
}

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    anim: number;
    particles: Particle[];
    sprites: HTMLCanvasElement[];
    mouseX: number;
    mouseY: number;
    mouseActive: boolean;
    time: number;
    isDark: boolean;
    lastFrame: number;
    visible: boolean;
    w: number;
    h: number;
  }>({
    anim: 0,
    particles: [],
    sprites: [],
    mouseX: -9999,
    mouseY: -9999,
    mouseActive: false,
    time: 0,
    isDark: false,
    lastFrame: 0,
    visible: true,
    w: 0,
    h: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const s = stateRef.current;

    s.isDark = document.documentElement.classList.contains('dark');
    s.sprites = buildParticleSprites(s.isDark);

    const observer = new MutationObserver(() => {
      const wasDark = s.isDark;
      s.isDark = document.documentElement.classList.contains('dark');
      if (wasDark !== s.isDark) s.sprites = buildParticleSprites(s.isDark);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      s.w = w;
      s.h = h;
      if (s.particles.length === 0) {
        const count = w < 768 ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
        s.particles = Array.from({ length: count }, () => createParticle(w, h));
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouse = (e: MouseEvent) => {
      s.mouseX = e.clientX;
      s.mouseY = e.clientY;
      s.mouseActive = true;
    };
    const onLeave = () => {
      s.mouseActive = false;
    };
    const onVisibility = () => {
      s.visible = !document.hidden;
      if (s.visible) {
        s.lastFrame = performance.now();
        s.anim = requestAnimationFrame(draw);
      }
    };

    document.addEventListener('mousemove', onMouse, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);

    const draw = (now: number) => {
      if (!s.visible) return;

      const elapsed = now - s.lastFrame;
      if (elapsed < FRAME_INTERVAL) {
        s.anim = requestAnimationFrame(draw);
        return;
      }
      s.lastFrame = now - (elapsed % FRAME_INTERVAL);

      const { w, h, particles, isDark } = s;
      s.time += 1;
      const t = s.time;

      ctx.clearRect(0, 0, w, h);

      // --- Waves (reduced step) ---
      const waveColors = isDark ? WAVE_COLORS_DARK : WAVE_COLORS_LIGHT;
      for (let li = 0; li < WAVE_LAYERS.length; li++) {
        const layer = WAVE_LAYERS[li];
        ctx.beginPath();
        const baseY = h * layer.yOff;
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 8) {
          const y =
            baseY +
            Math.sin(x * layer.freq + t * layer.speed + layer.phase) *
              layer.amp +
            Math.sin(x * layer.freq * 1.5 + t * layer.speed * 0.7) *
              (layer.amp * 0.4);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = waveColors[li];
        ctx.fill();
      }

      // --- Update particles ---
      const mx = s.mouseX;
      const my = s.mouseY;
      const mouseOn = s.mouseActive;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (mouseOn) {
          const dx = mx - p.x;
          const dy = my - p.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < MOUSE_RADIUS_SQ && distSq > 1) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }
        p.vx *= FRICTION;
        p.vy *= FRICTION;
        p.x += p.vx;
        p.y += p.vy;
        p.pulsePhase += p.pulseSpeed;

        if (p.x < -20) p.x = w + 20;
        else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        else if (p.y > h + 20) p.y = -20;
      }

      // --- Spatial grid for connections ---
      const cellSize = CONNECTION_DIST;
      const cols = Math.ceil(w / cellSize) + 1;
      const rows = Math.ceil(h / cellSize) + 1;
      const gridLen = cols * rows;
      const grid: number[][] = new Array(gridLen);
      for (let i = 0; i < gridLen; i++) grid[i] = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const col = Math.max(0, Math.min(cols - 1, (p.x / cellSize) | 0));
        const row = Math.max(0, Math.min(rows - 1, (p.y / cellSize) | 0));
        grid[row * cols + col].push(i);
      }

      // --- Batch connections ---
      const connColors = isDark ? connColorsDark : connColorsLight;
      ctx.lineWidth = 0.5;

      const buckets: [number, number][][] = new Array(CONN_ALPHA_STEPS + 1);
      for (let i = 0; i <= CONN_ALPHA_STEPS; i++) buckets[i] = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cellIdx = row * cols + col;
          const cell = grid[cellIdx];
          if (cell.length === 0) continue;

          for (let dc = 0; dc <= 1; dc++) {
            for (let dr = dc === 0 ? 0 : -1; dr <= 1; dr++) {
              const nc = col + dc;
              const nr = row + dr;
              if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
              const neighborIdx = nr * cols + nc;
              const neighbor = grid[neighborIdx];
              if (neighbor.length === 0) continue;

              const isSelf = cellIdx === neighborIdx;
              for (let ci = 0; ci < cell.length; ci++) {
                const a = particles[cell[ci]];
                const jStart = isSelf ? ci + 1 : 0;
                for (let cj = jStart; cj < neighbor.length; cj++) {
                  const b = particles[neighbor[cj]];
                  const dx = a.x - b.x;
                  const dy = a.y - b.y;
                  const distSq = dx * dx + dy * dy;
                  if (distSq < CONNECTION_DIST_SQ) {
                    const ratio = 1 - Math.sqrt(distSq) / CONNECTION_DIST;
                    const bucket = (ratio * CONN_ALPHA_STEPS + 0.5) | 0;
                    buckets[bucket].push([cell[ci], neighbor[cj]]);
                  }
                }
              }
            }
          }
        }
      }

      for (let b = 1; b <= CONN_ALPHA_STEPS; b++) {
        const lines = buckets[b];
        if (lines.length === 0) continue;
        ctx.beginPath();
        for (let l = 0; l < lines.length; l++) {
          const a = particles[lines[l][0]];
          const bP = particles[lines[l][1]];
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(bP.x, bP.y);
        }
        ctx.strokeStyle = connColors[b];
        ctx.stroke();
      }

      // --- Draw particles (sprite stamp) ---
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pulse = 0.6 + Math.sin(p.pulsePhase) * 0.4;
        const size = p.radius * pulse * 6;
        ctx.globalAlpha = p.opacity * pulse;
        ctx.drawImage(
          s.sprites[p.spriteIdx],
          p.x - size * 0.5,
          p.y - size * 0.5,
          size,
          size,
        );
      }
      ctx.globalAlpha = 1;

      // --- Mouse glow ---
      if (mouseOn) {
        const glow = ctx.createRadialGradient(mx, my, 0, mx, my, MOUSE_RADIUS);
        glow.addColorStop(
          0,
          isDark ? 'rgba(251,191,36,0.06)' : 'rgba(217,119,6,0.04)',
        );
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(mx, my, MOUSE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      s.anim = requestAnimationFrame(draw);
    };

    s.lastFrame = performance.now();
    s.anim = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(s.anim);
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', onMouse);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen"
      style={{ imageRendering: 'auto' }}
      aria-hidden
    />
  );
}
