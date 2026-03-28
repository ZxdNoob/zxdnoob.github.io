import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { fetchAllPostSummaries } from "@/lib/posts";
import { site } from "@/lib/site";

/**
 * 首页：站点介绍 + 最新文章（从 `GET /api/posts` 取摘要）。
 */
export default async function HomePage() {
  const all = await fetchAllPostSummaries();
  const posts = all.slice(0, 5);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-16 sm:px-6 sm:pt-20">
      <section className="border-b border-stone-200/90 pb-14 dark:border-stone-800/90">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-800/90 dark:text-amber-200/90">
          Personal blog
        </p>
        <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl dark:text-stone-50">
          {site.name}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-600 dark:text-stone-400">
          {site.description}
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/blog"
            className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-2.5 text-sm font-semibold text-stone-50 shadow-sm transition hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
          >
            阅读文章
          </Link>
          <a
            href="https://github.com/ZxdNoob/zxdnoob.github.io"
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-transparent px-6 py-2.5 text-sm font-semibold text-stone-800 transition hover:border-stone-400 hover:bg-stone-100/80 dark:border-stone-600 dark:text-stone-200 dark:hover:border-stone-500 dark:hover:bg-stone-900/60"
            rel="noopener noreferrer"
            target="_blank"
          >
            查看源码
          </a>
        </div>
      </section>

      <section className="pt-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">
            最新文章
          </h2>
          <Link
            href="/blog"
            className="text-sm font-medium text-amber-800 hover:underline dark:text-amber-300"
          >
            全部文章 →
          </Link>
        </div>
        {posts.length === 0 ? (
          <p className="mt-8 text-sm text-stone-500 dark:text-stone-500">
            暂无文章或无法连接后端。请先启动 API（默认{" "}
            <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">npm run dev:api</code>
            ）并配置 <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">API_URL</code> /
            <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">NEXT_PUBLIC_API_URL</code>
            。
          </p>
        ) : (
          <div className="mt-8 divide-y divide-stone-200/80 dark:divide-stone-800/80">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
