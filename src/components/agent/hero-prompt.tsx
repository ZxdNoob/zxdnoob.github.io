'use client';

/**
 * 首页 Hero「AI 提问框」。
 *
 * ## 产品定位
 * - 把 Agent 放在最高层入口：访客一进站就能看到「问点什么」的输入框
 * - 同时保留传统 CTA（「阅读文章」「AI 向导」），互不干扰
 * - 中文友好的引导语 + 推荐 prompt chips，降低首次使用门槛
 *
 * ## 实现要点
 * - 输入直接派发 `AGENT_PANEL_OPEN` + `AGENT_PANEL_SEND`，复用既有抽屉与 runner
 * - 推荐 prompt 来自常见高频意图（最新文章 / RAG 提问 / 主题切换 / 简历 / 命令面板）
 * - 与 globals.css 的 `gradient-text` / `glow-border` / `spotlight-card` 视觉语言保持一致
 * - 文本输入使用 `IME-safe`：`isComposing` 判断中文输入法回车
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AGENT_PANEL_OPEN,
  AGENT_PANEL_SEND,
  type AgentPanelSendDetail,
} from './agent-events';
import { isAgentLLMConfigured } from '@/lib/agent';

const SUGGESTED_PROMPTS = [
  { label: '最新文章', prompt: '帮我看看最新文章' },
  { label: '关于 React 的内容', prompt: '博客里关于 React 的内容有哪些' },
  { label: '随便推荐一篇', prompt: '随便推荐一篇文章带我看看' },
  { label: '切换深色主题', prompt: '切换深色主题' },
  { label: '看看作者简介', prompt: '查看作者简介与简历' },
] as const;

interface HeroPromptProps {
  /** 占位符；可由父组件覆盖 */
  placeholder?: string;
}

export function HeroPrompt({
  placeholder = '问点什么，例如「博客里关于性能优化写过什么？」',
}: HeroPromptProps) {
  const [value, setValue] = useState('');
  /**
   * `NEXT_PUBLIC_*` 与 `public-api.json` 都是构建期注入，
   * 服务端 / 客户端的判定一致，可以放心在 useState initializer 里同步求值，避免 hydration 不匹配。
   */
  const [llmReady] = useState<boolean>(() => isAgentLLMConfigured());
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  /** 自适应高度：单行 → 多行 */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  const submit = (override?: string) => {
    const prompt = (override ?? value).trim();
    if (!prompt) {
      inputRef.current?.focus();
      return;
    }
    /** 先打开抽屉，再发送 prompt — agent-panel 内部监听 SEND 事件并下发到 runner */
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(AGENT_PANEL_OPEN));
    /** 让抽屉先挂载完，再分发 prompt（确保 panel 的 useEffect 已绑定监听） */
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent<AgentPanelSendDetail>(AGENT_PANEL_SEND, {
          detail: { prompt },
        }),
      );
    }, 60);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const statusBadge = useMemo(
    () =>
      llmReady ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          LLM 已连接
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50/80 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
          启发式模式（无 LLM）
        </span>
      ),
    [llmReady],
  );

  return (
    <div className="relative">
      {/** 极光晕染（CSS 渐变；不消耗 GPU） */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -top-6 -z-10 h-32 rounded-full bg-gradient-to-r from-sky-300/20 via-amber-300/30 to-violet-300/20 blur-3xl dark:from-sky-500/10 dark:via-amber-500/15 dark:to-violet-500/10"
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={[
          'relative flex flex-col gap-3 rounded-3xl border bg-[var(--surface)]/85 p-4 shadow-lg shadow-black/[0.04] backdrop-blur-md transition-all duration-300 dark:bg-[var(--surface)]/75 sm:p-5',
          focused
            ? 'border-amber-300/70 shadow-amber-500/15 dark:border-amber-400/40'
            : 'border-[var(--border)] hover:border-stone-300/80 dark:hover:border-stone-600/60',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z" />
                <path d="M9 14c.8.8 2 1.2 3 1.2s2.2-.4 3-1.2" />
              </svg>
            </span>
            <p className="text-sm font-semibold tracking-tight text-stone-800 dark:text-stone-100">
              问 Noob：站内搜索 · 一句话直达内容
            </p>
          </div>
          {statusBadge}
        </div>

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            aria-label="向 AI 向导提问"
            className="min-h-[40px] flex-1 resize-none rounded-xl bg-transparent px-1 py-1 text-base leading-relaxed text-stone-900 placeholder:text-stone-400 focus:outline-none dark:text-stone-50 dark:placeholder:text-stone-500"
          />
          <button
            type="submit"
            disabled={!value.trim()}
            className="group inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-stone-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
            aria-label="发送提问"
          >
            提问
            <svg
              className="ml-1.5 h-4 w-4 transition-transform group-enabled:group-hover:translate-x-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <ul className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((s) => (
            <li key={s.label}>
              <button
                type="button"
                onClick={() => submit(s.prompt)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--background)]/60 px-3 py-1 text-xs font-medium text-stone-600 transition-all hover:border-amber-300/70 hover:bg-amber-50/60 hover:text-amber-800 dark:text-stone-400 dark:hover:border-amber-500/40 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
              >
                <svg
                  className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                {s.label}
              </button>
            </li>
          ))}
        </ul>

        <p className="text-[11px] leading-relaxed text-stone-400 dark:text-stone-500">
          按{' '}
          <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1 font-mono">
            Enter
          </kbd>{' '}
          发送 ·{' '}
          <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1 font-mono">
            ⌘
          </kbd>
          <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1 font-mono">
            I
          </kbd>{' '}
          打开抽屉 · 全文检索由后端 SQLite FTS5 提供
        </p>
      </form>
    </div>
  );
}
