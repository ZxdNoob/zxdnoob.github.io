import { getPublicApiBaseUrl } from '@/lib/api';
import type { AgentMessage } from '@/lib/agent/types';

const USER_ID_KEY = 'zxdnoob:agent:userId:v1';
const ACTIVE_SESSION_KEY = 'zxdnoob:agent:activeSessionId:v1';

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

export function getActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_SESSION_KEY)?.trim() || null;
}

export function setActiveSessionId(id: string | null) {
  if (typeof window === 'undefined') return;
  if (!id) {
    window.localStorage.removeItem(ACTIVE_SESSION_KEY);
  } else {
    window.localStorage.setItem(ACTIVE_SESSION_KEY, id);
  }
}

function getRemoteBaseUrl(): string | null {
  const base = getPublicApiBaseUrl();
  return base ? base.replace(/\/$/, '') : null;
}

export type RemoteSessionMeta = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type RemoteSessionsListPayload = {
  userId: string;
  sessions: RemoteSessionMeta[];
};

export type RemoteSessionPayload = {
  userId: string;
  id: string;
  title: string;
  messages: AgentMessage[];
  createdAt: string;
  updatedAt: string;
};

export function isRemoteSessionsEnabled(): boolean {
  /** 本地 dev 保持现状 */
  if (process.env.NODE_ENV !== 'production') return false;
  return Boolean(getRemoteBaseUrl());
}

export async function listRemoteSessions(): Promise<RemoteSessionsListPayload | null> {
  const base = getRemoteBaseUrl();
  if (!base) return null;
  const userId = getAgentUserId();
  try {
    const res = await fetch(`${base}/api/agent/sessions`, {
      method: 'GET',
      headers: { 'X-Agent-User': userId },
    });
    if (!res.ok) return null;
    return (await res.json()) as RemoteSessionsListPayload;
  } catch {
    return null;
  }
}

export async function createRemoteSession(args?: {
  title?: string;
  messages?: AgentMessage[];
}): Promise<RemoteSessionPayload | null> {
  const base = getRemoteBaseUrl();
  if (!base) return null;
  const userId = getAgentUserId();
  try {
    const res = await fetch(`${base}/api/agent/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-User': userId,
      },
      body: JSON.stringify({
        title: args?.title ?? '新会话',
        messages: args?.messages ?? [],
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as RemoteSessionPayload;
  } catch {
    return null;
  }
}

export async function getRemoteSession(
  id: string,
): Promise<RemoteSessionPayload | null> {
  const base = getRemoteBaseUrl();
  if (!base) return null;
  const userId = getAgentUserId();
  try {
    const res = await fetch(
      `${base}/api/agent/sessions/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        headers: { 'X-Agent-User': userId },
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as RemoteSessionPayload;
  } catch {
    return null;
  }
}

export async function updateRemoteSession(
  id: string,
  patch: { title?: string; messages?: AgentMessage[] },
): Promise<RemoteSessionPayload | null> {
  const base = getRemoteBaseUrl();
  if (!base) return null;
  const userId = getAgentUserId();
  try {
    const res = await fetch(
      `${base}/api/agent/sessions/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-User': userId,
        },
        body: JSON.stringify(patch),
        keepalive: true,
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as RemoteSessionPayload;
  } catch {
    return null;
  }
}

export async function deleteRemoteSession(id: string): Promise<boolean> {
  const base = getRemoteBaseUrl();
  if (!base) return false;
  const userId = getAgentUserId();
  try {
    const res = await fetch(
      `${base}/api/agent/sessions/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: { 'X-Agent-User': userId },
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
