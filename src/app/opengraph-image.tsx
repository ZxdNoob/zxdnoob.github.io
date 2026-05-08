/**
 * 站点级默认 Open Graph 图片（被 `/`、`/blog`、`/changelog` 等无 OG 图的页面继承）。
 * 静态导出时构建一次即落到 `out/opengraph-image.png`，社交平台抓取直接命中。
 */

import { OG_CONTENT_TYPE, OG_SIZE, renderSiteOgImage } from '@/lib/og-template';
import { site } from '@/lib/site';

export const alt = `${site.name} — ${site.description}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
/** SSG 期生成；静态导出时落为静态 PNG */
export const dynamic = 'force-static';

export default async function Image() {
  return renderSiteOgImage({
    title: site.title,
    description: site.description,
    brand: site.name,
  });
}
