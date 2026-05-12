'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { COMMAND_PALETTE_TOGGLE } from '@/components/command-palette';
import { SiteLogo } from '@/components/site-logo';
import { SiteNavLinks } from '@/components/site-nav-links';
import { ThemeToggle } from '@/components/theme-toggle';
import { site } from '@/lib/site';

/**
 * 站点顶部悬浮导航 Dock。
 *
 * ## 能做什么
 * - **拖拽**：按住左侧抓手把整条导航拖到屏幕任意边缘，松手自动吸附最近边
 * - **收起 / 展开**：折叠成一颗仅显示 Logo 的小圆点；折叠态可单击展开，或按住后拖动
 * - **位置自定义**：顶部 / 底部 / 左侧 / 右侧 四档悬浮，可通过抓手或位置菜单切换
 * - **状态记忆**：位置与折叠态存储在 `localStorage:site-nav-dock-v1`
 *
 * ## 实现要点
 * - Dock 始终 `position: fixed`，并向 `<html>` 写入 `--nav-pad-{top|bottom|left|right}`
 *   CSS 变量，配合 `body` 的 padding 让正文不会被导航遮挡
 * - 用 `useSyncExternalStore` 存储 Dock；首帧客户端快照须与 SSR 一致（默认顶栏），
 *   hydration 后在 `useLayoutEffect` 里再读 localStorage，避免竖栏/横栏 DOM 不一致
 * - `public/theme-init.js`（beforeInteractive）与读完存储后都会写 `--nav-pad-*` / `data-nav-dock`，
 *   减少正文边距与根标记错位
 * - 首屏在读完 localStorage 并写入 store **之前** Dock 保持不可见（opacity + inert），避免先出现在默认顶栏；
 *   同步后再显示在记忆位置；其后用 `dockMotionReady` 再打开位置类过渡
 * - 拖拽期间只更新临时坐标，不写入 storage；松手时统一 `setDockState` 触发吸附动画
 * - 保留旧的 `data-site-header` 属性，沉浸阅读模式仍能隐藏整条导航
 */

type DockPosition = 'top' | 'bottom' | 'left' | 'right';
interface DockState {
  position: DockPosition;
  collapsed: boolean;
}

const STORAGE_KEY = 'site-nav-dock-v1';
const DEFAULT_STATE: DockState = { position: 'top', collapsed: false };

const POSITION_LABEL: Record<DockPosition, string> = {
  top: '顶部',
  bottom: '底部',
  left: '左侧',
  right: '右侧',
};

function isDockPosition(v: unknown): v is DockPosition {
  return v === 'top' || v === 'bottom' || v === 'left' || v === 'right';
}

function loadState(): DockState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const obj = JSON.parse(raw) as Partial<DockState> | null;
    return {
      position: isDockPosition(obj?.position) ? obj.position : 'top',
      collapsed: obj?.collapsed === true,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function persistState(state: DockState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private-mode failures */
  }
}

/**
 * 把当前 Dock 占据的轴向尺寸映射成 4 个 CSS 变量，写入 `<html>` 上的内联样式。
 * 配合 globals.css 中的 `body { padding: var(--nav-pad-*) }` 实现内容避让。
 */
function applyDockVars(state: DockState) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const offset = state.collapsed ? '68px' : '84px';
  root.style.setProperty(
    '--nav-pad-top',
    state.position === 'top' ? offset : '0px',
  );
  root.style.setProperty(
    '--nav-pad-bottom',
    state.position === 'bottom' ? offset : '0px',
  );
  root.style.setProperty(
    '--nav-pad-left',
    state.position === 'left' ? offset : '0px',
  );
  root.style.setProperty(
    '--nav-pad-right',
    state.position === 'right' ? offset : '0px',
  );
  root.setAttribute('data-nav-dock', state.position);
  if (state.collapsed) root.setAttribute('data-nav-collapsed', '');
  else root.removeAttribute('data-nav-collapsed');
}

