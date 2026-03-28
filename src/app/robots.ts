import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** 与 `output: 'export'` 兼容：构建期生成单一 `robots.txt` */
export const dynamic = "force-static";

/**
 * 自动生成 `/robots.txt`：允许全站抓取并指向 sitemap。
 */
export default function robots(): MetadataRoute.Robots {
  const base = site.url.replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${base}/sitemap.xml`,
  };
}
