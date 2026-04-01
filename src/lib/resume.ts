/**
 * 简历数据由 Nest 后端 + SQLite 提供，构建期静态导出时与文章列表相同走 HTTP。
 */
import { getBackendBaseUrl } from './api';
import type { ResumePayload } from './resume-types';

async function fetchJson<T>(path: string): Promise<T | null> {
  const base = getBackendBaseUrl();
  try {
    const init: RequestInit =
      process.env.STATIC_EXPORT === '1'
        ? { cache: 'force-cache' }
        : { cache: 'no-store' };
    const res = await fetch(`${base}${path}`, init);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** 完整简历；后端未就绪或接口失败时返回 `null` */
export async function fetchResume(): Promise<ResumePayload | null> {
  return fetchJson<ResumePayload>('/api/resume');
}

export type { ResumePayload, ResumeProject } from './resume-types';
