/**
 * Agent runner：把「用户输入 + 历史消息 + 工具」组装成一个流式输出循环。
 *
 * 两种模式：
 * - **LLM 模式**：调用 OpenAI 兼容流式接口，按 `tool_calls` 触发本地工具，并把工具结果回写给 LLM，循环直到 `finish_reason !== 'tool_calls'`
 * - **启发式模式**：调用 `runHeuristicAgent`，由本地规则决定要执行哪些工具
 *
 * runner 不直接更新 React 状态——它通过回调 push 事件，由 UI Hook 维护视图状态。
 */

import { DEFAULT_AGENT_SYSTEM_PROMPT, getAgentLLMConfig } from './config';
import { runHeuristicAgent } from './heuristic';
import {
  streamChat,
  type LLMChatMessage,
  type LLMStreamEvent,
} from './llm-client';
import { executeTool, getOpenAITools, nextToolCallId } from './tools';
import type {
  AgentEvent,
  AgentMessage,
  AgentToolCall,
  AgentToolContext,
  AgentToolResult,
} from './types';

/** runner 输入 */
export interface RunAgentArgs {
  /** 已有会话历史（不含本次 user 输入） */
  history: AgentMessage[];
  /** 本次用户输入文本 */
  input: string;
  ctx: AgentToolContext;
  /** UI 推送 */
  push: (event: AgentEvent) => void;
  /** 本次 assistant 消息的内部 id（由 UI 提前生成） */
  assistantMessageId: string;
  /** 取消信号 */
  signal?: AbortSignal;
}

interface PartialToolCall {
  id?: string;
  name?: string;
  args: string;
}

/** 把内部 AgentMessage[] 翻译成 LLM 接口要求的 messages */
function toLLMMessages(
  history: AgentMessage[],
  input: string,
  systemPrompt: string,
): LLMChatMessage[] {
  const out: LLMChatMessage[] = [{ role: 'system', content: systemPrompt }];

  for (const m of history) {
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.content });
    } else if (m.role === 'assistant') {
      const toolCalls =
        m.steps && m.steps.length > 0
          ? m.steps.map((s) => ({
              id: s.call.id,
              type: 'function' as const,
              function: {
                name: s.call.name,
                arguments: JSON.stringify(s.call.args ?? {}),
              },
            }))
          : undefined;
      out.push({
        role: 'assistant',
        content: m.content || (toolCalls ? null : ''),
        ...(toolCalls ? { tool_calls: toolCalls } : {}),
      });
      if (m.steps) {
        for (const s of m.steps) {
          if (!s.result) continue;
          out.push({
            role: 'tool',
            tool_call_id: s.call.id,
            name: s.call.name,
            content: JSON.stringify({
              ok: s.result.ok,
              summary: s.result.summary,
              data: s.result.data ?? null,
            }),
          });
        }
      }
    }
  }

  out.push({ role: 'user', content: input });
  return out;
}

/** 解析本轮 LLM 流式事件，累积 text 与 tool_calls，并立即向 UI 推送 delta */
async function consumeOneRound(args: {
  events: AsyncGenerator<LLMStreamEvent>;
  push: (e: AgentEvent) => void;
  messageId: string;
}): Promise<{
  text: string;
  toolCalls: AgentToolCall[];
  finishReason: string | null;
  errorMessage: string | null;
}> {
  const { events, push, messageId } = args;
  let text = '';
  const partials = new Map<number, PartialToolCall>();
  let finishReason: string | null = null;
  let errorMessage: string | null = null;

  for await (const ev of events) {
    if (ev.kind === 'delta') {
      text += ev.text;
      push({ kind: 'text-delta', messageId, text: ev.text });
    } else if (ev.kind === 'tool-call-delta') {
      const cur = partials.get(ev.index) ?? { args: '' };
      if (ev.id) cur.id = ev.id;
      if (ev.name) cur.name = ev.name;
      if (ev.argsDelta) cur.args += ev.argsDelta;
      partials.set(ev.index, cur);
    } else if (ev.kind === 'finish') {
      finishReason = ev.reason;
    } else if (ev.kind === 'error') {
      errorMessage = ev.message;
    }
  }

  const toolCalls: AgentToolCall[] = [];
  for (const p of [...partials.values()]) {
    if (!p.name) continue;
    let parsed: Record<string, unknown> = {};
    if (p.args.trim()) {
      try {
        const v = JSON.parse(p.args);
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          parsed = v as Record<string, unknown>;
        }
      } catch {
        /** 一些模型会输出非严格 JSON；放进 raw 字段，工具自行兜底 */
        parsed = { raw: p.args };
      }
    }
    toolCalls.push({
      id: p.id ?? nextToolCallId(),
      name: p.name,
      args: parsed,
    });
  }

  return { text, toolCalls, finishReason, errorMessage };
}

async function runLLMAgent(args: RunAgentArgs): Promise<void> {
  const { history, input, ctx, push, assistantMessageId, signal } = args;
  const config = getAgentLLMConfig();
  if (!config) {
    /** 理论上调用方已判断；这里仍兜底 */
    return runHeuristicAgent({
      input,
      ctx,
      messageId: assistantMessageId,
      push,
    });
  }

  const systemPrompt = config.systemPrompt ?? DEFAULT_AGENT_SYSTEM_PROMPT;
  const messages = toLLMMessages(history, input, systemPrompt);
  const tools = getOpenAITools();

  push({ kind: 'message-start', messageId: assistantMessageId });

  /**
   * 循环：每轮请求 LLM，若返回 tool_calls 则执行后再追加 messages 重新请求；
   * 设上限避免死循环。
   */
  const MAX_ROUNDS = 4;
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const events = streamChat({ config, messages, tools, signal });
    const { text, toolCalls, finishReason, errorMessage } =
      await consumeOneRound({ events, push, messageId: assistantMessageId });

    if (errorMessage) {
      const fallback = `\n\n（LLM 调用失败：${errorMessage}）`;
      push({
        kind: 'text-delta',
        messageId: assistantMessageId,
        text: fallback,
      });
      break;
    }

    /** 把本轮 assistant 消息追加进 messages（包含 tool_calls） */
    if (toolCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: text || null,
        tool_calls: toolCalls.map((c) => ({
          id: c.id,
          type: 'function' as const,
          function: { name: c.name, arguments: JSON.stringify(c.args ?? {}) },
        })),
      });

      const results: AgentToolResult[] = [];
      for (const call of toolCalls) {
        push({ kind: 'tool-start', messageId: assistantMessageId, call });
        const result = await executeTool(call.name, call.args, ctx, call.id);
        push({ kind: 'tool-end', messageId: assistantMessageId, result });
        results.push(result);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: call.name,
          content: JSON.stringify({
            ok: result.ok,
            summary: result.summary,
            data: result.data ?? null,
          }),
        });
      }
      /** 继续下一轮：让 LLM 基于工具结果产生最终回答 */
      continue;
    }

    /** 没有更多 tool_calls：本轮回答即终态 */
    if (finishReason && finishReason !== 'tool_calls') {
      break;
    }

    /** 没有 tool_calls 且没有 finishReason 也终止，避免无限循环 */
    break;
  }

  push({ kind: 'message-end', messageId: assistantMessageId });
}

/**
 * 顶层入口：根据是否配置 LLM 自动选择运行模式。
 */
export async function runAgent(args: RunAgentArgs): Promise<void> {
  const config = getAgentLLMConfig();
  if (config) {
    return runLLMAgent(args);
  }
  return runHeuristicAgent({
    input: args.input,
    ctx: args.ctx,
    messageId: args.assistantMessageId,
    push: args.push,
  });
}
