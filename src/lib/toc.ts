/**
 * 文章目录（TOC）相关类型与解析逻辑。
 * 与正文渲染侧 `remark-slug` / `github-slugger` 生成的锚点 id 保持一致，便于右侧目录跳转。
 */
export type TocItem = {
  id: string;
  level: 2 | 3 | 4;
  text: string;
};

/** 规范化标题文本：统一空白字符、去掉首尾空格，供 slug 与展示一致。 */
export function normalizeHeadingText(input: string): string {
  return input
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 从 Markdown 中提取目录项（供 `TableOfContents` 使用）。
 * - 忽略 fenced 代码块内的 `#` 行，避免把注释误当标题
 * - 仅收录 h2/h3/h4（`##` / `###` / `####`）
 */
export function extractToc(markdown: string): TocItem[] {
  // 与 `remark-slug`（底层 `github-slugger`）生成规则对齐，保证 id 可跳转
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const GithubSlugger = require('github-slugger').default as unknown as {
    new (): { slug: (value: string) => string };
  };
  const slugger = new GithubSlugger();

  const normalized = markdown.replaceAll('\\`\\`\\`', '```');

  // 整段剔除代码围栏，防止代码示例里的 markdown 标题混入目录
  const withoutCode = normalized.replace(/```[\s\S]*?```/g, '\n');

  const lines = withoutCode.split('\n');
  const occurrences = new Map<string, number>();
  const items: TocItem[] = [];

  for (const line of lines) {
    const m = /^(#{2,4})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const level = m[1].length as 2 | 3 | 4;
    const raw = normalizeHeadingText(
      m[2].replace(/\s+#*\s*$/, ''), // ATX 风格标题末尾可选的 `#` 闭合标记
    );
    if (!raw) continue;

    // 连续调用 slugger.slug 相同文本时会生成 foo、foo-1、foo-2…，与 remark-slug 行为一致
    const count = (occurrences.get(raw) ?? 0) + 1;
    occurrences.set(raw, count);
    void count;
    items.push({ level, text: raw, id: slugger.slug(raw) });
  }

  return items;
}
