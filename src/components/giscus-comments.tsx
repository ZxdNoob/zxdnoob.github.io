'use client';

/**
 * Giscus 评论（基于 GitHub Discussions，零后端）。
 *
 * ## 部署条件
 * 必须配齐这三个 `NEXT_PUBLIC_GISCUS_*`，否则组件直接返回 null（不展示空区块）：
 * - `NEXT_PUBLIC_GISCUS_REPO`：`owner/repo`
 * - `NEXT_PUBLIC_GISCUS_REPO_ID`：仓库 ID（从 https://giscus.app 配置页拿）
 * - `NEXT_PUBLIC_GISCUS_CATEGORY_ID`：评论用的 Discussion 分类 ID
 *
 * 可选：
 * - `NEXT_PUBLIC_GISCUS_CATEGORY`：分类名（默认 `Announcements`）
 *
 * ## 主题联动
 * 监听 `html.dark` 类变化，运行时通过 `postMessage` 切换 giscus iframe 主题，
 * 不会因为切深色而强制刷新 iframe 状态（评论不丢）。
 *
 * ## 静态导出友好
 * 完全在客户端渲染，不影响 SSG / GitHub Pages 部署。
 */

import { useEffect, useRef } from 'react';

interface GiscusCommentsProps {
  slug: string;
  title: string;
}

interface GiscusEnv {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
}

/**
 * `NEXT_PUBLIC_GISCUS_*` 是构建期注入的常量，服务端 / 客户端取值一致，
 * 直接同步求值即可（不需要 hydration 后再判断），与 `HeroPrompt` 中
 * `isAgentLLMConfigured()` 走同一套思路。
 */
function readEnv(): GiscusEnv | null {
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO?.trim();
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID?.trim();
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID?.trim();
  if (!repo || !repoId || !categoryId) return null;
  const category =
    process.env.NEXT_PUBLIC_GISCUS_CATEGORY?.trim() || 'Announcements';
  return { repo, repoId, category, categoryId };
}

function resolveGiscusTheme(): 'light' | 'dark_dimmed' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark')
    ? 'dark_dimmed'
    : 'light';
}

export function GiscusComments({ slug, title }: GiscusCommentsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const env = readEnv();

  useEffect(() => {
    if (!env) return;
    const container = containerRef.current;
    if (!container) return;

    /** 容器清空 → 注入 script。每篇文章 slug 变化时重新挂载（评论池切换） */
    container.replaceChildren();
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-repo', env.repo);
    script.setAttribute('data-repo-id', env.repoId);
    script.setAttribute('data-category', env.category);
    script.setAttribute('data-category-id', env.categoryId);
    /** 用 slug + 站点 prefix 作为 mapping，避免不同站点同 slug 撞库 */
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', `blog:${slug}`);
    script.setAttribute('data-strict', '1');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', resolveGiscusTheme());
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('data-loading', 'lazy');
    container.appendChild(script);

    /** 监听 html.dark 变化 → postMessage 切 giscus 主题 */
    const observer = new MutationObserver(() => {
      const iframe = container.querySelector<HTMLIFrameElement>(
        'iframe.giscus-frame',
      );
      iframe?.contentWindow?.postMessage(
        {
          giscus: {
            setConfig: { theme: resolveGiscusTheme() },
          },
        },
        'https://giscus.app',
      );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
      container.replaceChildren();
    };
  }, [slug, env]);

  if (!env) return null;

  return (
    <section
      aria-label={`关于《${title}》的评论`}
      className="mt-12 border-t border-[var(--border)]/60 pt-10"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-600 ring-1 ring-[var(--border)] dark:bg-stone-800 dark:text-stone-300"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <h2 className="font-serif text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          评论
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-500">
          基于 GitHub Discussions · 用 GitHub 账号即可发言
        </p>
      </div>
      <div ref={containerRef} className="mt-6 [&>iframe]:!min-h-[120px]" />
    </section>
  );
}
