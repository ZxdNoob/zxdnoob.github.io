'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SiteLogo } from '@/components/site-logo';
import { site } from '@/lib/site';
import { fetchSiteTotalViewsClient } from '@/lib/views';

const nav = [
  { href: '/', label: '首页' },
  { href: '/blog', label: '文章' },
  { href: '/resume', label: '简历' },
  { href: '/changelog', label: '版本历史' },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteFooter() {
  const pathname = usePathname() ?? '';
  const year = new Date().getFullYear();
  const [totalViews, setTotalViews] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSiteTotalViewsClient().then((v) => {
      if (cancelled) return;
      if (typeof v === 'number') setTotalViews(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onUpdate(e: Event) {
      if (!(e instanceof CustomEvent)) return;
      const v = (e.detail as { siteTotalViews?: unknown } | undefined)
        ?.siteTotalViews;
      if (typeof v === 'number') setTotalViews(v);
    }
    window.addEventListener('site:total-views', onUpdate);
    return () => window.removeEventListener('site:total-views', onUpdate);
  }, []);
  return (
    <footer
      data-site-footer
      className="mt-auto border-t border-[var(--border)]/60"
    >
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <SiteLogo className="h-5 w-4 text-stone-400 dark:text-stone-600" />
              <p className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
                {site.name}
              </p>
            </div>
            <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-500">
              用心记录，认真生活
            </p>
            <p className="mt-3 text-xs text-stone-400 dark:text-stone-600">
              按{' '}
              <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1 py-0.5 font-mono text-[10px]">
                ⌘K
              </kbd>{' '}
              快速导航到任意页面
            </p>
          </div>
          <nav className="flex gap-10 text-sm">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                导航
              </p>
              <ul className="space-y-2.5">
                {nav
                  .filter((item) => !isActive(pathname, item.href))
                  .map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                更多
              </p>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="https://github.com/ZxdNoob/zxdnoob.github.io"
                    className="text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <Link
                    href="/sitemap.xml"
                    className="text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                  >
                    Sitemap
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>
        <div className="mt-10 flex flex-col items-center gap-4 border-t border-[var(--border)]/60 pt-6 sm:flex-row sm:justify-between">
          <p className="text-xs text-stone-400 dark:text-stone-600">
            &copy; {year} {site.author}. All rights reserved.
          </p>
          {typeof totalViews === 'number' ? (
            <p className="text-xs text-stone-400 dark:text-stone-600">
              总访问量 <span className="tabular-nums">{totalViews}</span>
            </p>
          ) : null}
          <p className="text-xs text-stone-400 dark:text-stone-600">
            Built with Next.js &middot; Styled with Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
}
