/**
 * Agent 工具集合：所有副作用都在这里收口。
 *
 * 每个工具：
 * - 拥有 OpenAI `tools[]` 兼容的 JSON schema 描述
 * - `execute(args, ctx)` 在浏览器侧执行，并返回结构化结果 + 中文摘要
 *
 * 设计原则：
 * - 工具尽量「幂等可观察」：调用工具不要悄悄改变路由或主题之外的全局状态
 * - 输出 `summary` 必须是一句中文，可直接拼接进 LLM/UI
 * - 失败用 `ok: false`，而不是抛错（让 runner 一致处理）
 */

import { parseNavigateHref } from '@/lib/agent/navigate-target';
import { formatChangelogReleaseAt } from '@/lib/changelog';
import { formatPostPublishedAt } from '@/lib/posts';
import type {
  AgentTool,
  AgentToolContext,
  AgentToolExecutor,
  AgentToolResult,
} from './types';

function ok(
  callId: string,
  name: string,
  summary: string,
  data?: unknown,
): AgentToolResult {
  return { callId, name, summary, data, ok: true };
}

function fail(
  callId: string,
  name: string,
  summary: string,
  data?: unknown,
): AgentToolResult {
  return { callId, name, summary, data, ok: false };
}

function getStr(
  args: Record<string, unknown>,
  key: string,
  fallback = '',
): string {
  const v = args[key];
  return typeof v === 'string' ? v : fallback;
}

function getNum(
  args: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const v = args[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/** 让 LLM/启发式 Agent 可以共用的工具调用 id 生成器 */
let toolCallSeq = 0;
export function nextToolCallId(): string {
  toolCallSeq += 1;
  return `call_${Date.now().toString(36)}_${toolCallSeq}`;
}

/** 简单的中文友好相似度：包含命中权重 + 关键字逐字符评分 */
function scorePostMatch(
  haystack: string,
  needle: string,
): { hit: boolean; score: number } {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase().trim();
  if (!n) return { hit: true, score: 0 };
  if (h.includes(n)) return { hit: true, score: 100 + n.length };
  let score = 0;
  let hit = false;
  for (const ch of n) {
    if (!ch.trim()) continue;
    if (h.includes(ch)) {
      score += 1;
      hit = true;
    }
  }
  return { hit, score };
}

const TOOLS: AgentTool[] = [
  {
    definition: {
      name: 'list_posts',
      description:
        '列出博客已发布的文章摘要，可指定返回条数。用于「最新文章」「最近写了什么」等场景。',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: '返回条数上限，默认 5，最多 20',
          },
        },
      },
    },
    execute: createListPosts(),
  },
  {
    definition: {
      name: 'search_posts',
      description:
        '按关键字（中文/英文均可）模糊搜索文章。返回匹配度最高的若干条。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键字' },
          limit: { type: 'number', description: '返回条数上限，默认 5' },
        },
        required: ['query'],
      },
    },
    execute: createSearchPosts(),
  },
  {
    definition: {
      name: 'get_post',
      description:
        '获取一篇文章的完整 Markdown 正文，用于摘要、答疑或引用片段。',
      parameters: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: '文章 slug，例如 nextjs-app-router',
          },
        },
        required: ['slug'],
      },
    },
    execute: createGetPost(),
  },
  {
    definition: {
      name: 'pick_random_post',
      description: '从已发布文章中随机抽取一篇，常用于「随便看看」。',
      parameters: { type: 'object', properties: {} },
    },
    execute: createPickRandomPost(),
  },
  {
    definition: {
      name: 'navigate',
      description:
        '跳转到站内页面（如 `/`、`/blog`、`/blog/<slug>`、`/resume`、`/changelog`、`/agent`）或外部链接（http(s)://）。外链会在新标签页打开。',
      parameters: {
        type: 'object',
        properties: {
          href: { type: 'string', description: '相对路径或绝对 URL' },
        },
        required: ['href'],
      },
    },
    execute: createNavigate(),
  },
  {
    definition: {
      name: 'set_theme',
      description: '切换站点主题：light/dark/system。',
      parameters: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['light', 'dark', 'system'],
            description: '主题模式',
          },
        },
        required: ['mode'],
      },
    },
    execute: createSetTheme(),
  },
  {
    definition: {
      name: 'open_command_palette',
      description: '打开 ⌘K 命令面板（站内快速跳转）。',
      parameters: { type: 'object', properties: {} },
    },
    execute: createOpenCommandPalette(),
  },
  {
    definition: {
      name: 'get_changelog',
      description: '返回最新 N 条版本历史/更新记录。',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: '默认 3，最多 10' },
        },
      },
    },
    execute: createGetChangelog(),
  },
  {
    definition: {
      name: 'get_resume',
      description: '返回作者简介与简历摘要（标题、所在地、技能组、亮点）。',
      parameters: { type: 'object', properties: {} },
    },
    execute: createGetResume(),
  },
  {
    definition: {
      name: 'copy_text',
      description: '把一段文本复制到访客的剪贴板（用户主动确认后再调用）。',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '要复制的文本' },
        },
        required: ['text'],
      },
    },
    execute: createCopyText(),
  },
];

