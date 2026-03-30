import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BackToTop } from '@/components/back-to-top';
import { PostBody } from '@/components/post-body';
import { ScrollProgress } from '@/components/scroll-progress';
import {
  STATIC_EXPORT_PLACEHOLDER_SLUG,
  fetchAllPostSummaries,
  fetchPostBySlug,
  formatPostPublishedAt,
  postPublishedAtIso,
  readingMinutesFromMarkdown,
} from '@/lib/posts';
import { site } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const posts = await fetchAllPostSummaries();
  if (posts.length > 0) {
    return posts.map((p) => ({ slug: p.slug }));
  }
  if (process.env.STATIC_EXPORT === '1') {
    return [{ slug: STATIC_EXPORT_PLACEHOLDER_SLUG }];
  }
  return [];
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  if (slug === STATIC_EXPORT_PLACEHOLDER_SLUG) {
    return { title: '文章列表为空', robots: { index: false, follow: true } };
  }
  const post = await fetchPostBySlug(slug);
  if (!post || post.draft) {
    return { title: '未找到' };
  }
  const url = `${site.url}/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.description,
      publishedTime: postPublishedAtIso(post.date),
    },
    alternates: { canonical: url },
  };
}

export default async function BlogPostPage(props: Props) {
  const { slug } = await props.params;

  if (slug === STATIC_EXPORT_PLACEHOLDER_SLUG) {
    return (
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <header className="border-b border-[var(--border)]/60 pb-8">
          <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">
            暂无文章
          </h1>
          <p className="mt-3 text-stone-600 dark:text-stone-400">
            构建时未能从 API 获取文章。请在 GitHub Actions 中配置可用的{' '}
            <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">
              API_URL
            </code>{' '}
            后重新部署；本地请启动后端并重新执行{' '}
            <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">
              npm run build:static
            </code>
            。
          </p>
        </header>
      </article>
    );
  }

  const post = await fetchPostBySlug(slug);
  if (!post || post.draft) notFound();

  const minutes =
    post.readingMinutes ?? readingMinutesFromMarkdown(post.content);
  const dateLabel = formatPostPublishedAt(post.date, 'long');

  return (
    <>
      <ScrollProgress />
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <header className="pb-10">
          <Link
            href="/blog"
            className="group mb-8 inline-flex items-center text-sm font-medium text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500 dark:text-stone-500">
            <time dateTime={postPublishedAtIso(post.date)}>{dateLabel}</time>
            <span
              className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700"
              aria-hidden
            />
            <span>{minutes} 分钟阅读</span>
          </div>
          <h1 className="mt-4 font-serif text-3xl font-bold leading-tight tracking-tight text-stone-900 sm:text-4xl lg:text-[2.75rem] dark:text-stone-50">
            {post.title}
          </h1>
          {post.description && (
            <p className="mt-4 text-lg leading-relaxed text-stone-600 dark:text-stone-400">
              {post.description}
            </p>
          )}
          {post.tags && post.tags.length > 0 ? (
            <ul className="mt-6 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-8 h-px bg-gradient-to-r from-[var(--border)] via-[var(--border)]/60 to-transparent" />
        </header>
        <div className="pt-2">
          <PostBody content={post.content} />
        </div>
        <footer className="mt-16 border-t border-[var(--border)]/60 pt-8">
          <Link
            href="/blog"
            className="group inline-flex items-center text-sm font-medium text-stone-500 transition-colors hover:text-[var(--accent)] dark:text-stone-400"
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
        </footer>
      </article>
      <BackToTop />
    </>
  );
}
