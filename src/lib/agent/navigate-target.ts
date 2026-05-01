/**
 * 解析 Agent `navigate` 工具的 href（兼容 LLM 常见脏数据）。
 */

export type NavigateTarget =
  | { kind: 'internal'; path: string }
  | { kind: 'external'; url: string };

/**
 * - 站内路径：统一为以 `/` 开头
 * - 完整 URL：与当前 `window.location.origin` 一致则视为站内，转为 pathname
 * - `blog/foo` → `/blog/foo`（避免从 `/agent` 相对跳转错成 `/agent/blog/foo`）
 */
export function parseNavigateHref(raw: string): NavigateTarget | null {
  let href = raw.trim();
  if (!href) return null;

  href = href.replace(/^[`'"<(]+|[>)`'"\]]+$/g, '').trim();
  if (!href) return null;

  if (/^https?:\/\//i.test(href)) {
    try {
      const u = new URL(href);
      if (
        typeof window !== 'undefined' &&
        u.origin === window.location.origin
      ) {
        return {
          kind: 'internal',
          path: `${u.pathname}${u.search}${u.hash}`,
        };
      }
      return { kind: 'external', url: href };
    } catch {
      return { kind: 'external', url: href };
    }
  }

  if (href.startsWith('//')) {
    return { kind: 'external', url: `https:${href}` };
  }

  const path = href.startsWith('/') ? href : `/${href}`;
  return { kind: 'internal', path };
}
