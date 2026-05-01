'use client';

/**
 * `/agent` 页面：左侧介绍 + 右侧聊天面板的两栏布局。
 *
 * 与悬浮抽屉共用 `<AgentPanel mode="page" />`，复用同一套消息状态机。
 * 这里强调「能做什么」与示例 prompt，第一次访问的用户也能马上开始。
 */

import { useCallback } from 'react';
import { ScrollReveal } from '@/components/scroll-reveal';
import { AGENT_DISPLAY_NAME, AGENT_TAGLINE } from '@/lib/agent';
import { AGENT_PANEL_SEND } from './agent-events';
import { AgentPanel } from './agent-panel';

interface CapabilityCard {
  title: string;
  desc: string;
  example: string;
}

const CAPABILITIES: CapabilityCard[] = [
  {
    title: '找内容',
    desc: '按标题、描述、标签做模糊匹配，第一时间给出能跳的链接。',
    example: '找一篇关于 Next.js App Router 的文章',
  },
  {
    title: '看简历',
    desc: '一句话概括作者亮点；也能直接打开完整简历。',
    example: '帮我看看作者，然后跳到简历',
  },
  {
    title: '看更新',
    desc: '汇总最近的版本历史，知道这站新加了什么。',
    example: '最近的 3 条更新',
  },
  {
    title: '随便看看',
    desc: '没有目标也行，从已发布文章里抽一篇带你读。',
    example: '随便挑一篇推荐',
  },
  {
    title: '换主题',
    desc: '深色 / 浅色 / 跟随系统，一句话搞定。',
    example: '帮我切深色主题',
  },
  {
    title: '快捷导航',
    desc: '帮你打开 ⌘K 命令面板或跳到任意站内页面。',
    example: '打开命令面板',
  },
];

const SYSTEM_BADGE = (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
    LLM 已连接
  </span>
);

const HEURISTIC_BADGE = (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
    本地启发式模式
  </span>
);

export function AgentExperience({ llmConfigured }: { llmConfigured: boolean }) {
  const sendPrompt = useCallback((prompt: string) => {
    if (typeof window === 'undefined') return;
    /** 通过自定义事件把 prompt 发到右侧面板：避免在两边维护重复的会话状态 */
    window.dispatchEvent(
      new CustomEvent(AGENT_PANEL_SEND, { detail: { prompt } }),
    );
  }, []);

  return (
    <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:px-8">
      <ScrollReveal>
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-px w-10 bg-gradient-to-r from-transparent to-[var(--accent)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
            AI Companion
          </p>
          {llmConfigured ? SYSTEM_BADGE : HEURISTIC_BADGE}
        </div>

        <h1 className="mt-6 max-w-3xl font-serif text-4xl font-bold leading-[1.08] tracking-tight text-stone-900 sm:text-5xl dark:text-stone-50">
          与 <span className="gradient-text">{AGENT_DISPLAY_NAME}</span> 对话，
          <br className="hidden sm:block" />
          让博客自己「带你逛」
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg dark:text-stone-400">
          {AGENT_TAGLINE}。基于 OpenAI 兼容协议 + 本地工具调用，
          可以在浏览器里直接发起一段对话，让 Agent 主动调用「列文章 / 搜文章 /
          看简历 / 切主题」等能力， 帮你 1 秒找到想看的内容。
        </p>
      </ScrollReveal>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr,1.05fr] lg:items-start">
        {/* Left: capabilities */}
        <ScrollReveal>
          <section className="space-y-3">
            <header className="flex items-center gap-3">
              <h2 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-100">
                能做什么
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
            </header>

            <div className="grid gap-3 sm:grid-cols-2">
              {CAPABILITIES.map((c) => (
                <article
                  key={c.title}
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-4 transition-all hover:border-stone-300 hover:bg-[var(--surface)] dark:hover:border-stone-700"
                >
                  <h3 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-50">
                    {c.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                    {c.desc}
                  </p>
                  <button
                    type="button"
                    onClick={() => sendPrompt(c.example)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-[11px] font-medium text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-800 dark:hover:border-stone-600 dark:hover:text-stone-100"
                    title="点击：直接发到右侧面板"
                  >
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    {c.example}
                  </button>
                </article>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 p-4 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              <p className="font-semibold text-stone-700 dark:text-stone-200">
                小提示
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                <li>
                  全局快捷键：
                  <kbd className="rounded border border-[var(--border)] bg-[var(--background)] px-1 font-mono">
                    ⌘/Ctrl + I
                  </kbd>{' '}
                  在任意页面唤起 AI 抽屉
                </li>
                <li>
                  每个工具调用都可点开查看「参数」「返回」，方便理解 Agent
                  是怎么帮你做事的
                </li>
                <li>
                  无 LLM 时也能用：本地启发式模式覆盖最常用的 9 种工具，开箱即用
                </li>
              </ul>
            </div>
          </section>
        </ScrollReveal>

        {/* Right: panel — 大屏固定视口高度 + flex 子项 min-h-0，消息区才可 overflow-y 滚动；小屏随内容增高由整页滚动 */}
        <ScrollReveal delay={120}>
          <div
            className={[
              'rounded-3xl border border-[var(--border)] bg-[var(--background)] shadow-xl shadow-black/5',
              'lg:sticky lg:top-24 lg:z-[1]',
              'lg:flex lg:h-[calc(100vh-7rem)] lg:max-h-[calc(100vh-7rem)] lg:min-h-0 lg:flex-col lg:overflow-hidden',
            ].join(' ')}
          >
            <AgentPanel mode="page" />
          </div>
        </ScrollReveal>
      </div>
    </main>
  );
}
