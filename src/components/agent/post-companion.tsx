'use client';

/**
 * 文章页「AI 共读」工具栏 + 选区气泡。
 *
 * ## 产品价值
 * - 长文阅读最大的痛点：「这章在讲什么？」「这段什么意思？」「相关文章在哪？」
 * - 这个组件给出三种最高频路径：
 *   1. 一键摘要：调用 `summarize_post(slug)` → 让 LLM 总结 3-5 句 + 关键观点
 *   2. 一键提问：唤起抽屉并预填「针对本文的具体问题…」
 *   3. 选中文本气泡：在选区附近浮出「解释 / 翻译 / 在博客里搜一下」
 *
 * ## 实现要点
 * - 通过 `AGENT_PANEL_OPEN` + `AGENT_PANEL_SEND` 复用既有 Agent 抽屉
 * - 选区气泡只在文章正文 (`#post-content`) 内的 selection 触发，避免在导航/页脚误触
 * - 监听 `selectionchange` + 防抖，避免拖选过程中的频繁重渲染
 * - 静态导出友好（纯客户端组件，无服务端依赖）
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AGENT_PANEL_OPEN,
  AGENT_PANEL_SEND,
  type AgentPanelSendDetail,
} from './agent-events';

interface PostCompanionProps {
  slug: string;
  title: string;
}

/** 让 selection 文本在 prompt 里更可读：去多余空白，截断 */
function normalizeSelection(text: string, maxLen = 320): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}…` : trimmed;
}

function dispatchAgentPrompt(prompt: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AGENT_PANEL_OPEN));
  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent<AgentPanelSendDetail>(AGENT_PANEL_SEND, {
        detail: { prompt },
      }),
    );
  }, 60);
}

export function PostCompanion({ slug, title }: PostCompanionProps) {
  return (
    <div
      data-post-companion
      className="not-prose mt-6 mb-2 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200/40 bg-gradient-to-br from-amber-50/60 to-orange-50/30 px-3 py-2 text-sm dark:border-amber-500/15 dark:from-amber-500/[0.06] dark:to-orange-500/[0.04]"
    >
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
      <span className="font-medium text-stone-700 dark:text-stone-200">
        AI 共读
      </span>
      <span className="text-xs text-stone-500 dark:text-stone-400">
        让 Noob 帮你提炼要点 / 答疑
      </span>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() =>
            dispatchAgentPrompt(
              `请用 summarize_post 工具帮我摘要这篇文章：${slug}`,
            )
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm transition-colors hover:border-amber-300/70 hover:text-amber-800 dark:text-stone-200 dark:hover:border-amber-500/40 dark:hover:text-amber-200"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 6h16" />
            <path d="M4 12h10" />
            <path d="M4 18h16" />
          </svg>
          一键摘要
        </button>
        <button
          type="button"
          onClick={() =>
            dispatchAgentPrompt(
              `针对这篇文章《${title}》（slug=${slug}），我想问：`,
            )
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm transition-colors hover:border-amber-300/70 hover:text-amber-800 dark:text-stone-200 dark:hover:border-amber-500/40 dark:hover:text-amber-200"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          针对本文提问
        </button>
        <button
          type="button"
          onClick={() =>
            dispatchAgentPrompt(
              `请用 find_relevant_passages 找出和《${title}》相关的其它博客片段，并推荐 1-2 篇延伸阅读。`,
            )
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm transition-colors hover:border-amber-300/70 hover:text-amber-800 dark:text-stone-200 dark:hover:border-amber-500/40 dark:hover:text-amber-200"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          延伸阅读
        </button>
      </div>
    </div>
  );
}

interface SelectionState {
  text: string;
  rect: { top: number; left: number; width: number };
}

/**
 * 选区气泡：监听文章正文（`#post-content`）的 selectionchange，
 * 在选区下方浮出「解释 / 翻译 / 在博客里搜」三个动作。
 *
 * - 选区 < 4 字符或 > 600 字符不触发，避免误触与超长上下文
 * - 选区跨出 #post-content 时不显示
 * - 滚动 / 点击其它区域 / 选区清空时自动隐藏
 */
export function PostSelectionAssistant({ title }: { title: string }) {
  const [state, setState] = useState<SelectionState | null>(null);
  const debounceRef = useRef<number | null>(null);
  const ignoreNextChangeRef = useRef(false);

  const compute = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (ignoreNextChangeRef.current) {
      ignoreNextChangeRef.current = false;
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setState(null);
      return;
    }
    const text = normalizeSelection(sel.toString(), 600);
    if (text.length < 4) {
      setState(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const container =
      range.commonAncestorContainer.nodeType === 1
        ? (range.commonAncestorContainer as HTMLElement)
        : range.commonAncestorContainer.parentElement;
    if (!container) {
      setState(null);
      return;
    }
    const post = document.getElementById('post-content');
    if (!post || !post.contains(container)) {
      setState(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      setState(null);
      return;
    }
    setState({
      text,
      rect: {
        top: rect.bottom + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX,
        width: rect.width,
      },
    });
  }, []);

  useEffect(() => {
    function onChange() {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(compute, 80);
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-selection-bubble]')) return;
      setState(null);
    }
    function onScroll() {
      setState(null);
    }
    document.addEventListener('selectionchange', onChange);
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('selectionchange', onChange);
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onScroll);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [compute]);

  if (!state) return null;

  const ask = (kind: 'explain' | 'translate' | 'search') => {
    const prefix =
      kind === 'explain'
        ? `请用通俗的中文解释这段文字（来自《${title}》）：`
        : kind === 'translate'
          ? '请把这段文字翻译成中文（如果原文已是中文，则反过来翻译成英文）：'
          : `请用 find_relevant_passages 在博客里找和这段文字相关的其它内容（来自《${title}》）：`;
    dispatchAgentPrompt(`${prefix}\n\n> ${state.text}`);
    /** 收起选区，避免气泡持续遮挡 */
    ignoreNextChangeRef.current = true;
    window.getSelection()?.removeAllRanges();
    setState(null);
  };

  /** 限制气泡不出视口 */
  const left = Math.min(
    Math.max(state.rect.left, 120),
    typeof window === 'undefined' ? 0 : window.innerWidth - 120,
  );

  return (
    <div
      data-selection-bubble
      role="toolbar"
      aria-label="选区 AI 操作"
      className="pointer-events-auto absolute z-30 flex -translate-x-1/2 translate-y-2 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)]/95 px-1 py-1 text-xs shadow-lg shadow-black/10 backdrop-blur-sm dark:bg-[var(--surface)]/95 animate-fade-in"
      style={{ top: `${state.rect.top}px`, left: `${left}px` }}
    >
      <button
        type="button"
        onClick={() => ask('explain')}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium text-stone-700 transition-colors hover:bg-amber-50 hover:text-amber-800 dark:text-stone-200 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
      >
        <svg
          className="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12" y2="17" />
        </svg>
        解释
      </button>
      <button
        type="button"
        onClick={() => ask('translate')}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium text-stone-700 transition-colors hover:bg-amber-50 hover:text-amber-800 dark:text-stone-200 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
      >
        <svg
          className="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m5 8 6 6" />
          <path d="m4 14 6-6 2-3" />
          <path d="M2 5h12" />
          <path d="M7 2h1" />
          <path d="m22 22-5-10-5 10" />
          <path d="M14 18h6" />
        </svg>
        翻译
      </button>
      <button
        type="button"
        onClick={() => ask('search')}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium text-stone-700 transition-colors hover:bg-amber-50 hover:text-amber-800 dark:text-stone-200 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
      >
        <svg
          className="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        搜博客
      </button>
    </div>
  );
}
