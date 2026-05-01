'use client';

/**
 * Agent UI Hook：把 lib/agent runner 接到 React 状态。
 *
 * 设计要点：
 * - 单一 `messages` 数组持有完整会话；`pending` 标记当前流式消息
 * - 通过 `useReducer` 处理事件序列，避免 useState 闭包陷阱
 * - 工具上下文由这里提供：路由 / 主题 / 命令面板 / 数据拉取
 */

import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AGENT_PANEL_CLOSE } from '@/components/agent/agent-events';
import { COMMAND_PALETTE_TOGGLE } from '@/components/command-palette';
import { parseNavigateHref } from '@/lib/agent/navigate-target';
import {
  clientFetchChangelog,
  clientFetchPostContent,
  clientFetchPosts,
  clientFetchResume,
  isAgentLLMConfigured,
  type AgentMessage,
  type AgentToolContext,
} from '@/lib/agent';
import {
  agentSessionState,
  appendMessage,
  clearAgentSession,
  hydrateAgentSessionFromStorage,
  hydrateAgentSessionFromRemote,
  createNewRemoteSession,
  deleteSessionRemote,
  renameRemoteSession,
  switchRemoteSession,
  runAgentIntoSession,
  setStreaming,
} from './agent-session';

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export interface UseAgentOptions {
  /** 首次打开时显示的欢迎语；当用户清空会话也会重新插入 */
  initialGreeting?: string;
}

export function useAgent(options: UseAgentOptions = {}) {
  const router = useRouter();
  const snapshot = useSyncExternalStore(
    agentSessionState.subscribe,
    agentSessionState.getSnapshot,
    agentSessionState.getServerSnapshot,
  );
  const { messages, isStreaming } = snapshot;
  const abortRef = useRef<AbortController | null>(null);
  /**
   * `NEXT_PUBLIC_*` 在构建期被内联到客户端 bundle，且 `public-api.json` 也是构建期 JSON，
   * 因此服务端 / 客户端的判定一致，可放心在 useState initializer 里同步求值，避免 hydration 不匹配。
   */
  const [llmConfigured] = useState<boolean>(() => isAgentLLMConfigured());

  /** 把 set_theme 工具的副作用对齐到根布局的 inline script + ThemeToggle 行为 */
  const setTheme = useCallback((mode: 'light' | 'dark' | 'system') => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.add('theme-changing');
    if (mode === 'system') {
      try {
        localStorage.removeItem('theme');
      } catch {
        /* ignore */
      }
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
      root.style.colorScheme = isDark ? 'dark' : 'light';
    } else {
      try {
        localStorage.setItem('theme', mode);
      } catch {
        /* ignore */
      }
      const isDark = mode === 'dark';
      root.classList.toggle('dark', isDark);
      root.style.colorScheme = isDark ? 'dark' : 'light';
    }
    window.setTimeout(() => root.classList.remove('theme-changing'), 120);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      const target = parseNavigateHref(href);
      if (!target) return;

      if (target.kind === 'external') {
        window.open(target.url, '_blank', 'noopener,noreferrer');
        return;
      }

      /** 先关抽屉，避免蒙层仍盖住文章详情 */
      window.dispatchEvent(new CustomEvent(AGENT_PANEL_CLOSE));
      router.push(target.path);
    },
    [router],
  );

  const openCommandPalette = useCallback(() => {
    window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_TOGGLE));
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }, []);

  const ctx = useMemo<AgentToolContext>(
    () => ({
      navigate,
      setTheme,
      openCommandPalette,
      copyToClipboard,
      fetchPosts: clientFetchPosts,
      fetchPostContent: clientFetchPostContent,
      fetchChangelog: clientFetchChangelog,
      fetchResume: clientFetchResume,
    }),
    [navigate, setTheme, openCommandPalette, copyToClipboard],
  );

  const send = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;
      if (isStreaming) return;

      const userMsg: AgentMessage = {
        id: makeId('user'),
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
      };
      const assistantMsg: AgentMessage = {
        id: makeId('asst'),
        role: 'assistant',
        content: '',
        steps: [],
        createdAt: Date.now(),
        pending: true,
      };
      appendMessage(userMsg);
      appendMessage(assistantMsg);
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await runAgentIntoSession({
          history: messages,
          input: trimmed,
          ctx,
          assistantMessageId: assistantMsg.id,
          signal: controller.signal,
        });
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [ctx, isStreaming, messages],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    clearAgentSession();
  }, []);

  /** 自动注入欢迎语（仅当尚无消息且提供了 greeting） */
  useEffect(() => {
    hydrateAgentSessionFromStorage();
    void hydrateAgentSessionFromRemote();
  }, []);

  /** 自动注入欢迎语（仅当尚无消息且提供了 greeting） */
  useEffect(() => {
    if (messages.length > 0) return;
    if (!options.initialGreeting) return;
    appendMessage({
      id: makeId('greet'),
      role: 'assistant',
      content: options.initialGreeting,
      createdAt: Date.now(),
    });
  }, [options.initialGreeting, messages.length]);

  return {
    messages,
    isStreaming,
    llmConfigured,
    send,
    stop,
    reset,
    /** remote sessions */
    remoteEnabled: snapshot.remoteEnabled,
    sessions: snapshot.sessions,
    activeSessionId: snapshot.activeSessionId,
    switchSession: switchRemoteSession,
    newSession: createNewRemoteSession,
    renameSession: renameRemoteSession,
    deleteSession: deleteSessionRemote,
  };
}
