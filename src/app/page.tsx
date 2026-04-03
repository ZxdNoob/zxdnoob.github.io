import Link from 'next/link';
import { AnimatedCounter } from '@/components/animated-counter';
import { PageViewBadge } from '@/components/page-view';
import { ScrollReveal } from '@/components/scroll-reveal';
import { SpotlightCard } from '@/components/spotlight-card';
import {
  fetchAllPostSummaries,
  formatPostPublishedAt,
  postPublishedAtIso,
} from '@/lib/posts';
import { isPublicViewStatsEnabled } from '@/lib/api';
import { site } from '@/lib/site';
import { fetchSiteTotalViews, fetchViewCounts } from '@/lib/views';

function CompactPostRow({
  post,
  index,
  views,
  showViewStats,
}: {
  post: Awaited<ReturnType<typeof fetchAllPostSummaries>>[number];
  index: number;
  views: number;
  showViewStats: boolean;
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
            {showViewStats ? (
              <>
                <span
                  className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700"
                  aria-hidden
                />
                <PageViewBadge views={views} />
              </>
            ) : null}
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

const BENTO_ITEMS = [
  {
    href: '/blog',
    label: '技术文章',
    description: '全栈开发、UI 设计与性能优化的实践笔记',
    icon: (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    gradient:
      'from-amber-500/10 to-orange-500/5 dark:from-amber-500/8 dark:to-orange-500/4',
    span: 'sm:col-span-2',
  },
  {
    href: '/resume',
    label: '在线简历',
    description: '能力概览与项目经历',
    icon: (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    gradient:
      'from-violet-500/10 to-purple-500/5 dark:from-violet-500/8 dark:to-purple-500/4',
    span: '',
  },
  {
    href: '/changelog',
    label: '版本历史',
    description: '站点迭代记录',
    icon: (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    gradient:
      'from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/8 dark:to-teal-500/4',
    span: '',
  },
] as const;

const TECH_STACK = [
  'React',
  'Next.js',
  'TypeScript',
  'Tailwind CSS',
  'NestJS',
  'Node.js',
  'SQLite',
  'Docker',
];

export default async function HomePage() {
  const all = await fetchAllPostSummaries();
  const posts = all.slice(0, 3);
  const featured = posts[0];
  const rest = posts.slice(1);

  const showViewStats = isPublicViewStatsEnabled();
  const [viewsMap, totalViews] = showViewStats
    ? await Promise.all([
        fetchViewCounts(posts.map((p) => p.slug)),
        fetchSiteTotalViews(),
      ])
    : [new Map<string, number>(), 0];

  const totalPosts = all.length;
  const totalSeries = new Set(all.map((p) => p.series).filter(Boolean)).size;

  return (
    <main>
      {/* ====== Hero ====== */}
      <section className="relative overflow-hidden border-b border-[var(--border)]/60">
        {/* Ambient gradients */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-amber-200/30 blur-[120px] animate-pulse-glow dark:bg-amber-900/20" />
          <div
            className="absolute -right-1/4 -bottom-1/2 h-[500px] w-[500px] rounded-full bg-orange-200/20 blur-[100px] animate-pulse-glow dark:bg-orange-900/15"
            style={{ animationDelay: '1.5s' }}
          />
          <div className="absolute top-1/4 right-1/3 h-[400px] w-[400px] rounded-full bg-stone-200/30 blur-[100px] animate-float dark:bg-stone-800/20" />
          {/* Decorative spinning ring */}
          <div className="absolute top-12 right-[10%] h-48 w-48 rounded-full border border-dashed border-amber-300/20 animate-spin-slow dark:border-amber-600/15 hidden lg:block" />
          <div
            className="absolute bottom-20 left-[8%] h-32 w-32 rounded-full border border-dashed border-stone-300/30 animate-spin-slow dark:border-stone-700/20 hidden lg:block"
            style={{ animationDirection: 'reverse', animationDuration: '25s' }}
          />
        </div>

        {/* Dot pattern */}
        <div
          className="pointer-events-none absolute inset-0 dot-pattern opacity-[0.04] dark:opacity-[0.03]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28 lg:px-8">
          <div className="animate-in flex items-center gap-3">
            <div className="h-px flex-1 max-w-12 bg-gradient-to-r from-transparent to-[var(--accent)]" />
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--accent)]">
              Personal blog
            </p>
          </div>

          <h1
            className="animate-in mt-8 max-w-4xl font-serif text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
            style={{ animationDelay: '80ms' }}
          >
            <span className="text-stone-900 dark:text-stone-50">探索 </span>
            <span className="gradient-text">全栈开发</span>
            <span className="text-stone-900 dark:text-stone-50"> 的</span>
            <br className="hidden sm:block" />
            <span className="text-stone-900 dark:text-stone-50">无限可能</span>
          </h1>

          <p
            className="animate-in mt-6 max-w-2xl text-lg leading-relaxed text-stone-600 sm:text-xl dark:text-stone-400"
            style={{ animationDelay: '160ms' }}
          >
            {site.description}
          </p>

          {/* CTA Buttons */}
          <div
            className="animate-in mt-10 flex flex-wrap items-center gap-4"
            style={{ animationDelay: '240ms' }}
          >
            <Link
              href="/blog"
              className="group inline-flex items-center justify-center rounded-full bg-stone-900 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-stone-900/15 transition-all hover:bg-stone-800 hover:shadow-xl hover:shadow-stone-900/20 active:scale-[0.98] dark:bg-stone-50 dark:text-stone-900 dark:shadow-stone-50/10 dark:hover:bg-stone-200"
            >
              阅读文章
              <svg
                className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5"
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
              className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-7 py-3.5 text-sm font-semibold text-stone-700 shadow-sm transition-all hover:border-stone-300 hover:bg-[var(--surface)] hover:shadow-md active:scale-[0.98] dark:text-stone-300 dark:hover:border-stone-600"
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

            {/* Keyboard shortcut hint */}
            <span className="hidden items-center gap-1.5 text-xs text-stone-400 dark:text-stone-600 lg:inline-flex">
              <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[11px] font-medium shadow-sm">
                ⌘
              </kbd>
              <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[11px] font-medium shadow-sm">
                K
              </kbd>
              <span className="ml-1">快速导航</span>
            </span>
          </div>

          {/* Tech stack pills */}
          <div
            className="animate-in mt-14 flex flex-wrap gap-2"
            style={{ animationDelay: '320ms' }}
          >
            {TECH_STACK.map((tech, i) => (
              <span
                key={tech}
                className="animate-in rounded-full border border-[var(--border)]/60 bg-[var(--surface)]/50 px-3 py-1 text-xs font-medium text-stone-500 backdrop-blur-sm dark:text-stone-400"
                style={{ animationDelay: `${360 + i * 40}ms` }}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ====== Bento Grid ====== */}
      <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <ScrollReveal>
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              探索站点
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
          </div>
        </ScrollReveal>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENTO_ITEMS.map((item, i) => (
            <ScrollReveal key={item.href} delay={i * 80} className={item.span}>
              <Link href={item.href} className="group block h-full">
                <SpotlightCard
                  className={`glow-border h-full rounded-3xl border border-[var(--border)] bg-gradient-to-br ${item.gradient} p-6 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20`}
                >
                  <div className="relative">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface)]/80 text-stone-600 shadow-sm ring-1 ring-[var(--border)] backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 dark:text-stone-300">
                      {item.icon}
                    </span>
                    <h3 className="mt-4 font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
                      {item.label}
                    </h3>
                    <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">
                      {item.description}
                    </p>
                    <span className="mt-4 inline-flex items-center text-sm font-medium text-[var(--accent)] opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5">
                      进入
                      <svg
                        className="ml-1 h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </SpotlightCard>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ====== Stats ====== */}
      <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <ScrollReveal>
          <div
            className={
              showViewStats
                ? 'grid grid-cols-2 gap-4 lg:grid-cols-4'
                : 'grid grid-cols-2 gap-4 lg:grid-cols-3'
            }
          >
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500">
                文章
              </p>
              <p className="mt-2 font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">
                <AnimatedCounter target={totalPosts} suffix="+" />
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500">
                系列
              </p>
              <p className="mt-2 font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">
                <AnimatedCounter target={totalSeries} />
              </p>
            </div>
            {showViewStats ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500">
                  总浏览量
                </p>
                <p className="mt-2 font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">
                  <AnimatedCounter target={totalViews} suffix="+" />
                </p>
              </div>
            ) : null}
            <div className="rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-50/80 to-transparent p-5 dark:border-amber-500/15 dark:from-amber-500/5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700/80 dark:text-amber-300/80">
                技术栈
              </p>
              <p className="mt-2 font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">
                全栈
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ====== Latest Posts ====== */}
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <ScrollReveal>
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                最新文章
              </h2>
              <div className="h-px flex-1 min-w-8 bg-gradient-to-r from-[var(--border)] to-transparent" />
            </div>
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
        </ScrollReveal>

        {posts.length === 0 ? (
          <ScrollReveal>
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
          </ScrollReveal>
        ) : (
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.25fr,0.75fr] lg:items-start">
            <ScrollReveal delay={80}>
              {featured ? (
                <SpotlightCard className="glow-border rounded-3xl border border-transparent p-1 transition-all duration-200 hover:border-[var(--border)] hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20">
                  <Link
                    href={`/blog/${featured.slug}`}
                    className="group block rounded-2xl p-5 sm:p-6"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-500">
                      <time dateTime={postPublishedAtIso(featured.date)}>
                        {formatPostPublishedAt(featured.date, 'short')}
                      </time>
                      <span
                        className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700"
                        aria-hidden
                      />
                      <span>{featured.readingMinutes} 分钟阅读</span>
                      {showViewStats ? (
                        <>
                          <span
                            className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700"
                            aria-hidden
                          />
                          <PageViewBadge
                            views={viewsMap.get(featured.slug) ?? 0}
                          />
                        </>
                      ) : null}
                    </div>
                    <h3 className="mt-3 font-serif text-xl font-semibold tracking-tight text-stone-900 transition-colors group-hover:text-[var(--accent)] dark:text-stone-100">
                      {featured.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                      {featured.description}
                    </p>
                    {featured.tags && featured.tags.length > 0 ? (
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {featured.tags.map((tag) => (
                          <li
                            key={tag}
                            className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                          >
                            {tag}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <span className="mt-4 inline-flex items-center text-sm font-medium text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100">
                      阅读全文
                      <svg
                        className="ml-1 h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </Link>
                </SpotlightCard>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link href="/blog" className="btn btn-secondary">
                  浏览全部文章
                </Link>
                <p className="text-sm text-stone-500 dark:text-stone-500">
                  首页仅展示 <span className="font-semibold">3</span>{' '}
                  篇最新内容。
                </p>
              </div>
            </ScrollReveal>

            {rest.length > 0 ? (
              <div className="space-y-3">
                {rest.map((post, idx) => (
                  <ScrollReveal key={post.slug} delay={(idx + 2) * 80}>
                    <CompactPostRow
                      post={post}
                      index={idx + 2}
                      views={viewsMap.get(post.slug) ?? 0}
                      showViewStats={showViewStats}
                    />
                  </ScrollReveal>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* ====== CTA / Connect ====== */}
      <section className="border-t border-[var(--border)]/60">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-stone-50 to-amber-50/30 p-8 sm:p-12 dark:from-stone-900/80 dark:to-amber-950/20">
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-800/20"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-8 -left-8 h-48 w-48 rounded-full bg-stone-200/40 blur-3xl dark:bg-stone-700/20"
                aria-hidden
              />
              <div className="relative text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                  Open Source
                </p>
                <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50">
                  代码完全开源
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-stone-600 dark:text-stone-400">
                  本站前后端代码托管于 GitHub，欢迎 Star、Fork 或提 Issue。
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <a
                    href="https://github.com/ZxdNoob/zxdnoob.github.io"
                    className="btn btn-primary"
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
                    GitHub
                  </a>
                  <Link href="/changelog" className="btn btn-secondary">
                    查看更新日志
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
