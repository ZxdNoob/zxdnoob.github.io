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
 * ## 交互（画布语义：与 Figma / Miro / Obsidian Canvas 对齐）
 * - hover：节点高亮 + 浮卡；浮卡可捕获指针以便点击「阅读全文」
 * - 节点拖拽：左键拖动节点重新布局（仿真继续迭代）
 * - 画布平移：空白处左键拖动；任意处中键拖动；按住空格左键拖动（含节点上方，避免误拖力学）；触控板双指滑动（不含 Ctrl/Meta 的 wheel）
 * - Shift + 滚轮：纵向滑动转为横向平移（兼容仅有 deltaY 的鼠标滚轮）
 * - Esc：关闭悬停卡片（不影响缩放）
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
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

/** 与固定 viewBox `0 0 WIDTH HEIGHT` 对应的可见区域（捏合缩放时改宽高与偏移） */
type GraphViewBox = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

const DEFAULT_VIEW_BOX: GraphViewBox = {
  minX: 0,
  minY: 0,
  width: WIDTH,
  height: HEIGHT,
};

/** 相对完整画布的缩放范围（宽为 WIDTH 的倍数） */
const VIEW_MIN_WIDTH = WIDTH / 18;
const VIEW_MAX_WIDTH = WIDTH * 12;

function clampGraphViewBox(vb: GraphViewBox): GraphViewBox {
  const w = clamp(vb.width, VIEW_MIN_WIDTH, VIEW_MAX_WIDTH);
  const h = w * (HEIGHT / WIDTH);
  const minXM = Math.min(0, WIDTH - w);
  const maxXM = Math.max(0, WIDTH - w);
  const minYM = Math.min(0, HEIGHT - h);
  const maxYM = Math.max(0, HEIGHT - h);
  return {
    minX: clamp(vb.minX, minXM, maxXM),
    minY: clamp(vb.minY, minYM, maxYM),
    width: w,
    height: h,
  };
}

/** widthMultiplier > 1 → 放大（可视区域变窄） */
function zoomViewBoxAtPoint(
  vb: GraphViewBox,
  cx: number,
  cy: number,
  widthMultiplier: number,
): GraphViewBox {
  const nw = clamp(vb.width / widthMultiplier, VIEW_MIN_WIDTH, VIEW_MAX_WIDTH);
  const ratio = nw / vb.width;
  return clampGraphViewBox({
    minX: cx - (cx - vb.minX) * ratio,
    minY: cy - (cy - vb.minY) * ratio,
    width: nw,
    height: nw * (HEIGHT / WIDTH),
  });
}

function zoomViewBoxCenter(
  vb: GraphViewBox,
  direction: 'in' | 'out',
): GraphViewBox {
  const cx = vb.minX + vb.width / 2;
  const cy = vb.minY + vb.height / 2;
  const step = 1.2;
  return zoomViewBoxAtPoint(vb, cx, cy, direction === 'in' ? step : 1 / step);
}

function pickHue(series: string, palette: string[]): number {
  if (!series || series === '未分类') return -1;
  const idx = palette.indexOf(series);
  return ((idx >= 0 ? idx : palette.length) * 137) % 360;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function isTypingShortcutConflict(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return Boolean(el.isContentEditable);
}

function shouldDeferSpatialShortcuts(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest('[role="toolbar"]')) return true;
  if (el.closest('[role="tooltip"]')) return true;
  return isTypingShortcutConflict(el);
}

/** 与 Tailwind `gap-2` 对齐，用于测算单行可容纳多少个系列胶囊 */
const FILTER_CHIP_GAP_PX = 8;

