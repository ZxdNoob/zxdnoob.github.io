/**
 * Agent 会话全局状态 + 本地持久化。
 *
 * 目标：
 * - 右下角抽屉 与 /agent 全屏页共享同一份 messages（避免各聊各的）
 * - 刷新页面后会话仍在（localStorage）
 * - 本地(dev)与线上(prod)均可用：同一实现，按 origin 自动隔离
 *
 * 实现风格参考 `src/lib/toast.ts`（subscribe + snapshot）。
 */

import { runAgent, type AgentEvent, type AgentMessage } from '@/lib/agent';
import {
  createRemoteSession,
  deleteRemoteSession,
  getActiveSessionId,
  getRemoteSession,
  isRemoteSessionsEnabled,
  listRemoteSessions,
  setActiveSessionId,
  updateRemoteSession,
  type RemoteSessionMeta,
} from '@/lib/agent/remote-sessions';

export interface AgentSessionSnapshot {
  messages: AgentMessage[];
  isStreaming: boolean;
  /** 仅远端多会话启用时可用 */
  remoteEnabled: boolean;
  sessions: RemoteSessionMeta[];
  activeSessionId: string | null;
}

const STORAGE_KEY = 'zxdnoob:agent:session:v1';
const MAX_MESSAGES = 80;
const REMOTE_DEBOUNCE_MS = 900;

let state: AgentSessionSnapshot = {
  messages: [],
  isStreaming: false,
  remoteEnabled: false,
  sessions: [],
  activeSessionId: null,
};
const listeners = new Set<() => void>();
let remoteSyncTimer: number | null = null;

/** `useSyncExternalStore` 要求服务端快照引用稳定 */
const serverSnapshot: AgentSessionSnapshot = {
  messages: [],
  isStreaming: false,
  remoteEnabled: false,
  sessions: [],
  activeSessionId: null,
};

function emit() {
  listeners.forEach((l) => l());
}

export const agentSessionState = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): AgentSessionSnapshot {
    return state;
  },
  getServerSnapshot(): AgentSessionSnapshot {
    return serverSnapshot;
  },
};

function safeParseMessages(raw: string): AgentMessage[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const list: AgentMessage[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const m = item as Partial<AgentMessage>;
      if (!m.id || !m.role || typeof m.content !== 'string') continue;
      if (typeof m.createdAt !== 'number') continue;
      list.push({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        pending: Boolean(m.pending),
        steps: Array.isArray(m.steps) ? (m.steps as AgentMessage['steps']) : [],
      });
    }
    return list.slice(-MAX_MESSAGES);
  } catch {
    return [];
  }
}

function persist(next: AgentSessionSnapshot) {
  try {
    if (typeof window === 'undefined') return;
    const payload = JSON.stringify(next.messages.slice(-MAX_MESSAGES));
    window.localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // ignore
  }
}

function newestCreatedAt(messages: AgentMessage[]): number {
  return messages.reduce((acc, m) => Math.max(acc, m.createdAt ?? 0), 0);
}

function scheduleRemoteSync() {
  if (!state.remoteEnabled) return;
  if (typeof window === 'undefined') return;
  if (remoteSyncTimer) window.clearTimeout(remoteSyncTimer);
  remoteSyncTimer = window.setTimeout(async () => {
    remoteSyncTimer = null;
    /** 仅同步稳定态消息，避免把 pending 的半截内容写入远端 */
    const stable = state.messages.filter((m) => !m.pending);
    if (stable.length === 0) return;
    if (!state.activeSessionId) return;
    await updateRemoteSession(state.activeSessionId, { messages: stable });
    /** 轻量刷新 list，确保 updatedAt 排序与 title 变化一致 */
    const list = await listRemoteSessions();
    if (list?.sessions) {
      state = { ...state, sessions: list.sessions };
      emit();
    }
  }, REMOTE_DEBOUNCE_MS);
}

export function hydrateAgentSessionFromStorage() {
  try {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const messages = safeParseMessages(raw);
    if (messages.length === 0) return;
    state = { ...state, messages, isStreaming: false };
    emit();
  } catch {
    // ignore
  }
}

