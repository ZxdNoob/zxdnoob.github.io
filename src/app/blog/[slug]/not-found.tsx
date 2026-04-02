/**
 * 文章详情 `notFound()` 时展示的友好页面，引导返回文章列表。
 */
import Link from 'next/link';

export default function BlogPostNotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-24 text-center">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800/80">
        <svg
          className="h-10 w-10 text-stone-400 dark:text-stone-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
          <path d="M8 11h6" />
        </svg>
      </div>
      <h1 className="mt-6 font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">
        找不到这篇文章
      </h1>
      <p className="mt-3 text-stone-600 dark:text-stone-400">
        链接可能已失效，或文章尚未发布。
      </p>
      <Link
        href="/blog"
        className="mt-8 inline-flex items-center rounded-full bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-stone-800 active:scale-[0.98] dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
      >
        <svg
          className="mr-1.5 h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        返回文章列表
      </Link>
    </main>
  );
}
