/**
 * 启发式 Agent（无 LLM 兜底）。
 *
 * 当未配置 `NEXT_PUBLIC_AGENT_*` 时使用。它无法做开放式问答，
 * 但能识别一组高频意图，调用对应工具，并给出友好的中文回复。
 *
 * 设计目标：
 * - 失败也要友好：不能匹配时给出几条「我能做什么」提示
 * - 不阻塞 UI：返回 `AgentEvent` 数组让 runner 模拟流式播放
 */

import type {
  AgentEvent,
  AgentToolCall,
  AgentToolContext,
  AgentToolResult,
} from './types';
import { executeTool, nextToolCallId } from './tools';

interface IntentPlan {
  /** 一段聊天回复（未流式拼接前的整段文本） */
  text: string;
  /** 要顺序执行的工具调用 */
  calls: AgentToolCall[];
  /** 若为 true：在拿到推荐结果后自动跳转到文章详情 */
  autoNavigateToRecommendation?: boolean;
}

interface HeuristicRunArgs {
  input: string;
  ctx: AgentToolContext;
  messageId: string;
  push: (e: AgentEvent) => void;
}

const THEME_KEYWORDS = {
  dark: ['深色', '暗色', '黑色', '夜间', 'dark'],
  light: ['浅色', '亮色', '白色', '白天', 'light'],
  system: ['跟随系统', '自动', 'system', 'auto'],
};

function includesAny(text: string, keys: string[]): boolean {
  const t = text.toLowerCase();
  return keys.some((k) => t.includes(k.toLowerCase()));
}

function makeCall(name: string, args: Record<string, unknown>): AgentToolCall {
  return { id: nextToolCallId(), name, args };
}

function planFromInput(input: string): IntentPlan {
  const raw = input.trim();
  const text = raw.toLowerCase();

  /** 1) 主题切换 */
  if (includesAny(text, ['切换主题', '换主题', '主题', 'theme'])) {
    if (includesAny(text, THEME_KEYWORDS.dark)) {
      return {
        text: '好的，已为你切到深色主题。',
        calls: [makeCall('set_theme', { mode: 'dark' })],
      };
    }
    if (includesAny(text, THEME_KEYWORDS.light)) {
      return {
        text: '已切到浅色主题。',
        calls: [makeCall('set_theme', { mode: 'light' })],
      };
    }
    if (includesAny(text, THEME_KEYWORDS.system)) {
      return {
        text: '已设为跟随系统主题。',
        calls: [makeCall('set_theme', { mode: 'system' })],
      };
    }
  }
  if (includesAny(text, THEME_KEYWORDS.dark) && raw.length <= 12) {
    return {
      text: '已为你切到深色主题。',
      calls: [makeCall('set_theme', { mode: 'dark' })],
    };
  }
  if (includesAny(text, THEME_KEYWORDS.light) && raw.length <= 12) {
    return {
      text: '已为你切到浅色主题。',
      calls: [makeCall('set_theme', { mode: 'light' })],
    };
  }

  /** 2) 命令面板 */
  if (
    includesAny(text, ['命令面板', 'command palette', '⌘k', 'cmd+k', '搜索框'])
  ) {
    return {
      text: '帮你打开 ⌘K 命令面板，开始导航吧。',
      calls: [makeCall('open_command_palette', {})],
    };
  }

  /** 3) 简历 */
  if (
    includesAny(text, ['简历', 'resume', 'cv', '作者', '关于你', '关于作者'])
  ) {
    return {
      text: '这是作者的简历摘要，需要的话我可以打开完整页面。',
      calls: [
        makeCall('get_resume', {}),
        makeCall('navigate', { href: '/resume' }),
      ],
    };
  }

  /** 4) 版本历史 */
  if (
    includesAny(text, [
      '版本',
      '更新',
      '更新日志',
      '更新记录',
      'changelog',
      '迭代',
    ])
  ) {
    return {
      text: '看看最近的更新吧，我同时把你跳到版本历史页。',
      calls: [
        makeCall('get_changelog', { limit: 3 }),
        makeCall('navigate', { href: '/changelog' }),
      ],
    };
  }

  /** 5) 随机 / 推荐 */
  if (
    includesAny(text, [
      '随便',
      '随机',
      '推荐一篇',
      '推荐文章',
      '看点啥',
      '看什么',
      'random',
      'recommend',
    ])
  ) {
    const wantsJump = includesAny(text, [
      '跳转',
      '直接跳转',
      '直接打开',
      '打开',
      '进入',
      '带我去',
      '去看',
    ]);
    return {
      text: wantsJump
        ? '从博客里抽一篇，并直接带你跳转过去。'
        : '从博客里抽一篇带你看看。',
      calls: [makeCall('pick_random_post', {})],
      autoNavigateToRecommendation: wantsJump,
    };
  }

  /** 6) 文章列表 */
  if (
    includesAny(text, [
      '最新',
      '最近',
      '新文章',
      '文章列表',
      '看文章',
      '所有文章',
      '全部文章',
      'blog',
      'posts',
    ])
  ) {
    return {
      text: '这是最近的几篇文章，点击就能跳过去阅读。',
      calls: [
        makeCall('list_posts', { limit: 5 }),
        makeCall('navigate', { href: '/blog' }),
      ],
    };
  }

  /** 7) 回到首页 */
  if (
    /^(回家|首页|主页|home|回主页|回首页)\s*$/i.test(raw) ||
    includesAny(text, ['返回首页', '回到首页', 'go home'])
  ) {
    return {
      text: '好的，带你回到首页。',
      calls: [makeCall('navigate', { href: '/' })],
    };
  }

  /** 8) 通用搜索：从「搜...」「找...」「关于 ... 的文章」中提取关键字 */
  const searchMatch =
    raw.match(/(?:搜|找|搜索|查|查找)\s*[「『"]?(.+?)[」』"]?$/) ||
    raw.match(/(?:关于|有关)(.+?)(?:的文章|的内容|的笔记)?$/);
  if (searchMatch && searchMatch[1]) {
    const q = searchMatch[1].trim().replace(/[?？!！。.\s]+$/g, '');
    if (q && q.length <= 40) {
      return {
        text: `好，我来搜一下「${q}」。`,
        calls: [makeCall('search_posts', { query: q, limit: 5 })],
      };
    }
  }

  /** 9) 跳转 GitHub */
  if (includesAny(text, ['github', '源代码', '源码', '仓库'])) {
    return {
      text: '帮你打开仓库地址。',
      calls: [
        makeCall('navigate', {
          href: 'https://github.com/ZxdNoob/zxdnoob.github.io',
        }),
      ],
    };
  }

  /** 10) 兜底：如果用户问句较长，按全文做一次搜索 */
  if (raw.length >= 2 && raw.length <= 40) {
    return {
      text: `还没接入 LLM，先按关键字给你搜一下「${raw}」。如需对话能力，可在部署时配置 NEXT_PUBLIC_AGENT_BASE_URL / NEXT_PUBLIC_AGENT_MODEL。`,
      calls: [makeCall('search_posts', { query: raw, limit: 5 })],
    };
  }

  /** 11) 空兜底 */
  return {
    text: [
      '我可以帮你：',
      '• 列出最新文章 / 搜索某个关键字',
      '• 随机推荐一篇阅读',
      '• 切换浅色或深色主题',
      '• 打开 ⌘K 命令面板，或跳到「简历」「版本历史」',
      '',
      '如需对话式问答，请配置 NEXT_PUBLIC_AGENT_BASE_URL / NEXT_PUBLIC_AGENT_MODEL（OpenAI 兼容）。',
    ].join('\n'),
    calls: [],
  };
}

