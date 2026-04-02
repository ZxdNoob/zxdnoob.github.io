/**
 * 根布局：全站字体（思源黑体/宋体）、metadata、首屏主题脚本与站点壳（顶栏/页脚/Toast）。
 * `suppressHydrationWarning` 用于 `<html>`：主题 class 由内联脚本在 hydration 前写入，与 SSR 可能不一致。
 */
import type { Metadata, Viewport } from 'next';
import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { ToastViewport } from '@/components/toast-viewport';
import { site } from '@/lib/site';
import './globals.css';

/** 正文无衬线字体，通过 CSS 变量 `--font-body` 供 `font-sans` 使用 */
const sans = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

/** 标题衬线字体，通过 `--font-display` 用于 `font-serif` */
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
 * 首屏前同步执行：根据 localStorage `theme` 与系统偏好切换 `html.dark` 与 `color-scheme`，
 * 避免浅色闪屏（FOUC）。需与 `theme-toggle` 写入的键名一致。
 */
const THEME_SCRIPT = `!function(){try{var d=document.documentElement,t=localStorage.getItem("theme"),s=matchMedia("(prefers-color-scheme:dark)").matches,i=(t==="dark"||(t!=="light"&&s));d.classList.toggle("dark",i);d.style.colorScheme=i?"dark":"light"}catch(e){}}()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
      <body className="flex min-h-full flex-col bg-[var(--background)] font-sans text-[var(--foreground)]">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <ToastViewport />
      </body>
    </html>
  );
}
