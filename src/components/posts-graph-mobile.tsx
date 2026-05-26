'use client';

/**
 * 文章关系图谱 — 移动端专属 UI 与触控增强。
 *
 * - 系列筛选、节点详情均以底部 sheet 呈现（避免 hover 浮卡溢出视口）
 * - 画布工具条贴底、仅图标，便于单手操作
 * - `useGraphPinchZoom`：双指捏合缩放（补足 touch 设备无 Ctrl+wheel 的缺口）
 */

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import type { GraphViewBox } from '@/components/posts-graph-viewbox';
import { useBodyScrollLock } from '@/lib/use-body-scroll-lock';
import {
  HEIGHT,
  WIDTH,
  clampGraphViewBox,
  zoomViewBoxAtPoint,
} from '@/components/posts-graph-viewbox';

function touchDistance(a: Touch, b: Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function touchCenter(a: Touch, b: Touch): { clientX: number; clientY: number } {
  return {
    clientX: (a.clientX + b.clientX) / 2,
    clientY: (a.clientY + b.clientY) / 2,
  };
}

/** 在画布容器上监听双指捏合，更新 viewBox */
export function useGraphPinchZoom(
  enabled: boolean,
  viewportRef: RefObject<HTMLDivElement | null>,
  svgRef: RefObject<SVGSVGElement | null>,
  setViewBox: React.Dispatch<React.SetStateAction<GraphViewBox>>,
): void {
  useEffect(() => {
    if (!enabled) return;
    const viewport = viewportRef.current;
    const svg = svgRef.current;
    if (!viewport || !svg) return;

    const active = new Map<number, Touch>();
    let lastDist: number | null = null;

    const clientToSvg = (clientX: number, clientY: number) => {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const inv = svg.getScreenCTM()?.inverse();
      if (!inv) return { x: WIDTH / 2, y: HEIGHT / 2 };
      return pt.matrixTransform(inv);
    };

    const syncTouches = (list: TouchList) => {
      active.clear();
      for (let i = 0; i < list.length; i += 1) {
        const t = list.item(i);
        if (t) active.set(t.identifier, t);
      }
      if (active.size < 2) lastDist = null;
    };

    const onTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const t = e.changedTouches.item(i);
        if (t) active.set(t.identifier, t);
      }
      if (active.size >= 2) {
        e.preventDefault();
        const [a, b] = [...active.values()];
        lastDist = touchDistance(a, b);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const t = e.changedTouches.item(i);
        if (!t) continue;
        if (active.has(t.identifier)) active.set(t.identifier, t);
      }
      if (active.size < 2) return;
      e.preventDefault();
      const [a, b] = [...active.values()];
      const dist = touchDistance(a, b);
      if (lastDist == null || lastDist < 1) {
        lastDist = dist;
        return;
      }
      const scale = dist / lastDist;
      lastDist = dist;
      const center = touchCenter(a, b);
      const p = clientToSvg(center.clientX, center.clientY);
      setViewBox((prev) => {
        const nw = prev.width / scale;
        const clamped = clampGraphViewBox({
          ...prev,
          width: nw,
          height: nw * (HEIGHT / WIDTH),
        });
        const ratio = clamped.width / prev.width;
        return clampGraphViewBox({
          minX: p.x - (p.x - prev.minX) * ratio,
          minY: p.y - (p.y - prev.minY) * ratio,
          width: clamped.width,
          height: clamped.height,
        });
      });
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const t = e.changedTouches.item(i);
        if (t) active.delete(t.identifier);
      }
      if (active.size < 2) lastDist = null;
      syncTouches(e.touches);
    };

    viewport.addEventListener('touchstart', onTouchStart, { passive: false });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    viewport.addEventListener('touchend', onTouchEnd);
    viewport.addEventListener('touchcancel', onTouchEnd);
    return () => {
      viewport.removeEventListener('touchstart', onTouchStart);
      viewport.removeEventListener('touchmove', onTouchMove);
      viewport.removeEventListener('touchend', onTouchEnd);
      viewport.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [enabled, setViewBox, svgRef, viewportRef]);
}

