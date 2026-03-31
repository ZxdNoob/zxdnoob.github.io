/**
 * 与前端 `readingMinutesFromMarkdown` 算法保持一致，供列表接口返回预估阅读分钟数。
 */
export function readingMinutesFromMarkdown(content: string): number {
  const fencedBlocks = content.match(/```[\s\S]*?```/g) ?? [];
  const codeLines = fencedBlocks
    .map(
      (b) =>
        b
          .replace(/^```.*$/gm, '')
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean).length,
    )
    .reduce((a, b) => a + b, 0);

  const prose = content
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/`[^`\n]+`/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const cjkChars =
    prose.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu)
      ?.length ?? 0;
  const latinWords =
    prose.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g)?.length ?? 0;

  const proseMinutes = cjkChars / 500 + latinWords / 220;
  const codeMinutes = codeLines / 45;

  const symbolHits = prose.match(/[{}[\]()<>=/*\\|&^%$#@~:+-]/g)?.length ?? 0;
  const proseLen = Math.max(1, prose.length);
  const symbolDensity = symbolHits / proseLen;
  const codeShare = codeMinutes / Math.max(0.0001, proseMinutes + codeMinutes);

  const multiplier =
    1 +
    (codeShare >= 0.55 ? 0.35 : codeShare >= 0.3 ? 0.18 : 0) +
    (symbolDensity >= 0.085 ? 0.12 : symbolDensity >= 0.045 ? 0.06 : 0);

  const total = (proseMinutes + codeMinutes) * multiplier;
  return Math.max(1, Math.round(total));
}
