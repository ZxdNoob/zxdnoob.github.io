import Link from 'next/link';
import { PostCard } from '@/components/post-card';
import {
  fetchAllPostSummaries,
  formatPostPublishedAt,
  postPublishedAtIso,
} from '@/lib/posts';
import { site } from '@/lib/site';

function CompactPostRow({
  post,
  index,
}: {
  post: Awaited<ReturnType<typeof fetchAllPostSummaries>>[number];
  index: number;
}) {
  const dateLabel = formatPostPublishedAt(post.date, 'short');
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={[
        'group relative block rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-5',
        'transition-all duration-200 hover:bg-[var(--surface)]/80 hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-500">
            <time dateTime={postPublishedAtIso(post.date)}>{dateLabel}</time>
            <span
              className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700"
              aria-hidden
            />
            <span>{post.readingMinutes} 分钟阅读</span>
            {post.series ? (
              <>
                <span
                  className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700"
                  aria-hidden
                />
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                  {post.series}
                </span>
              </>
            ) : null}
          </div>
          <h3 className="mt-2 font-serif text-lg font-semibold tracking-tight text-stone-900 transition-colors group-hover:text-[var(--accent)] dark:text-stone-100">
            <span className="line-clamp-1">{post.title}</span>
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {post.description}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-200">
            {index}
          </span>
          <span className="hidden text-sm font-medium text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100 sm:inline">
            阅读
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const all = await fetchAllPostSummaries();
  const posts = all.slice(0, 3);
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)]/60">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-amber-200/30 blur-[120px] dark:bg-amber-900/20" />
          <div className="absolute -right-1/4 -bottom-1/2 h-[500px] w-[500px] rounded-full bg-orange-200/20 blur-[100px] dark:bg-orange-900/15" />
          <div className="absolute top-1/4 right-1/3 h-[400px] w-[400px] rounded-full bg-stone-200/30 blur-[100px] dark:bg-stone-800/20" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:px-8">
          <p className="animate-in text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
            Personal blog
          </p>
          <h1
            className="animate-in mt-6 max-w-3xl font-serif text-5xl font-bold leading-[1.1] tracking-tight text-stone-900 sm:text-6xl lg:text-7xl dark:text-stone-50"
            style={{ animationDelay: '80ms' }}
          >
            {site.name}
          </h1>
          <p
            className="animate-in mt-6 max-w-2xl text-lg leading-relaxed text-stone-600 sm:text-xl dark:text-stone-400"
            style={{ animationDelay: '160ms' }}
          >
            {site.description}
          </p>
          <div
            className="animate-in mt-10 flex flex-wrap gap-4"
            style={{ animationDelay: '240ms' }}
          >
            <Link
              href="/blog"
              className="inline-flex items-center justify-center rounded-full bg-stone-900 px-7 py-3 text-sm font-semibold text-white shadow-md shadow-stone-900/10 transition-all hover:bg-stone-800 hover:shadow-lg active:scale-[0.98] dark:bg-stone-50 dark:text-stone-900 dark:shadow-stone-50/10 dark:hover:bg-stone-200"
            >
              阅读文章
              <svg
                className="ml-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <a
              href="https://github.com/ZxdNoob/zxdnoob.github.io"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-7 py-3 text-sm font-semibold text-stone-700 shadow-sm transition-all hover:border-stone-300 hover:bg-[var(--surface)] hover:shadow-md active:scale-[0.98] dark:text-stone-300 dark:hover:border-stone-600"
              rel="noopener noreferrer"
              target="_blank"
            >
              <svg
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              查看源码
            </a>
          </div>
        </div>
      </section>

      {/* Latest posts */}
      <section className="mx-auto max-w-5xl px-4 pb-24 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            最新文章
          </h2>
          <Link
            href="/blog"
            className="group text-sm font-medium text-stone-500 transition-colors hover:text-[var(--accent)] dark:text-stone-400"
          >
            全部文章
            <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
              &rarr;
            </span>
          </Link>
        </div>
        {posts.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
            <p className="text-sm text-stone-500 dark:text-stone-500">
              暂无文章或无法连接后端。请先启动 API（默认{' '}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs dark:bg-stone-800">
                npm run dev:api
              </code>
              ）并配置{' '}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs dark:bg-stone-800">
                API_URL
              </code>
              。
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.25fr,0.75fr] lg:items-start">
            <div className="animate-in" style={{ animationDelay: '80ms' }}>
              {featured ? <PostCard post={featured} /> : null}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link href="/blog" className="btn btn-secondary">
                  浏览全部文章
                </Link>
                <p className="text-sm text-stone-500 dark:text-stone-500">
                  首页仅展示 <span className="font-semibold">3</span>{' '}
                  篇最新内容。
                </p>
              </div>
            </div>

            {rest.length > 0 ? (
              <div className="space-y-3">
                {rest.map((post, idx) => (
                  <div
                    key={post.slug}
                    className="animate-in"
                    style={{ animationDelay: `${(idx + 2) * 80}ms` }}
                  >
                    <CompactPostRow post={post} index={idx + 2} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
