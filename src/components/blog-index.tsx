'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BlogPostCard } from '@/components/blog-post-card';
import {
  BLOG_ALL_SERIES,
  buildBlogSearchParams,
  createBlogIndexMeta,
  filterBlogPosts,
  getActiveFilterCount,
  type BlogFacet,
  type BlogFilters,
  parseBlogFilters,
} from '@/lib/blog-index';
import type { PostSummary } from '@/lib/posts';

type Props = {
  posts: PostSummary[];
  viewCounts?: Record<string, number>;
  showViewCounts?: boolean;
};

const INITIAL_PAGE_SIZE = 6;
const PAGE_SIZE = 12;

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function useIntersection(onHit: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onHit();
      },
      { rootMargin: '480px 0px', threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [onHit]);

  return ref;
}

function useResponsiveLoadSize() {
  const [step, setStep] = useState(PAGE_SIZE);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function update() {
      if (window.innerWidth < 640) {
        setIsMobile(true);
        setStep(6);
        return;
      }
      if (window.innerWidth < 1024) {
        setIsMobile(false);
        setStep(8);
        return;
      }
      setIsMobile(false);
      setStep(PAGE_SIZE);
    }

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return { step, isMobile };
}

function SurfaceButton({
  active = false,
  children,
  onClick,
  ariaLabel,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={[
        'inline-flex items-center justify-center rounded-full border px-3 py-2 text-sm font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]',
        active
          ? 'border-amber-400/50 bg-amber-500/10 text-stone-900 shadow-sm dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-stone-100'
          : 'border-[var(--border)] bg-[var(--surface)]/70 text-stone-600 hover:bg-[var(--surface)] dark:text-stone-300',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function SearchField({
  initialValue,
  onCommit,
}: {
  initialValue: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(initialValue);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft !== initialValue) onCommit(draft);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [draft, initialValue, onCommit]);

  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="搜索标题、描述、标签或系列"
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-11 pr-4 text-sm text-stone-900 shadow-sm shadow-black/5 outline-none transition-colors placeholder:text-stone-400 focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] dark:bg-stone-900 dark:text-stone-100 dark:shadow-black/20"
      />
    </div>
  );
}

function useClickAway<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  onAway: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    function handle(event: MouseEvent) {
      const node = ref.current;
      if (!node) return;
      if (event.target instanceof Node && !node.contains(event.target)) {
        onAway();
      }
    }

    window.addEventListener('mousedown', handle);
    return () => window.removeEventListener('mousedown', handle);
  }, [enabled, onAway, ref]);
}

function FilterChip({
  facet,
  active,
  onClick,
}: {
  facet: BlogFacet;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]',
        active
          ? 'border-amber-400/50 bg-amber-500/10 text-stone-900 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-stone-50'
          : 'border-[var(--border)] bg-[var(--surface)]/60 text-stone-600 hover:bg-[var(--surface)] dark:text-stone-300',
      ].join(' ')}
    >
      <span>{facet.label}</span>
      <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] text-stone-500 dark:bg-white/10 dark:text-stone-400">
        {facet.count}
      </span>
    </button>
  );
}

