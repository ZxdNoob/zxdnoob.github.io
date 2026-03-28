import Link from "next/link";

/**
 * 当 `getPostBySlug` 失败或文章为草稿时，`notFound()` 会渲染此 UI。
 */
export default function BlogPostNotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">
        找不到这篇文章
      </h1>
      <p className="mt-3 text-stone-600 dark:text-stone-400">
        链接可能已失效，或文章尚未发布。
      </p>
      <Link
        href="/blog"
        className="mt-8 inline-block text-sm font-medium text-amber-800 hover:underline dark:text-amber-300"
      >
        ← 返回文章列表
      </Link>
    </main>
  );
}