function createListPosts(): AgentToolExecutor {
  return async (args, ctx) => {
    const callId = getStr(args, '_callId') || nextToolCallId();
    const limit = Math.min(
      20,
      Math.max(1, Math.round(getNum(args, 'limit', 5))),
    );
    const posts = await ctx.fetchPosts();
    if (posts.length === 0) {
      return fail(
        callId,
        'list_posts',
        '暂未拉到文章数据，可能是 API 未启动。',
        {
          posts: [],
        },
      );
    }
    const top = posts.slice(0, limit).map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      date: p.date,
      readingMinutes: p.readingMinutes,
      series: p.series ?? null,
      tags: p.tags ?? [],
      url: `/blog/${p.slug}`,
      publishedAtLabel: formatPostPublishedAt(p.date, 'short'),
    }));
    return ok(callId, 'list_posts', `已取回最近 ${top.length} 篇文章。`, {
      posts: top,
    });
  };
}

function createSearchPosts(): AgentToolExecutor {
  return async (args, ctx) => {
    const callId = getStr(args, '_callId') || nextToolCallId();
    const query = getStr(args, 'query').trim();
    const limit = Math.min(
      10,
      Math.max(1, Math.round(getNum(args, 'limit', 5))),
    );
    if (!query) {
      return fail(callId, 'search_posts', '没有提供搜索关键字。');
    }
    const posts = await ctx.fetchPosts();
    if (posts.length === 0) {
      return fail(callId, 'search_posts', '暂未拉到文章数据，无法搜索。', {
        posts: [],
      });
    }
    const ranked = posts
      .map((p) => {
        const haystack = [
          p.title,
          p.description,
          p.series ?? '',
          (p.tags ?? []).join(' '),
        ].join('\n');
        return { post: p, ...scorePostMatch(haystack, query) };
      })
      .filter((r) => r.hit)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    if (ranked.length === 0) {
      return ok(callId, 'search_posts', `没有找到与「${query}」相关的文章。`, {
        posts: [],
        query,
      });
    }
    return ok(
      callId,
      'search_posts',
      `找到 ${ranked.length} 篇与「${query}」相关的文章。`,
      {
        query,
        posts: ranked.map(({ post }) => ({
          slug: post.slug,
          title: post.title,
          description: post.description,
          url: `/blog/${post.slug}`,
          date: post.date,
          publishedAtLabel: formatPostPublishedAt(post.date, 'short'),
          readingMinutes: post.readingMinutes,
          series: post.series ?? null,
          tags: post.tags ?? [],
        })),
      },
    );
  };
}

function createGetPost(): AgentToolExecutor {
  return async (args, ctx) => {
    const callId = getStr(args, '_callId') || nextToolCallId();
    const slug = getStr(args, 'slug').trim();
    if (!slug) return fail(callId, 'get_post', '没有提供 slug。');
    const md = await ctx.fetchPostContent(slug);
    if (!md) {
      return fail(
        callId,
        'get_post',
        `没有找到 slug 为「${slug}」的文章，可能是拼写不对或 API 不可达。`,
      );
    }
    /**
     * 给 LLM 截断到合理长度，避免一次塞进太多 token。
     * 仍保留前 6000 字符（含代码块），足以覆盖大多数博客正文摘要场景。
     */
    const truncated =
      md.length > 6000 ? `${md.slice(0, 6000)}\n\n…（已截断）` : md;
    return ok(callId, 'get_post', `已加载文章正文（${md.length} 字符）。`, {
      slug,
      content: truncated,
      contentLength: md.length,
      url: `/blog/${slug}`,
    });
  };
}

function createPickRandomPost(): AgentToolExecutor {
  return async (args, ctx) => {
    const callId = getStr(args, '_callId') || nextToolCallId();
    const posts = await ctx.fetchPosts();
    if (posts.length === 0) {
      return fail(callId, 'pick_random_post', '暂未拉到文章数据。');
    }
    const pick = posts[Math.floor(Math.random() * posts.length)];
    return ok(callId, 'pick_random_post', `随机抽到了《${pick.title}》。`, {
      slug: pick.slug,
      title: pick.title,
      description: pick.description,
      url: `/blog/${pick.slug}`,
    });
  };
}

