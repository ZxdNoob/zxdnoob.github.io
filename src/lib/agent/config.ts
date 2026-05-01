/**
 * Agent 运行时配置（浏览器侧）。
 *
 * 兼容三种来源（按优先级递减）：
 * 1. `NEXT_PUBLIC_AGENT_*` 环境变量（构建期注入）
 * 2. `src/config/public-api.json` 的 `agent` 节点（构建期 JSON）
 * 3. 默认值（仅启发式 Agent，无 LLM）
 *
 * 安全提醒：把 API key 暴露给浏览器是非常危险的——理想姿势是：
 * - **服务端反代**：`NEXT_PUBLIC_AGENT_BASE_URL` 指向你自己控制的反代，反代里再注入真正的 key
 * - 仅当本地或私有部署时，再考虑通过 `NEXT_PUBLIC_AGENT_API_KEY` 直连
 */

import publicApi from '@/config/public-api.json';

export interface AgentLLMConfig {
  /** OpenAI 兼容 BaseURL，例如 `https://api.openai.com/v1` 或 `https://your-proxy.example.com/v1` */
  baseUrl: string;
  /** 模型名，例如 `gpt-4o-mini` / `deepseek-chat` */
  model: string;
  /** 可选：调用方携带的 Bearer Token（仅在你确信暴露安全的场景使用） */
  apiKey?: string;
  /** 可选：覆盖系统提示词 */
  systemPrompt?: string;
  /** 可选：温度 */
  temperature?: number;
}

interface PublicApiAgentBlock {
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  systemPrompt?: string;
  temperature?: number;
}

function readPublicApiAgent(): PublicApiAgentBlock | undefined {
  const node = (publicApi as { agent?: PublicApiAgentBlock }).agent;
  if (!node || typeof node !== 'object') return undefined;
  return node;
}

function trimOrUndefined(v: string | undefined | null): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

/** 解析 LLM 配置；未配置 baseUrl + model 时返回 `null`（启发式 Agent 兜底） */
export function getAgentLLMConfig(): AgentLLMConfig | null {
  const fromEnvBase = trimOrUndefined(process.env.NEXT_PUBLIC_AGENT_BASE_URL);
  const fromEnvModel = trimOrUndefined(process.env.NEXT_PUBLIC_AGENT_MODEL);
  const fromEnvKey = trimOrUndefined(process.env.NEXT_PUBLIC_AGENT_API_KEY);
  const fromEnvSystem = trimOrUndefined(
    process.env.NEXT_PUBLIC_AGENT_SYSTEM_PROMPT,
  );
  const fromEnvTemp = trimOrUndefined(
    process.env.NEXT_PUBLIC_AGENT_TEMPERATURE,
  );

  const fromJson = readPublicApiAgent();

  const baseUrl =
    fromEnvBase ?? trimOrUndefined(fromJson?.baseUrl) ?? undefined;
  const model = fromEnvModel ?? trimOrUndefined(fromJson?.model) ?? undefined;

  if (!baseUrl || !model) return null;

  const apiKey = fromEnvKey ?? trimOrUndefined(fromJson?.apiKey);
  const systemPrompt = fromEnvSystem ?? trimOrUndefined(fromJson?.systemPrompt);
  const temperatureRaw = fromEnvTemp ?? fromJson?.temperature;
  const temperature =
    typeof temperatureRaw === 'number'
      ? temperatureRaw
      : typeof temperatureRaw === 'string' && temperatureRaw.trim()
        ? Number.parseFloat(temperatureRaw)
        : undefined;

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    model,
    apiKey,
    systemPrompt,
    temperature: Number.isFinite(temperature) ? temperature : undefined,
  };
}

export function isAgentLLMConfigured(): boolean {
  return getAgentLLMConfig() !== null;
}

/** 默认系统提示词（中文，强调站内导览的克制风格） */
export const DEFAULT_AGENT_SYSTEM_PROMPT = [
  '你是 ZxdNoob 个人博客的「向导小助手」，名字叫「Noob」。',
  '请用简洁、温和、专业的中文与访客交流。',
  '',
  '你的职责：',
  '- 帮访客快速找到他们想看的内容（文章、简历、版本历史等）',
  '- 在合适的时候主动调用工具：',
  '  * `list_posts` 列出文章',
  '  * `search_posts` 按关键字搜索文章',
  '  * `get_post` 拉取文章正文用于摘要/答疑',
  '  * `pick_random_post` 随机推荐一篇文章',
  '  * `navigate` 跳转到博客内的页面或外链',
  '  * `set_theme` 切换浅色/深色主题',
  '  * `get_changelog` / `get_resume` 查询站点更新或作者简介',
  '  * `copy_text` 复制文本到剪贴板',
  '',
  '风格要求：',
  '- 回答尽量精炼（3-6 句话），避免冗长说教',
  '- 推荐文章时，给出标题与一句话理由，并使用 `navigate` 让用户一键跳转',
  '- 不确定时，主动建议下一步可点的操作',
  '- 不杜撰文章；只引用工具返回的真实数据',
].join('\n');

/** Agent 在 UI 中的显示名 */
export const AGENT_DISPLAY_NAME = 'Noob';
export const AGENT_TAGLINE = '站内向导 · 让你 1 秒找到想看的内容';
