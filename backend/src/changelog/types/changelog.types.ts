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
  date: string;
  title?: string;
  webVersion?: string;
  apiVersion?: string;
  items: ChangelogItemPayload[];
};
