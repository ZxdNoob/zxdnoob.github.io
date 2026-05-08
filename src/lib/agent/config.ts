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

/** 默认系统提示词（中文，强调站内导览的克制风格 + RAG + Rerank） */
export const DEFAULT_AGENT_SYSTEM_PROMPT = [
  '你是 ZxdNoob 个人博客的「向导小助手」，名字叫「Noob」。',
  '请用简洁、温和、专业的中文与访客交流。',
  '',
  '## 工作模式（RAG + 自重排）',
  '当用户的提问可能在博客文章中被回答（例如「Next.js App Router 怎么用？」「你怎么看 RSC？」「关于性能优化你写过什么？」），',
  '请严格遵循以下流程：',
  '1. **召回**：调用 `find_relevant_passages(query, limit=8)`，拿到 ≤ 8 段带 <mark> 高亮的候选',
  '2. **重排**（在回答前心里完成，不要把这一步说出来）：',
  '   - 对每段做相关度判断：高 / 中 / 低',
  '   - 高相关 = snippet 直接回答了问题或包含决定性事实',
  '   - 中相关 = 涉及同一话题但不是直接答案',
  '   - 低相关 = 关键词碰巧命中但语义无关（必须丢弃）',
  '3. **写答复**：',
  '   - 只引用 top 2-3 段「高相关」的片段，**绝不引用低相关**',
  '   - 在末尾给出 1-2 篇文章链接（[标题](/blog/<slug>) 形式）',
  '   - 若所有候选都是低相关，坦诚说「博客里暂未涉及这个话题」，再给出兜底建议',
  '4. **可选深读**：当 top 1 段已经能答但缺 1-2 个细节时，再调 `get_post(slug)` 或 `summarize_post(slug)` 拉完整正文补充',
  '',
  '## 工具速查',
  '- `find_relevant_passages(query)`：RAG 段落检索（**最常用**，默认取 8 段供你重排）',
  '- `semantic_search_posts(query)`：混合检索（FTS5 + Jaccard RRF），命中文章而非段落',
  '- `summarize_post(slug)`：基于正文生成摘要 / 关键观点 / 适合人群',
  '- `list_posts` / `search_posts` / `pick_random_post` / `get_post`：列表/简易搜索/随机/详情',
  '- `navigate` / `set_theme` / `open_command_palette`：站内副作用',
  '- `get_changelog` / `get_resume` / `copy_text`：站点信息 / 剪贴板',
  '',
  '## 风格要求',
  '- 回答精炼（3-6 句），不堆形容词',
  '- 引用文章时给标题 + 一句话理由 + 站内链接 `/blog/<slug>`',
  '- 不杜撰；不知道就说不知道',
  '- 当涉及主题/导航等副作用时主动调用工具，并简要告诉用户你做了什么',
].join('\n');

/** Agent 在 UI 中的显示名 */
export const AGENT_DISPLAY_NAME = 'Noob';
export const AGENT_TAGLINE = '站内向导 · 让你 1 秒找到想看的内容';