function SeriesChipButton({
  seriesName,
  palette,
  selectedSlugs,
  onToggle,
  measureOnly,
}: {
  seriesName: string;
  palette: readonly string[];
  selectedSlugs: readonly string[];
  onToggle: (s: string) => void;
  measureOnly?: boolean;
}) {
  const idx = palette.indexOf(seriesName);
  const hue = ((idx >= 0 ? idx : palette.length) * 137) % 360;
  const active = selectedSlugs.includes(seriesName);
  return (
    <button
      type="button"
      tabIndex={measureOnly ? -1 : 0}
      aria-hidden={measureOnly || undefined}
      className={[
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
        active
          ? 'border-transparent text-white shadow-sm'
          : 'border-[var(--border)] text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800/40',
        measureOnly ? 'pointer-events-none' : '',
      ].join(' ')}
      style={
        active
          ? {
              backgroundColor: `hsl(${hue} 70% 45%)`,
            }
          : undefined
      }
      onClick={() => {
        if (!measureOnly) onToggle(seriesName);
      }}
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: `hsl(${hue} 70% 50%)` }}
      />
      {seriesName}
    </button>
  );
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

/** 节点 → 浮卡移动间隙略大于一轮指针事件间隔，避免一过空白就收起卡片 */
const HOVER_DISMISS_MS = 180;

/** Ctrl/Meta + wheel 缩放灵敏度（捏合同通道） */
const WHEEL_ZOOM_SENSITIVITY = 0.00165;

