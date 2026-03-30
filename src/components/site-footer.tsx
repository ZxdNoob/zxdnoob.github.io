import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-[var(--border)]/60">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
              {site.name}
            </p>
            <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-500">
              用心记录，认真生活
            </p>
          </div>
          <nav className="flex gap-10 text-sm">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                导航
              </p>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    href="/"
                    className="text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                  >
                    首页
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                  >
                    文章
                  </Link>
                </li>
                <li>
                  <Link
                    href="/changelog"
                    className="text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                  >
                    版本历史
                  </Link>
                </li>
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
        <div className="mt-10 border-t border-[var(--border)]/60 pt-6 text-center text-xs text-stone-400 dark:text-stone-600">
          &copy; {year} {site.author}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
