/**
 * 文章索引路由：服务端拉取全部摘要后交给客户端组件 `BlogIndex`（筛选、排序、无限加载）。
 */
import type { Metadata } from 'next';
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
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:px-8">
      <header className="border-b border-[var(--border)]/60 pb-10">
        <h1 className="font-serif text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl dark:text-stone-50">
          文章
        </h1>
        <p className="mt-4 text-lg text-stone-600 dark:text-stone-400">
          默认按发布时间从新到旧排列，可在筛选区切换排序与筛选条件。
        </p>
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
        <BlogIndex
          posts={posts}
          viewCounts={viewCounts}
          showViewCounts={showViewCounts}
        />
      )}
    </main>
  );
}
