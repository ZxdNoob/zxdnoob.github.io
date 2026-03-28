import Link from "next/link";
import {
  formatPostPublishedAt,
  postPublishedAtIso,
  type PostSummary,
} from "@/lib/posts";

type Props = { post: PostSummary };

/**
 * 文章卡片：列表数据来自后端摘要接口（含 `readingMinutes`）。
 */
export function PostCard({ post }: Props) {
  const minutes = post.readingMinutes;
  const dateLabel = formatPostPublishedAt(post.date, "short");

  return (
    <article>
      <Link
        href={`/blog/${post.slug}`}
        className="group block rounded-xl border border-transparent px-3 py-4 transition-colors hover:border-stone-200 hover:bg-stone-50/80 dark:hover:border-stone-800 dark:hover:bg-stone-900/40"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-500">
          <time dateTime={postPublishedAtIso(post.date)}>{dateLabel}</time>
          <span aria-hidden>·</span>
          <span>{minutes} 分钟阅读</span>
        </div>
        <h2 className="mt-2 font-serif text-xl font-semibold tracking-tight text-stone-900 transition-colors group-hover:text-amber-900 dark:text-stone-100 dark:group-hover:text-amber-100">
          {post.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {post.description}
        </p>
        {post.tags && post.tags.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </Link>
    </article>
  );
}
