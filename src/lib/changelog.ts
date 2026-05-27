/**
 * 版本历史：类型与纯函数；列表由 `fetchChangelogPage` / `fetchChangelogEntries` 从 Nest API 拉取。
 */

import { getBackendBaseUrl, getPublicApiBaseUrl } from './api';

/** 版本历史页首屏与「加载更多」每批条数 */
export const CHANGELOG_PAGE_SIZE = 8;

export type ChangelogKind = 'feature' | 'fix' | 'breaking' | 'docs' | 'perf';

export type ChangelogItemSurface = 'web' | 'api' | 'both';

export type ChangelogItem = {
  kind: ChangelogKind;
  text: string;
  surface?: ChangelogItemSurface;
};

/** 与 `GET /api/changelog` 单行响应一致 */
export type ChangelogEntry = {
  /** 数据库主键，用于稳定 React key */
  id?: string;
  /** 发布时间：`YYYY-MM-DD` 或含本地/偏移的 ISO 8601（含时分秒） */
  date: string;
  title?: string;
  webVersion?: string;
  apiVersion?: string;
  items: ChangelogItem[];
};

export type ChangelogYearGroup = {
  year: number;
  entries: ChangelogEntry[];
};

export type ChangelogScopeFilter = 'all' | 'web' | 'api';
export type ChangelogKindFilter = 'all' | ChangelogKind;

export type ChangelogPageQuery = {
  limit?: number;
  offset?: number;
  scope?: ChangelogScopeFilter;
  kind?: ChangelogKindFilter;
};

/** `GET /api/changelog?limit=&offset=` 分页响应 */
export type ChangelogPageResult = {
  entries: ChangelogEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  years: number[];
  latestWeb?: string;
  latestApi?: string;
};

type ChangelogApiRow = {
  id: string;
  date: string;
  title?: string;
  webVersion?: string;
  apiVersion?: string;
  items: ChangelogItem[];
};

function mapChangelogRow(row: ChangelogApiRow): ChangelogEntry {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    webVersion: row.webVersion,
    apiVersion: row.apiVersion,
    items: Array.isArray(row.items) ? row.items : [],
  };
}

function changelogFetchInit(): RequestInit {
  return process.env.STATIC_EXPORT === '1'
    ? { cache: 'force-cache' }
    : { cache: 'no-store' };
}

function buildChangelogPageUrl(
  base: string,
  query: ChangelogPageQuery,
): string {
  const params = new URLSearchParams();
  params.set('limit', String(query.limit ?? CHANGELOG_PAGE_SIZE));
  params.set('offset', String(query.offset ?? 0));
  if (query.scope && query.scope !== 'all') {
    params.set('scope', query.scope);
  }
  if (query.kind && query.kind !== 'all') {
    params.set('kind', query.kind);
  }
  return `${base}/api/changelog?${params.toString()}`;
}

function parseChangelogPageBody(data: unknown): ChangelogPageResult | null {
  if (data == null || typeof data !== 'object') return null;
  const body = data as {
    entries?: ChangelogApiRow[];
    total?: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    years?: number[];
    latestWeb?: string;
    latestApi?: string;
  };
  if (!Array.isArray(body.entries)) return null;
  return {
    entries: body.entries.map(mapChangelogRow),
    total: typeof body.total === 'number' ? body.total : body.entries.length,
    limit: typeof body.limit === 'number' ? body.limit : CHANGELOG_PAGE_SIZE,
    offset: typeof body.offset === 'number' ? body.offset : 0,
    hasMore: Boolean(body.hasMore),
    years: Array.isArray(body.years)
      ? body.years.filter((y): y is number => typeof y === 'number')
      : [],
    latestWeb: body.latestWeb,
    latestApi: body.latestApi,
  };
}

const emptyChangelogPage = (
  query: ChangelogPageQuery,
): ChangelogPageResult => ({
  entries: [],
  total: 0,
  limit: query.limit ?? CHANGELOG_PAGE_SIZE,
  offset: query.offset ?? 0,
  hasMore: false,
  years: [],
});

/**
 * 分页拉取版本历史（服务端 RSC / 构建期使用）。
 */
export async function fetchChangelogPage(
  query: ChangelogPageQuery = {},
): Promise<ChangelogPageResult> {
  const base = getBackendBaseUrl();
  try {
    const res = await fetch(
      buildChangelogPageUrl(base, query),
      changelogFetchInit(),
    );
    if (!res.ok) return emptyChangelogPage(query);
    const parsed = parseChangelogPageBody(await res.json());
    return parsed ?? emptyChangelogPage(query);
  } catch {
    return emptyChangelogPage(query);
  }
}

