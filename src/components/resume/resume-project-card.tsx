'use client';

/**
 * 简历项目卡片：摘要区常显，职责/成果详情区可折叠，使用 `useId` 关联无障碍属性。
 */
import { useId, useState } from 'react';
import type { ResumeProject } from '@/lib/resume-types';

type Props = {
  project: ResumeProject;
};

export function ResumeProjectCard({ project: proj }: Props) {
  const [detailOpen, setDetailOpen] = useState(true);
  const reactId = useId();
  const detailId = `${reactId}-detail`;

  return (
    <article className="overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-stone-50/40 shadow-sm dark:from-[var(--surface)] dark:to-stone-900/25">
      {/* 常显：标题、简介、技术栈 */}
      <div className="border-b border-[var(--border)] bg-stone-50/40 px-5 py-4 dark:bg-stone-900/40 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-serif text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              {proj.name}
            </h3>
            <p className="mt-1 text-sm font-medium text-[var(--accent)]">
              {proj.myRole}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--background)]/80 px-3 py-1 text-xs font-medium tabular-nums text-stone-600 dark:text-stone-400">
            {proj.period}
          </span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {proj.summary}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center text-[11px] font-semibold uppercase leading-none tracking-wider text-stone-500 dark:text-stone-500">
            技术栈
          </span>
          {proj.stack.map((s) => (
            <span
              key={s}
              className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--background)]/90 px-2.5 py-1 text-[11px] font-medium leading-none text-stone-700 dark:text-stone-300"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* 仅双栏区域可收起 */}
      <div className="border-b border-[var(--border)] bg-stone-50/30 px-5 py-2.5 dark:bg-stone-900/30 sm:px-6">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-lg text-left transition hover:bg-stone-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] dark:hover:bg-stone-800/50 sm:-mx-1 sm:px-1 sm:py-0.5"
          aria-expanded={detailOpen}
          aria-controls={detailId}
          onClick={() => setDetailOpen((v) => !v)}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
            职责与成果
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--accent)]">
            {detailOpen ? '收起' : '展开'}
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${detailOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
      </div>

      <div id={detailId} hidden={!detailOpen}>
        <div className="grid gap-6 p-5 sm:grid-cols-2 sm:gap-0 sm:p-0">
          <div className="sm:border-r sm:border-[var(--border)] sm:p-6">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
              职责与模块
            </h4>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              {proj.responsibilities.map((line) => (
                <li key={line} className="flex gap-2">
                  <span
                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400 dark:bg-stone-500"
                    aria-hidden
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="sm:p-6">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
              关键成果
            </h4>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              {proj.outcomes.map((line) => (
                <li key={line} className="flex gap-2">
                  <span
                    className="mt-0.5 shrink-0 text-[var(--accent)]"
                    aria-hidden
                  >
                    →
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
}
