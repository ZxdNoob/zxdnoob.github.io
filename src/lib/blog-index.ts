import type { PostSummary } from './posts';

export const BLOG_ALL_SERIES = '__all__' as const;

export type BlogSort = 'new' | 'old' | 'reading';
export type BlogView = 'grid' | 'list';

export type BlogFilters = {
  query: string;
  series: string;
  tags: string[];
  sort: BlogSort;
  view: BlogView;
};

export type BlogFacet = {
  value: string;
  label: string;
  count: number;
};

export type BlogIndexMeta = {
  totalPosts: number;
  totalSeries: number;
  totalTags: number;
  totalReadingMinutes: number;
  totalViews: number;
  seriesOptions: BlogFacet[];
  tagOptions: BlogFacet[];
  featuredTags: BlogFacet[];
};

const DEFAULT_FILTERS: BlogFilters = {
  query: '',
  series: BLOG_ALL_SERIES,
  tags: [],
  sort: 'new',
  view: 'grid',
};

function uniqSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) =>
    a.localeCompare(b, 'zh-CN'),
  );
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function toFacetEntries(counts: Map<string, number>) {
  return Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], 'zh-CN');
    })
    .map(([value, count]) => ({
      value,
      label: value,
      count,
    }));
}

export function createDefaultBlogFilters(): BlogFilters {
  return { ...DEFAULT_FILTERS };
}

export function createBlogIndexMeta(
  posts: PostSummary[],
  viewCounts: Record<string, number> = {},
): BlogIndexMeta {
  const tagCounts = new Map<string, number>();
  const seriesCounts = new Map<string, number>();

  let totalReadingMinutes = 0;
  let totalViews = 0;

  for (const post of posts) {
    totalReadingMinutes += post.readingMinutes;
    totalViews += viewCounts[post.slug] ?? 0;

    const series = post.series?.trim();
    if (series) {
      seriesCounts.set(series, (seriesCounts.get(series) ?? 0) + 1);
    }

    for (const tag of uniqSorted((post.tags ?? []).filter(Boolean))) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const tagOptions = toFacetEntries(tagCounts);
  const seriesOptions = [
    {
      value: BLOG_ALL_SERIES,
      label: '全部系列',
      count: posts.length,
    },
    ...toFacetEntries(seriesCounts),
  ];

  return {
    totalPosts: posts.length,
    totalSeries: seriesCounts.size,
    totalTags: tagCounts.size,
    totalReadingMinutes,
    totalViews,
    seriesOptions,
    tagOptions,
    featuredTags: tagOptions.slice(0, 8),
  };
}

export function parseBlogFilters(
  searchParams: URLSearchParams,
  meta: BlogIndexMeta,
): BlogFilters {
  const query = searchParams.get('q')?.trim() ?? '';
  const sort = searchParams.get('sort');
  const view = searchParams.get('view');
  const series = searchParams.get('series') ?? BLOG_ALL_SERIES;

  const validSeries = new Set(meta.seriesOptions.map((item) => item.value));
  const validTags = new Set(meta.tagOptions.map((item) => item.value));

  const tags = uniqSorted(
    searchParams
      .getAll('tag')
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter((value) => value.length > 0 && validTags.has(value)),
  );

  return {
    query,
    series: validSeries.has(series) ? series : BLOG_ALL_SERIES,
    tags,
    sort: sort === 'old' || sort === 'reading' ? sort : 'new',
    view: view === 'list' ? 'list' : 'grid',
  };
}

export function buildBlogSearchParams(filters: BlogFilters): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (filters.query.trim()) searchParams.set('q', filters.query.trim());
  if (filters.series !== BLOG_ALL_SERIES) {
    searchParams.set('series', filters.series);
  }
  if (filters.sort !== 'new') searchParams.set('sort', filters.sort);
  if (filters.view !== 'grid') searchParams.set('view', filters.view);

  for (const tag of uniqSorted(filters.tags)) {
    searchParams.append('tag', tag);
  }

  return searchParams;
}

export function filterBlogPosts(posts: PostSummary[], filters: BlogFilters) {
  const query = normalizeText(filters.query);
  let next = posts.slice();

  if (filters.series !== BLOG_ALL_SERIES) {
    next = next.filter((post) => (post.series ?? '') === filters.series);
  }

  if (filters.tags.length > 0) {
    const selected = new Set(filters.tags);
    next = next.filter((post) =>
      (post.tags ?? []).some((tag) => selected.has(tag)),
    );
  }

  if (query) {
    next = next.filter((post) => {
      const haystack = normalizeText(
        [
          post.title,
          post.description,
          post.series ?? '',
          (post.tags ?? []).join(' '),
        ].join('\n'),
      );
      return haystack.includes(query);
    });
  }

  next.sort((a, b) => {
    if (filters.sort === 'reading') {
      if (b.readingMinutes !== a.readingMinutes) {
        return b.readingMinutes - a.readingMinutes;
      }
    }

    const left = new Date(a.date).getTime();
    const right = new Date(b.date).getTime();
    return filters.sort === 'old' ? left - right : right - left;
  });

  return next;
}

export function getActiveFilterCount(filters: BlogFilters) {
  let total = 0;
  if (filters.query.trim()) total += 1;
  if (filters.series !== BLOG_ALL_SERIES) total += 1;
  total += filters.tags.length;
  if (filters.sort !== 'new') total += 1;
  return total;
}
