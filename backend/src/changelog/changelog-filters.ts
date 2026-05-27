import type {
  ChangelogKind,
  ChangelogReleaseDto,
} from './types/changelog.types';

export type ChangelogScopeFilter = 'all' | 'web' | 'api';
export type ChangelogKindFilter = 'all' | ChangelogKind;

/** 与前端 `changelog-view` 筛选逻辑一致，供分页接口在切片前过滤。 */
export function filterChangelogByScope(
  entries: ChangelogReleaseDto[],
  scope: ChangelogScopeFilter,
): ChangelogReleaseDto[] {
  if (scope === 'all') return entries;
  return entries
    .map((e) => {
      if (scope === 'web' && !e.webVersion) return null;
      if (scope === 'api' && !e.apiVersion) return null;
      const items = e.items.filter((i) => {
        const s = i.surface ?? 'both';
        if (s === 'both') return true;
        return scope === 'web' ? s === 'web' : s === 'api';
      });
      return { ...e, items };
    })
    .filter((e): e is ChangelogReleaseDto => e != null && e.items.length > 0);
}

export function filterChangelogByKind(
  entries: ChangelogReleaseDto[],
  kind: ChangelogKindFilter,
): ChangelogReleaseDto[] {
  if (kind === 'all') return entries;
  return entries
    .map((e) => ({
      ...e,
      items: e.items.filter((i) => i.kind === kind),
    }))
    .filter((e) => e.items.length > 0);
}

export function parseChangelogYear(dateStr: string): number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return parseInt(dateStr.slice(0, 4), 10);
  }
  return new Date(dateStr).getFullYear();
}

export function changelogYearsFromEntries(
  entries: ChangelogReleaseDto[],
): number[] {
  const years = new Set<number>();
  for (const e of entries) {
    years.add(parseChangelogYear(e.date));
  }
  return [...years].sort((a, b) => b - a);
}

export function maxSemver(
  current: string | undefined,
  next: string | undefined,
): string | undefined {
  if (!next) return current;
  if (!current) return next;
  return semverCompare(next, current) > 0 ? next : current;
}

function semverCompare(a: string, b: string): number {
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

export function latestVersionsFromEntries(entries: ChangelogReleaseDto[]): {
  latestWeb?: string;
  latestApi?: string;
} {
  let latestWeb: string | undefined;
  let latestApi: string | undefined;
  for (const e of entries) {
    latestWeb = maxSemver(latestWeb, e.webVersion);
    latestApi = maxSemver(latestApi, e.apiVersion);
  }
  return { latestWeb, latestApi };
}
