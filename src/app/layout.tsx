import type { Metadata, Viewport } from 'next';
import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google';
import Script from 'next/script';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { ToastViewport } from '@/components/toast-viewport';
import { site } from '@/lib/site';
import './globals.css';

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

const THEME_SCRIPT = `!function(){try{var d=document.documentElement,t=localStorage.getItem("theme"),s=matchMedia("(prefers-color-scheme:dark)").matches;(t==="dark"||(t!=="light"&&s))?d.classList.add("dark"):d.classList.remove("dark")}catch(e){}}()`;

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
      <body className="flex min-h-full flex-col bg-[var(--background)] font-sans text-[var(--foreground)]">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <ToastViewport />
      </body>
    </html>
  );
}
