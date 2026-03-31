'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  formatPostPublishedAt,
  postPublishedAtIso,
  type PostSummary,
} from '@/lib/posts';

type Props = { posts: PostSummary[] };

function uniqSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) =>
    a.localeCompare(b, 'zh-CN'),
  );
}

function SeriesSelect({
  labelId,
  value,
  options,
  onChange,
}: {
  labelId: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxId = `${labelId}-listbox`;

  const selected = useMemo(() => {
    return options.find((o) => o.value === value) ?? options[0];
  }, [options, value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function commitByIndex(idx: number) {
    const opt = options[idx];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (!open) {
            const idx = Math.max(
              0,
              options.findIndex((o) => o.value === value),
            );
            setActiveIndex(idx);
          }
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) {
              const idx = Math.max(
                0,
                options.findIndex((o) => o.value === value),
              );
              setActiveIndex(idx);
              setOpen(true);
            }
          }
        }}
        className={[
          'group w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 px-4 py-3 text-sm',
          'text-stone-900 dark:text-stone-100',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]',
          'transition-colors hover:bg-[var(--surface)]/80',
          'flex items-center justify-between gap-3',
        ].join(' ')}
      >
        <span className="min-w-0 truncate text-left font-medium">
          {selected?.label ?? ''}
        </span>
        <span
          className={[
            'inline-flex h-6 w-6 items-center justify-center rounded-full',
            'text-stone-500 transition-colors group-hover:text-stone-700 dark:text-stone-400 dark:group-hover:text-stone-200',
          ].join(' ')}
          aria-hidden
        >
          <svg
            className={[
              'h-4 w-4 transition-transform duration-200 motion-reduce:transition-none',
              open ? 'rotate-180' : 'rotate-0',
            ].join(' ')}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex((i) =>
                Math.min(options.length - 1, (i < 0 ? 0 : i) + 1),
              );
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex((i) => Math.max(0, (i < 0 ? 0 : i) - 1));
            } else if (e.key === 'Home') {
              e.preventDefault();
              setActiveIndex(0);
            } else if (e.key === 'End') {
              e.preventDefault();
              setActiveIndex(options.length - 1);
            } else if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              commitByIndex(activeIndex);
            } else if (e.key === 'Tab') {
              setOpen(false);
            }
          }}
          className={[
            'absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-[var(--border)]',
            'bg-[var(--background)]/80 shadow-xl shadow-black/10 backdrop-blur-xl',
            'dark:shadow-black/30',
            'animate-in',
          ].join(' ')}
        >
          <div className="max-h-72 overflow-auto p-1">
            {options.map((o, idx) => {
              const isSelected = o.value === value;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => commitByIndex(idx)}
                  className={[
                    'w-full rounded-xl px-3 py-2 text-left text-sm',
                    'flex items-center justify-between gap-3',
                    'transition-colors',
                    isActive
                      ? 'bg-stone-900/5 text-stone-900 dark:bg-stone-50/10 dark:text-stone-50'
                      : 'text-stone-700 hover:bg-stone-900/5 dark:text-stone-200 dark:hover:bg-stone-50/10',
                  ].join(' ')}
                >
                  <span className="min-w-0 truncate">{o.label}</span>
                  {isSelected ? (
                    <svg
                      className="h-4 w-4 shrink-0 text-[var(--accent)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function useIntersection(onHit: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onHit();
      },
      { rootMargin: '600px 0px 600px 0px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onHit]);
  return ref;
}

function PillButton({
  active,
  children,
  onClick,
  ariaLabel,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={[
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]',
        active
          ? 'border-amber-500/40 bg-amber-500/10 text-stone-900 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-stone-50'
          : 'border-[var(--border)] bg-[var(--surface)]/40 text-stone-600 hover:bg-[var(--surface)]/70 dark:text-stone-300',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function PostCard({ post }: { post: PostSummary }) {
  const dateLabel = formatPostPublishedAt(post.date, 'short');
  return (
    <li>
      <Link
        href={`/blog/${post.slug}`}
        className={[
          'group block rounded-3xl border border-transparent p-5 transition-all duration-200 motion-reduce:transition-none',
          'hover:border-[var(--border)] hover:bg-[var(--surface)]/70 hover:shadow-sm hover:shadow-black/5',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]',
        ].join(' ')}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-500">
          <time dateTime={postPublishedAtIso(post.date)}>{dateLabel}</time>
          <span className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700" />
          <span>{post.readingMinutes} 分钟阅读</span>
          {post.series ? (
            <>
              <span className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700" />
              <span className="truncate">{post.series}</span>
            </>
          ) : null}
        </div>
        <h3 className="mt-2 font-serif text-lg font-semibold tracking-tight text-stone-900 transition-colors group-hover:text-[var(--accent)] dark:text-stone-100 sm:text-xl">
          {post.title}
        </h3>
        {post.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {post.description}
          </p>
        ) : null}
        {post.tags && post.tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {post.tags.slice(0, 4).map((t) => (
              <li
                key={t}
                className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300"
              >
                {t}
              </li>
            ))}
          </ul>
        ) : null}
      </Link>
    </li>
  );
}

export function BlogIndex({ posts }: Props) {
  const storageKeyShowFilters = 'blog:index:show-filters:v1';
  const allTags = useMemo(
    () =>
      uniqSorted(
        posts
          .flatMap((p) => (Array.isArray(p.tags) ? p.tags : []))
          .filter(Boolean),
      ),
    [posts],
  );
  const allSeries = useMemo(
    () =>
      uniqSorted(
        posts.map((p) => (p.series ?? '').trim()).filter((s) => s.length > 0),
      ),
    [posts],
  );

  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [series, setSeries] = useState<string>('__all__');
  const [sort, setSort] = useState<'new' | 'old'>('new');
  const [visible, setVisible] = useState(40);
  const [showAllTags, setShowAllTags] = useState(false);
  const [showFilters, setShowFilters] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const raw = window.localStorage.getItem(storageKeyShowFilters);
      if (raw === '0') return false;
      if (raw === '1') return true;
    } catch {
      // ignore
    }
    return true;
  });

  const hasActiveFilter =
    query.trim().length > 0 || series !== '__all__' || selectedTags.size > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = posts.slice();
    if (series !== '__all__')
      list = list.filter((p) => (p.series ?? '') === series);
    if (selectedTags.size > 0) {
      list = list.filter((p) =>
        (p.tags ?? []).some((t) => selectedTags.has(t)),
      );
    }
    if (q) {
      list = list.filter((p) => {
        const hay =
          `${p.title}\n${p.description}\n${(p.tags ?? []).join(' ')}\n${p.series ?? ''}`.toLowerCase();
        return hay.includes(q);
      });
    }
    list.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sort === 'new' ? db - da : da - db;
    });
    return list;
  }, [posts, query, selectedTags, series, sort]);

  useEffect(() => {
    window.setTimeout(() => setVisible(40), 0);
  }, [query, selectedTags, series, sort]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKeyShowFilters,
        showFilters ? '1' : '0',
      );
    } catch {
      // ignore
    }
  }, [showFilters]);

  const shown = filtered.slice(0, visible);
  const canLoadMore = visible < filtered.length;
  const sentinelRef = useIntersection(() => {
    if (!canLoadMore) return;
    setVisible((v) => Math.min(filtered.length, v + 24));
  });

  const tagPreviewCount = 14;
  const visibleTags = showAllTags ? allTags : allTags.slice(0, tagPreviewCount);

  return (
    <div
      className={[
        'mt-10 grid gap-8 lg:items-start',
        showFilters ? 'lg:grid-cols-[16rem,minmax(0,1fr)]' : 'lg:grid-cols-1',
      ].join(' ')}
    >
      {showFilters ? (
        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <div
            className={[
              'rounded-3xl border border-[var(--border)] bg-[var(--background)]/92 p-4',
              'shadow-sm shadow-black/5 backdrop-blur-xl',
              'dark:shadow-black/25',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                筛选
              </p>
              <button
                type="button"
                className="text-xs font-semibold text-stone-500 underline-offset-4 hover:underline dark:text-stone-400"
                onClick={() => setShowFilters(false)}
                aria-label="隐藏筛选区"
              >
                隐藏
              </button>
            </div>

            <label className="mt-4 block">
              <span className="sr-only">搜索</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索标题 / 标签 / 系列…"
                className={[
                  'w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 px-4 py-3 text-sm',
                  'text-stone-900 placeholder:text-stone-400',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]',
                  'dark:text-stone-100 dark:placeholder:text-stone-500',
                ].join(' ')}
              />
            </label>

            <div className="mt-4">
              <p
                id="blog-series-filter-label"
                className="mb-2 text-xs font-semibold text-stone-500 dark:text-stone-400"
              >
                系列
              </p>
              <SeriesSelect
                labelId="blog-series-filter-label"
                value={series}
                onChange={setSeries}
                options={[
                  { value: '__all__', label: '全部系列' },
                  ...allSeries.map((s) => ({ value: s, label: s })),
                ]}
              />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-stone-500 dark:text-stone-400">
                排序
              </p>
              <div className="flex flex-wrap gap-2">
                <PillButton
                  active={sort === 'new'}
                  onClick={() => setSort('new')}
                  ariaLabel="按最新排序"
                >
                  最新
                </PillButton>
                <PillButton
                  active={sort === 'old'}
                  onClick={() => setSort('old')}
                  ariaLabel="按最早排序"
                >
                  最早
                </PillButton>
              </div>
            </div>

            {allTags.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                    标签
                  </p>
                  <div className="flex items-center gap-3">
                    {allTags.length > tagPreviewCount ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-stone-500 underline-offset-4 hover:underline dark:text-stone-400"
                        onClick={() => setShowAllTags((v) => !v)}
                        aria-expanded={showAllTags}
                      >
                        {showAllTags ? '收起' : '更多'}
                      </button>
                    ) : null}
                    {selectedTags.size > 0 ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-stone-500 underline-offset-4 hover:underline dark:text-stone-400"
                        onClick={() => {
                          setSelectedTags(new Set());
                          setShowAllTags(false);
                        }}
                      >
                        清空
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {visibleTags.map((t) => (
                    <PillButton
                      key={t}
                      active={selectedTags.has(t)}
                      onClick={() => {
                        const willClear =
                          selectedTags.size === 1 && selectedTags.has(t);
                        setSelectedTags((prev) => {
                          const next = new Set(prev);
                          if (next.has(t)) next.delete(t);
                          else next.add(t);
                          return next;
                        });
                        if (willClear) setShowAllTags(false);
                      }}
                      ariaLabel={`筛选标签 ${t}`}
                    >
                      {t}
                    </PillButton>
                  ))}
                </div>
                {!showAllTags && allTags.length > tagPreviewCount ? (
                  <p className="mt-3 text-xs text-stone-500 dark:text-stone-500">
                    还有 {allTags.length - tagPreviewCount} 个标签
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </aside>
      ) : null}

      <section className="min-w-0">
        {!showFilters ? (
          <div className="sticky top-20 z-30 -mt-1 mb-3 flex justify-end">
            <button
              type="button"
              className={[
                'inline-flex items-center gap-2 rounded-full border border-[var(--border)]',
                'bg-[var(--background)]/92 px-3.5 py-2 text-xs font-semibold',
                'text-stone-700 shadow-sm shadow-black/5 backdrop-blur-xl',
                'transition-colors hover:bg-[var(--background)]/98 hover:text-stone-900',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]',
                'dark:text-stone-200 dark:shadow-black/25 dark:hover:text-stone-50',
              ].join(' ')}
              onClick={() => setShowFilters(true)}
              aria-label="显示筛选区"
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
                <path d="M22 3H2l8 9v7l4 2v-9l8-9Z" />
              </svg>
              显示筛选
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {hasActiveFilter ? '筛选出 ' : '共 '}
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              {filtered.length}
            </span>{' '}
            篇
            {filtered.length !== shown.length ? (
              <>
                ，已展示{' '}
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {shown.length}
                </span>{' '}
                篇
              </>
            ) : null}
          </p>
          <div className="flex items-center gap-2">
            {canLoadMore ? (
              <button
                type="button"
                className="btn btn-secondary px-5 py-2"
                onClick={() =>
                  setVisible((v) => Math.min(filtered.length, v + 40))
                }
              >
                加载更多
              </button>
            ) : null}
          </div>
        </div>

        <ol className="mt-5 grid gap-3 sm:gap-4">
          {shown.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </ol>

        <div ref={sentinelRef} className="h-1" aria-hidden />
      </section>
    </div>
  );
}
