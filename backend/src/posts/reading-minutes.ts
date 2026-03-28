/**
 * 与前端 `readingMinutesFromMarkdown` 算法保持一致，供列表接口返回预估阅读分钟数。
 */
export function readingMinutesFromMarkdown(content: string): number {
  const text = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = text.split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 280));
}
