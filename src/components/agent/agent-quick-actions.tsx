'use client';

import type { ReactNode } from 'react';

export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon?: ReactNode;
}

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'latest',
    label: '最近文章',
    prompt: '推荐最近的 5 篇文章',
    icon: (
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    id: 'random',
    label: '随便看看',
    prompt: '随便给我推荐一篇文章',
    icon: (
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8" cy="8" r="1" />
        <circle cx="16" cy="8" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="8" cy="16" r="1" />
        <circle cx="16" cy="16" r="1" />
      </svg>
    ),
  },
  {
    id: 'resume',
    label: '看看简历',
    prompt: '介绍一下作者，并打开简历页',
    icon: (
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'changelog',
    label: '最近更新',
    prompt: '站点最近有什么更新？',
    icon: (
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: 'theme',
    label: '切深色',
    prompt: '帮我切到深色主题',
    icon: (
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
];

export function AgentQuickActions({
  actions = DEFAULT_QUICK_ACTIONS,
  onPick,
  disabled,
}: {
  actions?: QuickAction[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(a.prompt)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/70 px-2.5 py-1 text-[12px] font-medium text-stone-600 transition-colors hover:border-stone-300 hover:bg-[var(--surface)] hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-stone-300 dark:hover:border-stone-600 dark:hover:text-stone-50"
        >
          {a.icon}
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  );
}
