import Link from 'next/link';
import {
  formatPostPublishedAt,
  postPublishedAtIso,
  type PostSummary,
} from '@/lib/posts';
import { DailyPickReason } from './daily-pick-reason';

/**
 * 「今日精选」首页卡片（服务端组件）。
 *
 * ## 数据来源
 * - 后端 `GET /api/posts/daily-pick`：基于「日期 (YYYY-MM-DD) + 全库 slug」做确定性 hash 选一篇
 * - 同一天访问同一篇（CDN / SSG 缓存友好）
 *
 * ## AI 增强
 * - 服务端只负责出 PostSummary 壳，保证 SEO / 静态导出可见
 * - 客户端 `<DailyPickReason>` 在 LLM 已配置且当日缓存未命中时，调一次 LLM 写一句「为什么今天推荐这篇」
 * - 缓存 key：`daily-pick-reason:<YYYY-MM-DD>:<slug>`（localStorage），整天复用
 *
 * 没有 LLM / 客户端缓存命中时显示后端默认描述，体验也不会塌方。
 */
export function DailyPick({ post }: { post: PostSummary | null }) {
  if (!post) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/30 to-orange-500/20 text-amber-700 ring-1 ring-amber-300/30 dark:from-amber-400/15 dark:to-orange-500/10 dark:text-amber-300 dark:ring-amber-500/15"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v3" />
            <path d="m4.93 4.93 2.12 2.12" />
            <path d="M2 12h3" />
            <path d="m4.93 19.07 2.12-2.12" />
            <path d="M12 19v3" />
            <path d="m19.07 19.07-2.12-2.12" />
            <path d="M22 12h-3" />
            <path d="m19.07 4.93-2.12 2.12" />
            <circle cx="12" cy="12" r="4" />
          </svg>
        </span>
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          今日精选
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        <span className="rounded-full border border-amber-300/40 bg-amber-50/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          AI Pick
        </span>
      </div>

      <Link
        href={`/blog/${post.slug}`}
        className="group relative mt-6 block overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-amber-50/60 via-orange-50/30 to-rose-50/20 p-6 transition-all hover:border-amber-300/60 hover:shadow-xl hover:shadow-amber-500/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] dark:from-amber-500/[0.07] dark:via-orange-500/[0.04] dark:to-rose-500/[0.03] dark:hover:border-amber-500/30 sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-rose-300/15 blur-3xl dark:bg-rose-500/10"
        />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 dark:text-stone-400">
            <time dateTime={postPublishedAtIso(post.date)}>
              {formatPostPublishedAt(post.date, 'short')}
            </time>
            <span
              aria-hidden
              className="h-1 w-1 rounded-full bg-stone-400/70 dark:bg-stone-600"
            />
            <span>{post.readingMinutes} 分钟阅读</span>
            {post.series ? (
              <>
                <span
                  aria-hidden
                  className="h-1 w-1 rounded-full bg-stone-400/70 dark:bg-stone-600"
                />
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-stone-700 backdrop-blur-sm dark:bg-stone-800/70 dark:text-stone-200">
                  {post.series}
                </span>
              </>
            ) : null}
          </div>

          <h3 className="mt-3 font-serif text-2xl font-bold leading-tight tracking-tight text-stone-900 transition-colors group-hover:text-[var(--accent)] dark:text-stone-50 sm:text-3xl">
            {post.title}
          </h3>

          {/**
           * AI 推荐语：客户端组件。LLM 配置时调用一次输出一句话；
           * 未命中或未配置时回落到 description。两种情况都不会留空白。
           */}
          <DailyPickReason
            slug={post.slug}
            title={post.title}
            description={post.description}
            tags={post.tags ?? []}
            series={post.series}
          />

          {post.tags && post.tags.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {post.tags.slice(0, 4).map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-medium text-stone-700 backdrop-blur-sm dark:bg-stone-800/70 dark:text-stone-200"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}

          <span className="mt-6 inline-flex items-center text-sm font-semibold text-[var(--accent)]">
            阅读全文
            <svg
              className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5"
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
        </div>
      </Link>
    </section>
  );
}
