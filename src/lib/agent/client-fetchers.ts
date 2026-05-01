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

export function clearAgentClientCache() {
  cache.clear();
  inflight.clear();
}
