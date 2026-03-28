import type { Metadata } from "next";
import { ChangelogView } from "@/components/changelog/changelog-view";
import { fetchChangelogEntries, sortChangelogEntries } from "@/lib/changelog";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "版本历史",
  description: `「${site.name}」站点与工具链的版本记录与更新说明。`,
  openGraph: {
    title: `版本历史 · ${site.name}`,
    description: `「${site.name}」站点与工具链的版本记录与更新说明。`,
  },
};

/**
 * 版本历史：数据来自 Nest `GET /api/changelog`（SQLite）。
 */
export default async function ChangelogPage() {
  const raw = await fetchChangelogEntries();
  const entries = sortChangelogEntries(raw);

  return (
    <main className="min-h-[60vh]">
      <ChangelogView entries={entries} />
    </main>
  );
}
