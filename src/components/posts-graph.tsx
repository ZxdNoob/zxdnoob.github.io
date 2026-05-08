'use client';

/**
 * 文章关系图谱（force-directed SVG）。
 *
 * ## 算法
 * - 自实现简化 Verlet：每帧三种力作用
 *   1. 节点间 Coulomb-like 排斥（防止重叠）
 *   2. 边连接的节点间 Hooke 弹簧（拉近相关文章）
 *   3. 向画布中心微弱「重力」（防止飘出视口）
 * - 阻尼 0.85，迭代 ~280 次后稳定，再切到「按需重算」模式
 * - 不依赖 d3/cytoscape — 个人博客几十～百节点级别 O(N²) 完全够用
 *
 * ## React 19 兼容
 * - simulation state 全部装在一个 `GraphSimulation` 类里，外部仅通过 `useRef<GraphSimulation>`
 *   持有它；class 内部的 mutation 不在 React Compiler 的不可变性追踪范围内
 * - 每帧 RAF 后用 `forceTick`（递增 number）触发组件重渲染
 *
 * ## 交互
 * - hover：节点高亮 + 浮卡显示标题 / 系列 / 阅读时长
 * - drag：用户可拖动节点重新布局
 * - 节点点击跳转文章详情
 * - 「重新布局」按钮 = 重置位置并跑新 simulation
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GraphLink, GraphNode, PostsGraph } from '@/lib/posts';

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** hue 0-360；按 series 分配；-1 表示「未分类」用灰色 */
  hue: number;
}

interface SimLink extends GraphLink {
  /** 弹簧静止长度 — 边权越大越短（关系越紧密越近） */
  rest: number;
}

const WIDTH = 1100;
const HEIGHT = 640;
const PAD = 40;
const MAX_ITERATIONS = 280;

