/**
 * 与前端 `src/lib/changelog.ts` 对齐的 API 载荷。
 */

export type ChangelogKind = 'feature' | 'fix' | 'breaking' | 'docs' | 'perf';

export type ChangelogItemSurface = 'web' | 'api' | 'both';

export type ChangelogItemPayload = {
  kind: ChangelogKind;
  text: string;
  surface?: ChangelogItemSurface;
};

export type ChangelogReleaseDto = {
  id: string;
  /** 发布时间：ISO 8601（含时分秒）或 `YYYY-MM-DD` */
  date: string;
  title?: string;
  webVersion?: string;
  apiVersion?: string;
  items: ChangelogItemPayload[];
};

/** `GET /api/changelog?limit=&offset=` 分页响应（无查询参数时仍返回数组，兼容旧客户端）。 */
export type ChangelogListPageDto = {
  entries: ChangelogReleaseDto[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  /** 当前筛选条件下所有条目涉及的年份（新在前），供年份跳转 */
  years: number[];
  latestWeb?: string;
  latestApi?: string;
};
