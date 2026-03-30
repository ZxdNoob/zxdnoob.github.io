/**
 * 站点级常量：供 `layout.tsx` 的 metadata、sitemap、页脚等复用。
 * 修改站点名称、简介或默认 URL 时，优先只改此文件。
 */
export const site = {
  name: 'ZxdNoob',
  title: 'ZxdNoob — 个人博客',
  description:
    '全栈开发、界面设计与生活随笔。以性能、可维护与阅读体验为底线，用产品思维打磨个人站点。',
  /** 与 `.env.local` 中 `NEXT_PUBLIC_SITE_URL` 一致；无环境变量时用于本地开发 */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  author: 'ZxdNoob',
  locale: 'zh_CN',
} as const;
