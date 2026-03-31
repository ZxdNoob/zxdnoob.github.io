'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isValidElement, useMemo, useState } from 'react';
import type { Pluggable } from 'unified';
import { toast } from '@/lib/toast';
import { normalizeHeadingText } from '@/lib/toc';

type Props = { content: string };

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [wrap, setWrap] = useState(false);
  const [copied, setCopied] = useState(false);

  const raw = useMemo(() => {
    const text = String(children ?? '');
    return text.endsWith('\n') ? text.slice(0, -1) : text;
  }, [children]);

  const compactToken = useMemo(() => {
    const t = raw.trim();
    if (t !== raw) return null;
    if (t.length === 0 || t.length > 24) return null;
    if (t.includes('\n')) return null;
    if (!/^[\w./-]+$/.test(t)) return null;
    return t;
  }, [raw]);

  if (compactToken) {
    return (
      <code className="inline-flex max-w-full overflow-x-auto rounded bg-stone-100 px-1.5 py-0.5 text-[0.875em] font-medium text-stone-800 dark:bg-stone-800 dark:text-stone-100">
        {compactToken}
      </code>
    );
  }

  return (
    <div className="group relative">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          className="inline-flex items-center rounded-full border border-stone-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] dark:border-stone-700/70 dark:bg-stone-900/40 dark:text-stone-200 dark:hover:border-stone-600/80 dark:hover:bg-stone-800/60 dark:hover:text-stone-50"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(raw);
              setCopied(true);
              toast.success('已复制代码');
              window.setTimeout(() => setCopied(false), 1200);
            } catch {
              toast.error('复制失败');
            }
          }}
          aria-label="复制代码"
        >
          {copied ? '已复制' : '复制'}
        </button>
        <label
          className="inline-flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/80 px-2.5 py-1 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white focus-within:outline-none focus-within:ring-4 focus-within:ring-[var(--focus-ring)] dark:border-stone-700/70 dark:bg-stone-900/40 dark:text-stone-200 dark:hover:border-stone-600/80 dark:hover:bg-stone-800/60 dark:hover:text-stone-50"
          aria-label="代码自动换行开关"
        >
          <span className="select-none">换行</span>
          <button
            type="button"
            role="switch"
            aria-checked={wrap}
            onClick={() => setWrap((v) => !v)}
            className={[
              'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
              'focus-visible:outline-none',
              wrap
                ? 'border-amber-400/60 bg-amber-500/80 dark:border-amber-300/50 dark:bg-amber-400/70'
                : 'border-stone-300 bg-stone-200 dark:border-stone-600 dark:bg-stone-700/70',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform',
                wrap ? 'translate-x-[1.15rem]' : 'translate-x-0.5',
              ].join(' ')}
              aria-hidden
            />
          </button>
        </label>
      </div>

      <pre
        className={[
          'overflow-x-auto rounded-xl border border-stone-200/50 bg-stone-950 text-stone-100 dark:border-stone-800 dark:bg-stone-950',
          wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre',
        ].join(' ')}
      >
        <code className={className}>{raw}</code>
      </pre>
    </div>
  );
}

export function PostBody({ content }: Props) {
  const normalizedContent = content.replaceAll('\\`\\`\\`', '```');
  // Avoid type conflicts from duplicated `vfile` versions in remark plugin types.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const remarkSlugMod = require('remark-slug') as unknown as
    | Pluggable
    | { default: Pluggable };
  const remarkSlug =
    typeof remarkSlugMod === 'function'
      ? remarkSlugMod
      : (remarkSlugMod as { default: Pluggable }).default;

  function textFromNode(node: React.ReactNode): string {
    if (typeof node === 'string' || typeof node === 'number')
      return String(node);
    if (Array.isArray(node)) return node.map(textFromNode).join('');
    if (isValidElement<{ children?: React.ReactNode }>(node))
      return textFromNode(node.props.children);
    return '';
  }

  function renderHeading(
    level: 2 | 3 | 4,
    id: string | undefined,
    children?: React.ReactNode,
  ) {
    const Tag = `h${level}` as const;
    const text = normalizeHeadingText(textFromNode(children));
    void text;
    return (
      <Tag id={id} className="group scroll-mt-24">
        <span className="mr-2">{children}</span>
        <a
          href={id ? `#${id}` : '#'}
          className="no-underline opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          aria-label="跳转到该小节"
          onClick={(e) => {
            // Keep default jump behavior; also update URL hash reliably.
            e.preventDefault();
            const currentId =
              id ?? (e.currentTarget.parentElement as HTMLElement | null)?.id;
            if (!currentId) return;
            try {
              history.replaceState(null, '', `#${currentId}`);
            } catch {
              // ignore
            }
            document
              .getElementById(currentId)
              ?.scrollIntoView({ block: 'start' });
          }}
        >
          #
        </a>
      </Tag>
    );
  }

  function Heading2({
    id,
    children,
  }: {
    id?: string;
    children?: React.ReactNode;
  }) {
    return renderHeading(2, id, children);
  }
  function Heading3({
    id,
    children,
  }: {
    id?: string;
    children?: React.ReactNode;
  }) {
    return renderHeading(3, id, children);
  }
  function Heading4({
    id,
    children,
  }: {
    id?: string;
    children?: React.ReactNode;
  }) {
    return renderHeading(4, id, children);
  }

  return (
    <div
      id="post-content"
      className={[
        'prose prose-stone max-w-none dark:prose-invert',
        'prose-headings:font-serif prose-headings:tracking-tight prose-h2:mt-12 prose-h2:text-2xl prose-h3:mt-8',
        'prose-p:leading-[1.8]',
        'prose-a:text-[var(--accent)] prose-a:no-underline prose-a:transition-colors hover:prose-a:underline',
        'prose-blockquote:border-l-[var(--accent)] prose-blockquote:text-stone-600 dark:prose-blockquote:text-stone-400',
        // Inline code
        'prose-code:rounded prose-code:bg-stone-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.875em] prose-code:font-medium prose-code:before:content-none prose-code:after:content-none dark:prose-code:bg-stone-800',
        // Code blocks (ensure code inside <pre> stays readable in light theme)
        'prose-pre:rounded-xl prose-pre:border prose-pre:border-stone-200/50 prose-pre:bg-stone-950 prose-pre:text-stone-100 dark:prose-pre:border-stone-800 dark:prose-pre:bg-stone-950',
        'prose-pre:[&>code]:bg-transparent prose-pre:[&>code]:p-0 prose-pre:[&>code]:text-inherit prose-pre:[&>code]:font-normal',
        'prose-img:rounded-xl prose-img:shadow-md',
        'prose-hr:border-[var(--border)]',
      ].join(' ')}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkSlug]}
        components={{
          h2: Heading2,
          h3: Heading3,
          h4: Heading4,
          pre: ({ children }) => {
            // Render fenced code blocks via <pre><code> as our custom CodeBlock.
            // Keeping <code> itself inline-only avoids invalid <p><div> nesting.
            const child = Array.isArray(children) ? children[0] : children;
            if (
              isValidElement<{
                className?: string;
                children?: React.ReactNode;
              }>(child)
            ) {
              const { className, children: codeChildren } = child.props;
              return (
                <CodeBlock className={className}>{codeChildren}</CodeBlock>
              );
            }
            return <pre>{children}</pre>;
          },
          code: ({ className, children }) => (
            <code className={className}>{children}</code>
          ),
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
