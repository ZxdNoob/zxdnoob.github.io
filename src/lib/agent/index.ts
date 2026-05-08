/**
 * Agent 模块统一出口（避免 UI 直接 deep import）。
 */
export * from './types';
export * from './config';
export {
  REGISTERED_TOOL_NAMES,
  executeTool,
  findTool,
  getOpenAITools,
  nextToolCallId,
} from './tools';
export { runAgent } from './runner';
export { streamChat } from './llm-client';
export type { LLMChatMessage } from './llm-client';
export {
  clientFetchPosts,
  clientFetchPostContent,
  clientFetchChangelog,
  clientFetchResume,
  clientFetchPostSearch,
  clientFetchRelevantPassages,
  clearAgentClientCache,
} from './client-fetchers';
export type { PostSearchHit, PostSearchPassage } from './client-fetchers';
