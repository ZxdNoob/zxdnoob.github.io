/**
 * OpenAI 兼容的流式 Chat Completions 客户端（浏览器侧）。
 *
 * 仅依赖 fetch + ReadableStream，体积接近 0。
 *
 * 兼容范围：
 * - OpenAI / Azure OpenAI（后者需要外部反代规整路径）
 * - DeepSeek、Moonshot、SiliconFlow、零一万物等
 * - 自托管 vLLM / Ollama（开启 OpenAI 兼容接口）
 *
 * 注意：CORS 由对端决定。建议生产配置反代。
 */

import type { AgentLLMConfig } from './config';

/** 与 OpenAI Chat Completions 一致的「平铺」消息格式 */
export interface LLMChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  /** assistant 角色：流式累计的 tool calls */
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  /** tool 角色必备：对应的 call id */
  tool_call_id?: string;
  /** tool 角色：调用的工具名（OpenAI 端一些实现需要） */
  name?: string;
}

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export type LLMStreamEvent =
  | { kind: 'delta'; text: string }
  | {
      kind: 'tool-call-delta';
      index: number;
      id?: string;
      name?: string;
      argsDelta?: string;
    }
  | { kind: 'finish'; reason: string }
  | { kind: 'error'; message: string };

/** SSE 解析：遵循 `data: {...}\n\n` 格式，支持 `data: [DONE]` */
async function* parseSSE(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const lines = chunk.split('\n').map((l) => l.trim());
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') return;
        if (payload) yield payload;
      }
    }
  }
}

interface RawChoiceDelta {
  content?: string;
  tool_calls?: Array<{
    index?: number;
    id?: string;
    type?: string;
    function?: { name?: string; arguments?: string };
  }>;
}

interface RawStreamChunk {
  choices?: Array<{
    delta?: RawChoiceDelta;
    finish_reason?: string | null;
  }>;
  error?: { message?: string };
}

/**
 * 发起一次流式 chat completion；通过 async generator 推送事件。
 *
 * @param signal 用于取消的 AbortSignal
 */
export async function* streamChat(args: {
  config: AgentLLMConfig;
  messages: LLMChatMessage[];
  tools?: LLMTool[];
  signal?: AbortSignal;
}): AsyncGenerator<LLMStreamEvent> {
  const { config, messages, tools, signal } = args;
  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        stream: true,
        messages,
        ...(tools && tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
        ...(typeof config.temperature === 'number'
          ? { temperature: config.temperature }
          : {}),
      }),
      signal,
    });
  } catch (err) {
    yield {
      kind: 'error',
      message: err instanceof Error ? err.message : '网络错误',
    };
    return;
  }

  if (!res.ok || !res.body) {
    let detail = `HTTP ${res.status}`;
    try {
      const text = await res.text();
      if (text) detail = `${detail}: ${text.slice(0, 240)}`;
    } catch {
      /* ignore */
    }
    yield { kind: 'error', message: detail };
    return;
  }

  for await (const payload of parseSSE(res.body)) {
    let parsed: RawStreamChunk;
    try {
      parsed = JSON.parse(payload) as RawStreamChunk;
    } catch {
      continue;
    }

    if (parsed.error?.message) {
      yield { kind: 'error', message: parsed.error.message };
      continue;
    }

    const choice = parsed.choices?.[0];
    if (!choice) continue;

    const delta = choice.delta;
    if (delta?.content) {
      yield { kind: 'delta', text: delta.content };
    }
    if (delta?.tool_calls && delta.tool_calls.length > 0) {
      for (const tc of delta.tool_calls) {
        yield {
          kind: 'tool-call-delta',
          index: tc.index ?? 0,
          id: tc.id,
          name: tc.function?.name,
          argsDelta: tc.function?.arguments,
        };
      }
    }
    if (choice.finish_reason) {
      yield { kind: 'finish', reason: choice.finish_reason };
    }
  }
}