export const MOBILE_GRAPH_HELP =
  '单指拖动画布 · 双指捏合缩放 · 点节点查看详情 · 底部工具条可缩放与复位';

/** 在可滚动容器顶/底边界阻止 touch 继续传给页面（iOS 滚动链穿透） */
function useSheetScrollContain(
  scrollRef: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;
    const el = scrollRef.current;
    if (!el) return;

    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const dy = touch.clientY - startY;
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      if ((atTop && dy > 0) || (atBottom && dy < 0)) {
        e.preventDefault();
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [active, scrollRef]);
}

function SheetBackdrop({
  onClose,
  label,
}: {
  onClose: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="fixed inset-0 z-40 touch-none bg-stone-950/40 backdrop-blur-[2px] dark:bg-black/55"
      onClick={onClose}
    />
  );
}

function SheetPanel({
  title,
  onClose,
  children,
  listId,
  scrollActive,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  listId?: string;
  scrollActive: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useSheetScrollContain(scrollRef, scrollActive);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl dark:bg-stone-950"
      role="dialog"
      aria-modal="true"
      aria-labelledby={listId}
    >
      <div className="flex justify-center pt-2 pb-1" aria-hidden>
        <span className="h-1 w-10 rounded-full bg-stone-300 dark:bg-stone-600" />
      </div>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 pb-3">
        <h2
          id={listId}
          className="font-serif text-base font-semibold text-stone-900 dark:text-stone-50"
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          关闭
        </button>
      </div>
      <div
        ref={scrollRef}
        className="max-h-[min(52dvh,420px)] overflow-y-auto overscroll-y-contain px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]"
      >
        {children}
      </div>
    </div>
  );
}

function MobileBottomSheet({
  open,
  title,
  onClose,
  backdropLabel,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  backdropLabel: string;
  children: ReactNode;
}) {
  const titleId = useId();
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <SheetBackdrop onClose={onClose} label={backdropLabel} />
      <SheetPanel title={title} onClose={onClose} listId={titleId} scrollActive>
        {children}
      </SheetPanel>
    </>
  );
}

