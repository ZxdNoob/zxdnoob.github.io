/**
 * Agent 类型定义。
 *
 * 设计目标：
 * - 与 OpenAI Chat Completions 工具调用协议兼容（`tools`/`tool_calls`），
 *   方便接入任意 OpenAI 兼容的网关（OpenAI、DeepSeek、SiliconFlow、本地 vLLM/Ollama 等）。
 * - 同时也能在「无 LLM」时降级为本地启发式 Agent，UI 表现一致。
 */

import type { ChangelogEntry } from '@/lib/changelog';
import type { PostSummary } from '@/lib/posts';
import type { ResumePayload } from '@/lib/resume-types';
import type { PostSearchHit, PostSearchPassage } from './client-fetchers';

/** 消息角色 */
export type AgentRole = 'system' | 'user' | 'assistant' | 'tool';

/** 一次工具调用（与 OpenAI 兼容） */
export interface AgentToolCall {
  id: string;
  name: string;
  /** 参数对象（已解析为 JSON） */
  args: Record<string, unknown>;
}

/** 工具执行结果（写回会话） */
export interface AgentToolResult {
  callId: string;
  name: string;
  /** 用于展示的人类可读摘要（一段简短中文） */
  summary: string;
  /** 结构化数据，回写给 LLM 时会序列化为 JSON 字符串 */
  data?: unknown;
  /** 是否成功 */
  ok: boolean;
}

/** 工具步骤：在 UI 中以「工具卡片」展示 */
export interface AgentToolStep {
  call: AgentToolCall;
  result?: AgentToolResult;
}

/** 一条会话消息 */
export interface AgentMessage {
  /** 内部唯一 id（仅用于 React key） */
  id: string;
  role: AgentRole;
  /** Markdown / 纯文本 */
  content: string;
  /** 仅在 `assistant` 上出现的工具调用记录（用于 UI 展示） */
  steps?: AgentToolStep[];
  /** 时间戳（毫秒） */
  createdAt: number;
  /** 是否仍在流式输出 */
  pending?: boolean;
}

/**
 * 工具运行时上下文（由 UI 注入）。
 *
 * 之所以放在这里而非各工具自己拿，是为了：
 * - 工具是纯函数，方便测试与组合
 * - UI 决定路由与主题切换的实际副作用，不让 lib 直接依赖 next/navigation
 */
export interface AgentToolContext {
  /** 软导航：相对路径（如 `/blog/foo`）或绝对 URL（外链） */
  navigate: (href: string) => void;
  /** 设置主题（写 localStorage 并切 html.classList） */
  setTheme: (mode: 'light' | 'dark' | 'system') => void;
  /** 打开 ⌘K 命令面板 */
  openCommandPalette: () => void;
  /** 复制文本到剪贴板，返回是否成功 */
  copyToClipboard: (text: string) => Promise<boolean>;
  /** 拉取后端数据（封装了缓存与 API 基址） */
  fetchPosts: () => Promise<PostSummary[]>;
  fetchPostContent: (slug: string) => Promise<string | null>;
  fetchChangelog: () => Promise<ChangelogEntry[]>;
  fetchResume: () => Promise<ResumePayload | null>;
  /** RAG：FTS5 全文搜索（命中标题/描述/正文/标签） */
  fetchPostSearch: (query: string, limit?: number) => Promise<PostSearchHit[]>;
  /** RAG：返回最相关的正文片段（含 `<mark>` 高亮） */
  fetchRelevantPassages: (
    query: string,
    limit?: number,
  ) => Promise<PostSearchPassage[]>;
}

/** 工具定义：name/description/JSON Schema 兼容 OpenAI 的 `tools` 字段 */
export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: AgentJsonSchema;
}

/**
 * 极简 JSON Schema 子集：只支持 `object` + 顶层属性。
 * 对绝大多数工具调用够用，避免引入额外的 schema 库。
 */
export interface AgentJsonSchema {
  type: 'object';
  properties: Record<
    string,
    {
      type: 'string' | 'number' | 'boolean' | 'array';
      description?: string;
      enum?: string[];
      items?: { type: 'string' | 'number' };
    }
  >;
  required?: string[];
}

/** 工具的执行函数 */
export type AgentToolExecutor = (
  args: Record<string, unknown>,
  ctx: AgentToolContext,
) => Promise<AgentToolResult>;

/** 已注册工具：定义 + 执行器 */
export interface AgentTool {
  definition: AgentToolDefinition;
  execute: AgentToolExecutor;
}

/** 由 runner 推送给 UI 的事件流（统一 LLM/启发式两种模式） */
export type AgentEvent =
  | { kind: 'message-start'; messageId: string }
  | { kind: 'text-delta'; messageId: string; text: string }
  | {
      kind: 'tool-start';
      messageId: string;
      call: AgentToolCall;
    }
  | {
      kind: 'tool-end';
      messageId: string;
      result: AgentToolResult;
    }
  | { kind: 'message-end'; messageId: string }
  | { kind: 'error'; message: string };
