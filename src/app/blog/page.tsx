import type { Metadata } from "next";
import { PostCard } from "@/components/post-card";
import { fetchAllPostSummaries } from "@/lib/posts";
import { site } from "@/lib/site";

/** 列表页 SEO：标题与描述出现在搜索结果与分享卡片中 */
export const metadata: Metadata = {
  title: "文章",
  description: `「${site.name}」全部文章列表。`,
};

/**
 * 文章索引页：数据来自 `GET /api/posts`。
 */
export default async function BlogIndexPage() {
  const posts = await fetchAllPostSummaries();

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
      <header className="border-b border-stone-200/90 pb-10 dark:border-stone-800/90">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          文章
        </h1>
        <p className="mt-3 text-stone-600 dark:text-stone-400">
          共 {posts.length} 篇；按发布时间从新到旧排列。
        </p>
      </header>
      {posts.length === 0 ? (
        <p className="mt-8 text-sm text-stone-500">
          暂无文章或无法连接后端，请检查 API 是否已启动。
        </p>
      ) : (
        <div className="mt-6 divide-y divide-stone-200/80 dark:divide-stone-800/80">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
