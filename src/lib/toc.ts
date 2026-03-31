export type TocItem = {
  id: string;
  level: 2 | 3 | 4;
  text: string;
};

export function normalizeHeadingText(input: string): string {
  return input
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract headings from markdown for Table of Contents.
 * - Ignores fenced code blocks
 * - Only includes h2/h3/h4 (##/###/####)
 */
export function extractToc(markdown: string): TocItem[] {
  // Keep ids in sync with `remark-slug` (which uses `github-slugger`).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const GithubSlugger = require('github-slugger').default as unknown as {
    new (): { slug: (value: string) => string };
  };
  const slugger = new GithubSlugger();

  const normalized = markdown.replaceAll('\\`\\`\\`', '```');

  // Remove fenced code blocks entirely to avoid matching headings inside them.
  const withoutCode = normalized.replace(/```[\s\S]*?```/g, '\n');

  const lines = withoutCode.split('\n');
  const occurrences = new Map<string, number>();
  const items: TocItem[] = [];

  for (const line of lines) {
    const m = /^(#{2,4})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const level = m[1].length as 2 | 3 | 4;
    const raw = normalizeHeadingText(
      m[2].replace(/\s+#*\s*$/, ''), // strip trailing hashes (ATX style)
    );
    if (!raw) continue;

    const count = (occurrences.get(raw) ?? 0) + 1;
    occurrences.set(raw, count);
    void count;
    items.push({ level, text: raw, id: slugger.slug(raw) });
  }

  return items;
}