export function PostsGraph({ data }: { data: PostsGraph }) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const graphViewportRef = useRef<HTMLDivElement | null>(null);
  const canvasPanRef = useRef<{
    pointerId: number;
    lastClientX: number;
    lastClientY: number;
  } | null>(null);
  const canvasPanCaptureElRef = useRef<Element | null>(null);
  const nodeDragStartClientRef = useRef<{ x: number; y: number } | null>(null);
  const spacePanHeldRef = useRef(false);
  const simRef = useRef<GraphSimulation>(new GraphSimulation());
  const animRef = useRef<number | null>(null);
  const hoverDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [hovered, setHovered] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [canvasPanning, setCanvasPanning] = useState(false);
  const [selectedSeriesSlugs, setSelectedSeriesSlugs] = useState<string[]>([]);
  const [moreSeriesMenuOpen, setMoreSeriesMenuOpen] = useState(false);
  const [inlineSeriesCap, setInlineSeriesCap] = useState(1 << 20);

  const chipsTrackRef = useRef<HTMLDivElement | null>(null);
  const measureGhostRef = useRef<HTMLDivElement | null>(null);
  const moreSeriesBtnRef = useRef<HTMLButtonElement | null>(null);
  const moreSeriesPanelRef = useRef<HTMLDivElement | null>(null);
  const moreSeriesMenuListId = useId();

  const toggleSeriesSlug = useCallback((slug: string) => {
    setSelectedSeriesSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return [...next].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    });
  }, []);

  const clearSeriesSelection = useCallback(() => {
    setSelectedSeriesSlugs([]);
  }, []);

  /**
   * 把 sim 状态以 snapshot 形式暴露给 render，避免在 render 阶段读 ref（React 19 严禁）。
   * 节点 / 边数组浅拷贝即可触发重渲染；个人博客规模 N≤200 60fps 没问题。
   */
  const [snapshot, setSnapshot] = useState<GraphSnapshot>({
    nodes: [],
    links: [],
  });
  const [viewBox, setViewBox] = useState<GraphViewBox>(() => ({
    ...DEFAULT_VIEW_BOX,
  }));

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

  /** 图谱数据去掉某系列后，丢弃已无效的选中项（不触发额外 effect setState） */
  const effectiveSeriesSelection = useMemo(() => {
    const valid = new Set(seriesPalette);
    return selectedSeriesSlugs.filter((s) => valid.has(s));
  }, [seriesPalette, selectedSeriesSlugs]);

  const filteringSeries = effectiveSeriesSelection.length > 0;

  const recalcInlineSeriesCap = useCallback(() => {
    const track = chipsTrackRef.current;
    const ghost = measureGhostRef.current;
    if (seriesPalette.length === 0) {
      setInlineSeriesCap(0);
      return;
    }
    if (!track || !ghost) return;
    const kids = ghost.children;
    if (kids.length !== seriesPalette.length + 1) return;
    const avail = track.clientWidth;
    const gap = FILTER_CHIP_GAP_PX;
    const moreBtnW = (kids[seriesPalette.length] as HTMLElement).offsetWidth;
    let cap = 0;
    let used = 0;
    for (let i = 0; i < seriesPalette.length; i++) {
      const w = (kids[i] as HTMLElement).offsetWidth;
      const remainingAfter = seriesPalette.length - i - 1;
      const segment = (cap > 0 ? gap : 0) + w;
      const needMoreBtn = remainingAfter > 0;
      if (used + segment + (needMoreBtn ? gap + moreBtnW : 0) > avail + 0.5) {
        break;
      }
      used += segment;
      cap++;
    }
    setInlineSeriesCap(cap);
  }, [seriesPalette]);

  useEffect(() => {
    const track = chipsTrackRef.current;
    if (!track) return;
    const schedule = () => queueMicrotask(() => recalcInlineSeriesCap());
    const ro = new ResizeObserver(schedule);
    ro.observe(track);
    schedule();
    return () => ro.disconnect();
  }, [recalcInlineSeriesCap, selectedSeriesSlugs]);

  useEffect(() => {
    if (!moreSeriesMenuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (moreSeriesBtnRef.current?.contains(t)) return;
      if (moreSeriesPanelRef.current?.contains(t)) return;
      setMoreSeriesMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [moreSeriesMenuOpen]);

  useEffect(() => {
    if (!moreSeriesMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreSeriesMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreSeriesMenuOpen]);

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

  /** 数据变化 → 重置 + 重启 simulation（视图缩放见外层 key，避免在此同步 setState） */
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

  /** 触控板捏合缩放 + 双指滑动平移（单一 wheel、非 passive） */
  useEffect(() => {
    if (data.nodes.length === 0) return;
    const svg = svgRef.current;
    if (!svg) return;

    const onWheel = (e: WheelEvent) => {
      const rect = svg.getBoundingClientRect();
      const normalizeDelta = (dx: number, dy: number) => {
        if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
          return { dx: dx * 16, dy: dy * 16 };
        }
        if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
          return {
            dx: dx * rect.width * 0.92,
            dy: dy * rect.height * 0.92,
          };
        }
        return { dx, dy };
      };

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const inv = svg.getScreenCTM()?.inverse();
        if (!inv) return;
        const p = pt.matrixTransform(inv);
        const factor = Math.exp(e.deltaY * WHEEL_ZOOM_SENSITIVITY);
        setViewBox((prev) => {
          const { minX, minY, width: w } = prev;
          const nw = clamp(w * factor, VIEW_MIN_WIDTH, VIEW_MAX_WIDTH);
          const ratio = nw / w;
          return clampGraphViewBox({
            minX: p.x - (p.x - minX) * ratio,
            minY: p.y - (p.y - minY) * ratio,
            width: nw,
            height: nw * (HEIGHT / WIDTH),
          });
        });
        return;
      }

      const { dx, dy } = normalizeDelta(e.deltaX, e.deltaY);
      let panDx = dx;
      let panDy = dy;
      if (e.shiftKey) {
        panDx += dy;
        panDy = 0;
      }

      if (panDx === 0 && panDy === 0) return;
      e.preventDefault();
      setViewBox((prev) =>
        clampGraphViewBox({
          ...prev,
          minX: prev.minX + (panDx * prev.width) / rect.width,
          minY: prev.minY + (panDy * prev.height) / rect.height,
        }),
      );
    };

    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [data.nodes.length]);

  const cancelHoverDismiss = useCallback(() => {
    if (hoverDismissTimerRef.current !== null) {
      clearTimeout(hoverDismissTimerRef.current);
      hoverDismissTimerRef.current = null;
    }
  }, []);

  const scheduleHoverDismiss = useCallback(() => {
    cancelHoverDismiss();
    hoverDismissTimerRef.current = setTimeout(() => {
      hoverDismissTimerRef.current = null;
      setHovered(null);
    }, HOVER_DISMISS_MS);
  }, [cancelHoverDismiss]);

  useEffect(() => () => cancelHoverDismiss(), [cancelHoverDismiss]);

  /** 键盘：空格抓手平移、Esc 关卡片、+/−/0/方向键（画布激活且不在工具栏/卡片字段内） */
  useEffect(() => {
    const clearSpacePan = () => {
      spacePanHeldRef.current = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const root = graphViewportRef.current;
      const svg = svgRef.current;
      if (!root || !svg) return;

      const viewportHot =
        root.contains(document.activeElement) ||
        (typeof root.matches === 'function' && root.matches(':hover'));

      const toolbar = root.querySelector('[data-graph-toolbar="true"]');
      const toolbarHovered =
        toolbar instanceof Element &&
        typeof toolbar.matches === 'function' &&
        toolbar.matches(':hover');

      const spatialHot =
        viewportHot &&
        !toolbarHovered &&
        (svg.matches(':hover') ||
          root === document.activeElement ||
          svg.contains(document.activeElement));

      if (e.code === 'Escape') {
        if (!viewportHot || isTypingShortcutConflict(e.target)) return;
        e.preventDefault();
        cancelHoverDismiss();
        setHovered(null);
        return;
      }

      if (!spatialHot || shouldDeferSpatialShortcuts(e.target)) return;

      const viewportCenterSvg = (): { x: number; y: number } => {
        const r = svg.getBoundingClientRect();
        const pt = svg.createSVGPoint();
        pt.x = r.left + r.width / 2;
        pt.y = r.top + r.height / 2;
        const inv = svg.getScreenCTM()?.inverse();
        if (!inv) return { x: WIDTH / 2, y: HEIGHT / 2 };
        const p = pt.matrixTransform(inv);
        return { x: p.x, y: p.y };
      };

      if (e.code === 'Space') {
        if (e.repeat) return;
        e.preventDefault();
        spacePanHeldRef.current = true;
        return;
      }

      switch (e.key) {
        case '+':
        case '=': {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          e.preventDefault();
          const { x, y } = viewportCenterSvg();
          setViewBox((vb) => zoomViewBoxAtPoint(vb, x, y, 1.2));
          break;
        }
        case '-':
        case '_': {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          e.preventDefault();
          const { x, y } = viewportCenterSvg();
          setViewBox((vb) => zoomViewBoxAtPoint(vb, x, y, 1 / 1.2));
          break;
        }
        case '0': {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          e.preventDefault();
          setViewBox({ ...DEFAULT_VIEW_BOX });
          break;
        }
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown': {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          e.preventDefault();
          setViewBox((vb) => {
            const step = (52 * WIDTH) / vb.width;
            const sx =
              e.key === 'ArrowLeft' ? step : e.key === 'ArrowRight' ? -step : 0;
            const sy =
              e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0;
            return clampGraphViewBox({
              ...vb,
              minX: vb.minX + sx,
              minY: vb.minY + sy,
            });
          });
          break;
        }
        default:
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      clearSpacePan();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearSpacePan);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearSpacePan);
    };
  }, [cancelHoverDismiss]);

  const replay = useCallback(() => {
    simRef.current.shake();
    startLoop();
  }, [startLoop]);

  /** 鼠标坐标 → 当前 SVG 用户坐标（随 viewBox 变化，与捏合缩放一致） */
  const toSvgCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const inv = svg.getScreenCTM()?.inverse();
    if (!inv) return { x: 0, y: 0 };
    const p = pt.matrixTransform(inv);
    return { x: p.x, y: p.y };
  }, []);

  const beginCanvasPan = useCallback((e: React.PointerEvent<Element>) => {
    if (e.button !== 0 && e.button !== 1) return;
    e.preventDefault();
    const el = e.currentTarget;
    canvasPanCaptureElRef.current = el;
    el.setPointerCapture(e.pointerId);
    canvasPanRef.current = {
      pointerId: e.pointerId,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
    };
    setCanvasPanning(true);
  }, []);

  const handleSvgPointerMove = useCallback(
    (e: React.PointerEvent<SVGElement>) => {
      const pan = canvasPanRef.current;
      if (pan && pan.pointerId === e.pointerId) {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const dx = e.clientX - pan.lastClientX;
        const dy = e.clientY - pan.lastClientY;
        pan.lastClientX = e.clientX;
        pan.lastClientY = e.clientY;
        setViewBox((prev) =>
          clampGraphViewBox({
            ...prev,
            minX: prev.minX - (dx * prev.width) / rect.width,
            minY: prev.minY - (dy * prev.height) / rect.height,
          }),
        );
        return;
      }
      if (draggingId) {
        e.preventDefault();
        const { x, y } = toSvgCoords(e.clientX, e.clientY);
        simRef.current.moveDrag(x, y);
        publishSnapshot();
      }
    },
    [draggingId, publishSnapshot, toSvgCoords],
  );

  const handleSvgPointerUp = useCallback(
    (e: React.PointerEvent<SVGElement>) => {
      const pan = canvasPanRef.current;
      if (pan && pan.pointerId === e.pointerId) {
        canvasPanRef.current = null;
        setCanvasPanning(false);
        try {
          canvasPanCaptureElRef.current?.releasePointerCapture?.(e.pointerId);
        } catch {
          /* noop */
        }
        canvasPanCaptureElRef.current = null;
        return;
      }
      if (!draggingId) return;
      const slug = draggingId;
      const start = nodeDragStartClientRef.current;
      nodeDragStartClientRef.current = null;
      const travelPx =
        start != null
          ? Math.hypot(e.clientX - start.x, e.clientY - start.y)
          : 999;
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      simRef.current.endDrag();
      setDraggingId(null);
      if (travelPx < 11) {
        const post = data.nodes.find((n) => n.slug === slug);
        if (post) router.push(post.url);
      }
    },
    [data.nodes, draggingId, router],
  );

  const onNodePointerDown = useCallback(
    (e: React.PointerEvent<SVGCircleElement>, slug: string) => {
      if (spacePanHeldRef.current && e.button === 0) {
        beginCanvasPan(e);
        return;
      }
      if (e.button === 1) {
        beginCanvasPan(e);
        return;
      }
      if (e.button !== 0) return;
      e.preventDefault();
      nodeDragStartClientRef.current = {
        x: e.clientX,
        y: e.clientY,
      };
      (e.target as SVGCircleElement).setPointerCapture(e.pointerId);
      const { x, y } = toSvgCoords(e.clientX, e.clientY);
      simRef.current.startDrag(slug, x, y);
      setDraggingId(slug);
      replay();
    },
    [beginCanvasPan, replay, toSvgCoords],
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
    filteringSeries && !effectiveSeriesSelection.includes(n.series);
  const slugToIdx = new Map(nodes.map((n, i) => [n.slug, i]));
  const hoveredNode = hovered ? nodes[slugToIdx.get(hovered) ?? -1] : null;
  const zoomPercent = Math.round((WIDTH / viewBox.width) * 100);

  const inlineSeriesLimit = Math.min(inlineSeriesCap, seriesPalette.length);
  const inlineSeriesList = seriesPalette.slice(0, inlineSeriesLimit);
  const overflowSeriesList = seriesPalette.slice(inlineSeriesLimit);
  const overflowSeriesSelectedCount = overflowSeriesList.filter((s) =>
    effectiveSeriesSelection.includes(s),
  ).length;

  const moreSeriesBtnGhostClass =
    'inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 px-2.5 py-1 text-[11px] font-semibold text-stone-700 dark:text-stone-200';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
          <span className="text-xs text-stone-500 dark:text-stone-500">
            按系列筛选（可多选）：
          </span>
          <button
            type="button"
            onClick={() => {
              clearSeriesSelection();
              setMoreSeriesMenuOpen(false);
            }}
            className={[
              'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
              !filteringSeries
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                : 'border border-[var(--border)] text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800',
            ].join(' ')}
          >
            全部
          </button>
        </div>

        <div
          ref={chipsTrackRef}
          className="relative flex min-h-[30px] min-w-0 flex-1 flex-nowrap items-center gap-2"
        >
          <div
            ref={measureGhostRef}
            className="pointer-events-none invisible absolute left-0 top-0 z-[-1] flex gap-2 whitespace-nowrap"
            aria-hidden
          >
            {seriesPalette.map((s) => (
              <SeriesChipButton
                key={`measure-${s}`}
                seriesName={s}
                palette={seriesPalette}
                selectedSlugs={[]}
                onToggle={() => {}}
                measureOnly
              />
            ))}
            <button
              type="button"
              tabIndex={-1}
              className={moreSeriesBtnGhostClass}
            >
              更多
            </button>
          </div>

          {inlineSeriesList.map((s) => (
            <SeriesChipButton
              key={s}
              seriesName={s}
              palette={seriesPalette}
              selectedSlugs={effectiveSeriesSelection}
              onToggle={toggleSeriesSlug}
            />
          ))}

          {overflowSeriesList.length > 0 ? (
            <div className="relative shrink-0">
              <button
                ref={moreSeriesBtnRef}
                type="button"
                className={[
                  moreSeriesBtnGhostClass,
                  moreSeriesMenuOpen
                    ? 'border-[var(--accent)] ring-2 ring-[var(--focus-ring)]'
                    : '',
                ].join(' ')}
                aria-expanded={moreSeriesMenuOpen}
                aria-haspopup="listbox"
                aria-controls={moreSeriesMenuListId}
                onClick={() => setMoreSeriesMenuOpen((o) => !o)}
              >
                更多
                <span className="tabular-nums text-stone-500 dark:text-stone-400">
                  （{overflowSeriesList.length}）
                </span>
                {overflowSeriesSelectedCount > 0 ? (
                  <span className="ml-0.5 min-w-[1.15rem] rounded-full bg-[var(--accent)] px-1 text-center text-[10px] font-bold leading-tight text-white">
                    {overflowSeriesSelectedCount}
                  </span>
                ) : null}
              </button>

              {moreSeriesMenuOpen ? (
                <div
                  ref={moreSeriesPanelRef}
                  id={moreSeriesMenuListId}
                  role="listbox"
                  aria-multiselectable="true"
                  aria-label="更多系列筛选"
                  className="absolute left-0 top-[calc(100%+6px)] z-40 max-h-72 min-w-[240px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]/98 py-2 shadow-xl backdrop-blur-md dark:bg-stone-950/95"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {overflowSeriesList.map((s) => {
                    const idx = seriesPalette.indexOf(s);
                    const hue =
                      ((idx >= 0 ? idx : seriesPalette.length) * 137) % 360;
                    const checked = effectiveSeriesSelection.includes(s);
                    return (
                      <label
                        key={s}
                        role="option"
                        aria-selected={checked}
                        className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[13px] text-stone-800 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-900"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSeriesSlug(s)}
                          className="h-3.5 w-3.5 shrink-0 rounded border-stone-400 text-[var(--accent)] focus:ring-[var(--focus-ring)] dark:border-stone-600"
                        />
                        <span
                          aria-hidden
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: `hsl(${hue} 70% 50%)`,
                          }}
                        />
                        <span className="min-w-0 flex-1 font-medium leading-snug">
                          {s}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={graphViewportRef}
        tabIndex={0}
        role="application"
        aria-label="文章关系图谱画布"
        aria-describedby="posts-graph-help"
        className="relative overflow-hidden overscroll-contain rounded-3xl border border-[var(--border)] bg-[var(--surface)]/40 outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] dark:focus-visible:ring-offset-stone-950"
        style={{ aspectRatio: `${WIDTH}/${HEIGHT}` }}
        onPointerDownCapture={() => {
          graphViewportRef.current?.focus({ preventScroll: true });
        }}
      >
        <div className="pointer-events-none absolute right-3 top-3 z-20">
          <div
            data-graph-toolbar="true"
            role="toolbar"
            aria-label="画布缩放与复位"
            className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/95 p-0.5 text-stone-700 shadow-lg backdrop-blur-md dark:text-stone-200"
          >
            <button
              type="button"
              aria-label="缩小"
              title="缩小 · 快捷键 −"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-semibold leading-none transition-colors hover:bg-stone-100 active:bg-stone-200 dark:hover:bg-stone-800 dark:active:bg-stone-700"
              onClick={() => setViewBox((vb) => zoomViewBoxCenter(vb, 'out'))}
            >
              −
            </button>
            <span className="min-w-[3rem] px-1 text-center font-mono text-[11px] font-semibold tabular-nums text-stone-500 dark:text-stone-400">
              {zoomPercent}%
            </span>
            <button
              type="button"
              aria-label="放大"
              title="放大 · 快捷键 +"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-semibold leading-none transition-colors hover:bg-stone-100 active:bg-stone-200 dark:hover:bg-stone-800 dark:active:bg-stone-700"
              onClick={() => setViewBox((vb) => zoomViewBoxCenter(vb, 'in'))}
            >
              +
            </button>
            <span className="mx-0.5 h-5 w-px bg-[var(--border)]" aria-hidden />
            <button
              type="button"
              aria-label="重置画布视图"
              title="复位视图 · 0 · Esc 关闭卡片"
              className="shrink-0 rounded-full px-2 py-1.5 text-[11px] font-semibold transition-colors hover:bg-stone-100 active:bg-stone-200 dark:hover:bg-stone-800 dark:active:bg-stone-700"
              onClick={() => setViewBox({ ...DEFAULT_VIEW_BOX })}
            >
              复位视图
            </button>
          </div>
        </div>

        <svg
          ref={svgRef}
          viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
          className="h-full w-full touch-none"
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onAuxClick={(e) => {
            if (e.button === 1) e.preventDefault();
          }}
        >
          <rect
            x={0}
            y={0}
            width={WIDTH}
            height={HEIGHT}
            fill="transparent"
            className={canvasPanning ? 'cursor-grabbing' : 'cursor-grab'}
            onPointerDown={beginCanvasPan}
            onDoubleClick={(e) => {
              e.preventDefault();
              setViewBox({ ...DEFAULT_VIEW_BOX });
            }}
          />
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
                filteringSeries &&
                !effectiveSeriesSelection.includes(a.series) &&
                !effectiveSeriesSelection.includes(b.series);
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
                      cursor:
                        canvasPanning || draggingId === n.slug
                          ? 'grabbing'
                          : 'grab',
                      filter: isHovered
                        ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.18))'
                        : undefined,
                    }}
                    onPointerDown={(e) => onNodePointerDown(e, n.slug)}
                    onMouseEnter={() => {
                      cancelHoverDismiss();
                      setHovered(n.slug);
                    }}
                    onMouseLeave={() => scheduleHoverDismiss()}
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
              left: `calc(${((hoveredNode.x - viewBox.minX) / viewBox.width) * 100}% + 12px)`,
              top: `calc(${((hoveredNode.y - viewBox.minY) / viewBox.height) * 100}% - 12px)`,
              transform: 'translateY(-100%)',
            }}
            onMouseEnter={() => {
              cancelHoverDismiss();
              setHovered(hoveredNode.slug);
            }}
            onMouseLeave={() => {
              cancelHoverDismiss();
              setHovered(null);
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

      <p
        id="posts-graph-help"
        className="text-xs text-stone-500 dark:text-stone-500"
      >
        节点 = 文章；边 = 内容相似度（trigram Jaccard）+ 标签 / 系列加权 ·
        系列可多选；宽度不足时出现「更多」下拉勾选其余系列 ·
        空白拖动画布，按住空格可在节点上拖画布（避免误拖节点）；双指滑动平移；Shift+滚轮横向平移；
        捏合或 Ctrl+滚轮缩放；方向键微调；Esc 关闭卡片 ·
        悬停可读摘要；单击节点打开文章（小幅拖动仍视为拖拽）。
      </p>
    </div>
  );
}
