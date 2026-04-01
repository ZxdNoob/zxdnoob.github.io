'use client';

import { useMemo, useState } from 'react';
import type { ResumeExperience } from '@/lib/resume-types';

function isCurrentPeriod(period: string): boolean {
  const p = period.trim();
  return (
    /至今|present|current/i.test(p) ||
    p.endsWith('— 至今') ||
    p.endsWith('—至今')
  );
}

export function ExperienceSection({
  experience,
  defaultVisible = 3,
}: {
  experience: ResumeExperience[];
  defaultVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const { visible, hiddenCount } = useMemo(() => {
    const count = Math.max(0, defaultVisible);
    const visibleJobs = expanded ? experience : experience.slice(0, count);
    return {
      visible: visibleJobs,
      hiddenCount: Math.max(0, experience.length - visibleJobs.length),
    };
  }, [defaultVisible, expanded, experience]);

  const canToggle = experience.length > defaultVisible;

  return (
    <div className="mt-8">
      <ol className="space-y-8">
        {visible.map((job, idx) => {
          const isLast = idx === visible.length - 1;
          const isCurrent = isCurrentPeriod(job.period);
          return (
            <li
              key={`${job.company}-${job.period}`}
              className="relative flex gap-2 sm:gap-2.5"
            >
              {/* 时间线：圆点与首行标题垂直居中，与正文留出间距 */}
              <div className="relative flex w-3 shrink-0 flex-col items-center">
                {idx > 0 ? (
                  <div
                    className="absolute -top-8 left-1/2 h-8 w-px -translate-x-1/2 bg-[var(--border)]"
                    aria-hidden
                  />
                ) : null}
                <div className="relative z-10 flex h-7 w-full items-center justify-center">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border-2 border-[var(--background)] bg-[var(--accent)] shadow-sm"
                    aria-hidden
                  />
                </div>
                {!isLast ? (
                  <div
                    className="absolute left-1/2 top-[1.25rem] bottom-[-2rem] w-px -translate-x-1/2 bg-[var(--border)]"
                    aria-hidden
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-2.5">
                    {isCurrent ? (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wider text-amber-900 dark:bg-amber-950/80 dark:text-amber-200">
                        Current
                      </span>
                    ) : null}
                    <h3 className="text-lg font-semibold leading-7 text-stone-900 dark:text-stone-100">
                      {job.company}
                    </h3>
                    {job.badges?.length ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {job.badges.map((b) => (
                          <li key={b}>
                            <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)]/70 px-2 py-0.5 text-[10px] font-semibold leading-none tracking-wide text-stone-600 dark:bg-[var(--surface)]/50 dark:text-stone-300">
                              {b}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <time className="shrink-0 text-xs font-medium leading-7 tabular-nums text-stone-500 dark:text-stone-500">
                    {job.period}
                  </time>
                </div>

                <p className="mt-1 text-sm font-medium text-stone-600 dark:text-stone-400">
                  {job.role}
                  <span className="text-stone-400 dark:text-stone-600">
                    {' '}
                    · {job.location}
                  </span>
                </p>

                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  {job.points.map((pt) => (
                    <li key={pt} className="flex gap-2">
                      <span
                        className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]"
                        aria-hidden
                      />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>

      {canToggle ? (
        <div className="mt-8 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/70 px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)] dark:bg-[var(--surface)]/50 dark:text-stone-200"
            aria-expanded={expanded}
          >
            {expanded ? '收起' : `展开全部（+${hiddenCount}）`}
            <span aria-hidden className="text-stone-400 dark:text-stone-500">
              {expanded ? '↑' : '↓'}
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
