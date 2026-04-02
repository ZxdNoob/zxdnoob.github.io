/**
 * 文章详情：动态路由 `[slug]`，含静态参数预生成、SEO metadata、正文目录与阅读工具条。
 * 静态导出且无文章时使用占位 slug，避免 Next 构建报错。
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageViewRecorder } from '@/components/page-view';
import { PostBody } from '@/components/post-body';
import { ReadingToolbar } from '@/components/reading-toolbar';
import { ScrollProgress } from '@/components/scroll-progress';
import { TableOfContents } from '@/components/table-of-contents';
import {
  STATIC_EXPORT_PLACEHOLDER_SLUG,
  fetchAllPostSummaries,
  fetchPostBySlug,
  formatPostPublishedAt,
  postPublishedAtIso,
  readingMinutesFromMarkdown,
} from '@/lib/posts';
import { site } from '@/lib/site';
import { extractToc } from '@/lib/toc';
import { fetchViewCount } from '@/lib/views';

type Props = { params: Promise<{ slug: string }> };

/** SSG：为每篇已发布文章生成一条路径；静态导出空列表时回退占位 slug。 */
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

/** 按 slug 生成标题、描述、OpenGraph 与 canonical；占位 slug 与 404 场景单独处理。 */
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

/** 文章页主体：进度条、双栏布局（正文 + 桌面端 sticky 目录）、沉浸式等客户端功能在子组件中。 */
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

  const [post, initialViews] = await Promise.all([
    fetchPostBySlug(slug),
    fetchViewCount(slug),
  ]);
  if (!post || post.draft) notFound();

  const minutes =
    post.readingMinutes ?? readingMinutesFromMarkdown(post.content);
  const dateLabel = formatPostPublishedAt(post.date, 'long');
  const toc = extractToc(post.content);

  return (
    <>
      <ScrollProgress
        startSelector="#post-article"
        endSelector="#post-content"
      />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr),18rem]">
          <article id="post-article" className="min-w-0">
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
                <time dateTime={postPublishedAtIso(post.date)}>
                  {dateLabel}
                </time>
                <span
                  className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700"
                  aria-hidden
                />
                <span>{minutes} 分钟阅读</span>
                <span
                  className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700"
                  aria-hidden
                />
                <PageViewRecorder slug={slug} initialViews={initialViews} />
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

          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-3xl border border-[var(--border)] bg-[var(--surface)]/30 p-5">
              <TableOfContents items={toc} />
            </div>
          </aside>
        </div>
      </main>
      <ReadingToolbar />
    </>
  );
}