function summarizeToolResult(result: AgentToolResult): string | null {
  if (!result.ok) return result.summary;
  const data = result.data as
    | {
        posts?: Array<{ title: string; url: string; description?: string }>;
        entries?: Array<{ title?: string; dateLabel?: string; date?: string }>;
        title?: string;
        url?: string;
        name?: string;
        tagline?: string;
      }
    | undefined;

  if (!data) return null;

  if (Array.isArray(data.posts) && data.posts.length > 0) {
    const lines = data.posts.slice(0, 5).map((p, i) => {
      const desc = p.description ? ` — ${p.description}` : '';
      return `${i + 1}. **[${p.title}](${p.url})**${desc}`;
    });
    return lines.join('\n');
  }

  if (Array.isArray(data.entries) && data.entries.length > 0) {
    const lines = data.entries.slice(0, 5).map((e) => {
      const label = e.dateLabel ?? e.date ?? '';
      const title = e.title ? `：${e.title}` : '';
      return `• ${label}${title}`;
    });
    return lines.join('\n');
  }

  if (result.name === 'pick_random_post' && data.title && data.url) {
    return `我推荐：**[${data.title}](${data.url})**`;
  }

  if (result.name === 'get_resume' && data.name) {
    return `**${data.name}** · ${data.tagline ?? ''}`;
  }

  return null;
}

/**
 * 模拟流式输出：把整段文本切成小段 push，让 UI 看起来像在打字。
 */
async function streamText(
  text: string,
  push: (e: AgentEvent) => void,
  messageId: string,
) {
  /** 中文按字符切，英文按 ~4 字符切 */
  const chunks: string[] = [];
  let buf = '';
  for (const ch of text) {
    buf += ch;
    if (/[\u4e00-\u9fa5]/.test(ch) || buf.length >= 4 || ch === '\n') {
      chunks.push(buf);
      buf = '';
    }
  }
  if (buf) chunks.push(buf);

  for (const c of chunks) {
    push({ kind: 'text-delta', messageId, text: c });
    /** 12ms ≈ 中文阅读速度，又不会显得卡顿 */
    await new Promise((r) => setTimeout(r, 12));
  }
}

export async function runHeuristicAgent({
  input,
  ctx,
  messageId,
  push,
}: HeuristicRunArgs): Promise<void> {
  const plan = planFromInput(input);

  push({ kind: 'message-start', messageId });
  await streamText(plan.text, push, messageId);

  for (const call of plan.calls) {
    push({ kind: 'tool-start', messageId, call });
    const result = await executeTool(call.name, call.args, ctx, call.id);
    push({ kind: 'tool-end', messageId, result });

    const extra = summarizeToolResult(result);
    if (extra) {
      await streamText(`\n\n${extra}`, push, messageId);
    } else if (!result.ok) {
      await streamText(`\n\n（${result.summary}）`, push, messageId);
    }

    /**
     * 用户明确要求「推荐并直接跳转」时：在 pick_random_post 成功后，自动调用 navigate。
     * 这样即使在无 LLM 的启发式模式，也能实现“推荐→跳转”的丝滑体验。
     */
    if (
      plan.autoNavigateToRecommendation &&
      call.name === 'pick_random_post' &&
      result.ok
    ) {
      const url =
        typeof (result.data as { url?: unknown } | undefined)?.url === 'string'
          ? ((result.data as { url: string }).url as string)
          : null;
      if (url) {
        const navCall = makeCall('navigate', { href: url });
        push({ kind: 'tool-start', messageId, call: navCall });
        const navResult = await executeTool(
          navCall.name,
          navCall.args,
          ctx,
          navCall.id,
        );
        push({ kind: 'tool-end', messageId, result: navResult });
      }
    }
  }

  push({ kind: 'message-end', messageId });
}
