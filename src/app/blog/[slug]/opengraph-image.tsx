/**
 * 文章级 Open Graph 图（每篇一张）。
 *
 * - 静态导出（GitHub Pages）下：`generateStaticParams` 让构建期为每个 slug 落一张 PNG
 * - 占位 slug（无文章场景）使用站点级默认图，避免 build 失败
 */

import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderPostOgImage,
  renderSiteOgImage,
} from '@/lib/og-template';
import {
  STATIC_EXPORT_PLACEHOLDER_SLUG,
  fetchAllPostSummaries,
  fetchPostBySlug,
  formatPostPublishedAt,
} from '@/lib/posts';
import { site } from '@/lib/site';

export const alt = `${site.name} 文章封面`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = 'force-static';

/** 与 page.tsx 保持一致：让每篇文章都有一张静态 OG */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const posts = await fetchAllPostSummaries();
  if (posts.length > 0) return posts.map((p) => ({ slug: p.slug }));
  if (process.env.STATIC_EXPORT === '1') {
    return [{ slug: STATIC_EXPORT_PLACEHOLDER_SLUG }];
  }
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export default async function Image(props: Props) {
  const { slug } = await props.params;

  if (slug === STATIC_EXPORT_PLACEHOLDER_SLUG) {
    return renderSiteOgImage({
      title: site.title,
      description: site.description,
      brand: site.name,
    });
  }

  const post = await fetchPostBySlug(slug);
  if (!post) {
    return renderSiteOgImage({
      title: site.title,
      description: site.description,
      brand: site.name,
    });
  }

  return renderPostOgImage({
    title: post.title,
    series: post.series ?? null,
    readingMinutes: post.readingMinutes,
    dateLabel: formatPostPublishedAt(post.date, 'short'),
    description: post.description,
    brand: site.name,
  });
}
