import { getPublicApiBaseUrl } from '@/lib/api';
import type { AgentMessage } from '@/lib/agent/types';

const USER_ID_KEY = 'zxdnoob:agent:userId:v1';

function safeRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID().replace(/-/g, '');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export function getAgentUserId(): string {
  if (typeof window === 'undefined') return 'server';
  const existing = window.localStorage.getItem(USER_ID_KEY)?.trim();
  if (existing) return existing;
  const created = `u_${safeRandomId()}`.slice(0, 64);
  window.localStorage.setItem(USER_ID_KEY, created);
  return created;
}

function getRemoteBaseUrl(): string | null {
  const base = getPublicApiBaseUrl();
  return base ? base.replace(/\/$/, '') : null;
}

export type RemoteMemoryPayload = {
  userId: string;
  messages: AgentMessage[];
  updatedAt: string;
};

export async function fetchRemoteMemory(): Promise<RemoteMemoryPayload | null> {
  const base = getRemoteBaseUrl();
  if (!base) return null;
  const userId = getAgentUserId();
  try {
    const res = await fetch(`${base}/api/agent/memory`, {
      method: 'GET',
      headers: { 'X-Agent-User': userId },
    });
    if (!res.ok) return null;
    return (await res.json()) as RemoteMemoryPayload;
  } catch {
    return null;
  }
}

export async function saveRemoteMemory(
  messages: AgentMessage[],
): Promise<RemoteMemoryPayload | null> {
  const base = getRemoteBaseUrl();
  if (!base) return null;
  const userId = getAgentUserId();
  try {
    const res = await fetch(`${base}/api/agent/memory`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-User': userId,
      },
      body: JSON.stringify({ messages }),
      keepalive: true,
    });
    if (!res.ok) return null;
    return (await res.json()) as RemoteMemoryPayload;
  } catch {
    return null;
  }
}

/**
 * 是否启用“远端记忆同步”：
 * - 仅生产环境启用（保持本地 dev 现状）
 * - 且必须配置 NEXT_PUBLIC_API_URL 或 public-api.json.apiBaseUrl（可访问后端）
 */
export function isRemoteMemoryEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  return Boolean(getRemoteBaseUrl());
}
