'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 命令面板（Command Palette / Cmd+K）。
 *
 * ## 交互目标
 * - 类 Raycast/VSCode：按 `⌘K` 打开，输入即过滤，方向键选择，回车执行，ESC 关闭
 * - 鼠标与键盘都好用（可 hover 高亮、可滚动对齐）
 *
 * ## 设计要点
 * - **只在客户端渲染**：依赖 `window` 监听键盘事件
 * - **无外部依赖**：避免引入重型 UI 库，保证体积与可控性
 * - **可访问性**：使用 `role="dialog"` + `aria-modal`，输入框 focus，支持 ESC
 *
 * ## 层级（z-index）注意事项
 * - 面板的 backdrop 是 `absolute inset-0`，因此内容容器需要 `relative z-10`
 * - 页面颗粒层（grain overlay）必须低 z-index，否则会盖住面板导致“只有蒙层”
 */
interface CommandItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: React.ReactNode;
  group: string;
}

const NAV_ITEMS: CommandItem[] = [
  {
    id: 'home',
    label: '首页',
    description: '回到首页',
    href: '/',
    group: '导航',
    icon: (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'blog',
    label: '文章列表',
    description: '浏览全部技术文章',
    href: '/blog',
    group: '导航',
    icon: (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    id: 'resume',
    label: '个人简历',
    description: '查看在线简历',
    href: '/resume',
    group: '导航',
    icon: (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'changelog',
    label: '版本历史',
    description: '站点更新记录',
    href: '/changelog',
    group: '导航',
    icon: (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: 'github',
    label: 'GitHub 仓库',
    description: '查看源代码',
    href: 'https://github.com/ZxdNoob/zxdnoob.github.io',
    group: '链接',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
];

function groupItems(items: CommandItem[]): Map<string, CommandItem[]> {
  const map = new Map<string, CommandItem[]>();
  for (const item of items) {
    const arr = map.get(item.group) ?? [];
    arr.push(item);
    map.set(item.group, arr);
  }
  return map;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const filtered = query.trim()
    ? NAV_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          (item.description?.toLowerCase().includes(query.toLowerCase()) ??
            false),
      )
    : NAV_ITEMS;

  const groups = groupItems(filtered);

  const flatItems = filtered;

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  const execute = useCallback(
    (item: CommandItem) => {
      close();
      if (item.href.startsWith('http')) {
        window.open(item.href, '_blank', 'noopener,noreferrer');
      } else {
        router.push(item.href);
      }
    },
    [close, router],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(flatItems.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (item) execute(item);
    } else if (e.key === 'Escape') {
      close();
    }
  }

  if (!open) return null;

  let itemCounter = 0;

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label="快速导航"
    >
      <div
        className="cmd-palette-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60"
        onClick={close}
        aria-hidden
      />
      <div className="relative z-10 flex items-start justify-center px-4 pt-[15vh]">
        <div className="cmd-palette-panel w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl">
          <div className="flex items-center gap-3 border-b border-[var(--border)] px-4">
            <svg
              className="h-4 w-4 shrink-0 text-stone-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="搜索页面或功能…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent py-4 text-sm text-[var(--foreground)] placeholder:text-stone-400 focus:outline-none dark:placeholder:text-stone-500"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[10px] text-stone-400 sm:inline">
              ESC
            </kbd>
          </div>

          <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
            {flatItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-stone-500">
                未找到匹配结果
              </div>
            ) : (
              Array.from(groups.entries()).map(([group, items]) => (
                <div key={group} className="mb-1">
                  <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500">
                    {group}
                  </p>
                  {items.map((item) => {
                    const idx = itemCounter++;
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-active={isActive}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => execute(item)}
                        className={[
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                          isActive
                            ? 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-50'
                            : 'text-stone-700 dark:text-stone-300',
                        ].join(' ')}
                      >
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-stone-500 dark:text-stone-400">
                          {item.icon}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="font-medium">{item.label}</span>
                          {item.description ? (
                            <span className="ml-2 text-xs text-stone-400 dark:text-stone-500">
                              {item.description}
                            </span>
                          ) : null}
                        </span>
                        {isActive ? (
                          <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[10px] text-stone-400">
                            ↵
                          </kbd>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2.5 text-[11px] text-stone-400 dark:text-stone-500">
            <span className="flex items-center gap-2">
              <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1 py-0.5 font-mono">
                ↑↓
              </kbd>
              导航
              <kbd className="ml-1 rounded border border-[var(--border)] bg-[var(--surface)] px-1 py-0.5 font-mono">
                ↵
              </kbd>
              确认
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1 py-0.5 font-mono">
                ESC
              </kbd>
              关闭
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