function ActiveFilterTag({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-stone-900 transition-colors hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-stone-100"
    >
      <span>{label}</span>
      <svg
        className="h-3 w-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected =
    options.find((option) => option.value === value) ??
    options[0] ?? {
      value: '',
      label: '',
    };

  useClickAway(rootRef, () => setOpen(false), open);

  return (
    <div className="block" ref={rootRef}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
        {label}
      </span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={[
            'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition-all',
            'border-[var(--border)] bg-gradient-to-br from-stone-50 to-[var(--surface)]',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]',
            'hover:border-stone-300 hover:bg-stone-50 dark:from-stone-900 dark:to-stone-800 dark:hover:border-stone-600 dark:hover:bg-stone-900',
            open ? 'ring-4 ring-[var(--focus-ring)]' : '',
          ].join(' ')}
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-stone-900 dark:text-stone-100">
              {selected.label}
            </span>
          </span>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-900/5 text-stone-500 dark:bg-white/8 dark:text-stone-300">
            <svg
              className={[
                'h-4 w-4 transition-transform duration-200',
                open ? 'rotate-180' : '',
              ].join(' ')}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl shadow-black/12 dark:bg-stone-900 dark:shadow-black/40">
            <div className="max-h-72 overflow-auto p-1.5">
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={[
                      'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                      active
                        ? 'bg-amber-500/10 text-stone-900 dark:bg-amber-400/10 dark:text-stone-50'
                        : 'text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800',
                    ].join(' ')}
                  >
                    <span className="truncate">{option.label}</span>
                    {active ? (
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
    </div>
  );
}

function BlogResults({
  posts,
  view,
  viewCounts,
  showViewCounts,
}: {
  posts: PostSummary[];
  view: 'grid' | 'list';
  viewCounts: Record<string, number>;
  showViewCounts: boolean;
}) {
  const { step, isMobile } = useResponsiveLoadSize();
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const visiblePosts = posts.slice(0, visibleCount);
  const canLoadMore = visibleCount < posts.length;

  const sentinelRef = useIntersection(
    useCallback(() => {
      if (!canLoadMore) return;
      setIsAutoLoading(true);
      window.setTimeout(() => {
        setVisibleCount((current) => Math.min(posts.length, current + step));
        setIsAutoLoading(false);
      }, 180);
    }, [canLoadMore, posts.length, step]),
  );

  return (
    <>
      <ol
        className={[
          'mt-6',
          view === 'grid' ? 'grid gap-4 lg:grid-cols-2' : 'grid gap-4',
        ].join(' ')}
      >
        {visiblePosts.map((post) => (
          <BlogPostCard
            key={post.slug}
            post={post}
            views={viewCounts[post.slug] ?? 0}
            showViewCounts={showViewCounts}
            view={view}
          />
        ))}
      </ol>

      <div className="mt-6 flex flex-col items-center gap-4">
        {canLoadMore && isMobile ? (
          <div className="w-full rounded-2xl border border-dashed border-[var(--border)] bg-stone-50/80 px-4 py-4 text-center dark:bg-stone-900/80">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-200">
              {isAutoLoading ? (
                <>
                  <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-700 dark:border-stone-700 dark:border-t-stone-100" />
                  正在加载更多文章...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4 text-stone-500 dark:text-stone-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="m12 5 0 14" />
                    <path d="m19 12-7 7-7-7" />
                  </svg>
                  继续下滑，自动加载更多
                </>
              )}
            </div>
            <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
              当前已显示 {formatNumber(visiblePosts.length)} /{' '}
              {formatNumber(posts.length)} 篇
            </p>
          </div>
        ) : null}
        {canLoadMore ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              setVisibleCount((current) => Math.min(posts.length, current + step))
            }
          >
            加载更多文章
          </button>
        ) : (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            已展示全部 {formatNumber(posts.length)} 篇文章。
          </p>
        )}
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
      </div>
    </>
  );
}

