import type { Metadata, Viewport } from 'next';
import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google';
import { BfcacheRevealRestore } from '@/components/bfcache-reveal-restore';
import { CommandPalette } from '@/components/command-palette';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { SiteViewRecorder } from '@/components/site-view-recorder';
import { ToastViewport } from '@/components/toast-viewport';
import { site } from '@/lib/site';
import { fetchSiteTotalViews } from '@/lib/views';
import './globals.css';

/**
 * 根布局（App Router 的全站壳）。
 *
 * ## 这个文件负责什么？
 * - **SEO/社交卡片**：`metadata` / `viewport` 统一配置，子路由按需覆盖
 * - **字体体系**：使用 `next/font` 生成 CSS 变量，避免 FOUT 并提升性能
 * - **主题初始化**：在 hydration 前写入 `html.dark`，避免首屏“闪白/闪黑”
 * - **全站 UI 壳**：头部/页脚/Toast/命令面板（Cmd+K）
 * - **质感层**：`grain-overlay` 为整站添加轻微颗粒（仅视觉，不影响交互）
 *
 * ## 为什么要把 Command Palette 放在这里？
 * - 它属于全局能力（像 Spotlight / Raycast）
 * - 任意页面都能触发 `Cmd+K`，无需每个页面重复挂载
 */
const sans = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const serif = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: 'website',
    locale: site.locale,
    siteName: site.name,
    title: site.title,
    description: site.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0a09' },
  ],
};

/**
 * 主题首屏脚本（同步执行）。
 *
 * 约束：
 * - 不能依赖 React（因为 React 还没加载）
 * - 不能使用复杂逻辑（避免阻塞首屏）
 *
 * 行为：
 * - 若 localStorage 里显式设置了 theme（light/dark）就优先使用
 * - 否则回退到系统 prefers-color-scheme
 * - 同步写入 `html.classList` 与 `color-scheme`，让表单控件/滚动条也匹配主题
 */
const THEME_SCRIPT = `!function(){try{var d=document.documentElement,t=localStorage.getItem("theme"),s=matchMedia("(prefers-color-scheme:dark)").matches,i=(t==="dark"||(t!=="light"&&s));d.classList.toggle("dark",i);d.style.colorScheme=i?"dark":"light"}catch(e){}}()`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /** 构建期从 API 拉取，静态导出时写入 HTML；客户端可再拉取/POST 更新 */
  const initialSiteTotalViews = await fetchSiteTotalViews();

  return (
    <html
      lang="zh-CN"
      className={`${sans.variable} ${serif.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
      </head>
      <body className="grain-overlay flex min-h-full flex-col bg-[var(--background)] font-sans text-[var(--foreground)]">
        <BfcacheRevealRestore />
        <SiteViewRecorder />
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter initialSiteTotalViews={initialSiteTotalViews} />
        <ToastViewport />
        <CommandPalette />
      </body>
    </html>
  );
}
