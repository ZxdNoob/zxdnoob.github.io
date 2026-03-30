import Link from "next/link";
import { SiteLogo } from "@/components/site-logo";
import { SiteNavLinks } from "@/components/site-nav-links";
import { site } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)]/60 bg-[var(--background)]/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-serif text-lg font-semibold tracking-tight text-stone-900 transition-colors dark:text-stone-100"
        >
          <SiteLogo className="h-7 w-[1.4rem] shrink-0 transition-transform duration-300 group-hover:scale-110" />
          <span>{site.name}</span>
        </Link>
        <SiteNavLinks />
      </div>
    </header>
  );
}
