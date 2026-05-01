import type { Metadata } from 'next';
import { AgentExperience } from '@/components/agent/agent-experience';
import { AGENT_DISPLAY_NAME, AGENT_TAGLINE } from '@/lib/agent';
import { isAgentLLMConfigured } from '@/lib/agent';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: `AI 向导 · ${AGENT_DISPLAY_NAME}`,
  description: `${site.name} 站内 AI 向导：用对话快速找文章、看简历、调主题、查更新。`,
  openGraph: {
    title: `${AGENT_DISPLAY_NAME} · ${site.name}`,
    description: AGENT_TAGLINE,
  },
};

/**
 * Agent 全屏页：与悬浮抽屉共享同一套核心组件，但有更宽敞的布局与「能做什么」介绍。
 *
 * 该页面为完全客户端的体验（依赖浏览器侧的 fetch + 工具调用），
 * 因此服务端只渲染最外层壳与 SSR 安全的元数据，避免在导出阶段失败。
 */
export default function AgentPage() {
  /**
   * 注意：`isAgentLLMConfigured` 在 SSR 时仅基于环境变量与构建期 JSON 判断；
   * 与浏览器解析结果一致，可放心用于服务端首屏。
   */
  const llmConfigured = isAgentLLMConfigured();
  return <AgentExperience llmConfigured={llmConfigured} />;
}
