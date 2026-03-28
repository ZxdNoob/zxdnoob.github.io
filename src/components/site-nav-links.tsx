"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** 与 `app/` 路由保持一致 */
const nav = [
  { href: "/", label: "首页" },
  { href: "/blog", label: "文章" },
  { href: "/changelog", label: "版本历史" },
] as const;

function navItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNavLinks() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex items-center gap-6 text-sm font-medium">
      {nav.map((item) => {
        const active = navItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "font-semibold text-amber-800 transition-colors dark:text-amber-200"
                : "text-stone-600 transition-colors hover:text-amber-800 dark:text-stone-400 dark:hover:text-amber-200"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
