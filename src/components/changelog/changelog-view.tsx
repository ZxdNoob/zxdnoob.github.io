'use client';

/**
 * 版本历史页：分页加载、按年分组时间轴、范围/类型筛选；PC 与移动端自适应。
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ChangelogReleaseCard } from '@/components/changelog/changelog-release-card';
import {
  changelogEntryKey,
  fetchChangelogPageClient,
  groupChangelogByYear,
  type ChangelogEntry,
  type ChangelogKind,
  type ChangelogKindFilter,
  type ChangelogScopeFilter,
} from '@/lib/changelog';

type KindFilter = ChangelogKindFilter;
type ScopeFilter = ChangelogScopeFilter;

const KIND_ORDER: ChangelogKind[] = [
  'feature',
  'fix',
  'breaking',
  'perf',
  'docs',
];

const KIND_CHIP_LABEL: Record<ChangelogKind, string> = {
  feature: '新功能',
  fix: '修复',
  breaking: '破坏性',
  perf: '性能',
  docs: '文档',
};

const KIND_CHIP_ACCENT: Record<ChangelogKind, string> = {
  feature:
    'border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100',
  fix: 'border-sky-200/80 bg-sky-50 text-sky-950 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-100',
  breaking:
    'border-rose-200/80 bg-rose-50 text-rose-950 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-100',
  perf: 'border-emerald-200/80 bg-emerald-50 text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100',
  docs: 'border-stone-200/80 bg-stone-100 text-stone-900 dark:border-stone-600/60 dark:bg-stone-800/80 dark:text-stone-100',
};

export type ChangelogViewProps = {
  initialEntries: ChangelogEntry[];
  initialTotal: number;
  initialHasMore: boolean;
  initialYears: number[];
  latestWeb?: string;
  latestApi?: string;
  pageSize: number;
};

export function ChangelogView({
  initialEntries,
  initialTotal,
  initialHasMore,
  initialYears,
  latestWeb,
  latestApi,
  pageSize,
}: ChangelogViewProps) {
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [entries, setEntries] = useState(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [years, setYears] = useState(initialYears);
  const [listLoading, setListLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [jumpingYear, setJumpingYear] = useState<number | null>(null);

  const skipFilterFetch = useRef(true);
  const loadMoreLock = useRef(false);

  const yearGroups = useMemo(() => groupChangelogByYear(entries), [entries]);
  const shownCount = entries.length;
  const filtersActive = scopeFilter !== 'all' || kindFilter !== 'all';

  const fetchPage = useCallback(
    async (offset: number) =>
      fetchChangelogPageClient({
        limit: pageSize,
        offset,
        scope: scopeFilter,
        kind: kindFilter,
      }),
    [pageSize, scopeFilter, kindFilter],
  );

  /** 筛选变化时重置列表（跳过首屏 SSR 数据以避免重复请求） */
  useEffect(() => {
    if (skipFilterFetch.current) {
      skipFilterFetch.current = false;
      return;
    }
    let cancelled = false;
    setListLoading(true);
    void fetchPage(0).then((page) => {
      if (cancelled) return;
      setEntries(page.entries);
      setTotal(page.total);
      setHasMore(page.hasMore);
      setYears(page.years);
      setListLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const loadMore = useCallback(async (): Promise<{
    loaded: number;
    hasMore: boolean;
  }> => {
    if (!hasMore || loadMoreLock.current) {
      return { loaded: 0, hasMore };
    }
    loadMoreLock.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchPage(entries.length);
      setEntries((prev) => {
        const seen = new Set(prev.map(changelogEntryKey));
        const next = page.entries.filter(
          (e) => !seen.has(changelogEntryKey(e)),
        );
        return [...prev, ...next];
      });
      setTotal(page.total);
      setHasMore(page.hasMore);
      setYears(page.years);
      return { loaded: page.entries.length, hasMore: page.hasMore };
    } finally {
      setLoadingMore(false);
      loadMoreLock.current = false;
    }
  }, [entries.length, fetchPage, hasMore]);

  const jumpToYear = useCallback(
    async (year: number) => {
      const scrollTo = () => {
        const el = document.getElementById(`year-${year}`);
        if (!el) return false;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      };
      if (scrollTo()) return;
      setJumpingYear(year);
      try {
        let guard = 0;
        let stillHasMore = hasMore;
        while (stillHasMore && guard < 30) {
          const { loaded, hasMore: nextHasMore } = await loadMore();
          stillHasMore = nextHasMore;
          guard += 1;
          if (loaded === 0) break;
          if (scrollTo()) return;
        }
      } finally {
        setJumpingYear(null);
      }
    },
    [hasMore, loadMore],
  );

  return (
    <div>
      <section className="relative overflow-hidden border-b border-stone-200/90 dark:border-stone-800/90">
        <div
          className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-30"
          aria-hidden
        >
          <div className="absolute -left-1/4 top-0 h-[420px] w-[70%] rounded-full bg-gradient-to-br from-amber-200/50 via-orange-100/30 to-transparent blur-3xl dark:from-amber-500/20 dark:via-orange-500/10" />
          <div className="absolute -right-1/4 bottom-0 h-[320px] w-[60%] rounded-full bg-gradient-to-tl from-stone-300/40 via-transparent to-transparent blur-3xl dark:from-stone-600/20" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 pb-12 pt-10 sm:px-6 sm:pb-14 sm:pt-14">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-800/90 dark:text-amber-200/90">
            Changelog
          </p>
          <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-stone-900 sm:mt-4 sm:text-4xl md:text-5xl dark:text-stone-50">
            版本历史
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-600 sm:mt-4 sm:text-lg dark:text-stone-400">
            追踪站点前端与后端的重要更新。可按范围与变更类型筛选，点击版本号即可复制。
          </p>

          <details className="mt-4 max-w-2xl text-sm text-stone-500 dark:text-stone-500">
            <summary className="cursor-pointer select-none font-medium text-stone-600 outline-none marker:content-none hover:text-stone-800 focus-visible:rounded focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:text-stone-400 dark:hover:text-stone-200">
              数据来源说明
            </summary>
            <p className="mt-2 leading-relaxed">
              记录保存在 SQLite{' '}
              <code className="rounded bg-stone-100 px-1 text-[0.9em] dark:bg-stone-800">
                changelog_releases
              </code>
              ，经{' '}
              <code className="rounded bg-stone-100 px-1 text-[0.9em] dark:bg-stone-800">
                GET /api/changelog
              </code>{' '}
              分页返回；首屏仅加载最近 {pageSize} 条，其余可逐步展开。
            </p>
          </details>

          {initialTotal === 0 ? (
            <p
              className="mt-6 max-w-2xl rounded-xl border border-stone-200/90 bg-stone-50/80 px-4 py-3 text-sm leading-relaxed text-stone-700 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-300"
              role="status"
            >
              暂无版本记录或无法连接后端。请先启动 API（{' '}
              <code className="rounded bg-stone-200/80 px-1 dark:bg-stone-800">
                npm run dev:api
              </code>
              ）。
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-4">
              <StatCard label="累计发布" value={String(total)} large />
              <StatCard
                label="当前前端"
                value={latestWeb != null ? `v${latestWeb}` : '—'}
                tone="amber"
              />
              <StatCard
                label="当前后端"
                value={latestApi != null ? `v${latestApi}` : '—'}
                tone="violet"
              />
              <StatCard
                label="已加载"
                value={`${shownCount} / ${total}`}
                className="col-span-2 lg:col-span-1"
                hint={hasMore ? '下方可加载更多' : '已全部展示'}
              />
            </div>
          )}
        </div>
      </section>

      {initialTotal > 0 ? (
        <>
          <div className="sticky-below-site-nav border-b border-stone-200/90 bg-[var(--background)] shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:border-stone-800/90 dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]">
            <div className="mx-auto max-w-4xl space-y-0 px-4 sm:px-6">
              <FilterRow label="范围" ariaLabel="按前端或后端筛选">
                <ScopeChip
                  active={scopeFilter === 'all'}
                  onClick={() => setScopeFilter('all')}
                >
                  全部
                </ScopeChip>
                <ScopeChip
                  active={scopeFilter === 'web'}
                  onClick={() => setScopeFilter('web')}
                  variant="web"
                >
                  前端
                </ScopeChip>
                <ScopeChip
                  active={scopeFilter === 'api'}
                  onClick={() => setScopeFilter('api')}
                  variant="api"
                >
                  后端
                </ScopeChip>
              </FilterRow>
              <FilterRow label="类型" ariaLabel="按变更类型筛选" bordered>
                <FilterChip
                  active={kindFilter === 'all'}
                  onClick={() => setKindFilter('all')}
                >
                  全部
                </FilterChip>
                {KIND_ORDER.map((k) => (
                  <FilterChip
                    key={k}
                    active={kindFilter === k}
                    onClick={() => setKindFilter(k)}
                    accent={KIND_CHIP_ACCENT[k]}
                  >
                    {KIND_CHIP_LABEL[k]}
                  </FilterChip>
                ))}
              </FilterRow>
            </div>

            {years.length > 1 ? (
              <div className="border-t border-stone-100/90 dark:border-stone-800/80">
                <div className="mx-auto max-w-4xl px-4 py-2 sm:px-6">
                  <nav
                    className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    aria-label="按年份跳转"
                  >
                    <span className="shrink-0 pr-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500">
                      年份
                    </span>
                    {years.map((y) => (
                      <button
                        key={y}
                        type="button"
                        disabled={jumpingYear != null}
                        onClick={() => void jumpToYear(y)}
                        className="shrink-0 rounded-full border border-stone-200/90 bg-white/60 px-3 py-1.5 font-mono text-[13px] tabular-nums text-stone-700 outline-none transition hover:border-amber-300/90 hover:text-amber-900 focus-visible:ring-2 focus-visible:ring-amber-500/40 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-200 dark:hover:border-amber-500/40 dark:hover:text-amber-200"
                      >
                        {jumpingYear === y ? '…' : y}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mx-auto max-w-4xl px-4 pb-28 pt-8 sm:px-6 sm:pt-10">
            {listLoading ? (
              <TimelineSkeleton />
            ) : yearGroups.length === 0 ? (
              <p
                className="rounded-2xl border border-dashed border-stone-300/90 px-6 py-16 text-center text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400"
                role="status"
              >
                {filtersActive
                  ? '当前筛选下没有条目，请尝试调整「范围」或「类型」。'
                  : '暂无版本记录。'}
              </p>
            ) : (
              <div
                className="space-y-12 sm:space-y-16"
                aria-busy={loadingMore || jumpingYear != null}
              >
                {yearGroups.map((group) => (
                  <section
                    key={group.year}
                    id={`year-${group.year}`}
                    className="scroll-mt-changelog-sticky"
                  >
                    <div className="mb-6 flex items-baseline gap-3 border-b border-stone-200/70 pb-3 sm:mb-8 lg:hidden dark:border-stone-700/70">
                      <h2 className="font-serif text-2xl font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                        {group.year}
                      </h2>
                      <span className="text-sm text-stone-500">
                        {group.entries.length} 次发布
                      </span>
                    </div>

                    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
                      <div className="hidden lg:block lg:w-24 lg:shrink-0">
                        <div className="sticky-changelog-year-rail">
                          <p className="font-serif text-3xl font-semibold tabular-nums text-stone-400 dark:text-stone-500">
                            {group.year}
                          </p>
                          <p className="mt-1 text-sm text-stone-500">
                            {group.entries.length} 次
                          </p>
                        </div>
                      </div>

                      <div className="relative min-w-0 flex-1">
                        <div
                          className="pointer-events-none absolute left-[5px] top-3 bottom-3 w-px bg-gradient-to-b from-amber-400/70 via-stone-200 to-stone-200 sm:left-[7px] dark:from-amber-500/50 dark:via-stone-700 dark:to-stone-800"
                          aria-hidden
                        />
                        <ul className="relative space-y-6 sm:space-y-8">
                          {group.entries.map((entry) => (
                            <li key={changelogEntryKey(entry)}>
                              <ChangelogReleaseCard entry={entry} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </section>
                ))}

                {hasMore ? (
                  <div className="flex flex-col items-center gap-3 pt-4">
                    <button
                      type="button"
                      disabled={loadingMore || listLoading}
                      onClick={() => void loadMore()}
                      className="btn btn-secondary min-h-11 w-full max-w-md px-6 text-sm font-medium disabled:opacity-60 sm:w-auto"
                    >
                      {loadingMore
                        ? '加载中…'
                        : `加载更多（${shownCount} / ${total}）`}
                    </button>
                    <p className="text-center text-xs text-stone-500 dark:text-stone-500">
                      每次加载 {pageSize} 条发布记录
                    </p>
                  </div>
                ) : shownCount > 0 && total > pageSize ? (
                  <p
                    className="pt-6 text-center text-sm text-stone-500 dark:text-stone-500"
                    role="status"
                  >
                    已展示全部 {total} 条记录
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  large,
  tone,
  className = '',
}: {
  label: string;
  value: string;
  hint?: string;
  large?: boolean;
  tone?: 'amber' | 'violet';
  className?: string;
}) {
  const toneBorder =
    tone === 'amber'
      ? 'border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white/60 dark:border-amber-500/20 dark:from-amber-500/10 dark:to-stone-900/40'
      : tone === 'violet'
        ? 'border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-white/60 dark:border-violet-500/20 dark:from-violet-500/10 dark:to-stone-900/40'
        : 'border-stone-200/80 bg-white/60 dark:border-stone-700/80 dark:bg-stone-900/40';

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm backdrop-blur-sm sm:p-5 ${toneBorder} ${className}`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500 sm:text-xs dark:text-stone-500">
        {label}
      </p>
      <p
        className={`mt-1.5 tabular-nums text-stone-900 dark:text-stone-50 ${
          large
            ? 'font-serif text-2xl font-semibold sm:text-3xl'
            : 'font-mono text-xl font-semibold sm:text-2xl'
        }`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-stone-500 dark:text-stone-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function FilterRow({
  label,
  ariaLabel,
  bordered,
  children,
}: {
  label: string;
  ariaLabel: string;
  bordered?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`py-3 ${bordered ? 'border-t border-stone-100/90 dark:border-stone-800/80' : ''}`}
      role="toolbar"
      aria-label={ariaLabel}
    >
      <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="sticky left-0 z-[1] shrink-0 bg-[var(--background)]/95 pr-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400 backdrop-blur-sm dark:text-stone-500">
          {label}
        </span>
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--border)] p-5 sm:p-6"
        >
          <div className="skeleton h-7 w-32 rounded-lg" />
          <div className="skeleton mt-4 h-5 w-48" />
          <div className="mt-4 space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ScopeChip({
  children,
  active,
  onClick,
  variant,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  variant?: 'web' | 'api';
}) {
  const activeWeb =
    'border-amber-400/90 bg-amber-50 text-amber-950 shadow-sm dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-50';
  const activeApi =
    'border-violet-400/90 bg-violet-50 text-violet-950 shadow-sm dark:border-violet-500/50 dark:bg-violet-500/15 dark:text-violet-50';

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] dark:focus-visible:ring-offset-[var(--background)]',
        active
          ? variant === 'web'
            ? `${activeWeb} focus-visible:ring-amber-500/50`
            : variant === 'api'
              ? `${activeApi} focus-visible:ring-violet-500/50`
              : 'border-stone-900 bg-stone-900 text-white shadow-sm focus-visible:ring-stone-500/50 dark:border-amber-400 dark:bg-amber-400 dark:text-stone-950'
          : 'border-stone-200/90 bg-white/70 text-stone-600 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-400',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function FilterChip({
  children,
  active,
  onClick,
  accent,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
        active
          ? accent
            ? `${accent} border-transparent shadow-sm`
            : 'border-stone-900 bg-stone-900 text-white shadow-sm dark:border-amber-400 dark:bg-amber-400 dark:text-stone-950'
          : 'border-stone-200/90 bg-white/70 text-stone-600 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-400',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
