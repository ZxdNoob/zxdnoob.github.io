/**
 * 知识图谱页 `/blog/graph`。
 *
 * - 服务端组件：构建 / SSG 时拉取 `GET /api/posts/graph`，把节点 + 边发给客户端布局
 * - 客户端 `<PostsGraph>` 跑 force-directed simulation，带交互（hover/drag/筛选）
 * - 与 `/blog`、`/blog/[slug]` 共享 navigation；命令面板与 ⌘K 搜索都能直达此处
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { PostsGraph } from '@/components/posts-graph';
import { fetchPostsGraph } from '@/lib/posts';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: '文章关系图谱',
  description: `${site.name} 全部文章的知识图谱：以内容相似度 + 标签 / 系列加权连接，可拖拽与筛选。`,
  openGraph: {
    title: '文章关系图谱',
    description: '可视化博客内容的相似度网络。',
  },
};

export default async function PostsGraphPage() {
  const data = await fetchPostsGraph(1.0);
  /** 图谱数据变化时整组件 remount，缩放/pan 状态回到默认（避免在 effect 里同步 setViewBox） */
  const postsGraphKey =
    data.nodes.length === 0
      ? 'empty'
      : [...data.nodes]
          .map((n) => n.slug)
          .sort()
          .join('|');

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8">
      <header className="mb-8">
        <Link
          href="/blog"
          className="group inline-flex items-center text-sm font-medium text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
        >
          <svg
            className="mr-1.5 h-4 w-4 transition-transform group-hover:-translate-x-0.5"
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
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              Knowledge Graph
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
              文章关系图谱
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-600 dark:text-stone-400">
              用 char-trigram Jaccard + 标签 /
              系列加权，实时计算每两篇文章的「相似度」。
              点是文章，连线越粗表示主题越接近。
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-3 py-1.5 text-xs text-stone-500 dark:text-stone-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            {data.nodes.length} 节点 · {data.links.length} 条边
          </div>
        </div>
      </header>

      <PostsGraph key={postsGraphKey} data={data} />
    </main>
  );
}
