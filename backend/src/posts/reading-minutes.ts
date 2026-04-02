/**
 * 与前端 `src/lib/posts.ts` 中 `readingMinutesFromMarkdown` 算法保持一致，
 * 供 `GET /api/posts` 列表返回预估阅读分钟数（详情页亦可复用后端值）。
 */
export function readingMinutesFromMarkdown(content: string): number {
  // 1) 统计 fenced code（```...```）内的有效代码行数（去掉围栏首行语言标记）
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

  // 2) 正文：去掉代码块与行内 code，压缩空白，便于统计 CJK 与英文词
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

  // 3) 基础阅读速度（经验值，偏技术文保守估计）
  const proseMinutes = cjkChars / 500 + latinWords / 220;
  const codeMinutes = codeLines / 45;

  // 4) 难度系数：符号密度高、代码占比高 → 乘数 > 1，总分钟数上调
  const symbolHits = prose.match(/[{}[\]()<>=/*\\|&^%$#@~:+-]/g)?.length ?? 0;
  const proseLen = Math.max(1, prose.length);
  const symbolDensity = symbolHits / proseLen;
  const codeShare = codeMinutes / Math.max(0.0001, proseMinutes + codeMinutes);

  const multiplier =
    1 +
    (codeShare >= 0.55 ? 0.35 : codeShare >= 0.3 ? 0.18 : 0) +
    (symbolDensity >= 0.085 ? 0.12 : symbolDensity >= 0.045 ? 0.06 : 0);

  const total = (proseMinutes + codeMinutes) * multiplier;
  // 至少 1 分钟，避免极短文显示 0
  return Math.max(1, Math.round(total));
}
