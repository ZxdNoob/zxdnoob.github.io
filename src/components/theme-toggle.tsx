'use client';

/**
 * 主题切换：system / light / dark，读写 `localStorage.theme`，与根布局内联脚本一致。
 * 含旧版 Safari `matchMedia` 回退与无 Pointer Events 环境的点击兼容。
 */
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

type ThemeMode = 'system' | 'light' | 'dark';

const BUTTON_LABELS: Record<ThemeMode, string> = {
  system: '主题：跟随系统',
  light: '主题：浅色',
  dark: '主题：深色',
};

const OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  description: string;
  Icon: () => React.JSX.Element;
}> = [
  {
    mode: 'system',
    label: '跟随系统',
    description: '自动匹配系统浅色/深色',
    Icon: SystemIcon,
  },
  {
    mode: 'light',
    label: '浅色',
    description: '始终使用浅色主题',
    Icon: SunIcon,
  },
  {
    mode: 'dark',
    label: '深色',
    description: '始终使用深色主题',
    Icon: MoonIcon,
  },
];

const MENU_WIDTH = 260;
const MENU_GAP = 8;
/** 约等于面板高度，用于贴底导航时改为向上展开 */
const MENU_EST_HEIGHT = 300;

function computeThemeMenuPosition(trigger: DOMRect): {
  top: number;
  left: number;
} {
  const edge = MENU_GAP;
  let left = trigger.right - MENU_WIDTH;
  left = Math.max(edge, Math.min(left, window.innerWidth - MENU_WIDTH - edge));

  const spaceBelow = window.innerHeight - trigger.bottom - edge;
  const spaceAbove = trigger.top - edge;
  const belowTop = trigger.bottom + MENU_GAP;
  const aboveTop = trigger.top - MENU_EST_HEIGHT - MENU_GAP;

  let top = belowTop;
  if (spaceBelow < 140 && spaceAbove > spaceBelow) {
    top = Math.max(edge, aboveTop);
  }
  return { top, left };
}

/** 根据当前模式解析是否应用 `dark` class（system 时读取系统偏好）。 */
function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** 切换 `html` 上的 `dark` class（Tailwind 暗色变体依赖此类名）。 */
function applyClass(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark);
}

/**
 * 主题切换：现代浏览器走 View Transitions（淡出 + 淡入），老浏览器降级 `theme-changing` 抑制闪屏。
 * 注意：View Transitions 会快照整个 root，所以即便切深色背景也是丝滑过渡。
 */
