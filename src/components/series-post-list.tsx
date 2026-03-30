'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import {
  formatPostPublishedAt,
  postPublishedAtIso,
  type PostSummary,
} from '@/lib/posts';

export type SeriesGroup = {
  series: string;
  posts: PostSummary[];
  latestMs: number;
};

type Props = {
  groups: SeriesGroup[];
  ungrouped: PostSummary[];
};

function SeriesIcon() {
  return (
    <svg
      className="h-5 w-5 text-stone-500 dark:text-stone-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h16" />
      <path d="M4 12h10" />
      <path d="M4 18h16" />
      <path d="M18 10v6" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={[
        'h-5 w-5 flex-none text-stone-400 transition-transform duration-200 motion-reduce:transition-none dark:text-stone-500',
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
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)]/70 px-2.5 py-1 text-xs font-medium text-stone-600 shadow-sm shadow-black/5 dark:text-stone-300">
      {children}
    </span>
  );
}

function PostRow({ post }: { post: PostSummary }) {
  const dateLabel = formatPostPublishedAt(post.date, 'short');
  return (
    <li>
      <Link
        href={`/blog/${post.slug}`}
        className={[
          'group block rounded-2xl border border-transparent px-4 py-3 transition-all duration-200',
          'hover:border-[var(--border)] hover:bg-[var(--surface)]/80 hover:shadow-sm',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]',
        ].join(' ')}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-500">
          <time dateTime={postPublishedAtIso(post.date)}>{dateLabel}</time>
          <span
            className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700"
            aria-hidden
          />
          <span>{post.readingMinutes} 分钟阅读</span>
        </div>
        <div className="mt-2 flex items-start justify-between gap-4">
          <h3 className="min-w-0 font-serif text-base font-semibold tracking-tight text-stone-900 transition-colors group-hover:text-[var(--accent)] dark:text-stone-100 sm:text-lg">
            <span className="line-clamp-1">{post.title}</span>
          </h3>
          <span className="hidden shrink-0 text-sm font-medium text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100 sm:inline-flex">
            阅读
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {post.description}
        </p>
      </Link>
    </li>
  );
}

export function SeriesPostList({ groups, ungrouped }: Props) {
  const storageKey = 'blog:series-open:v1';
  const listId = useId();

  const [openSeries, setOpenSeries] = useState<Set<string>>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return new Set<string>();
      return new Set(parsed.filter((x) => typeof x === 'string'));
    } catch {
      return new Set<string>();
    }
  });

  function toggle(series: string) {
    setOpenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(series)) next.delete(series);
      else next.add(series);
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify(Array.from(next)),
        );
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div className="mt-8 space-y-4" aria-describedby={listId}>
      <p id={listId} className="sr-only">
        系列文章可展开查看，未归类文章在底部单独列出。
      </p>

      {groups.map((group) => {
        const open = openSeries.has(group.series);
        const latest = group.posts[0]?.date;
        return (
          <section
            key={group.series}
            className={[
              'overflow-hidden rounded-3xl border border-[var(--border)]',
              'bg-[var(--surface)]/40 shadow-sm shadow-black/5',
            ].join(' ')}
          >
            <div className="relative">
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent dark:from-amber-400/10"
                aria-hidden
              />
              <button
                type="button"
                onClick={() => toggle(group.series)}
                aria-expanded={open}
                aria-controls={`${listId}-${group.series}`}
                className={[
                  'relative w-full px-5 py-5 text-left sm:px-6',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]',
                  'transition-colors hover:bg-[var(--surface)]/60',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2">
                        <SeriesIcon />
                        <span className="truncate font-serif text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 sm:text-2xl">
                          {group.series}
                        </span>
                      </span>
                      <MetaPill>{group.posts.length} 篇</MetaPill>
                      {latest ? (
                        <MetaPill>
                          最近更新 {formatPostPublishedAt(latest, 'short')}
                        </MetaPill>
                      ) : null}
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                      展开后以“目录”方式浏览系列文章，适合按顺序学习与回顾。
                    </p>
                  </div>
                  <ChevronIcon open={open} />
                </div>
              </button>
            </div>

            <div
              id={`${listId}-${group.series}`}
              className={[
                'grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none',
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              ].join(' ')}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="px-2 pb-3 sm:px-3 sm:pb-4">
                  <ol
                    className="space-y-2"
                    aria-label={`${group.series} 系列文章`}
                  >
                    {group.posts.map((post) => (
                      <PostRow key={post.slug} post={post} />
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {ungrouped.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]/25">
          <div className="px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-serif text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 sm:text-2xl">
                其它文章
              </span>
              <MetaPill>{ungrouped.length} 篇</MetaPill>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              未设置系列的文章会出现在这里。
            </p>
          </div>
          <div className="px-2 pb-3 sm:px-3 sm:pb-4">
            <ol className="space-y-2" aria-label="其它文章列表">
              {ungrouped.map((post) => (
                <PostRow key={post.slug} post={post} />
              ))}
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}
