/**
 * 文章索引路由：服务端拉取全部摘要后交给客户端组件 `BlogIndex`（筛选、排序、无限加载）。
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { BlogIndex } from '@/components/blog-index';
import { isPublicViewStatsEnabled } from '@/lib/api';
import { fetchAllPostSummaries } from '@/lib/posts';
import { site } from '@/lib/site';
import { fetchViewCounts } from '@/lib/views';

export const metadata: Metadata = {
  title: '文章',
  description: `「${site.name}」全部文章列表。`,
};

export default async function BlogIndexPage() {
  const posts = await fetchAllPostSummaries();
  const showViewCounts = isPublicViewStatsEnabled();
  const viewCounts = showViewCounts
    ? Object.fromEntries(await fetchViewCounts(posts.map((p) => p.slug)))
    : {};

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:px-8">
      <header className="animate-in">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
          Blog Library
        </p>
        <div className="mt-5 border-b border-[var(--border)]/60 pb-7">
          <div className="max-w-4xl">
            <h1 className="font-serif text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl dark:text-stone-50">
              文章列表
            </h1>
            <p className="mt-3 text-base leading-7 text-stone-600 dark:text-stone-400">
              聚合全部技术文章，支持快速搜索、系列聚合、标签筛选与多视图浏览。
            </p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <div className="rounded-full border border-[var(--border)] bg-gradient-to-br from-stone-50 to-amber-50/70 px-4 py-2 text-sm text-stone-700 shadow-sm shadow-black/5 dark:from-stone-900 dark:to-stone-800 dark:text-stone-200 dark:shadow-black/20">
              <span className="font-semibold text-stone-900 dark:text-stone-50">
                {posts.length}
              </span>{' '}
              篇文章
            </div>
            <div className="rounded-full border border-[var(--border)] bg-gradient-to-br from-stone-50 to-stone-100/80 px-4 py-2 text-sm text-stone-700 shadow-sm shadow-black/5 dark:from-stone-900 dark:to-stone-800 dark:text-stone-200 dark:shadow-black/20">
              支持系列、标签、关键词筛选
            </div>
            <Link
              href="/blog/graph"
              className="group inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-gradient-to-br from-amber-50 to-orange-50/70 px-4 py-2 text-sm font-medium text-amber-900 shadow-sm shadow-amber-500/10 transition-all hover:border-amber-400 hover:shadow-md dark:border-amber-500/25 dark:from-amber-500/[0.08] dark:to-orange-500/[0.04] dark:text-amber-200 dark:hover:border-amber-400/40"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="5" cy="6" r="2" />
                <circle cx="19" cy="6" r="2" />
                <circle cx="12" cy="18" r="2" />
                <path d="M7 7l4 9" />
                <path d="M17 7l-4 9" />
                <path d="M7 6h10" />
              </svg>
              文章关系图谱
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
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
          </div>
        </div>
      </header>
      {posts.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-700"
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
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p className="mt-4 text-sm text-stone-500">
            暂无文章或无法连接后端，请检查 API 是否已启动。
          </p>
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)]/70 p-6"
                >
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton mt-5 h-8 w-3/4" />
                  <div className="skeleton mt-4 h-4 w-full" />
                  <div className="skeleton mt-3 h-4 w-5/6" />
                  <div className="mt-8 flex gap-2">
                    <div className="skeleton h-8 w-16 rounded-full" />
                    <div className="skeleton h-8 w-20 rounded-full" />
                    <div className="skeleton h-8 w-14 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <BlogIndex
            posts={posts}
            viewCounts={viewCounts}
            showViewCounts={showViewCounts}
          />
        </Suspense>
      )}
    </main>
  );
}
