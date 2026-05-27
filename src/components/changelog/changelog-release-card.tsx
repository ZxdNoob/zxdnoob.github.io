'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';
import {
  changelogEntryKey,
  formatChangelogReleaseAt,
  type ChangelogEntry,
  type ChangelogItem,
  type ChangelogKind,
} from '@/lib/changelog';

const KIND_META: Record<
  ChangelogKind,
  { label: string; pill: string; Icon: () => React.ReactElement }
> = {
  feature: {
    label: '新功能',
    pill: 'border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100',
    Icon: IconSpark,
  },
  fix: {
    label: '修复',
    pill: 'border-sky-200/80 bg-sky-50 text-sky-950 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-100',
    Icon: IconWrench,
  },
  breaking: {
    label: '破坏性变更',
    pill: 'border-rose-200/80 bg-rose-50 text-rose-950 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-100',
    Icon: IconAlert,
  },
  perf: {
    label: '性能',
    pill: 'border-emerald-200/80 bg-emerald-50 text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100',
    Icon: IconBolt,
  },
  docs: {
    label: '文档',
    pill: 'border-stone-200/80 bg-stone-100 text-stone-900 dark:border-stone-600/60 dark:bg-stone-800/80 dark:text-stone-100',
    Icon: IconBook,
  },
};

function itemSurfaceLabel(item: ChangelogItem): {
  text: string;
  className: string;
} {
  const s = item.surface ?? 'both';
  if (s === 'web') {
    return {
      text: '前端',
      className:
        'border-amber-200/90 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
    };
  }
  if (s === 'api') {
    return {
      text: '后端',
      className:
        'border-violet-200/90 bg-violet-50 text-violet-900 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100',
    };
  }
  return {
    text: '共通',
    className:
      'border-stone-200/90 bg-stone-100 text-stone-600 dark:border-stone-600 dark:bg-stone-800/90 dark:text-stone-400',
  };
}

function VersionBadge({
  role,
  version,
}: {
  role: 'web' | 'api';
  version: string;
}) {
  const [done, setDone] = useState(false);
  const surface =
    role === 'web'
      ? 'border-amber-300/90 bg-amber-50 text-amber-950 ring-amber-500/15 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-50 dark:ring-amber-400/20'
      : 'border-violet-300/90 bg-violet-50 text-violet-950 ring-violet-500/15 dark:border-violet-500/35 dark:bg-violet-500/10 dark:text-violet-50 dark:ring-violet-400/20';
  const label = role === 'web' ? '前端' : '后端';

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(version);
          toast.success('版本号已复制');
          setDone(true);
          window.setTimeout(() => setDone(false), 1600);
        } catch {
          /* ignore */
        }
      }}
      className={`group/copy inline-flex max-w-full min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium outline-none ring-offset-2 ring-offset-[var(--background)] transition hover:brightness-[0.98] focus-visible:ring-2 dark:ring-offset-[var(--background)] dark:hover:brightness-110 ${surface} ${
        role === 'web'
          ? 'focus-visible:ring-amber-500/60'
          : 'focus-visible:ring-violet-500/60'
      }`}
      aria-label={
        done ? `${label} 版本号已复制` : `复制${label} 版本号 ${version}`
      }
    >
      <span className="min-w-0 shrink truncate text-[11px] font-semibold uppercase tracking-wide opacity-80">
        {label}
      </span>
      <span className="font-mono tabular-nums tracking-tight text-stone-900 dark:text-stone-50">
        v{version}
      </span>
      <svg
        className="h-3.5 w-3.5 shrink-0 opacity-60 transition group-hover/copy:opacity-100"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M8 7V5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

