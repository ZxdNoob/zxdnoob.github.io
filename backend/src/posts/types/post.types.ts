/**
 * 与前端 `src/lib/posts.ts` 字段对齐，便于 JSON 序列化后直接消费。
 */
export type PostMeta = {
  title: string;
  /** ISO 8601 发布时间（含时分秒） */
  date: string;
  description: string;
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