function createNavigate(): AgentToolExecutor {
  return async (args, ctx) => {
    const callId = getStr(args, '_callId') || nextToolCallId();
    const raw = getStr(args, 'href').trim();
    if (!raw) return fail(callId, 'navigate', '没有提供跳转目标。');
    const target = parseNavigateHref(raw);
    if (!target) {
      return fail(callId, 'navigate', '无法解析跳转地址。');
    }
    if (target.kind === 'external') {
      ctx.navigate(target.url);
      return ok(callId, 'navigate', `已在新标签页打开 ${target.url}`, {
        href: target.url,
        external: true,
      });
    }
    ctx.navigate(target.path);
    return ok(callId, 'navigate', `已跳转到 ${target.path}`, {
      href: target.path,
      external: false,
    });
  };
}

function createSetTheme(): AgentToolExecutor {
  return async (args, ctx) => {
    const callId = getStr(args, '_callId') || nextToolCallId();
    const raw = getStr(args, 'mode').toLowerCase();
    const mode: 'light' | 'dark' | 'system' =
      raw === 'light' ? 'light' : raw === 'system' ? 'system' : 'dark';
    ctx.setTheme(mode);
    return ok(
      callId,
      'set_theme',
      `已切换到 ${mode === 'dark' ? '深色' : mode === 'light' ? '浅色' : '跟随系统'}主题。`,
      { mode },
    );
  };
}

function createOpenCommandPalette(): AgentToolExecutor {
  return async (args, ctx) => {
    const callId = getStr(args, '_callId') || nextToolCallId();
    ctx.openCommandPalette();
    return ok(callId, 'open_command_palette', '已为你打开 ⌘K 命令面板。');
  };
}

function createGetChangelog(): AgentToolExecutor {
  return async (args, ctx) => {
    const callId = getStr(args, '_callId') || nextToolCallId();
    const limit = Math.min(
      10,
      Math.max(1, Math.round(getNum(args, 'limit', 3))),
    );
    const entries = await ctx.fetchChangelog();
    if (entries.length === 0) {
      return fail(callId, 'get_changelog', '暂未拉到版本历史。');
    }
    const top = entries.slice(0, limit).map((e) => ({
      date: e.date,
      dateLabel: formatChangelogReleaseAt(e.date),
      title: e.title ?? '',
      webVersion: e.webVersion ?? '',
      apiVersion: e.apiVersion ?? '',
      items: e.items.map((i) => ({ kind: i.kind, text: i.text })),
    }));
    return ok(
      callId,
      'get_changelog',
      `已取回最近 ${top.length} 条更新记录。`,
      { entries: top, url: '/changelog' },
    );
  };
}

function createGetResume(): AgentToolExecutor {
  return async (args, ctx) => {
    const callId = getStr(args, '_callId') || nextToolCallId();
    const r = await ctx.fetchResume();
    if (!r) {
      return fail(callId, 'get_resume', '暂未拉到简历数据。');
    }
    return ok(callId, 'get_resume', `已取回 ${r.name} 的简历摘要。`, {
      url: '/resume',
      name: r.name,
      title: r.title,
      tagline: r.tagline,
      location: r.location,
      email: r.email,
      phone: r.phone ?? null,
      yearsExperience: r.yearsExperience,
      highlights: r.highlights,
      skillGroups: r.skillGroups.map((g) => ({
        name: g.name,
        items: g.items,
      })),
    });
  };
}

function createCopyText(): AgentToolExecutor {
  return async (args, ctx) => {
    const callId = getStr(args, '_callId') || nextToolCallId();
    const text = getStr(args, 'text');
    if (!text) return fail(callId, 'copy_text', '没有要复制的文本。');
    const ok2 = await ctx.copyToClipboard(text);
    return ok2
      ? ok(callId, 'copy_text', '已复制到剪贴板。', { length: text.length })
      : fail(callId, 'copy_text', '剪贴板不可用，请手动复制。', { text });
  };
}

/** 暴露给 LLM 的 OpenAI 兼容 tools 列表 */
export function getOpenAITools() {
  return TOOLS.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.definition.name,
      description: t.definition.description,
      parameters: {
        type: 'object',
        properties: t.definition.parameters.properties,
        ...(t.definition.parameters.required?.length
          ? { required: t.definition.parameters.required }
          : {}),
      },
    },
  }));
}

/** 通过名字查找工具实现 */
export function findTool(name: string): AgentTool | undefined {
  return TOOLS.find((t) => t.definition.name === name);
}

/** 调用工具（统一封装异常处理） */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AgentToolContext,
  callId: string,
): Promise<AgentToolResult> {
  const tool = findTool(name);
  if (!tool) {
    return fail(callId, name, `未知工具：${name}`);
  }
  try {
    return await tool.execute({ ...args, _callId: callId }, ctx);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fail(callId, name, `工具执行失败：${msg}`);
  }
}

/** 工具列表（仅供 UI 调试/展示） */
export const REGISTERED_TOOL_NAMES = TOOLS.map((t) => t.definition.name);
