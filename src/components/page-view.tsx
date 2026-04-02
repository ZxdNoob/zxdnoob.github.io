'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { fetchViewCountClient, recordPageView } from '@/lib/views';

/**
 * 文章详情页的浏览计数器。
 *
 * ## 职责
 * - 在文章详情页 **首次挂载** 时向后端 `POST /api/views/:slug` 记录阅读
 * - 显示当前阅读量（先用服务端预取值 `initialViews`，再用 POST 返回值更新）
 *
 * ## 为什么要“服务端预取 + 客户端再 POST”？
 * - 只靠客户端：首屏会显示 0 → 再跳到真实值（闪烁、体验差）
 * - 只靠服务端：无法获取真实 IP/UA（且 RSC 不应该做“有副作用的写入”）
 *
 * ## 去重在哪里做？
 * - 去重**必须**在后端：因为只有后端能可靠获取 IP/UA，并持久化判断窗口
 *
 * ## 为什么要用 `recorded` ref？
 * - React 严格模式、某些场景会触发 effect 重复执行
 * - 避免同一页面一次打开触发多次 POST（即使后端有防抖，前端也应尽量克制）
 */
export function PageViewRecorder({
  slug,
  initialViews,
}: {
  slug: string;
  initialViews: number;
}) {
  const [views, setViews] = useState(initialViews);
  const pathname = usePathname() ?? '';
  const lastRecordedSlug = useRef<string | null>(null);

  useEffect(() => {
    // slug 变化时由父级 `key={slug}` 重挂载，本组件 state 从 `initialViews` 重新初始化，无需在 effect 里同步 setState。
    // React 严格模式/某些缓存复用场景下，确保每个 slug 只触发一次 POST
    if (lastRecordedSlug.current === slug) return;
    lastRecordedSlug.current = slug;

    // 异步请求失败不影响阅读体验：不抛错、不阻断渲染
    recordPageView(slug).then((result) => {
      if (result) setViews(result.views);
    });
  }, [slug]);

  // 路由跳转/返回（含 bfcache 恢复）时刷新当前文章的最新浏览量
  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const v = await fetchViewCountClient(slug);
      if (cancelled) return;
      if (typeof v === 'number') setViews(v);
    }

    function onPageShow() {
      refresh();
    }

    refresh();
    window.addEventListener('pageshow', onPageShow);
    return () => {
      cancelled = true;
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [slug, pathname]);

  return <ViewBadge views={views} />;
}

/**
 * 纯展示浏览数（供列表页使用，不触发 POST）。
 */
export function PageViewBadge({ views }: { views: number }) {
  return <ViewBadge views={views} />;
}

function ViewBadge({ views }: { views: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-stone-500 dark:text-stone-500">
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
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span className="tabular-nums">{formatViews(views)}</span>
    </span>
  );
}

function formatViews(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
