'use client';

/**
 * Agent 全局入口：
 * - 屏幕右下角悬浮按钮，点击打开抽屉
 * - 全局快捷键 `⌘/Ctrl + I`
 * - 自定义事件 `AGENT_PANEL_TOGGLE`，方便其它组件（导航/命令面板）触发
 *
 * 抽屉风格：右侧滑出，移动端全屏。
 */

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AGENT_PANEL_CLOSE,
  AGENT_PANEL_OPEN,
  AGENT_PANEL_TOGGLE,
} from './agent-events';
import { AgentPanel } from './agent-panel';

/** 向后兼容：其它模块可从 launcher 或 `agent-events` 引用 */
export {
  AGENT_PANEL_TOGGLE,
  AGENT_PANEL_OPEN,
  AGENT_PANEL_CLOSE,
  AGENT_PANEL_SEND,
  type AgentPanelSendDetail,
} from './agent-events';

export function AgentLauncher() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? '';
  /** `null` = 尚未记录首屏路径；避免挂载当帧误关抽屉 */
  const prevPathRef = useRef<string | null>(null);

  /** `/agent` 全屏页内不显示悬浮入口（避免重复入口） */
  const hideOnPage = pathname === '/agent';

  const close = useCallback(() => setOpen(false), []);
  const openIt = useCallback(() => setOpen(true), []);

  /** 路由变化（含站内 Link / router.push）时收起抽屉；下一帧再 setState，避免 react-hooks/set-state-in-effect */
  useEffect(() => {
    if (prevPathRef.current === null) {
      prevPathRef.current = pathname;
      return;
    }
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    const id = requestAnimationFrame(() => setOpen(false));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      /** 与 ⌘K 错开：使用 ⌘I（避免与浏览器原生「斜体」冲突时取消默认） */
      if ((e.metaKey || e.ctrlKey) && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    function onToggle() {
      setOpen((v) => !v);
    }
    function onOpen() {
      setOpen(true);
    }
    function onClose() {
      setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener(AGENT_PANEL_TOGGLE, onToggle);
    window.addEventListener(AGENT_PANEL_OPEN, onOpen);
    window.addEventListener(AGENT_PANEL_CLOSE, onClose);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(AGENT_PANEL_TOGGLE, onToggle);
      window.removeEventListener(AGENT_PANEL_OPEN, onOpen);
      window.removeEventListener(AGENT_PANEL_CLOSE, onClose);
    };
  }, [open]);

  /** 抽屉打开时锁定 body 滚动 */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {!hideOnPage ? (
        <button
          type="button"
          onClick={openIt}
          aria-label="打开 AI 向导"
          aria-expanded={open}
          className="agent-fab fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl shadow-amber-500/30 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] active:scale-95 dark:shadow-amber-500/20 sm:bottom-6 sm:right-6"
        >
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z" />
            <circle cx="9.5" cy="10.5" r=".75" fill="currentColor" />
            <circle cx="14.5" cy="10.5" r=".75" fill="currentColor" />
            <path d="M9 14c.8.8 2 1.2 3 1.2s2.2-.4 3-1.2" />
            <path d="M12 18v3" />
          </svg>
          <span className="sr-only">打开 AI 向导（⌘+I）</span>
        </button>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[90]"
          role="dialog"
          aria-modal="true"
          aria-label="AI 向导"
        >
          <div
            className="cmd-palette-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60"
            onClick={close}
            aria-hidden
          />
          <div className="agent-drawer absolute inset-x-0 bottom-0 top-0 ml-auto flex w-full max-w-[440px] flex-col border-l border-[var(--border)] bg-[var(--background)] shadow-2xl sm:inset-y-0 sm:max-w-[440px]">
            <AgentPanel mode="drawer" onClose={close} />
          </div>
        </div>
      ) : null}
    </>
  );
}
