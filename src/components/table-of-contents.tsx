'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { TocItem } from '@/lib/toc';

type Props = {
  items: TocItem[];
  /** Which content container to observe for active heading. Defaults to `#post-content`. */
  contentSelector?: string;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function TableOfContents({
  items,
  contentSelector = '#post-content',
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const ids = useMemo(() => items.map((x) => x.id), [items]);

  useEffect(() => {
    if (ids.length === 0) return;

    const candidates = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);

    if (candidates.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        // Pick the closest heading above the fold among intersecting ones.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .map((e) => e.target as HTMLElement)
          .sort(
            (a, b) =>
              a.getBoundingClientRect().top - b.getBoundingClientRect().top,
          );
        if (visible.length > 0) setActiveId(visible[0].id);
      },
      {
        root: null,
        rootMargin: '-96px 0px -65% 0px',
        threshold: 0.01,
      },
    );

    for (const el of candidates) io.observe(el);
    return () => io.disconnect();
  }, [ids, contentSelector]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="目录" className="text-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
          目录
        </p>
        <span className="text-xs text-stone-400 dark:text-stone-600">
          {clamp(items.length, 0, 99)}
        </span>
      </div>
      <ol className="space-y-1.5">
        {items.map((item) => {
          const active = item.id === activeId;
          const pad =
            item.level === 2 ? 'pl-0' : item.level === 3 ? 'pl-3' : 'pl-6';
          return (
            <li key={item.id} className={pad}>
              <Link
                href={`#${item.id}`}
                className={[
                  'block rounded-lg px-2 py-1.5 leading-snug transition-colors',
                  'hover:bg-[var(--surface)]/70',
                  active
                    ? 'bg-[var(--surface)]/80 text-stone-900 dark:text-stone-100'
                    : 'text-stone-600 dark:text-stone-400',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]',
                ].join(' ')}
              >
                <span className="line-clamp-2">{item.text}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
