/**
 * 文章数据：全部由 Nest 后端 + 数据库提供，前端仅通过 HTTP 获取。
 *
 * 服务端组件中请使用下列 async 方法；`cache: 'no-store'` 避免把旧数据静态缓存进 HTML。
 */
import { getBackendBaseUrl } from './api';

/** 列表项：无正文，含后端计算的 `readingMinutes` */
export type PostSummary = {
  slug: string;
  title: string;
  /** ISO 8601 日期时间（可含时区），用于展示与 `<time datetime>` */
  date: string;
  description: string;
  /**
   * 系列名：用于前端按系列分组展示。
   * 为空/缺省表示不属于任何系列。
   */
  series?: string;
  tags?: string[];
  draft?: boolean;
  readingMinutes: number;
};

/** 详情：含 Markdown 正文 */
export type Post = PostSummary & {
  content: string;
};

/** 内部通用 GET：404/网络错误返回 null，由上层决定默认空列表或 notFound。 */
async function fetchJson<T>(path: string): Promise<T | null> {
  const base = getBackendBaseUrl();
  try {
    /** 静态导出（GitHub Pages）构建需可缓存的 fetch；本地/Vercel 仍用 no-store */
    const init: RequestInit =
      process.env.STATIC_EXPORT === '1'
        ? { cache: 'force-cache' }
        : { cache: 'no-store' };
    const res = await fetch(`${base}${path}`, init);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** 已发布文章摘要列表（用于首页、文章索引、sitemap） */
export async function fetchAllPostSummaries(): Promise<PostSummary[]> {
  const data = await fetchJson<PostSummary[]>('/api/posts');
  return data ?? [];
}

/** 单篇详情；不存在或未发布返回 `null` */
export async function fetchPostBySlug(slug: string): Promise<Post | null> {
  return fetchJson<Post>(`/api/posts/${encodeURIComponent(slug)}`);
}

/**
 * 与后端 `reading-minutes` 算法一致，供卡片在缺少字段时兜底（一般不需要）。
 */
export function readingMinutesFromMarkdown(content: string): number {
  // 与后端 `backend/src/posts/reading-minutes.ts` 保持一致。
  // 目标：适配中文（无空格）、英文（按词）、以及代码块较多的技术文章。

  const fencedBlocks = content.match(/```[\s\S]*?```/g) ?? [];
  const codeLines = fencedBlocks
    .map(
      (b) =>
        b
          // 去掉围栏行，避免把 ```ts 算成代码行
          .replace(/^```.*$/gm, '')
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean).length,
    )
    .reduce((a, b) => a + b, 0);

  const prose = content
    .replace(/```[\s\S]*?```/g, '\n')
    // 去掉行内 code，避免符号密集时把“可读字数”夸大
    .replace(/`[^`\n]+`/g, ' ')
    // 只保留文本结构，避免 URL/标点造成噪声
    .replace(/\s+/g, ' ')
    .trim();

  const cjkChars =
    prose.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu)
      ?.length ?? 0;
  const latinWords =
    prose.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g)?.length ?? 0;

  // 经验速度（偏保守）：
  // - 中文：约 500 字/分钟（含少量停顿）
  // - 英文：约 220 词/分钟
  // - 代码：约 45 行/分钟（“扫读 + 理解”）
  const proseMinutes = cjkChars / 500 + latinWords / 220;
  const codeMinutes = codeLines / 45;

  // 难度因子：代码占比越高、符号密度越高，理解成本越高。
  const symbolHits = prose.match(/[{}[\]()<>=/*\\|&^%$#@~:+-]/g)?.length ?? 0;
  const proseLen = Math.max(1, prose.length);
  const symbolDensity = symbolHits / proseLen;
  const codeShare = codeMinutes / Math.max(0.0001, proseMinutes + codeMinutes);

  const multiplier =
    1 +
    (codeShare >= 0.55 ? 0.35 : codeShare >= 0.3 ? 0.18 : 0) +
    (symbolDensity >= 0.085 ? 0.12 : symbolDensity >= 0.045 ? 0.06 : 0);

  const total = (proseMinutes + codeMinutes) * multiplier;
  return Math.max(1, Math.round(total));
}

/** 供 `<time datetime>` 使用的规范 ISO 字符串（UTC） */
export function postPublishedAtIso(dateStr: string): string {
  return new Date(dateStr).toISOString();
}

/**
 * 静态导出（GitHub Pages）且构建时拉不到任何文章时，Next 仍要求 `[slug]` 至少有一条预渲染路径。
 * 该 slug 仅用于占位，详情页会渲染提示文案而非真实文章。
 */
export const STATIC_EXPORT_PLACEHOLDER_SLUG =
  '__static-export-placeholder__' as const;

/**
 * 发布时间展示：本地时区下的年月日 + 24 小时制时分秒。
 * `monthStyle`：列表用 `short`，详情页用 `long`。
 */
export function formatPostPublishedAt(
  dateStr: string,
  monthStyle: 'short' | 'long' = 'short',
): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: monthStyle,
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(dateStr));
}
