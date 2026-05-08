import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

/**
 * PWA Manifest（`/manifest.webmanifest`）。
 *
 * 由 Next.js App Router 自动暴露在站点根（静态导出时也会随 `out/` 一起部署）。
 * 浏览器读取后即可在桌面/移动端「添加到主屏幕」，配合 service worker 进入 PWA。
 *
 * - `theme_color`：与 `<meta name="theme-color">` 同源（layout viewport）
 * - `icons`：复用 `public/logo.svg` + `app/icon.svg`，避免引入新位图资源
 * - `start_url`：默认根；`scope`：限制为本站
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#faf9f7',
    theme_color: '#faf9f7',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    categories: ['blog', 'productivity', 'lifestyle'],
    lang: 'zh-CN',
  };
}
