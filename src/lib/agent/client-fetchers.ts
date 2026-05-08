/**
 * 浏览器侧的 Agent 数据拉取封装（带内存缓存）。
 *
 * 不直接复用 `lib/posts.ts` 那一套，是因为：
 * - 那些函数是「给 RSC/服务端」用的，会读取 `API_URL`（Node 环境）
 * - Agent 跑在浏览器里，必须使用 `getPublicApiBaseUrl()` 解析得到的公开地址
 *
 * 缓存策略：
 * - 简单 `Map<string, Promise<T>>`：同一会话内不重复请求
 * - 失败结果也会被短期缓存（30s）以避免反复请求挂掉的后端
 */

import { getPublicApiBaseUrl } from '@/lib/api';
import type { ChangelogEntry } from '@/lib/changelog';
import type { Post, PostSummary } from '@/lib/posts';
import type { ResumePayload } from '@/lib/resume-types';

/** 与后端 `PostSearchHit` 对齐 */
export type PostSearchHit = PostSummary & {
  score: number;
  url: string;
};

/** 与后端 `PostSearchPassage` 对齐 */
export interface PostSearchPassage {
  slug: string;
  title: string;
  date: string;
  description: string;
  /** 含 `<mark>` 高亮，前端可保留或剥离 */
  snippet: string;
  url: string;
}

interface CacheEntry<T> {
  value: T;
  /** 仅失败结果使用：在该时间戳后允许重试 */
  retryAt?: number;
}

const FAIL_RETRY_MS = 30_000;

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function browserApiBaseUrl(): string | null {
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

async function fetchJSONCached<T>(
  key: string,
  path: string,
  fallback: T,
): Promise<T> {
  const cached = cache.get(key) as CacheEntry<T> | undefined;
  if (cached && (cached.retryAt == null || cached.retryAt > Date.now())) {
    return cached.value;
  }

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const base = browserApiBaseUrl();
  if (!base) {
    cache.set(key, { value: fallback, retryAt: Date.now() + FAIL_RETRY_MS });
    return fallback;
  }

  const promise = (async () => {
    try {
      const res = await fetch(`${base}${path}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        cache.set(key, {
          value: fallback,
          retryAt: Date.now() + FAIL_RETRY_MS,
        });
        return fallback;
      }
      const data = (await res.json()) as T;
      cache.set(key, { value: data });
      return data;
    } catch {
      cache.set(key, { value: fallback, retryAt: Date.now() + FAIL_RETRY_MS });
      return fallback;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export async function clientFetchPosts(): Promise<PostSummary[]> {
  return fetchJSONCached<PostSummary[]>('posts', '/api/posts', []);
}

export async function clientFetchPostContent(
  slug: string,
): Promise<string | null> {
  if (!slug) return null;
  const key = `post:${slug}`;
  const data = await fetchJSONCached<Post | null>(
    key,
    `/api/posts/${encodeURIComponent(slug)}`,
    null,
  );
  return data?.content ?? null;
}

export async function clientFetchChangelog(): Promise<ChangelogEntry[]> {
  return fetchJSONCached<ChangelogEntry[]>('changelog', '/api/changelog', []);
}

export async function clientFetchResume(): Promise<ResumePayload | null> {
  return fetchJSONCached<ResumePayload | null>('resume', '/api/resume', null);
}

/** RAG：基于 FTS5 的全文搜索，命中 title/description/content/tags */
export async function clientFetchPostSearch(
  query: string,
  limit = 8,
): Promise<PostSearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  const key = `posts:search:${q}:${limit}`;
  const url = `/api/posts/search?q=${encodeURIComponent(q)}&limit=${limit}`;
  const data = await fetchJSONCached<{
    query: string;
    hits: PostSearchHit[];
  } | null>(key, url, null);
  return data?.hits ?? [];
}

/** RAG：检索文章正文中最相关的若干 snippet（带 <mark> 高亮） */
export async function clientFetchRelevantPassages(
  query: string,
  limit = 6,
): Promise<PostSearchPassage[]> {
  const q = query.trim();
  if (!q) return [];

  const base = browserApiBaseUrl();
  if (!base) return [];

  /** POST 不进 fetchJSONCached 的 GET 缓存，但走自己的简单 LRU 缓存 */
  const key = `posts:relevant:${q}:${limit}`;
  const cached = cache.get(key) as CacheEntry<PostSearchPassage[]> | undefined;
  if (cached && (cached.retryAt == null || cached.retryAt > Date.now())) {
    return cached.value;
  }
  try {
    const res = await fetch(`${base}/api/posts/relevant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, limit }),
    });
    if (!res.ok) {
      cache.set(key, { value: [], retryAt: Date.now() + FAIL_RETRY_MS });
      return [];
    }
    const data = (await res.json()) as {
      query: string;
      passages: PostSearchPassage[];
    };
    const out = Array.isArray(data?.passages) ? data.passages : [];
    cache.set(key, { value: out });
    return out;
  } catch {
    cache.set(key, { value: [], retryAt: Date.now() + FAIL_RETRY_MS });
    return [];
  }
}

export function clearAgentClientCache() {
  cache.clear();
  inflight.clear();
}