function pickHue(series: string, palette: string[]): number {
  if (!series || series === '未分类') return -1;
  const idx = palette.indexOf(series);
  return ((idx >= 0 ? idx : palette.length) * 137) % 360;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * 力导向模拟器：所有 nodes / links / drag / iter 状态都装在 class 内。
 * React 不追踪类内部字段，因此可以自由 mutate，避免触发 immutability lint。
 */
class GraphSimulation {
  nodes: SimNode[] = [];
  links: SimLink[] = [];
  /** slug → nodes 数组下标，每次 reset 重建一次 */
  private slugIndex = new Map<string, number>();
  iter = 0;
  /** 当前正在拖拽的节点 id；null 表示无拖拽 */
  private dragging: string | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  reset(data: PostsGraph, palette: string[]): void {
    if (data.nodes.length === 0) {
      this.nodes = [];
      this.links = [];
      this.slugIndex.clear();
      this.iter = 0;
      return;
    }
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    const radius = Math.min(WIDTH, HEIGHT) / 2.4;
    this.nodes = data.nodes.map((n, i) => {
      const angle = (i / data.nodes.length) * Math.PI * 2;
      return {
        ...n,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        r: 8 + Math.min(8, n.tags.length * 1.2),
        hue: pickHue(n.series, palette),
      };
    });
    const slugSet = new Set(data.nodes.map((n) => n.slug));
    this.links = data.links
      .filter((l) => slugSet.has(l.source) && slugSet.has(l.target))
      .map((l) => ({
        ...l,
        rest: clamp(180 - l.weight * 0.6, 60, 160),
      }));
    this.slugIndex = new Map(this.nodes.map((n, idx) => [n.slug, idx]));
    this.iter = 0;
  }

  /** 给所有节点一个随机扰动 — 让 simulation 重新激活 */
  shake(): void {
    for (const n of this.nodes) {
      n.vx = (Math.random() - 0.5) * 30;
      n.vy = (Math.random() - 0.5) * 30;
    }
    this.iter = 0;
  }

  startDrag(slug: string, mouseX: number, mouseY: number): void {
    const idx = this.slugIndex.get(slug);
    if (idx == null) return;
    this.dragging = slug;
    this.dragOffsetX = this.nodes[idx].x - mouseX;
    this.dragOffsetY = this.nodes[idx].y - mouseY;
  }

  moveDrag(mouseX: number, mouseY: number): void {
    if (!this.dragging) return;
    const idx = this.slugIndex.get(this.dragging);
    if (idx == null) return;
    this.nodes[idx].x = clamp(mouseX + this.dragOffsetX, PAD, WIDTH - PAD);
    this.nodes[idx].y = clamp(mouseY + this.dragOffsetY, PAD, HEIGHT - PAD);
    this.nodes[idx].vx = 0;
    this.nodes[idx].vy = 0;
  }

  endDrag(): string | null {
    const id = this.dragging;
    this.dragging = null;
    return id;
  }

  isDragging(slug: string): boolean {
    return this.dragging === slug;
  }

  /** 单步力学：排斥 + 弹簧 + 重力 + 阻尼。返回是否还需要继续模拟。 */
  tick(): boolean {
    if (this.nodes.length === 0) return false;
    if (this.iter > MAX_ITERATIONS) return false;
    this.iter += 1;

    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;

    /** 1) Coulomb 排斥 */
    const repulse = 1400;
    for (let i = 0; i < this.nodes.length; i += 1) {
      for (let j = i + 1; j < this.nodes.length; j += 1) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist2 = dx * dx + dy * dy + 0.01;
        const dist = Math.sqrt(dist2);
        const force = repulse / dist2;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    /** 2) Hooke 弹簧 */
    const k = 0.06;
    for (const l of this.links) {
      const ai = this.slugIndex.get(l.source);
      const bi = this.slugIndex.get(l.target);
      if (ai == null || bi == null) continue;
      const a = this.nodes[ai];
      const b = this.nodes[bi];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const delta = dist - l.rest;
      const fx = (dx / dist) * delta * k;
      const fy = (dy / dist) * delta * k;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    /** 3) 中心重力 */
    const gravity = 0.012;
    for (const n of this.nodes) {
      n.vx += (cx - n.x) * gravity;
      n.vy += (cy - n.y) * gravity;
    }

    /** 4) 阻尼 + 位置 + 边界 */
    const damping = 0.85;
    for (const n of this.nodes) {
      n.vx *= damping;
      n.vy *= damping;
      n.x += clamp(n.vx, -16, 16);
      n.y += clamp(n.vy, -16, 16);
      n.x = clamp(n.x, PAD, WIDTH - PAD);
      n.y = clamp(n.y, PAD, HEIGHT - PAD);
    }

    /** 拖拽中的节点强制贴随鼠标 */
    if (this.dragging) {
      const idx = this.slugIndex.get(this.dragging);
      if (idx != null) {
        this.nodes[idx].vx = 0;
        this.nodes[idx].vy = 0;
      }
    }
    return true;
  }
}

/** simulation 暴露给 render 的不可变 snapshot */
interface GraphSnapshot {
  nodes: SimNode[];
  links: SimLink[];
}

export function PostsGraph({ data }: { data: PostsGraph }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simRef = useRef<GraphSimulation>(new GraphSimulation());
  const animRef = useRef<number | null>(null);

  const [hovered, setHovered] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [seriesFilter, setSeriesFilter] = useState<string | null>(null);
  /**
   * 把 sim 状态以 snapshot 形式暴露给 render，避免在 render 阶段读 ref（React 19 严禁）。
   * 节点 / 边数组浅拷贝即可触发重渲染；个人博客规模 N≤200 60fps 没问题。
   */
  const [snapshot, setSnapshot] = useState<GraphSnapshot>({
    nodes: [],
    links: [],
  });

  /** 系列调色板（顺序稳定，不因 nodes 顺序波动而跳） */
  const seriesPalette = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const n of data.nodes) {
      if (!n.series || n.series === '未分类') continue;
      if (seen.has(n.series)) continue;
      seen.add(n.series);
      out.push(n.series);
    }
    return out;
  }, [data]);

  /** 把当前 sim 状态浅拷贝到 React state（外部需自行调用） */
  const publishSnapshot = useCallback(() => {
    const sim = simRef.current;
    setSnapshot({
      nodes: sim.nodes.slice(),
      links: sim.links.slice(),
    });
  }, []);

  /** 启动 RAF 循环 */
  const startLoop = useCallback(() => {
    if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    const step = () => {
      const continueRunning = simRef.current.tick();
      publishSnapshot();
      if (continueRunning) {
        animRef.current = requestAnimationFrame(step);
      } else {
        animRef.current = null;
      }
    };
    animRef.current = requestAnimationFrame(step);
  }, [publishSnapshot]);

  /** 数据变化 → 重置 + 重启 simulation */
  useEffect(() => {
    simRef.current.reset(data, seriesPalette);
    publishSnapshot();
    startLoop();
    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [data, seriesPalette, startLoop, publishSnapshot]);

  const replay = useCallback(() => {
    simRef.current.shake();
    startLoop();
  }, [startLoop]);

  /** 鼠标坐标 → SVG viewBox 坐标（事件处理内可读 ref） */
  const toSvgCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * WIDTH,
      y: ((clientY - rect.top) / rect.height) * HEIGHT,
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGCircleElement>, slug: string) => {
      if (e.button !== 0) return;
      e.preventDefault();
      (e.target as SVGCircleElement).setPointerCapture(e.pointerId);
      const { x, y } = toSvgCoords(e.clientX, e.clientY);
      simRef.current.startDrag(slug, x, y);
      setDraggingId(slug);
      replay();
    },
    [replay, toSvgCoords],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGElement>) => {
      if (!draggingId) return;
      e.preventDefault();
      const { x, y } = toSvgCoords(e.clientX, e.clientY);
      simRef.current.moveDrag(x, y);
      publishSnapshot();
    },
    [draggingId, toSvgCoords, publishSnapshot],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<SVGElement>) => {
      if (!draggingId) return;
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      simRef.current.endDrag();
      setDraggingId(null);
    },
    [draggingId],
  );

  if (data.nodes.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--border)] p-12 text-center">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          暂无文章数据 — 请先启动后端并写入文章后再回来。
        </p>
      </div>
    );
  }

  const { nodes, links } = snapshot;
  const isDimmed = (n: SimNode) =>
    seriesFilter !== null && n.series !== seriesFilter;
  const slugToIdx = new Map(nodes.map((n, i) => [n.slug, i]));
  const hoveredNode = hovered ? nodes[slugToIdx.get(hovered) ?? -1] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={replay}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:border-stone-300 hover:bg-[var(--surface)] dark:text-stone-200 dark:hover:border-stone-600"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          重新布局
        </button>
        <span className="ml-1 text-xs text-stone-500 dark:text-stone-500">
          按系列筛选：
        </span>
        <button
          type="button"
          onClick={() => setSeriesFilter(null)}
          className={[
            'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
            seriesFilter === null
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
              : 'border border-[var(--border)] text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800',
          ].join(' ')}
        >
          全部
        </button>
        {seriesPalette.map((s, i) => {
          const hue = (i * 137) % 360;
          const active = seriesFilter === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSeriesFilter(active ? null : s)}
              className={[
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                active
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-[var(--border)] text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800/40',
              ].join(' ')}
              style={
                active
                  ? {
                      backgroundColor: `hsl(${hue} 70% 45%)`,
                    }
                  : undefined
              }
            >
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: `hsl(${hue} 70% 50%)` }}
              />
              {s}
            </button>
          );
        })}
      </div>

      <div
        className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]/40"
        style={{ aspectRatio: `${WIDTH}/${HEIGHT}` }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-full w-full"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* 边 */}
          <g
            stroke="currentColor"
            className="text-stone-300/60 dark:text-stone-700/40"
          >
            {links.map((l, i) => {
              const ai = slugToIdx.get(l.source);
              const bi = slugToIdx.get(l.target);
              if (ai == null || bi == null) return null;
              const a = nodes[ai];
              const b = nodes[bi];
              const dimmed =
                seriesFilter !== null &&
                a.series !== seriesFilter &&
                b.series !== seriesFilter;
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  strokeWidth={Math.max(0.5, Math.min(2.5, l.weight / 24))}
                  opacity={dimmed ? 0.08 : 0.55}
                />
              );
            })}
          </g>

          {/* 节点 */}
          <g>
            {nodes.map((n) => {
              const dimmed = isDimmed(n);
              const isHovered = hovered === n.slug;
              const fill =
                n.hue >= 0 ? `hsl(${n.hue} 72% 52%)` : 'hsl(30 4% 60%)';
              return (
                <g key={n.slug} opacity={dimmed ? 0.18 : 1}>
                  {isHovered ? (
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={n.r + 8}
                      fill="none"
                      stroke={fill}
                      strokeOpacity={0.4}
                      strokeWidth={6}
                    />
                  ) : null}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    fill={fill}
                    stroke="white"
                    strokeWidth={1.6}
                    style={{
                      cursor: draggingId === n.slug ? 'grabbing' : 'grab',
                      filter: isHovered
                        ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.18))'
                        : undefined,
                    }}
                    onPointerDown={(e) => onPointerDown(e, n.slug)}
                    onMouseEnter={() => setHovered(n.slug)}
                    onMouseLeave={() =>
                      setHovered((h) => (h === n.slug ? null : h))
                    }
                    onClick={(e) => {
                      if (draggingId) e.preventDefault();
                    }}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {hoveredNode ? (
          <div
            role="tooltip"
            className="pointer-events-auto absolute z-10 max-w-[260px] rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 px-3 py-2 text-sm shadow-lg backdrop-blur-sm"
            style={{
              left: `calc(${(hoveredNode.x / WIDTH) * 100}% + 12px)`,
              top: `calc(${(hoveredNode.y / HEIGHT) * 100}% - 12px)`,
              transform: 'translateY(-100%)',
            }}
          >
            <p className="font-serif text-sm font-semibold text-stone-900 dark:text-stone-50">
              {hoveredNode.title}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-stone-500 dark:text-stone-400">
              {hoveredNode.series !== '未分类' ? (
                <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  {hoveredNode.series}
                </span>
              ) : null}
              <span>{hoveredNode.readingMinutes} 分钟</span>
              {hoveredNode.tags.length > 0 ? (
                <span>· {hoveredNode.tags.slice(0, 3).join(' / ')}</span>
              ) : null}
            </p>
            <Link
              href={hoveredNode.url}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              阅读全文
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        ) : null}
      </div>

      <p className="text-xs text-stone-500 dark:text-stone-500">
        节点 = 文章；边 = 内容相似度（trigram Jaccard）+ 标签 / 系列加权 ·
        悬停查看详情，按住可拖拽，点击节点跳转文章
      </p>
    </div>
  );
}