export function BlogIndex({
  posts,
  viewCounts = {},
  showViewCounts = true,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const meta = useMemo(
    () => createBlogIndexMeta(posts, showViewCounts ? viewCounts : {}),
    [posts, showViewCounts, viewCounts],
  );
  const filters = useMemo(
    () => parseBlogFilters(new URLSearchParams(searchParams.toString()), meta),
    [meta, searchParams],
  );
  const filteredPosts = useMemo(
    () => filterBlogPosts(posts, filters),
    [filters, posts],
  );
  const activeFilterCount = getActiveFilterCount(filters);
  const selectedSeries =
    meta.seriesOptions.find((item) => item.value === filters.series)?.label ??
    '全部系列';
  const [advancedOpen, setAdvancedOpen] = useState(activeFilterCount > 0);
  const [pinnedTop, setPinnedTop] = useState(false);
  const [toolbarCondensed, setToolbarCondensed] = useState(false);

  const replaceFilters = useCallback(
    (updater: (current: BlogFilters) => BlogFilters) => {
      const next = updater(filters);
      const params = buildBlogSearchParams(next);
      const nextUrl = params.size > 0 ? `${pathname}?${params}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [filters, pathname, router],
  );

  const toggleTag = useCallback(
    (tag: string) => {
      replaceFilters((current) => {
        const nextTags = current.tags.includes(tag)
          ? current.tags.filter((item) => item !== tag)
          : [...current.tags, tag];
        return { ...current, tags: nextTags };
      });
    },
    [replaceFilters],
  );

  const clearFilters = useCallback(() => {
    const nextUrl =
      filters.view === 'grid' ? pathname : `${pathname}?view=${filters.view}`;
    router.replace(nextUrl, { scroll: false });
  }, [filters.view, pathname, router]);
  const filterSignature = buildBlogSearchParams(filters).toString() || 'all';
  const compactToolbar = pinnedTop || toolbarCondensed;

  useEffect(() => {
    function onScroll() {
      setToolbarCondensed(window.scrollY > 160);
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function syncPinnedAvailability() {
      if (window.innerWidth < 1024) setPinnedTop(false);
    }

    syncPinnedAvailability();
    window.addEventListener('resize', syncPinnedAvailability);
    return () => window.removeEventListener('resize', syncPinnedAvailability);
  }, []);

  return (
    <div className="mt-10 space-y-8">
      <section
        className={[
          'rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface)] shadow-sm shadow-black/6 transition-all dark:bg-stone-900 dark:shadow-black/30',
          pinnedTop ? 'lg:sticky lg:top-20 lg:z-40' : '',
        ].join(' ')}
      >
        <div
          className={[
            'transition-all',
            compactToolbar ? 'p-3 sm:p-4' : 'p-4 sm:p-5',
          ].join(' ')}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <SearchField
                key={filters.query}
                initialValue={filters.query}
                onCommit={(value) =>
                  replaceFilters((current) => ({
                    ...current,
                    query: value,
                  }))
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-stone-50 px-3 py-2 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {formatNumber(filteredPosts.length)}
                </span>
                <span className="ml-1">篇结果</span>
              </div>
              <SurfaceButton
                active={filters.view === 'grid'}
                onClick={() =>
                  replaceFilters((current) => ({ ...current, view: 'grid' }))
                }
                ariaLabel="切换为网格视图"
              >
                网格
              </SurfaceButton>
              <SurfaceButton
                active={filters.view === 'list'}
                onClick={() =>
                  replaceFilters((current) => ({ ...current, view: 'list' }))
                }
                ariaLabel="切换为列表视图"
              >
                列表
              </SurfaceButton>
              <SurfaceButton
                active={advancedOpen}
                onClick={() => setAdvancedOpen((open) => !open)}
                ariaLabel="展开高级筛选"
              >
                {advancedOpen ? '收起筛选' : '筛选'}
              </SurfaceButton>
              <div className="hidden lg:block">
                <SurfaceButton
                  active={pinnedTop}
                  onClick={() => setPinnedTop((value) => !value)}
                  ariaLabel="固定筛选条到顶部"
                >
                  {pinnedTop ? '取消置顶' : '固定顶部'}
                </SurfaceButton>
              </div>
            </div>
          </div>

          {advancedOpen && (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,14rem),minmax(0,14rem),1fr] lg:items-start">
                <SelectField
                  label="系列"
                  value={filters.series}
                  onChange={(value) =>
                    replaceFilters((current) => ({ ...current, series: value }))
                  }
                  options={meta.seriesOptions.map((item) => ({
                    value: item.value,
                    label: `${item.label} (${item.count})`,
                  }))}
                />
                <SelectField
                  label="排序"
                  value={filters.sort}
                  onChange={(value) =>
                    replaceFilters((current) => ({
                      ...current,
                      sort: value as BlogFilters['sort'],
                    }))
                  }
                  options={[
                    { value: 'new', label: '最新发布优先' },
                    { value: 'old', label: '最早发布优先' },
                    { value: 'reading', label: '阅读时长优先' },
                  ]}
                />
                <div className="min-w-0">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
                      标签
                    </span>
                    <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                      <span>{filters.tags.length} 已选</span>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="font-semibold underline-offset-4 hover:underline"
                      >
                        清空
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {meta.tagOptions.map((tag) => (
                      <FilterChip
                        key={tag.value}
                        facet={tag}
                        active={filters.tags.includes(tag.value)}
                        onClick={() => toggleTag(tag.value)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                <span className="rounded-full border border-[var(--border)] bg-stone-50 px-3 py-1.5 dark:bg-stone-800">
                  {formatNumber(meta.totalPosts)} 篇文章
                </span>
                <span className="rounded-full border border-[var(--border)] bg-stone-50 px-3 py-1.5 dark:bg-stone-800">
                  {formatNumber(meta.totalSeries)} 个系列
                </span>
                <span className="rounded-full border border-[var(--border)] bg-stone-50 px-3 py-1.5 dark:bg-stone-800">
                  {formatNumber(meta.totalTags)} 个标签
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      <div>
        <section className="min-w-0">
          <div className="rounded-[1.75rem] border border-[var(--border)] bg-gradient-to-br from-stone-50 to-[var(--surface)] p-5 shadow-sm shadow-black/5 dark:from-stone-900 dark:to-stone-800 dark:shadow-black/30">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400 dark:text-stone-500">
                  Results
                </p>
                <h3 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                  {activeFilterCount > 0 ? '筛选结果' : '全部文章'}
                </h3>
                <p className="mt-2 text-sm leading-7 text-stone-600 dark:text-stone-400">
                  当前共找到{' '}
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {formatNumber(filteredPosts.length)}
                  </span>{' '}
                  篇文章，系列为{' '}
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {selectedSeries}
                  </span>
                  ，展示模式为{' '}
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {filters.view === 'grid' ? '网格' : '列表'}
                  </span>
                  。
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-right dark:bg-stone-900">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
                  活跃筛选
                </p>
                <p className="mt-2 font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">
                  {formatNumber(activeFilterCount)}
                </p>
              </div>
            </div>

            {activeFilterCount > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {filters.query ? (
                  <ActiveFilterTag
                    label={`搜索: ${filters.query}`}
                    onRemove={() => {
                      replaceFilters((current) => ({ ...current, query: '' }));
                    }}
                  />
                ) : null}
                {filters.series !== BLOG_ALL_SERIES ? (
                  <ActiveFilterTag
                    label={`系列: ${selectedSeries}`}
                    onRemove={() =>
                      replaceFilters((current) => ({
                        ...current,
                        series: BLOG_ALL_SERIES,
                      }))
                    }
                  />
                ) : null}
                {filters.tags.map((tag) => (
                  <ActiveFilterTag
                    key={tag}
                    label={`标签: ${tag}`}
                    onRemove={() => toggleTag(tag)}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {filteredPosts.length === 0 ? (
            <div className="mt-6 rounded-[1.75rem] border border-dashed border-[var(--border)] bg-[var(--surface)]/50 p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <h4 className="mt-4 font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">
                没有匹配的文章
              </h4>
              <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-400">
                可以尝试清空关键词、切换系列，或减少标签筛选条件。
              </p>
              <button type="button" className="btn btn-secondary mt-6" onClick={clearFilters}>
                重置筛选
              </button>
            </div>
          ) : (
            <BlogResults
              key={filterSignature}
              posts={filteredPosts}
              view={filters.view}
              viewCounts={viewCounts}
              showViewCounts={showViewCounts}
            />
          )}
        </section>
      </div>
    </div>
  );
}
