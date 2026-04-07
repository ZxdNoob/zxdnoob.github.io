'use client';

import Link from 'next/link';
import { SpotlightCard } from '@/components/spotlight-card';
import {
  formatPostPublishedAt,
  postPublishedAtIso,
  type PostSummary,
} from '@/lib/posts';

type Props = {
  post: PostSummary;
  views: number;
  showViewCounts: boolean;
  view: 'grid' | 'list';
};

function StatDot() {
  return (
    <span
      className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700"
      aria-hidden
    />
  );
}

export function BlogPostCard({
  post,
  views,
  showViewCounts,
  view,
}: Props) {
  const isList = view === 'list';
  const dateLabel = formatPostPublishedAt(post.date, 'short');

  return (
    <li className="h-full">
      <SpotlightCard
        className={[
          'glow-border h-full rounded-[1.75rem] border border-[var(--border)]',
          'bg-gradient-to-br from-stone-50 via-[var(--surface)] to-amber-50/65',
          'shadow-sm shadow-black/5 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-black/8 dark:from-stone-900 dark:via-stone-900 dark:to-stone-800 dark:shadow-black/25 dark:group-hover:shadow-black/35',
        ].join(' ')}
      >
        <Link
          href={`/blog/${post.slug}`}
          className={[
            'group relative flex h-full flex-col rounded-[1.65rem] p-5 sm:p-6',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]',
            isList ? 'sm:flex-row sm:items-start sm:justify-between sm:gap-6' : '',
          ].join(' ')}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-stone-500 dark:text-stone-500">
              <time dateTime={postPublishedAtIso(post.date)}>{dateLabel}</time>
              <StatDot />
              <span>{post.readingMinutes} 分钟阅读</span>
              {showViewCounts && views > 0 ? (
                <>
                  <StatDot />
                  <span className="inline-flex items-center gap-1">
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span className="tabular-nums">{views}</span>
                  </span>
                </>
              ) : null}
              {post.series ? (
                <>
                  <StatDot />
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                    {post.series}
                  </span>
                </>
              ) : null}
            </div>

            <h3
              className={[
                'mt-3 font-serif font-semibold tracking-tight text-stone-900 transition-colors group-hover:text-[var(--accent)] dark:text-stone-100',
                isList ? 'text-xl sm:text-2xl' : 'text-xl',
              ].join(' ')}
            >
              {post.title}
            </h3>

            {post.description ? (
              <p
                className={[
                  'mt-3 text-sm leading-7 text-stone-600 dark:text-stone-400',
                  isList ? 'line-clamp-3 max-w-3xl' : 'line-clamp-3',
                ].join(' ')}
              >
                {post.description}
              </p>
            ) : null}

            {post.tags && post.tags.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {post.tags.slice(0, isList ? 6 : 4).map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-2.5 py-1 text-[11px] font-semibold text-stone-600 dark:text-stone-300"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div
            className={[
              'mt-6 flex items-center justify-between gap-3 text-sm font-medium text-stone-500 dark:text-stone-400',
              isList
                ? 'sm:mt-0 sm:w-36 sm:flex-col sm:items-end sm:justify-between sm:self-stretch'
                : '',
            ].join(' ')}
          >
            <span
              className={[
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-all duration-200',
                'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900',
                'group-hover:translate-x-0.5 group-hover:bg-stone-800 group-hover:border-stone-800 dark:group-hover:bg-white dark:group-hover:border-white',
              ].join(' ')}
            >
              阅读全文
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
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
            </span>
            <span className="text-xs text-stone-400 transition-colors group-hover:text-stone-500 dark:text-stone-500 dark:group-hover:text-stone-400">
              {post.tags?.length ?? 0} 个标签
            </span>
          </div>
        </Link>
      </SpotlightCard>
    </li>
  );
}