export async function hydrateAgentSessionFromRemote(): Promise<void> {
  if (!isRemoteSessionsEnabled()) return;
  state = { ...state, remoteEnabled: true };
  emit();

  const list = await listRemoteSessions();
  if (!list) return;

  let active = getActiveSessionId();
  const sessions = list.sessions ?? [];
  state = { ...state, sessions };
  emit();

  /** 若没有任何 session：创建一个空会话 */
  if (sessions.length === 0) {
    const created = await createRemoteSession({
      title: '新会话',
      messages: [],
    });
    if (!created) return;
    active = created.id;
    setActiveSessionId(active);
    state = {
      ...state,
      sessions: [
        {
          id: created.id,
          title: created.title,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
      ],
      activeSessionId: active,
      messages: (created.messages ?? []).slice(-MAX_MESSAGES),
    };
    emit();
    persist(state);
    return;
  }

  /** active 不存在或不在列表里：默认选最新 updatedAt 的第一个 */
  if (!active || !sessions.some((s) => s.id === active)) {
    active = sessions[0]?.id ?? null;
    setActiveSessionId(active);
  }

  state = { ...state, activeSessionId: active };
  emit();
  if (!active) return;

  const session = await getRemoteSession(active);
  if (!session) return;
  const remoteMessages = Array.isArray(session.messages)
    ? session.messages
    : [];
  const localTs = newestCreatedAt(state.messages);
  const remoteTs = newestCreatedAt(remoteMessages);
  if (remoteTs > localTs) {
    state = { ...state, messages: remoteMessages.slice(-MAX_MESSAGES) };
    emit();
    persist(state);
  }
}

export function clearAgentSession() {
  /** 本地保持现状：仅清空本地会话；远端会话不删除，只清空当前会话内容 */
  state = { ...state, messages: [], isStreaming: false };
  emit();
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  if (remoteSyncTimer && typeof window !== 'undefined') {
    window.clearTimeout(remoteSyncTimer);
    remoteSyncTimer = null;
  }
  scheduleRemoteSync();
}

export async function switchRemoteSession(id: string): Promise<void> {
  if (!state.remoteEnabled) return;
  const sid = id.trim();
  if (!sid) return;
  setActiveSessionId(sid);
  state = { ...state, activeSessionId: sid, messages: [] };
  emit();
  const session = await getRemoteSession(sid);
  if (!session) return;
  const remoteMessages = Array.isArray(session.messages)
    ? session.messages
    : [];
  state = { ...state, messages: remoteMessages.slice(-MAX_MESSAGES) };
  emit();
  persist(state);
}

export async function createNewRemoteSession(title?: string): Promise<void> {
  if (!state.remoteEnabled) return;
  const created = await createRemoteSession({
    title: title?.trim() || '新会话',
    messages: [],
  });
  if (!created) return;
  const list = await listRemoteSessions();
  const sessions = list?.sessions ?? state.sessions;
  setActiveSessionId(created.id);
  state = {
    ...state,
    sessions,
    activeSessionId: created.id,
    messages: [],
  };
  emit();
  persist(state);
}

export async function renameRemoteSession(
  id: string,
  title: string,
): Promise<void> {
  if (!state.remoteEnabled) return;
  const sid = id.trim();
  const nextTitle = title.trim().slice(0, 191);
  if (!sid || !nextTitle) return;
  await updateRemoteSession(sid, { title: nextTitle });
  const list = await listRemoteSessions();
  if (list?.sessions) {
    state = { ...state, sessions: list.sessions };
    emit();
  }
}

export async function deleteSessionRemote(id: string): Promise<void> {
  if (!state.remoteEnabled) return;
  const sid = id.trim();
  if (!sid) return;
  const ok = await deleteRemoteSession(sid);
  if (!ok) return;
  const list = await listRemoteSessions();
  const sessions = list?.sessions ?? [];
  state = { ...state, sessions };
  emit();
  if (state.activeSessionId === sid) {
    const nextId = sessions[0]?.id ?? null;
    setActiveSessionId(nextId);
    state = { ...state, activeSessionId: nextId, messages: [] };
    emit();
    if (nextId) await switchRemoteSession(nextId);
  }
}

export function appendMessage(message: AgentMessage) {
  state = {
    ...state,
    messages: [...state.messages, message].slice(-MAX_MESSAGES),
  };
  emit();
  persist(state);
  scheduleRemoteSync();
}

export function setStreaming(value: boolean) {
  state = { ...state, isStreaming: value };
  emit();
}

export function applyAgentEvent(event: AgentEvent) {
  if (event.kind === 'error') return;
  const messageId = (event as { messageId?: string }).messageId;
  if (!messageId) return;
  const idx = state.messages.findIndex((m) => m.id === messageId);
  if (idx < 0) return;

  const list = state.messages.slice();
  const target = { ...list[idx] };

  switch (event.kind) {
    case 'message-start':
      target.pending = true;
      break;
    case 'text-delta':
      target.content = (target.content ?? '') + event.text;
      break;
    case 'tool-start': {
      const steps = target.steps ? target.steps.slice() : [];
      steps.push({ call: event.call });
      target.steps = steps;
      break;
    }
    case 'tool-end': {
      const steps = target.steps ? target.steps.slice() : [];
      const i = steps.findIndex((s) => s.call.id === event.result.callId);
      if (i >= 0) {
        steps[i] = { ...steps[i], result: event.result };
      } else {
        steps.push({
          call: { id: event.result.callId, name: event.result.name, args: {} },
          result: event.result,
        });
      }
      target.steps = steps;
      break;
    }
    case 'message-end':
      target.pending = false;
      break;
  }

  list[idx] = target;
  state = { ...state, messages: list };
  emit();
  persist(state);
  scheduleRemoteSync();
}

export async function runAgentIntoSession(args: {
  history: AgentMessage[];
  input: string;
  ctx: Parameters<typeof runAgent>[0]['ctx'];
  assistantMessageId: string;
  signal?: AbortSignal;
}) {
  await runAgent({
    history: args.history,
    input: args.input,
    ctx: args.ctx,
    assistantMessageId: args.assistantMessageId,
    signal: args.signal,
    push: applyAgentEvent,
  });
}
