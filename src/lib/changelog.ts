/**
 * 版本历史：类型与纯函数；列表数据由 `fetchChangelogEntries()` 从 Nest API 拉取。
 */

import { getBackendBaseUrl } from "./api";

export type ChangelogKind = "feature" | "fix" | "breaking" | "docs" | "perf";

export type ChangelogItemSurface = "web" | "api" | "both";

export type ChangelogItem = {
  kind: ChangelogKind;
  text: string;
  surface?: ChangelogItemSurface;
};

/** 与 `GET /api/changelog` 单行响应一致 */
export type ChangelogEntry = {
  /** 数据库主键，用于稳定 React key */
  id?: string;
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

type ChangelogApiRow = {
  id: string;
  date: string;
  title?: string;
  webVersion?: string;
  apiVersion?: string;
  items: ChangelogItem[];
};

/**
 * 从后端 `GET /api/changelog` 拉取全部发布记录（服务端组件中调用，`no-store`）。
 */
export async function fetchChangelogEntries(): Promise<ChangelogEntry[]> {
  const base = getBackendBaseUrl();
  try {
    const init: RequestInit =
      process.env.STATIC_EXPORT === "1"
        ? { cache: "force-cache" }
        : { cache: "no-store" };
    const res = await fetch(`${base}/api/changelog`, init);
    if (!res.ok) return [];
    const data = (await res.json()) as ChangelogApiRow[];
    if (!Array.isArray(data)) return [];
    return data.map((row) => ({
      id: row.id,
      date: row.date,
      title: row.title,
      webVersion: row.webVersion,
      apiVersion: row.apiVersion,
      items: Array.isArray(row.items) ? row.items : [],
    }));
  } catch {
    return [];
  }
}

/** Semver 比较：a > b 返回正数（仅支持数字段，与当前 package 一致） */
export function semverCompare(a: string, b: string): number {
  const pa = a.split(".").map((x) => parseInt(x, 10) || 0);
  const pb = b.split(".").map((x) => parseInt(x, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

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
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    const w = semverCompare(
      b.webVersion ?? "0.0.0",
      a.webVersion ?? "0.0.0",
    );
    if (w !== 0) return w;
    return semverCompare(
      b.apiVersion ?? "0.0.0",
      a.apiVersion ?? "0.0.0",
    );
  });
}

export function changelogEntryKey(e: ChangelogEntry): string {
  return e.id ?? `${e.date}-${e.webVersion ?? ""}-${e.apiVersion ?? ""}`;
}

/** 按年份分组（年内按排序函数结果） */
export function groupChangelogByYear(entries: ChangelogEntry[]): ChangelogYearGroup[] {
  const map = new Map<number, ChangelogEntry[]>();
  for (const e of entries) {
    const y = new Date(e.date + "T12:00:00").getFullYear();
    const list = map.get(y) ?? [];
    list.push(e);
    map.set(y, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      const w = semverCompare(
        b.webVersion ?? "0.0.0",
        a.webVersion ?? "0.0.0",
      );
      if (w !== 0) return w;
      return semverCompare(
        b.apiVersion ?? "0.0.0",
        a.apiVersion ?? "0.0.0",
      );
    });
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => ({ year, entries: list }));
}
