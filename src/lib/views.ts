import { getBackendBaseUrl, getPublicApiBaseUrl } from './api';

/**
 * 浏览量 API（前端封装）。
 *
 * ## 为什么要分“服务端 fetch”与“客户端 POST”？
 * - **服务端（RSC）**：适合批量取数（列表页），可复用后端内网地址 `API_URL`
 * - **客户端（浏览器）**：只能访问 `NEXT_PUBLIC_*` 暴露的地址；且需要 POST 记录浏览
 *
 * ## 静态导出（GitHub Pages）注意
 * - 构建时可能取不到后端数据：服务端 fetch 使用 `force-cache` 以满足导出要求
 * - 真正的“累加浏览量”发生在用户浏览时的 POST（需要后端在线）
 */
export interface ViewCount {
  slug: string;
  views: number;
}

export interface RecordViewResult {
  slug: string;
  views: number;
  isNew: boolean;
}

export interface TotalViewsResult {
  totalViews: number;
}

export interface SiteTotalViewsResult {
  siteTotalViews: number;
}

export interface ViewCountResult {
  slug: string;
  views: number;
}

/**
 * 服务端：批量获取浏览量（供 RSC 列表页使用）。
 * 传入 slug 数组，返回对应的浏览量映射。
 */
export async function fetchViewCounts(
  slugs: string[],
): Promise<Map<string, number>> {
  if (slugs.length === 0) return new Map();

  // 这里使用“服务端基址”：优先 API_URL（容器/内网），否则 NEXT_PUBLIC_API_URL，再否则本机 4000
  const base = getBackendBaseUrl();
  try {
    const init: RequestInit =
      process.env.STATIC_EXPORT === '1'
        ? { cache: 'force-cache' }
        : { cache: 'no-store' };
    const res = await fetch(
      `${base}/api/views?slugs=${slugs.map(encodeURIComponent).join(',')}`,
      init,
    );
    if (!res.ok) return new Map();
    const data = (await res.json()) as ViewCount[];
    return new Map(data.map((d) => [d.slug, d.views]));
  } catch {
    return new Map();
  }
}

/**
 * 服务端：获取全站总浏览量（PV）。
 */
export async function fetchTotalViews(): Promise<number> {
  const base = getBackendBaseUrl();
  try {
    const init: RequestInit =
      process.env.STATIC_EXPORT === '1'
        ? { cache: 'force-cache' }
        : { cache: 'no-store' };
    const res = await fetch(`${base}/api/views/total`, init);
    if (!res.ok) return 0;
    const data = (await res.json()) as TotalViewsResult;
    return data.totalViews ?? 0;
  } catch {
    return 0;
  }
}

/**
 * 服务端：获取全站 PV（每次刷新/进入也会累加）。
 */
export async function fetchSiteTotalViews(): Promise<number> {
  const base = getBackendBaseUrl();
  try {
    const init: RequestInit =
      process.env.STATIC_EXPORT === '1'
        ? { cache: 'force-cache' }
        : { cache: 'no-store' };
    const res = await fetch(`${base}/api/views/site`, init);
    if (!res.ok) return 0;
    const data = (await res.json()) as SiteTotalViewsResult;
    return data.siteTotalViews ?? 0;
  } catch {
    return 0;
  }
}

/**
 * 客户端：上报一次“页面访问”（PV +1）。
 * 失败时返回 null（不影响页面展示）。
 */
export async function recordSiteView(): Promise<number | null> {
  const base = getClientApiBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/views/site`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as SiteTotalViewsResult;
    return typeof data.siteTotalViews === 'number' ? data.siteTotalViews : null;
  } catch {
    return null;
  }
}

/**
 * 客户端：获取当前全站 PV。
 * 失败时返回 null（避免影响页脚展示）。
 */
export async function fetchSiteTotalViewsClient(): Promise<number | null> {
  const base = getClientApiBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/views/site`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as SiteTotalViewsResult;
    return typeof data.siteTotalViews === 'number' ? data.siteTotalViews : null;
  } catch {
    return null;
  }
}

/**
 * 服务端：获取单篇浏览量。
 */
export async function fetchViewCount(slug: string): Promise<number> {
  // 同上：服务端渲染时可以访问 API_URL（不要求 public）
  const base = getBackendBaseUrl();
  try {
    const init: RequestInit =
      process.env.STATIC_EXPORT === '1'
        ? { cache: 'force-cache' }
        : { cache: 'no-store' };
    const res = await fetch(
      `${base}/api/views/${encodeURIComponent(slug)}`,
      init,
    );
    if (!res.ok) return 0;
    const data = (await res.json()) as ViewCount;
    return data.views;
  } catch {
    return 0;
  }
}

/**
 * 客户端：获取单篇浏览量（用于路由跳转/返回时刷新 UI）。
 * 失败时返回 null（不影响阅读体验）。
 */
export async function fetchViewCountClient(
  slug: string,
): Promise<number | null> {
  const base = getClientApiBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/views/${encodeURIComponent(slug)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ViewCountResult;
    return typeof data.views === 'number' ? data.views : null;
  } catch {
    return null;
  }
}

/**
 * 客户端：记录一次浏览（POST）。
 * 返回最新浏览数；失败时返回 null（不阻断页面展示）。
 */
/**
 * 浏览器端推断 API 基址：优先使用 NEXT_PUBLIC_API_URL。
 * 仅在 localhost / 127.0.0.1 下回退到 :4000（本仓库 dev 默认）；静态站（如 GitHub Pages）
 * 未注入 NEXT_PUBLIC_API_URL 时不能猜测端口，否则会把 POST 发到错误主机并导致浏览量无法累加。
 */
function getClientApiBaseUrl(): string | null {
  const explicit = getPublicApiBaseUrl();
  if (explicit) return explicit;
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:4000`;
    }
  }
  return null;
}

/**
 * 客户端：记录一次浏览（POST）。
 * 返回最新浏览数；失败时返回 null（不阻断页面展示）。
 */
export async function recordPageView(
  slug: string,
): Promise<RecordViewResult | null> {
  const base = getClientApiBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/views/${encodeURIComponent(slug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
    if (!res.ok) return null;
    return (await res.json()) as RecordViewResult;
  } catch {
    return null;
  }
}
