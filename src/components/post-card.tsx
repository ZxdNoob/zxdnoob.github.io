/**
 * 首页主推文章大卡片：元信息、标题、描述与标签，hover 边框/阴影反馈。
 */
import Link from 'next/link';
import {
  formatPostPublishedAt,
  postPublishedAtIso,
  type PostSummary,
} from '@/lib/posts';

type Props = { post: PostSummary };

export function PostCard({ post }: Props) {
  const minutes = post.readingMinutes;
  const dateLabel = formatPostPublishedAt(post.date, 'short');

  return (
    <article>
      <Link
        href={`/blog/${post.slug}`}
        className="group relative block rounded-2xl border border-transparent p-5 transition-all duration-200 hover:border-[var(--border)] hover:bg-[var(--surface)]/80 hover:shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-500">
          <time dateTime={postPublishedAtIso(post.date)}>{dateLabel}</time>
          <span
            className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700"
            aria-hidden
          />
          <span>{minutes} 分钟阅读</span>
        </div>
        <h2 className="mt-3 font-serif text-xl font-semibold tracking-tight text-stone-900 transition-colors group-hover:text-[var(--accent)] dark:text-stone-100">
          {post.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {post.description}
        </p>
        {post.tags && post.tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
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
    </article>
  );
}
