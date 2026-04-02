import Link from 'next/link';
import { site } from '@/lib/site';

export default function NotFound() {
  return (
    <main className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-4">
      {/* Ambient gradients */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-1/4 left-1/3 h-[400px] w-[400px] rounded-full bg-amber-200/20 blur-[120px] dark:bg-amber-900/15" />
        <div className="absolute bottom-1/4 right-1/3 h-[300px] w-[300px] rounded-full bg-stone-200/30 blur-[100px] dark:bg-stone-800/15" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 dot-pattern opacity-[0.03]"
        aria-hidden
      />

      <div className="relative text-center">
        <p className="gradient-text font-serif text-[8rem] font-bold leading-none sm:text-[12rem]">
          404
        </p>
        <h1 className="mt-4 font-serif text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-100">
          页面去哪了？
        </h1>
        <p className="mx-auto mt-3 max-w-md text-stone-600 dark:text-stone-400">
          你访问的页面不存在或已被移除。试试从首页重新开始， 或使用{' '}
          <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs">
            ⌘K
          </kbd>{' '}
          快速导航。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-stone-800 hover:shadow-lg active:scale-[0.98] dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
          >
            <svg
              className="mr-2 h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            回到首页
          </Link>
          <Link
            href="/blog"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-6 py-3 text-sm font-semibold text-stone-700 shadow-sm transition-all hover:bg-[var(--surface)] hover:shadow-md active:scale-[0.98] dark:text-stone-300"
          >
            浏览文章
          </Link>
        </div>

        <p className="mt-12 text-xs text-stone-400 dark:text-stone-600">
          {site.name} · 你可能想找的内容已经搬家了
        </p>
      </div>
    </main>
  );
}
