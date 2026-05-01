'use client';

/**
 * 工具调用卡片：在 assistant 消息的下方折叠展示。
 *
 * 状态：
 * - 调用中（无 result）：显示「正在执行」 + 旋转点
 * - 成功：绿色对勾 + summary
 * - 失败：红色叹号 + summary
 * 默认折叠 args/data，点击展开。
 */

import { useState } from 'react';
import type { AgentToolStep } from '@/lib/agent';

const TOOL_LABEL: Record<string, string> = {
  list_posts: '列出文章',
  search_posts: '搜索文章',
  get_post: '加载文章正文',
  pick_random_post: '随机推荐',
  navigate: '跳转',
  set_theme: '切换主题',
  open_command_palette: '打开命令面板',
  get_changelog: '查询版本历史',
  get_resume: '查询简历',
  copy_text: '复制文本',
};

function ToolIcon() {
  return (
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
      <path d="M14.7 6.3a4 4 0 0 0-5.6 5.6l-6.4 6.4a2 2 0 1 0 2.8 2.8l6.4-6.4a4 4 0 0 0 5.6-5.6l-2 2-2.8-2.8 2-2z" />
    </svg>
  );
}

function StatusDot({ state }: { state: 'pending' | 'ok' | 'err' }) {
  if (state === 'pending') {
    return (
      <span className="relative inline-flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
      </span>
    );
  }
  if (state === 'ok') {
    return (
      <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
    );
  }
  return (
    <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-rose-500" />
  );
}

export function AgentToolStepView({ step }: { step: AgentToolStep }) {
  const [open, setOpen] = useState(false);
  const status: 'pending' | 'ok' | 'err' = !step.result
    ? 'pending'
    : step.result.ok
      ? 'ok'
      : 'err';
  const label = TOOL_LABEL[step.call.name] ?? step.call.name;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 px-3 py-2 text-xs text-stone-600 dark:text-stone-400">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-stone-500 dark:text-stone-400">
          <ToolIcon />
        </span>
        <StatusDot state={status} />
        <span className="font-mono text-[11px] text-stone-500 dark:text-stone-500">
          {step.call.name}
        </span>
        <span className="truncate text-[11px] text-stone-700 dark:text-stone-300">
          {label}
          {step.result ? ` · ${step.result.summary}` : ' · 正在执行…'}
        </span>
        <svg
          className={[
            'ml-auto h-3.5 w-3.5 shrink-0 transition-transform',
            open ? 'rotate-180' : '',
          ].join(' ')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open ? (
        <div className="mt-2 space-y-2 border-t border-[var(--border)] pt-2">
          {Object.keys(step.call.args ?? {}).length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                参数
              </p>
              <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-[var(--background)] p-2 font-mono text-[11px] leading-relaxed text-stone-700 dark:text-stone-300">
                {JSON.stringify(step.call.args, null, 2)}
              </pre>
            </div>
          ) : null}
          {step.result?.data != null ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                返回
              </p>
              <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-[var(--background)] p-2 font-mono text-[11px] leading-relaxed text-stone-700 dark:text-stone-300">
                {JSON.stringify(step.result.data, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
