'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

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

export function SiteNavLinks() {
  const pathname = usePathname() ?? '';
  // Store the pathname at the moment we opened the menu.
  // If the route changes, the menu will be considered closed automatically.
  const [mobileOpenPathname, setMobileOpenPathname] = useState<string | null>(
    null,
  );
  const mobileOpen = mobileOpenPathname === pathname;

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-1 md:flex">
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          const className = `relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            active
              ? 'cursor-default text-stone-900 dark:text-stone-50'
              : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-50'
          }`;

          const content = (
            <>
              {active && (
                <span className="absolute inset-0 rounded-full bg-stone-100 dark:bg-stone-800/80" />
              )}
              <span className="relative">{item.label}</span>
            </>
          );

          return active ? (
            <span key={item.href} aria-current="page" className={className}>
              {content}
            </span>
          ) : (
            <Link key={item.href} href={item.href} className={className}>
              {content}
            </Link>
          );
        })}
      </nav>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 md:hidden dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          onClick={() => setMobileOpenPathname(mobileOpen ? null : pathname)}
          aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
          aria-expanded={mobileOpen}
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          >
            {mobileOpen ? (
              <>
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </>
            ) : (
              <>
                <path d="M4 8h16" />
                <path d="M4 16h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm dark:bg-black/40"
            onClick={() => setMobileOpenPathname(null)}
            aria-hidden
          />
          <nav className="relative mx-4 mt-2 space-y-1 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 shadow-xl">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              const className = `flex items-center rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                active
                  ? 'cursor-default bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-50'
                  : 'text-stone-600 hover:bg-stone-50 dark:text-stone-400 dark:hover:bg-stone-800/50'
              }`;

              if (active) {
                return (
                  <span
                    key={item.href}
                    aria-current="page"
                    className={className}
                  >
                    {item.label}
                  </span>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpenPathname(null)}
                  className={className}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