/** 单条发布记录卡片（时间轴节点） */
export function ChangelogReleaseCard({ entry }: { entry: ChangelogEntry }) {
  const key = changelogEntryKey(entry);
  const dotClass =
    entry.webVersion && entry.apiVersion
      ? 'bg-gradient-to-br from-amber-400 to-violet-500 shadow-amber-500/15 dark:from-amber-300 dark:to-violet-500 dark:shadow-violet-500/15'
      : entry.webVersion
        ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/15 dark:from-amber-300 dark:to-amber-600'
        : 'bg-gradient-to-br from-violet-400 to-violet-600 shadow-violet-500/15 dark:from-violet-300 dark:to-violet-600';

  return (
    <article
      className="group/card relative pl-8 sm:pl-10 motion-safe:transition motion-safe:duration-300 motion-safe:ease-out hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
      aria-labelledby={`release-${key}-title`}
    >
      <span
        className={`absolute left-0 top-7 h-3 w-3 rounded-full border-2 border-[var(--background)] shadow-[0_0_0_3px] sm:h-3.5 sm:w-3.5 sm:shadow-[0_0_0_4px] ${dotClass}`}
        aria-hidden
      />

      <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white/80 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm motion-safe:transition motion-safe:duration-300 group-hover/card:border-stone-300/90 group-hover/card:shadow-md dark:border-stone-700/90 dark:bg-stone-900/50 dark:ring-white/[0.04] dark:group-hover/card:border-stone-600">
        <header className="flex flex-col gap-3 border-b border-stone-100/90 px-4 py-4 sm:px-6 sm:py-5 dark:border-stone-800/90">
          <div className="flex flex-wrap items-center gap-2">
            {entry.webVersion ? (
              <VersionBadge role="web" version={entry.webVersion} />
            ) : null}
            {entry.apiVersion ? (
              <VersionBadge role="api" version={entry.apiVersion} />
            ) : null}
          </div>
          {entry.title ? (
            <h2
              id={`release-${key}-title`}
              className="font-serif text-lg font-semibold tracking-tight text-stone-900 sm:text-xl dark:text-stone-50"
            >
              {entry.title}
            </h2>
          ) : (
            <h2 id={`release-${key}-title`} className="sr-only">
              发布 {entry.webVersion ? `前端 ${entry.webVersion}` : ''}
              {entry.webVersion && entry.apiVersion ? '，' : ''}
              {entry.apiVersion ? `后端 ${entry.apiVersion}` : ''}
            </h2>
          )}
          <time
            dateTime={entry.date}
            className="text-sm text-stone-500 dark:text-stone-400"
          >
            {formatChangelogReleaseAt(entry.date)}
          </time>
        </header>

        <ul className="divide-y divide-stone-100 dark:divide-stone-800/90">
          {entry.items.map((item, idx) => {
            const meta = KIND_META[item.kind];
            const Icon = meta.Icon;
            const surf = itemSurfaceLabel(item);
            return (
              <li key={idx}>
                <div className="flex gap-3 px-4 py-3.5 sm:gap-4 sm:px-6 sm:py-4">
                  <div className="flex shrink-0 flex-col items-center gap-1.5 sm:gap-2">
                    <span
                      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${surf.className}`}
                    >
                      {surf.text}
                    </span>
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border ${meta.pill}`}
                      title={meta.label}
                    >
                      <Icon />
                    </span>
                  </div>
                  <p className="min-w-0 flex-1 pt-0.5 text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
                    {item.text}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

function IconSpark() {
  return (
    <svg
      className="block h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 3l1.2 4.2a4 4 0 002.8 2.8L20.2 12l-4.2 1.2a4 4 0 00-2.8 2.8L12 20.2 10.8 16a4 4 0 00-2.8-2.8L3.8 12l4.2-1.2a4 4 0 002.8-2.8L12 3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWrench() {
  return (
    <svg
      className="block h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.35 6.35a1 1 0 01-3-3l6.35-6.35a6 6 0 017.94-7.94l-3.76 3.76z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg
      className="block h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg
      className="block h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBook() {
  return (
    <svg
      className="block h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 016.5 22H20v-18H6.5A2.5 2.5 0 004 4.5v15zM6.5 2H20v18H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
