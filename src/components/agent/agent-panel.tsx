'use client';

/**
 * Agent 聊天面板（核心 UI）。
 *
 * 用法：
 * - `<AgentPanel mode="drawer" />`：抽屉风格（嵌入到悬浮入口）
 * - `<AgentPanel mode="page" />`：嵌入到 `/agent` 全屏页
 *
 * 内部使用 `useAgent` 维护会话状态，负责渲染消息列表 + 输入框 + 快速指令。
 */

import { useEffect, useRef, useState } from 'react';
import { AGENT_DISPLAY_NAME, AGENT_TAGLINE } from '@/lib/agent';
import { AgentMessageView } from './agent-message';
import { AGENT_PANEL_SEND, type AgentPanelSendDetail } from './agent-events';
import {
  AgentQuickActions,
  DEFAULT_QUICK_ACTIONS,
} from './agent-quick-actions';
import { useAgent } from './use-agent';

interface AgentPanelProps {
  mode: 'drawer' | 'page';
  onClose?: () => void;
  initialGreeting?: string;
}

const DEFAULT_GREETING = [
  `你好，我是 **${AGENT_DISPLAY_NAME}**，本博客的向导小助手。`,
  '',
  '试试这些：',
  '- 「最新文章」—— 看看博主最近写了什么',
  '- 「找一篇关于 Next.js 的」—— 站内关键字搜索',
  '- 「随便推荐一篇」 / 「切深色」 / 「打开命令面板」',
].join('\n');