/** 浏览器端分页拉取（版本历史页「加载更多」与筛选重置）。 */
export async function fetchChangelogPageClient(
  query: ChangelogPageQuery = {},
): Promise<ChangelogPageResult> {
  const base = resolveChangelogBrowserApiBase();
  if (!base) return emptyChangelogPage(query);
  try {
    const res = await fetch(buildChangelogPageUrl(base, query), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return emptyChangelogPage(query);
    const parsed = parseChangelogPageBody(await res.json());
    return parsed ?? emptyChangelogPage(query);
  } catch {
    return emptyChangelogPage(query);
  }
}

function resolveChangelogBrowserApiBase(): string | null {
  const explicit = getPublicApiBaseUrl();
  if (explicit) return explicit;
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:4000`;
    }
  }
  return null;
}

/**
 * 从后端 `GET /api/changelog` 拉取全部发布记录（Agent 等需要全量列表的场景）。
 */
export async function fetchChangelogEntries(): Promise<ChangelogEntry[]> {
  const base = getBackendBaseUrl();
  try {
    const res = await fetch(`${base}/api/changelog`, changelogFetchInit());
    if (!res.ok) return [];
    const data = (await res.json()) as ChangelogApiRow[];
    if (!Array.isArray(data)) return [];
    return data.map(mapChangelogRow);
  } catch {
    return [];
  }
}

/**
 * 解析发布时间为 `Date`。
 * 纯日期 `YYYY-MM-DD` 按本地正午解析，避免仅日期串被解析为 UTC 午夜导致跨日。
 */
export function parseChangelogDate(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T12:00:00`);
  }
  return new Date(dateStr);
}

/** 版本发布时间展示：本地时区年月日 + 24 小时制时分秒（与文章发布时间风格一致）。 */
export function formatChangelogReleaseAt(dateStr: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(parseChangelogDate(dateStr));
}

/** Semver 比较：a > b 返回正数（仅支持数字段，与当前 package 一致） */
export function semverCompare(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

/** 在两条可选版本号中取 semver 较大者（用于推导站点「当前最新版本」展示）。 */
function maxSemver(
  current: string | undefined,
  next: string | undefined,
): string | undefined {
  if (!next) return current;
  if (!current) return next;
  return semverCompare(next, current) > 0 ? next : current;
}

/** 从发布记录中推导「最新前端版本」 */
export function latestWebVersionFromEntries(
  entries: ChangelogEntry[],
): string | undefined {
  return entries.reduce<string | undefined>(
    (acc, e) => maxSemver(acc, e.webVersion),
    undefined,
  );
}

/** 从发布记录中推导「最新后端版本」 */
export function latestApiVersionFromEntries(
  entries: ChangelogEntry[],
): string | undefined {
  return entries.reduce<string | undefined>(
    (acc, e) => maxSemver(acc, e.apiVersion),
    undefined,
  );
}

/** 全局排序：日期新优先，同日则前端 semver、再后端 semver */
export function sortChangelogEntries(
  entries: ChangelogEntry[],
): ChangelogEntry[] {
  return [...entries].sort((a, b) => {
    const byDate =
      parseChangelogDate(b.date).getTime() -
      parseChangelogDate(a.date).getTime();
    if (byDate !== 0) return byDate;
    const w = semverCompare(b.webVersion ?? '0.0.0', a.webVersion ?? '0.0.0');
    if (w !== 0) return w;
    return semverCompare(b.apiVersion ?? '0.0.0', a.apiVersion ?? '0.0.0');
  });
}

export function changelogEntryKey(e: ChangelogEntry): string {
  return e.id ?? `${e.date}-${e.webVersion ?? ''}-${e.apiVersion ?? ''}`;
}

/** 按年份分组（年内按排序函数结果） */
export function groupChangelogByYear(
  entries: ChangelogEntry[],
): ChangelogYearGroup[] {
  const map = new Map<number, ChangelogEntry[]>();
  for (const e of entries) {
    const y = parseChangelogDate(e.date).getFullYear();
    const list = map.get(y) ?? [];
    list.push(e);
    map.set(y, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      const byDate =
        parseChangelogDate(b.date).getTime() -
        parseChangelogDate(a.date).getTime();
      if (byDate !== 0) return byDate;
      const w = semverCompare(b.webVersion ?? '0.0.0', a.webVersion ?? '0.0.0');
      if (w !== 0) return w;
      return semverCompare(b.apiVersion ?? '0.0.0', a.apiVersion ?? '0.0.0');
    });
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => ({ year, entries: list }));
}
