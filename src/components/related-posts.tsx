import Link from 'next/link';
import {
  type PostHit,
  formatPostPublishedAt,
  postPublishedAtIso,
} from '@/lib/posts';

/**
 * 文章页末尾的「相关阅读」模块。
 *
 * ## 数据来源
 * - 后端 `GET /api/posts/:slug/related?limit=4`
 * - 评分 = char-trigram Jaccard × 100 + 共享 tag × 8 + 同 series × 12 + 时间衰减
 *
 * ## 设计目标
 * - 服务端组件（async）→ SSG 时直接出在 HTML 里，不阻塞首屏交互
 * - 视觉与首页 `BENTO` 卡片对齐（spotlight glow border 留给主卡片，避免视觉打架）
 * - 列出 0 条时直接返回 `null`，不留空区块
 */
export function RelatedPosts({
  posts,
  className,
}: {
  posts: PostHit[];
  className?: string;
}) {
  if (!posts || posts.length === 0) return null;

  return (
    <section
      aria-label="相关阅读"
      className={['mt-16 border-t border-[var(--border)]/60 pt-10', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-baseline justify-between gap-4">
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
              <path d="M2 12h6l3 9 4-18 3 9h4" />
            </svg>
          </span>
          <h2 className="font-serif text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            相关阅读
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-500">
            基于内容相似度 + 标签/系列加权
          </p>
        </div>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {posts.map((post, i) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="group relative block h-full rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-4 transition-all hover:border-stone-300/80 hover:bg-[var(--surface)]/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] dark:hover:border-stone-600/70"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-stone-500 dark:text-stone-500">
                  <time dateTime={postPublishedAtIso(post.date)}>
                    {formatPostPublishedAt(post.date, 'short')}
                  </time>
                  <span
                    aria-hidden
                    className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700"
                  />
                  <span>{post.readingMinutes} 分钟</span>
                  {post.series ? (
                    <>
                      <span
                        aria-hidden
                        className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700"
                      />
                      <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                        {post.series}
                      </span>
                    </>
                  ) : null}
                </div>
                <span
                  aria-hidden
                  className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 px-1.5 text-[10px] font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-200"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-2.5 font-serif text-base font-semibold tracking-tight text-stone-900 transition-colors group-hover:text-[var(--accent)] dark:text-stone-100">
                <span className="line-clamp-2">{post.title}</span>
              </h3>
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                {post.description}
              </p>
              {post.tags && post.tags.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {post.tags.slice(0, 3).map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