export function AgentPanel({
  mode,
  onClose,
  initialGreeting = DEFAULT_GREETING,
}: AgentPanelProps) {
  const {
    messages,
    isStreaming,
    llmConfigured,
    send,
    stop,
    reset,
    remoteEnabled,
    sessions,
    activeSessionId,
    switchSession,
    newSession,
    renameSession,
    deleteSession,
  } = useAgent({ initialGreeting });
  const [input, setInput] = useState('');
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /** 自适应高度 */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  /** 滚到底部 */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  /** 抽屉打开后聚焦输入框 */
  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, []);

  /** 监听全局「发送 prompt」事件：用于 /agent 页示例卡片或导航等其它入口 */
  useEffect(() => {
    function onSend(e: Event) {
      const detail = (e as CustomEvent<AgentPanelSendDetail>).detail;
      const prompt = detail?.prompt?.trim();
      if (!prompt || isStreaming) return;
      setInput('');
      send(prompt);
    }
    window.addEventListener(AGENT_PANEL_SEND, onSend);
    return () => window.removeEventListener(AGENT_PANEL_SEND, onSend);
  }, [isStreaming, send]);

  const submit = () => {
    if (isStreaming) return;
    const value = input;
    setInput('');
    send(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      if (mode === 'drawer') onClose?.();
    }
  };

  const containerClass =
    mode === 'drawer'
      ? 'flex h-full min-h-0 flex-col'
      : [
          /** page：父级在 lg 已给固定高度；min-h-0 + overflow-hidden 建立 flex 滚动上下文 */
          'flex min-h-0 flex-1 flex-col overflow-hidden lg:h-full',
        ].join(' ');

  return (
    <div className={containerClass}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-gradient-to-br from-amber-400/30 to-orange-500/20 font-serif text-sm font-semibold text-amber-700 dark:from-amber-400/15 dark:to-orange-500/10 dark:text-amber-300"
            aria-hidden
          >
            N
            {isStreaming ? (
              <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              </span>
            ) : (
              <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full border border-[var(--surface)] bg-emerald-500" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-serif text-sm font-semibold text-stone-900 dark:text-stone-50">
              {AGENT_DISPLAY_NAME} · 站内 AI 向导
            </p>
            <p className="truncate text-[11px] text-stone-500 dark:text-stone-500">
              {llmConfigured ? AGENT_TAGLINE : '本地启发式模式 · 未连接 LLM'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {remoteEnabled ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setSessionsOpen((v) => !v)}
                className="inline-flex h-8 items-center justify-center rounded-full px-2.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                aria-expanded={sessionsOpen}
                aria-haspopup="menu"
                title="切换会话"
              >
                会话
                <svg
                  className="ml-1 h-3.5 w-3.5"
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
              {sessionsOpen ? (
                <div
                  role="menu"
                  aria-label="会话列表"
                  className="absolute right-0 mt-2 w-[280px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl ring-1 ring-black/5 dark:ring-white/10"
                >
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400 dark:text-stone-500">
                      Sessions
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        await newSession('新会话');
                        setSessionsOpen(false);
                      }}
                      className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800/60"
                    >
                      新建
                    </button>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto p-2">
                    {sessions.length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs text-stone-500">
                        暂无会话
                      </div>
                    ) : (
                      sessions.map((s) => {
                        const active = s.id === activeSessionId;
                        return (
                          <div
                            key={s.id}
                            className={[
                              'flex items-center gap-2 rounded-xl px-2 py-2',
                              active
                                ? 'bg-stone-100 dark:bg-stone-800/60'
                                : 'hover:bg-stone-50 dark:hover:bg-stone-800/40',
                            ].join(' ')}
                          >
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={async () => {
                                await switchSession(s.id);
                                setSessionsOpen(false);
                              }}
                            >
                              <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-50">
                                {s.title}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-stone-400 dark:text-stone-500">
                                {new Date(s.updatedAt).toLocaleString('zh-CN')}
                              </p>
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-stone-500 hover:bg-stone-200/60 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-700/40 dark:hover:text-stone-50"
                              title="重命名"
                              onClick={async () => {
                                const next = window.prompt('会话名称', s.title);
                                if (!next) return;
                                await renameSession(s.id, next);
                              }}
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
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-stone-500 hover:bg-rose-100 hover:text-rose-700 dark:text-stone-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                              title="删除"
                              onClick={async () => {
                                const ok =
                                  window.confirm(
                                    '删除该会话？此操作不可撤销。',
                                  );
                                if (!ok) return;
                                await deleteSession(s.id);
                              }}
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
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                              </svg>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-8 items-center justify-center rounded-full px-2.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            title="清空会话"
          >
            清空
          </button>
          {mode === 'drawer' ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
              aria-label="关闭"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>
      </header>

      {!llmConfigured ? (
        <div className="shrink-0 border-b border-[var(--border)] bg-amber-50/60 px-4 py-2 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          未配置 LLM。当前为本地启发式模式：可执行 9
          种工具，但不支持开放式问答。配置{' '}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[10px] dark:bg-amber-500/20">
            NEXT_PUBLIC_AGENT_BASE_URL
          </code>{' '}
          /{' '}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[10px] dark:bg-amber-500/20">
            NEXT_PUBLIC_AGENT_MODEL
          </code>{' '}
          可启用对话能力。
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain px-3 py-3 sm:px-4"
      >
        {messages.map((m) => (
          <AgentMessageView key={m.id} message={m} />
        ))}
      </div>

      <div className="shrink-0 border-t border-[var(--border)] px-3 py-3 sm:px-4">
        <div className="mb-2">
          <AgentQuickActions
            actions={DEFAULT_QUICK_ACTIONS}
            onPick={(prompt) => {
              if (isStreaming) return;
              setInput('');
              send(prompt);
            }}
            disabled={isStreaming}
          />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 px-2.5 py-2 focus-within:border-stone-300 focus-within:bg-[var(--surface)] dark:focus-within:border-stone-600"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming ? '生成中…' : '问点什么，例如「找一篇关于 RSC 的」'
            }
            className="flex-1 resize-none bg-transparent px-1.5 py-1 text-sm leading-relaxed text-stone-900 placeholder:text-stone-400 focus:outline-none dark:text-stone-50 dark:placeholder:text-stone-500"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-semibold text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800/60"
            >
              中止
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-xl bg-stone-900 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
            >
              发送
              <svg
                className="ml-1 h-3.5 w-3.5"
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
          )}
        </form>
        <p className="mt-1.5 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
          按{' '}
          <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1 font-mono">
            Enter
          </kbd>{' '}
          发送 ·{' '}
          <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1 font-mono">
            Shift+Enter
          </kbd>{' '}
          换行
        </p>
      </div>
    </div>
  );
}