/** 取离指针最近的视口边缘，作为拖拽落点。 */
function nearestEdge(x: number, y: number): DockPosition {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dists: Array<[DockPosition, number]> = [
    ['top', y],
    ['bottom', h - y],
    ['left', x],
    ['right', w - x],
  ];
  dists.sort((a, b) => a[1] - b[1]);
  return dists[0][0];
}

// ──────────────────────────────────────────────────────────────────────────
// 外部存储：Dock 状态（位置 + 折叠态）
// ──────────────────────────────────────────────────────────────────────────

let cachedState: DockState | null = null;
/** 为 true 后客户端快照才读取 localStorage；之前必须与 `getDockServerSnapshot` 一致。 */
let dockStoreHydrated = false;
const listeners = new Set<() => void>();

function subscribeDock(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** SSR 与客户端 hydration 首帧共用；引用须稳定。 */
const SERVER_SNAPSHOT: DockState = DEFAULT_STATE;
function getDockServerSnapshot(): DockState {
  return SERVER_SNAPSHOT;
}

function getDockSnapshot(): DockState {
  if (!dockStoreHydrated) {
    return SERVER_SNAPSHOT;
  }
  if (cachedState === null) {
    cachedState = loadState();
  }
  return cachedState;
}

function setDockState(updater: (prev: DockState) => DockState): void {
  const prev = getDockSnapshot();
  const next = updater(prev);
  if (next.position === prev.position && next.collapsed === prev.collapsed) {
    return;
  }
  cachedState = next;
  persistState(next);
  applyDockVars(next);
  for (const listener of listeners) listener();
}

// ──────────────────────────────────────────────────────────────────────────
// 主组件
// ──────────────────────────────────────────────────────────────────────────

export function SiteHeader() {
  const pathname = usePathname() ?? '';
  const state = useSyncExternalStore(
    subscribeDock,
    getDockSnapshot,
    getDockServerSnapshot,
  );

  // 用 pathname 锚定 open 态：路由切换后 `xxxOpen === pathname` 自动变 false，
  // 无需在 effect 里调用 setState 来「重置」这些 UI 状态。
  const [menuOpenAt, setMenuOpenAt] = useState<string | null>(null);
  const [mobileOpenAt, setMobileOpenAt] = useState<string | null>(null);
  /** 读完 localStorage 并同步 store 之前不显示 Dock，避免首屏误显默认顶栏 */
  const [dockRevealed, setDockRevealed] = useState(false);
  /** 首帧同步后再开启 top/left 等过渡，避免与显隐打架 */
  const [dockMotionReady, setDockMotionReady] = useState(false);
  const [drag, setDrag] = useState<{
    x: number;
    y: number;
    edge: DockPosition;
  } | null>(null);
  const dockRef = useRef<HTMLElement | null>(null);
  const menuId = useId();

  const menuOpen = menuOpenAt === pathname;
  const mobileOpen = mobileOpenAt === pathname;

  // 首帧必须与 SSR 一致（默认顶栏）；同步读 localStorage 延到 layout effect，避免 hydration mismatch。
  useLayoutEffect(() => {
    if (!dockStoreHydrated) {
      dockStoreHydrated = true;
      cachedState = loadState();
      applyDockVars(cachedState);
      for (const listener of listeners) listener();
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setDockRevealed(true);
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setDockMotionReady(true);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 锁定背景滚动（仅在移动端折叠面板打开时）。
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // 菜单打开时：点击外部 / Esc 关闭。这里只在回调里写 state，不违反规则。
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: Event) {
      const node = dockRef.current;
      if (!node) return;
      const target = e.target as Node | null;
      if (target && !node.contains(target)) setMenuOpenAt(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpenAt(null);
    }
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const openCommandPalette = useCallback(() => {
    setMobileOpenAt(null);
    setMenuOpenAt(null);
    window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_TOGGLE));
  }, []);

  const closePopovers = useCallback(() => {
    setMobileOpenAt(null);
    setMenuOpenAt(null);
  }, []);

  const beginDrag = useCallback((startX: number, startY: number) => {
    setMobileOpenAt(null);
    setMenuOpenAt(null);
    setDrag({
      x: startX,
      y: startY,
      edge: nearestEdge(startX, startY),
    });

    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    function onMove(ev: PointerEvent) {
      setDrag({
        x: ev.clientX,
        y: ev.clientY,
        edge: nearestEdge(ev.clientX, ev.clientY),
      });
    }
    function onUp(ev: PointerEvent) {
      const edge = nearestEdge(ev.clientX, ev.clientY);
      setDockState((s) => ({ ...s, position: edge }));
      setDrag(null);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, []);

  const startDragFromHandle = useCallback(
    (e: ReactPointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      beginDrag(e.clientX, e.clientY);
    },
    [beginDrag],
  );

  const vertical = state.position === 'left' || state.position === 'right';
  const { collapsed } = state;

  const dockChromeVisible = dockRevealed || Boolean(drag);

  const posStyle: CSSProperties = useMemo(() => {
    if (drag) {
      return {
        left: drag.x,
        top: drag.y,
        transform: 'translate(-50%, -50%)',
      };
    }
    switch (state.position) {
      case 'top':
        return { top: 12, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom':
        return { bottom: 12, left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { left: 12, top: '50%', transform: 'translateY(-50%)' };
      case 'right':
        return { right: 12, top: '50%', transform: 'translateY(-50%)' };
    }
  }, [drag, state.position]);

  return (
    <>
      {drag ? <DragEdgeHints edge={drag.edge} /> : null}

      <header
        ref={dockRef}
        data-site-header
        data-nav-dock={state.position}
        data-nav-collapsed={collapsed ? '' : undefined}
        style={posStyle}
        className={[
          'fixed z-50 overflow-visible',
          dockChromeVisible
            ? 'pointer-events-auto visible opacity-100'
            : 'pointer-events-none invisible opacity-0',
          collapsed ? 'rounded-full' : 'rounded-3xl',
          'border border-[var(--border)]/70',
          'bg-[var(--background)]/85 backdrop-blur-xl backdrop-saturate-150',
          'shadow-[0_18px_60px_-20px_rgba(0,0,0,0.18)]',
          drag
            ? 'scale-[1.03] cursor-grabbing select-none transition-none'
            : dockMotionReady
              ? 'motion-safe:transition-[top,left,right,bottom,transform,opacity,width,height,border-radius,padding] motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none'
              : 'transition-none',
        ].join(' ')}
      >
        {collapsed ? (
          <CollapsedDock
            onExpand={() => setDockState((s) => ({ ...s, collapsed: false }))}
            onBeginDrag={beginDrag}
          />
        ) : (
          <ExpandedDock
            vertical={vertical}
            position={state.position}
            menuOpen={menuOpen}
            menuId={menuId}
            mobileOpen={mobileOpen}
            onStartDrag={startDragFromHandle}
            onToggleMenu={() => setMenuOpenAt(menuOpen ? null : pathname)}
            onToggleMobile={() => setMobileOpenAt(mobileOpen ? null : pathname)}
            onOpenCommand={openCommandPalette}
            onCollapse={() => setDockState((s) => ({ ...s, collapsed: true }))}
            onClosePopovers={closePopovers}
            onSetPosition={(p) => {
              setDockState((s) => ({ ...s, position: p }));
              setMenuOpenAt(null);
            }}
          />
        )}
      </header>

      {dockRevealed && mobileOpen && !vertical && !collapsed ? (
        <MobileNavOverlay
          position={state.position}
          onClose={() => setMobileOpenAt(null)}
        />
      ) : null}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────

interface ExpandedDockProps {
  vertical: boolean;
  position: DockPosition;
  menuOpen: boolean;
  menuId: string;
  mobileOpen: boolean;
  onStartDrag: (e: ReactPointerEvent) => void;
  onToggleMenu: () => void;
  onToggleMobile: () => void;
  onOpenCommand: () => void;
  onCollapse: () => void;
  onClosePopovers: () => void;
  onSetPosition: (p: DockPosition) => void;
}

function ExpandedDock({
  vertical,
  position,
  menuOpen,
  menuId,
  mobileOpen,
  onStartDrag,
  onToggleMenu,
  onToggleMobile,
  onOpenCommand,
  onCollapse,
  onClosePopovers,
  onSetPosition,
}: ExpandedDockProps) {
  return (
    <div
      className={
        vertical
          ? 'flex w-[92px] flex-col items-stretch gap-1.5 px-2 py-3'
          : 'flex flex-row items-center gap-1.5 px-2 py-2'
      }
    >
      <DragHandle vertical={vertical} onPointerDown={onStartDrag} />

      <Link
        href="/"
        onClick={onClosePopovers}
        className={[
          'group inline-flex items-center font-serif font-semibold tracking-tight text-stone-900 transition-colors dark:text-stone-100',
          vertical ? 'justify-center py-1 text-base' : 'gap-2 px-2 text-lg',
        ].join(' ')}
      >
        <span className="relative">
          <SiteLogo
            className={
              vertical
                ? 'h-6 w-[1.2rem] transition-transform duration-300 group-hover:scale-110'
                : 'h-7 w-[1.4rem] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3'
            }
          />
        </span>
        {!vertical ? (
          <span className="hidden sm:inline">{site.name}</span>
        ) : null}
      </Link>

      <Separator vertical={vertical} />

      <div
        className={
          vertical
            ? 'flex flex-col items-stretch gap-0.5'
            : 'hidden items-center gap-0.5 md:flex'
        }
      >
        <SiteNavLinks
          as="div"
          orientation={vertical ? 'vertical' : 'horizontal'}
          onNavigate={onClosePopovers}
        />
      </div>

      <Separator vertical={vertical} />

      <div
        className={
          vertical
            ? 'flex flex-col items-center gap-1'
            : 'flex items-center gap-1'
        }
      >
        <IconButton
          ariaLabel="搜索"
          onClick={onOpenCommand}
          icon={
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
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
        />

        <ThemeToggle />

        <div className="relative flex min-w-0 shrink-0 justify-center">
          <IconButton
            ariaLabel="导航位置设置"
            ariaHasPopup="menu"
            ariaExpanded={menuOpen}
            ariaControls={menuId}
            onClick={onToggleMenu}
            active={menuOpen}
            icon={<SettingsIcon />}
          />
          {menuOpen ? (
            <DockMenu
              id={menuId}
              vertical={vertical}
              position={position}
              onPick={onSetPosition}
            />
          ) : null}
        </div>

        <IconButton
          ariaLabel="收起导航"
          onClick={onCollapse}
          icon={<MinimizeIcon vertical={vertical} />}
        />

        {!vertical ? (
          <button
            type="button"
            onClick={onToggleMobile}
            aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
            aria-expanded={mobileOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 md:hidden dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <HamburgerIcon open={mobileOpen} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CollapsedDock({
  onExpand,
  onBeginDrag,
}: {
  onExpand: () => void;
  onBeginDrag: (x: number, y: number) => void;
}) {
  /**
   * 折叠态：
   * - 轻点 → 展开导航
   * - 按住后移动 ≥4px → 进入拖拽流程，松手吸附最近边
   */
  const downRef = useRef<{ x: number; y: number; dragging: boolean } | null>(
    null,
  );

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    downRef.current = { x: startX, y: startY, dragging: false };

    function onMove(ev: PointerEvent) {
      const ref = downRef.current;
      if (!ref || ref.dragging) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.hypot(dx, dy) >= 4) {
        ref.dragging = true;
        cleanup();
        onBeginDrag(ev.clientX, ev.clientY);
      }
    }
    function onUp() {
      const ref = downRef.current;
      cleanup();
      if (!ref) return;
      if (!ref.dragging) onExpand();
      downRef.current = null;
    }
    function cleanup() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      aria-label="展开导航（按住可拖拽）"
      title="点击展开 · 按住可拖动位置"
      className="group flex h-12 w-12 cursor-grab items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-stone-100 active:cursor-grabbing dark:text-stone-200 dark:hover:bg-stone-800/60"
    >
      <SiteLogo className="h-5 w-4 transition-transform duration-300 group-hover:scale-110" />
    </button>
  );
}

function Separator({ vertical }: { vertical: boolean }) {
  return (
    <span
      aria-hidden
      className={
        vertical
          ? 'mx-1 h-px shrink-0 bg-[var(--border)]/60'
          : 'mx-0.5 h-6 w-px shrink-0 bg-[var(--border)]/60'
      }
    />
  );
}

function DragHandle({
  vertical,
  onPointerDown,
}: {
  vertical: boolean;
  onPointerDown: (e: ReactPointerEvent) => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      aria-label="按住拖动以改变导航位置"
      title="按住拖动 ↕ 或 ↔ 任意边缘"
      className={[
        'inline-flex shrink-0 cursor-grab items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 active:cursor-grabbing dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-200',
        vertical ? 'h-6 w-full' : 'h-9 w-5',
      ].join(' ')}
    >
      <svg
        className={vertical ? 'h-3.5 w-3.5 rotate-90' : 'h-3.5 w-3.5'}
        viewBox="0 0 12 18"
        fill="currentColor"
        aria-hidden
      >
        <circle cx="3" cy="3" r="1.2" />
        <circle cx="3" cy="9" r="1.2" />
        <circle cx="3" cy="15" r="1.2" />
        <circle cx="9" cy="3" r="1.2" />
        <circle cx="9" cy="9" r="1.2" />
        <circle cx="9" cy="15" r="1.2" />
      </svg>
    </button>
  );
}

interface IconButtonProps {
  ariaLabel: string;
  onClick: () => void;
  icon: ReactNode;
  active?: boolean;
  ariaHasPopup?: 'menu' | 'dialog' | 'true' | 'false';
  ariaExpanded?: boolean;
  ariaControls?: string;
}

function IconButton({
  ariaLabel,
  onClick,
  icon,
  active,
  ariaHasPopup,
  ariaExpanded,
  ariaControls,
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-haspopup={ariaHasPopup}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      onClick={onClick}
      className={[
        'inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors',
        active
          ? 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100'
          : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100',
      ].join(' ')}
    >
      {icon}
    </button>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function MinimizeIcon({ vertical }: { vertical: boolean }) {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {vertical ? (
        <>
          <path d="M4 12h16" />
          <path d="M9 7l-5 5 5 5" />
        </>
      ) : (
        <>
          <path d="M12 4v16" />
          <path d="M7 9l5-5 5 5" />
        </>
      )}
    </svg>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <>
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </>
      ) : (
        <>
          <path d="M4 8h16" />
          <path d="M4 16h16" />
        </>
      )}
    </svg>
  );
}

function DockMiniIcon({ dir }: { dir: DockPosition }) {
  const barCls = 'absolute rounded-sm bg-current';
  let bar: ReactNode;
  if (dir === 'top') {
    bar = <span className={`${barCls} top-1 right-1 left-1 h-1.5`} />;
  } else if (dir === 'bottom') {
    bar = <span className={`${barCls} bottom-1 right-1 left-1 h-1.5`} />;
  } else if (dir === 'left') {
    bar = <span className={`${barCls} top-1 bottom-1 left-1 w-1.5`} />;
  } else {
    bar = <span className={`${barCls} top-1 right-1 bottom-1 w-1.5`} />;
  }
  return (
    <span className="relative inline-block h-6 w-9 rounded-md border border-current/40">
      {bar}
    </span>
  );
}

function DockMenu({
  id,
  vertical,
  position,
  onPick,
}: {
  id: string;
  vertical: boolean;
  position: DockPosition;
  onPick: (p: DockPosition) => void;
}) {
  // 让菜单从 Dock 朝远离屏幕边缘的方向弹出，避免溢出视口。
  const placementCls = vertical
    ? position === 'left'
      ? 'top-0 left-full ml-3'
      : 'top-0 right-full mr-3'
    : position === 'top'
      ? 'top-full right-0 mt-3'
      : 'right-0 bottom-full mb-3';

  return (
    <div
      id={id}
      role="menu"
      aria-label="选择导航悬浮位置"
      className={`absolute z-20 w-[244px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl ring-1 ring-black/5 dark:ring-white/10 ${placementCls}`}
    >
      <div className="px-3 pt-3 pb-2 text-xs font-semibold tracking-[0.22em] text-stone-400 uppercase dark:text-stone-500">
        悬浮位置
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-2">
        {(['top', 'bottom', 'left', 'right'] as const).map((key) => {
          const active = key === position;
          return (
            <button
              key={key}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => onPick(key)}
              className={[
                'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors',
                active
                  ? 'border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100'
                  : 'border-[var(--border)] bg-[var(--surface)] text-stone-600 hover:border-stone-300 hover:text-stone-900 dark:text-stone-300 dark:hover:border-stone-600 dark:hover:text-stone-100',
              ].join(' ')}
            >
              <DockMiniIcon dir={key} />
              <span>{POSITION_LABEL[key]}</span>
            </button>
          );
        })}
      </div>
      <p className="border-t border-[var(--border)]/60 px-3 py-2.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-500">
        也可以按住左侧抓手把整条导航拖到任意边缘。
      </p>
    </div>
  );
}

function DragEdgeHints({ edge }: { edge: DockPosition }) {
  const edges: DockPosition[] = ['top', 'bottom', 'left', 'right'];
  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-hidden>
      {edges.map((e) => {
        const isTarget = e === edge;
        const color = isTarget
          ? 'rgba(245,158,11,0.22)'
          : 'rgba(120,113,108,0.08)';
        let sizeCls = '';
        let bg = '';
        if (e === 'top') {
          sizeCls = `left-0 right-0 top-0 ${isTarget ? 'h-28' : 'h-12'}`;
          bg = `linear-gradient(180deg, ${color}, transparent)`;
        } else if (e === 'bottom') {
          sizeCls = `left-0 right-0 bottom-0 ${isTarget ? 'h-28' : 'h-12'}`;
          bg = `linear-gradient(0deg, ${color}, transparent)`;
        } else if (e === 'left') {
          sizeCls = `top-0 bottom-0 left-0 ${isTarget ? 'w-32' : 'w-14'}`;
          bg = `linear-gradient(90deg, ${color}, transparent)`;
        } else {
          sizeCls = `top-0 bottom-0 right-0 ${isTarget ? 'w-32' : 'w-14'}`;
          bg = `linear-gradient(-90deg, ${color}, transparent)`;
        }
        return (
          <div
            key={e}
            className={`absolute transition-all duration-200 ease-out ${sizeCls}`}
            style={{ background: bg }}
          />
        );
      })}
    </div>
  );
}

function MobileNavOverlay({
  position,
  onClose,
}: {
  position: DockPosition;
  onClose: () => void;
}) {
  const panelCls =
    position === 'top' ? 'top-24 right-4 left-4' : 'bottom-24 right-4 left-4';

  return (
    <div className="fixed inset-0 z-40 md:hidden" onClick={onClose} aria-hidden>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm dark:bg-black/40" />
      <div
        className={`absolute rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 shadow-xl ${panelCls}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="导航菜单"
      >
        <SiteNavLinks
          orientation="horizontal"
          size="md"
          onNavigate={onClose}
          className="!flex-col !items-stretch !gap-1 [&>*]:!text-base [&_a]:!rounded-xl [&_a]:!px-4 [&_a]:!py-3 [&_span[aria-current='page']]:!rounded-xl [&_span[aria-current='page']]:!px-4 [&_span[aria-current='page']]:!py-3"
          ariaLabel="移动端主导航"
        />
      </div>
    </div>
  );
}
