/**
 * 与前端 `src/lib/posts.ts` 字段对齐，便于 JSON 序列化后直接消费。
 */
export type PostMeta = {
  title: string;
  /** ISO 8601 发布时间（含时分秒） */
  date: string;
  description: string;
  /**
   * 系列名：用于前端按系列分组展示。
   * 为空/缺省表示不属于任何系列。
   */
  series?: string;
  tags?: string[];
  draft?: boolean;
};

/** 列表接口：无正文，含 `readingMinutes` 供卡片展示 */
export type PostSummary = PostMeta & {
  slug: string;
  readingMinutes: number;
};

/** 详情接口：含 Markdown 正文 */
export type PostDetail = PostSummary & {
  content: string;
};

/** 搜索命中：在摘要基础上附带相关性分值与跳转 URL */
export type PostSearchHit = PostSummary & {
  /** BM25 反向得分（越大越相关，已映射为 ≥ 0） */
  score: number;
  /** 站内跳转地址，前端可直接渲染链接 */
  url: string;
};

/** RAG 用：返回正文中最相关的 snippet（含 `<mark>...</mark>` 高亮标签） */
export type PostSearchPassage = {
  slug: string;
  title: string;
  date: string;
  description: string;
  /** 命中段，含 `<mark>` 高亮（前端可保留或剥离） */
  snippet: string;
  url: string;
};