export function PostsGraphMobileControls({
  filteringSeries,
  selectedCount,
  onOpenFilters,
  onReplay,
}: {
  filteringSeries: boolean;
  selectedCount: number;
  onOpenFilters: () => void;
  onReplay: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onReplay}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-3 py-2 text-xs font-semibold text-stone-700 transition-colors active:bg-stone-100 dark:text-stone-200 dark:active:bg-stone-800"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        重新布局
      </button>
      <button
        type="button"
        onClick={onOpenFilters}
        className={[
          'inline-flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors sm:flex-none',
          filteringSeries
            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
            : 'border-[var(--border)] bg-[var(--surface)]/80 text-stone-700 dark:text-stone-200',
        ].join(' ')}
        aria-haspopup="dialog"
      >
        系列筛选
        {filteringSeries ? (
          <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {selectedCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}

export function PostsGraphMobileZoomToolbar({
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex justify-end">
      <div
        data-graph-toolbar="true"
        role="toolbar"
        aria-label="画布缩放与复位"
        className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/95 p-0.5 text-stone-700 shadow-lg backdrop-blur-md dark:text-stone-200"
      >
        <button
          type="button"
          aria-label="缩小"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-semibold leading-none transition-colors active:bg-stone-200 dark:active:bg-stone-700"
          onClick={onZoomOut}
        >
          −
        </button>
        <span className="min-w-[2.75rem] px-0.5 text-center font-mono text-[11px] font-semibold tabular-nums text-stone-500 dark:text-stone-400">
          {zoomPercent}%
        </span>
        <button
          type="button"
          aria-label="放大"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-semibold leading-none transition-colors active:bg-stone-200 dark:active:bg-stone-700"
          onClick={onZoomIn}
        >
          +
        </button>
        <span className="mx-0.5 h-6 w-px bg-[var(--border)]" aria-hidden />
        <button
          type="button"
          aria-label="重置画布视图"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors active:bg-stone-200 dark:active:bg-stone-700"
          onClick={onReset}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

type NodeSheetData = {
  title: string;
  series: string;
  readingMinutes: number;
  tags: string[];
  url: string;
};

export function PostsGraphNodeSheet({
  open,
  node,
  onClose,
}: {
  open: boolean;
  node: NodeSheetData | null;
  onClose: () => void;
}) {
  if (!open || !node) return null;

  return (
    <MobileBottomSheet
      open={open}
      title="文章详情"
      onClose={onClose}
      backdropLabel="关闭文章详情"
    >
      <p className="font-serif text-lg font-semibold leading-snug text-stone-900 dark:text-stone-50">
        {node.title}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
        {node.series !== '未分类' ? (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            {node.series}
          </span>
        ) : null}
        <span>{node.readingMinutes} 分钟阅读</span>
      </p>
      {node.tags.length > 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
          {node.tags.slice(0, 6).join(' · ')}
        </p>
      ) : null}
      <Link
        href={node.url}
        className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition-opacity active:opacity-90"
      >
        阅读全文
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>
    </MobileBottomSheet>
  );
}

export function PostsGraphFilterSheet({
  open,
  seriesPalette,
  selectedSlugs,
  onToggle,
  onClear,
  onClose,
}: {
  open: boolean;
  seriesPalette: readonly string[];
  selectedSlugs: readonly string[];
  onToggle: (s: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <MobileBottomSheet
      open={open}
      title="按系列筛选"
      onClose={onClose}
      backdropLabel="关闭系列筛选"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            onClear();
          }}
          className={[
            'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            selectedSlugs.length === 0
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
              : 'border border-[var(--border)] text-stone-600 dark:text-stone-300',
          ].join(' ')}
        >
          全部系列
        </button>
      </div>
      <ul className="space-y-1" role="listbox" aria-multiselectable="true">
        {seriesPalette.map((s) => {
          const idx = seriesPalette.indexOf(s);
          const hue = ((idx >= 0 ? idx : seriesPalette.length) * 137) % 360;
          const checked = selectedSlugs.includes(s);
          return (
            <li key={s}>
              <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm text-stone-800 active:bg-stone-100 dark:text-stone-100 dark:active:bg-stone-900">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(s)}
                  className="h-4 w-4 shrink-0 rounded border-stone-400 text-[var(--accent)] focus:ring-[var(--focus-ring)] dark:border-stone-600"
                />
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: `hsl(${hue} 70% 50%)` }}
                />
                <span className="min-w-0 flex-1 font-medium leading-snug">
                  {s}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </MobileBottomSheet>
  );
}

/** 移动端画布容器 class：更高可视区、禁止浏览器默认手势滚动 */
export const MOBILE_GRAPH_VIEWPORT_CLASS =
  'relative overflow-hidden overscroll-contain rounded-3xl border border-[var(--border)] bg-[var(--surface)]/40 touch-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] dark:focus-visible:ring-offset-stone-950 h-[min(72dvh,560px)]';

export function useMobileGraphZoomHandlers(
  setViewBox: React.Dispatch<React.SetStateAction<GraphViewBox>>,
  defaultViewBox: GraphViewBox,
) {
  const zoomIn = useCallback(() => {
    setViewBox((vb) => {
      const cx = vb.minX + vb.width / 2;
      const cy = vb.minY + vb.height / 2;
      return zoomViewBoxAtPoint(vb, cx, cy, 1.2);
    });
  }, [setViewBox]);

  const zoomOut = useCallback(() => {
    setViewBox((vb) => {
      const cx = vb.minX + vb.width / 2;
      const cy = vb.minY + vb.height / 2;
      return zoomViewBoxAtPoint(vb, cx, cy, 1 / 1.2);
    });
  }, [setViewBox]);

  const reset = useCallback(() => {
    setViewBox({ ...defaultViewBox });
  }, [defaultViewBox, setViewBox]);

  return { zoomIn, zoomOut, reset };
}
