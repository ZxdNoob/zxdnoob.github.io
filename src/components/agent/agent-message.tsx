'use client';

/**
 * 单条消息渲染。
 *
 * - User：右侧气泡，纯文本
 * - Assistant：左侧气泡，Markdown（链接走客户端路由），下方挂工具步骤
 *
 * Markdown 组件复用了项目里 react-markdown + remark-gfm，但只接管 a 标签做软导航。
 */

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AgentMessage } from '@/lib/agent';
import { AGENT_DISPLAY_NAME } from '@/lib/agent';
import { AgentToolStepView } from './agent-tool-step';

function AgentAvatar() {
  return (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-gradient-to-br from-amber-400/30 to-orange-500/20 font-serif text-[12px] font-semibold text-amber-700 dark:from-amber-400/15 dark:to-orange-500/10 dark:text-amber-300"
      aria-hidden
    >
      N
    </span>
  );
}

function isInternal(href: string | undefined) {
  if (!href) return false;
  return href.startsWith('/') && !href.startsWith('//');
}

const markdownComponents = {
  a({
    href,
    children,
    ...rest
  }: {
    href?: string;
    children?: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
    if (isInternal(href)) {
      return (
        <Link
          href={href!}
          className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
        >
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
        {...rest}
      >
        {children}
      </a>
    );
  },
  /** 让段落不要自动包裹一些块级（避免在很短的回复里出现额外间距） */
  p({ children }: { children?: React.ReactNode }) {
    return <p className="my-1.5 leading-relaxed">{children}</p>;
  },
  ul({ children }: { children?: React.ReactNode }) {
    return <ul className="my-1.5 list-disc space-y-1 pl-5">{children}</ul>;
  },
  ol({ children }: { children?: React.ReactNode }) {
    return <ol className="my-1.5 list-decimal space-y-1 pl-5">{children}</ol>;
  },
  code({ children }: { children?: React.ReactNode }) {
    return (
      <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[0.85em] text-stone-800 dark:bg-stone-800/80 dark:text-stone-100">
        {children}
      </code>
    );
  },
  pre({ children }: { children?: React.ReactNode }) {
    return (
      <pre className="my-2 max-h-72 overflow-auto rounded-xl bg-stone-100 p-3 font-mono text-[12px] leading-relaxed text-stone-800 dark:bg-stone-800/70 dark:text-stone-100">
        {children}
      </pre>
    );
  },
};

export function AgentMessageView({ message }: { message: AgentMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-stone-900 px-3.5 py-2 text-sm leading-relaxed text-white shadow-sm dark:bg-stone-100 dark:text-stone-900">
          {message.content}
        </div>
      </div>
    );
  }

  /** assistant */
  const showCursor = message.pending && !!message.content;
  const showInitialIndicator =
    message.pending && !message.content && (message.steps?.length ?? 0) === 0;
  return (
    <div className="flex items-start gap-2">
      <AgentAvatar />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {showInitialIndicator ? (
          <div className="rounded-2xl rounded-tl-sm border border-[var(--border)] bg-[var(--surface)]/70 px-3.5 py-2 text-sm text-stone-500 dark:text-stone-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:0ms]" />
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:120ms]" />
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:240ms]" />
              <span className="ml-1.5 text-xs">
                {AGENT_DISPLAY_NAME} 思考中…
              </span>
            </span>
          </div>
        ) : null}

        {message.steps && message.steps.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {message.steps.map((step) => (
              <AgentToolStepView key={step.call.id} step={step} />
            ))}
          </div>
        ) : null}

        {message.content ? (
          <div className="rounded-2xl rounded-tl-sm border border-[var(--border)] bg-[var(--surface)]/70 px-3.5 py-2 text-sm leading-relaxed text-stone-800 dark:text-stone-100">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {message.content}
            </ReactMarkdown>
            {showCursor ? (
              <span className="ml-0.5 inline-block h-3 w-1 -translate-y-0.5 animate-pulse bg-[var(--accent)] align-middle" />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
