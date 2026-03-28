import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ToastViewport } from "@/components/toast-viewport";
import { site } from "@/lib/site";
import "./globals.css";

/**
 * 根布局：全站字体、SEO metadata、页头页脚外壳。
 *
 * `next/font`：构建时优化字体子集，避免布局抖动（`display: swap`）。
 * CSS 变量 `--font-body` / `--font-display` 在 `globals.css` 的 `@theme` 中映射到 Tailwind。
 */
const sans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const serif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

/** 默认与模板：供子页面 `generateMetadata` 继承 */
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.name,
    title: site.title,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
};

/** 浏览器 UI 主题色（Safari 等标签栏/地址栏） */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // `suppressHydrationWarning`：缓解浏览器扩展向 `<html>` 注入属性时的 hydration 提示
  return (
    <html
      lang="zh-CN"
      className={`${sans.variable} ${serif.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-[var(--background)] font-sans text-[var(--foreground)]">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <ToastViewport />
      </body>
    </html>
  );
}