function withThemeChangeFreeze(fn: () => void) {
  const root = document.documentElement;
  type DocWithVT = Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };
  const doc = document as DocWithVT;
  if (typeof doc.startViewTransition === 'function') {
    root.classList.add('theme-flipping');
    const t = doc.startViewTransition(fn);
    void t.finished.finally(() => root.classList.remove('theme-flipping'));
    return;
  }
  root.classList.add('theme-changing');
  fn();
  window.setTimeout(() => {
    root.classList.remove('theme-changing');
  }, 120);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const popoverId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('theme') as ThemeMode | null;
    const initial: ThemeMode =
      stored === 'light' || stored === 'dark' ? stored : 'system';
    const id = window.setTimeout(() => {
      setMode(initial);
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const syncSystem = useCallback(() => {
    withThemeChangeFreeze(() => applyClass(resolveIsDark('system')));
  }, []);

  useEffect(() => {
    if (!mounted) return;

    withThemeChangeFreeze(() => applyClass(resolveIsDark(mode)));

    if (mode === 'system') {
      localStorage.removeItem('theme');
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      // Safari < 14 uses addListener/removeListener (deprecated but still needed).
      const mqLegacy = mq as MediaQueryList & {
        addListener?: (listener: (e: MediaQueryListEvent) => void) => void;
        removeListener?: (listener: (e: MediaQueryListEvent) => void) => void;
      };

      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', syncSystem);
        return () => mq.removeEventListener('change', syncSystem);
      }
      mqLegacy.addListener?.(syncSystem);
      return () => mqLegacy.removeListener?.(syncSystem);
    }

    localStorage.setItem('theme', mode);
  }, [mode, mounted, syncSystem]);

  const syncMenuPosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    setMenuPos(computeThemeMenuPosition(btn.getBoundingClientRect()));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    syncMenuPosition();
    window.addEventListener('resize', syncMenuPosition);
    window.addEventListener('scroll', syncMenuPosition, true);
    return () => {
      window.removeEventListener('resize', syncMenuPosition);
      window.removeEventListener('scroll', syncMenuPosition, true);
    };
  }, [open, syncMenuPosition]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    function onPointerDown(e: Event) {
      const target = e.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    window.addEventListener('keydown', onKeyDown);
    const supportsPointer =
      typeof window !== 'undefined' && 'PointerEvent' in window;
    const downEvent = supportsPointer ? 'pointerdown' : 'touchstart';
    window.addEventListener(downEvent, onPointerDown, { passive: true });
    if (!supportsPointer) window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(downEvent, onPointerDown);
      if (!supportsPointer)
        window.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  return (
    <div
      className="relative flex h-9 w-9 shrink-0 items-center justify-center"
      ref={rootRef}
      suppressHydrationWarning
    >
      {mounted ? (
        <>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            aria-label={BUTTON_LABELS[mode]}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={popoverId}
          >
            {mode === 'system' ? (
              <SystemIcon />
            ) : mode === 'light' ? (
              <SunIcon />
            ) : (
              <MoonIcon />
            )}
          </button>

          {open && menuPos
            ? createPortal(
                <div
                  ref={menuRef}
                  id={popoverId}
                  role="menu"
                  aria-label="选择主题"
                  style={{
                    position: 'fixed',
                    top: menuPos.top,
                    left: menuPos.left,
                    width: MENU_WIDTH,
                  }}
                  className="z-[110] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl ring-1 ring-black/5 dark:ring-white/10"
                >
                  <div className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-stone-400 dark:text-stone-500">
                    主题
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 p-2">
                    {OPTIONS.map((opt) => {
                      const active = opt.mode === mode;
                      return (
                        <button
                          key={opt.mode}
                          type="button"
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() => {
                            setMode(opt.mode);
                            setOpen(false);
                          }}
                          className={[
                            'group/item flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]',
                            active
                              ? 'border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100'
                              : 'border-[var(--border)] bg-[var(--surface)] text-stone-600 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-300 dark:hover:border-stone-600 dark:hover:bg-stone-800/40 dark:hover:text-stone-100',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                              active
                                ? 'border-amber-300/60 bg-amber-100/70 text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/20 dark:text-amber-100'
                                : 'border-[var(--border)] bg-[var(--background)] text-stone-600 group-hover/item:border-stone-300 group-hover/item:bg-stone-100/90 dark:bg-stone-900/40 dark:text-stone-300 dark:group-hover/item:border-stone-600 dark:group-hover/item:bg-stone-800/70',
                            ].join(' ')}
                          >
                            <opt.Icon />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="text-sm font-semibold tracking-tight">
                                {opt.label}
                              </span>
                              {active ? (
                                <span className="sr-only">（当前已选）</span>
                              ) : null}
                            </span>
                            <span
                              className={[
                                'mt-0.5 block text-xs leading-relaxed',
                                active
                                  ? 'text-amber-900/75 dark:text-amber-200/80'
                                  : 'text-stone-500 dark:text-stone-500',
                              ].join(' ')}
                            >
                              {opt.description}
                            </span>
                          </span>
                          <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center">
                            {active ? (
                              <svg
                                className="h-4 w-4 text-amber-600 dark:text-amber-400"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.25"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>,
                document.body,
              )
            : null}
        </>
      ) : null}
    </div>
  );
}

function SunIcon() {
  return (
    <svg
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
