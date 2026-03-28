import Link from "next/link";
import { SiteLogo } from "@/components/site-logo";
import { SiteNavLinks } from "@/components/site-nav-links";
import { site } from "@/lib/site";

/**
 * 站点顶栏：粘性定位 + 半透明背景，滚动时仍可见导航。
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-[var(--background)]/80 backdrop-blur-md dark:border-stone-800/80">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-serif text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100"
        >
          <SiteLogo className="h-7 w-[1.4rem] shrink-0" />
          <span>{site.name}</span>
        </Link>
        <SiteNavLinks />
      </div>
    </header>
  );
}
