import type { Metadata } from 'next';
import { ChangelogView } from '@/components/changelog/changelog-view';
import { CHANGELOG_PAGE_SIZE, fetchChangelogPage } from '@/lib/changelog';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: '版本历史',
  description: `「${site.name}」站点与工具链的版本记录与更新说明。`,
  openGraph: {
    title: `版本历史 · ${site.name}`,
    description: `「${site.name}」站点与工具链的版本记录与更新说明。`,
  },
};

/**
 * 版本历史：首屏分页来自 `GET /api/changelog?limit=&offset=`，其余由客户端加载。
 */
export default async function ChangelogPage() {
  const page = await fetchChangelogPage({
    limit: CHANGELOG_PAGE_SIZE,
    offset: 0,
  });

  return (
    <main className="min-h-[60vh]">
      <ChangelogView
        initialEntries={page.entries}
        initialTotal={page.total}
        initialHasMore={page.hasMore}
        initialYears={page.years}
        latestWeb={page.latestWeb}
        latestApi={page.latestApi}
        pageSize={CHANGELOG_PAGE_SIZE}
      />
    </main>
  );
}
