/**
 * Open Graph 卡片模板。
 *
 * ## 实现方式
 * - 用 `next/og` 的 `ImageResponse`（底层 Satori），在 build 期渲染为 PNG
 * - 静态导出（`STATIC_EXPORT=1`）也支持：Next.js 把每张图作为静态文件落到 `out/`
 * - 不依赖任何 native 模块，不需要 Edge Runtime（runtime 留默认 nodejs）
 *
 * ## 字体
 * - Satori 默认字体能渲染拉丁/数字/部分常用 CJK，但中文标题最好是同款 Noto Sans/Serif SC
 * - 这里的策略是**按需 fetch Noto Sans SC 子集**：
 *   - 命中文章标题中的 CJK 字符 → 拼成 `text=<chars>` 让 Google Fonts CDN 返回最小子集 woff2
 *   - 不命中（纯英文）→ 跳过字体加载，节省时间
 * - 失败时静默回退 Satori 默认字体；卡片视觉仍然在线
 */

import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

interface PostCardOptions {
  title: string;
  series?: string | null;
  readingMinutes?: number;
  dateLabel?: string;
  description?: string;
  /** 站点品牌名（默认 ZxdNoob） */
  brand?: string;
}

interface SiteCardOptions {
  title: string;
  description: string;
  brand?: string;
}

/** 抽出标题里的 CJK 字符以拼最小字体子集 */
function pickCjk(...texts: string[]): string {
  const set = new Set<string>();
  for (const t of texts) {
    if (!t) continue;
    for (const ch of t) {
      const code = ch.charCodeAt(0);
      if (code >= 0x3000 && code <= 0x9fff) set.add(ch);
      if (code >= 0xff00 && code <= 0xffef) set.add(ch);
    }
  }
  return [...set].join('');
}

/**
 * Google Fonts API CSS 模式：传 `family=Noto+Sans+SC&text=<chars>` 拿到 CSS，
 * 再从 CSS 里提取 .woff2 URL。返回 ArrayBuffer 给 Satori。
 *
 * 注意：Google 返回 woff2，但 Satori 在 next/og v16+ 已经支持 woff2 解码。
 */
async function loadCjkSubset(
  text: string,
  family = 'Noto Sans SC',
  weight = 600,
): Promise<ArrayBuffer | null> {
  if (!text) return null;
  const cssUrl =
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}` +
    `&text=${encodeURIComponent(text)}&display=swap`;
  try {
    const css = await fetch(cssUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    }).then((r) => (r.ok ? r.text() : ''));
    if (!css) return null;
    const m = css.match(/url\(([^)]+)\)\s*format\('woff2'\)/);
    if (!m) return null;
    const fontUrl = m[1];
    const buf = await fetch(fontUrl).then((r) =>
      r.ok ? r.arrayBuffer() : null,
    );
    return buf;
  } catch {
    return null;
  }
}

/** 文章 OG 卡（标题 + 标签 + 元信息） */
export async function renderPostOgImage({
  title,
  series,
  readingMinutes,
  dateLabel,
  description,
  brand = 'ZxdNoob',
}: PostCardOptions): Promise<ImageResponse> {
  const cjk = pickCjk(title, series ?? '', description ?? '');
  const fontData = cjk ? await loadCjkSubset(cjk) : null;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '64px',
        background:
          'linear-gradient(135deg, #faf9f7 0%, #fef3c7 60%, #fde68a 100%)',
        fontFamily: '"Noto Sans SC", system-ui, sans-serif',
        color: '#1c1917',
        position: 'relative',
      }}
    >
      {/* 极光圆 */}
      <div
        style={{
          position: 'absolute',
          top: -160,
          right: -120,
          width: 540,
          height: 540,
          borderRadius: 9999,
          background:
            'radial-gradient(closest-side, rgba(245,158,11,0.45), transparent 70%)',
          display: 'flex',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -200,
          left: -160,
          width: 600,
          height: 600,
          borderRadius: 9999,
          background:
            'radial-gradient(closest-side, rgba(217,119,6,0.25), transparent 70%)',
          display: 'flex',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 22,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Z
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 1,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {brand}
        </div>
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 18,
            color: '#78716c',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {dateLabel ? <span>{dateLabel}</span> : null}
          {dateLabel && readingMinutes ? <span>·</span> : null}
          {readingMinutes ? <span>{readingMinutes} min read</span> : null}
        </div>
      </div>

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {series ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 22,
              color: '#92400e',
              fontWeight: 600,
            }}
          >
            <div
              style={{
                height: 2,
                width: 36,
                background: '#d97706',
                display: 'flex',
              }}
            />
            <span>{series}</span>
          </div>
        ) : null}
        <div
          style={{
            fontSize: title.length > 24 ? 60 : 76,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: -1,
            maxWidth: 1080,
            wordBreak: 'break-word',
          }}
        >
          {title}
        </div>
        {description ? (
          <div
            style={{
              fontSize: 24,
              lineHeight: 1.5,
              color: '#57534e',
              maxWidth: 1080,
              /** 描述不强制 ellipsis：Satori 不支持 line-clamp，超长会自动换行 */
              display: '-webkit-box' as const,
            }}
          >
            {description.length > 120
              ? `${description.slice(0, 120)}…`
              : description}
          </div>
        ) : null}
      </div>
    </div>,
    {
      ...OG_SIZE,
      ...(fontData
        ? {
            fonts: [
              {
                name: 'Noto Sans SC',
                data: fontData,
                style: 'normal',
                weight: 600,
              },
            ],
          }
        : {}),
    },
  );
}

/** 站点级默认 OG */
export async function renderSiteOgImage({
  title,
  description,
  brand = 'ZxdNoob',
}: SiteCardOptions): Promise<ImageResponse> {
  const cjk = pickCjk(title, description);
  const fontData = cjk ? await loadCjkSubset(cjk) : null;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        textAlign: 'center',
        fontFamily: '"Noto Sans SC", system-ui, sans-serif',
        color: '#1c1917',
        background:
          'linear-gradient(135deg, #faf9f7 0%, #fef3c7 50%, #fde68a 100%)',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -200,
          right: -160,
          width: 640,
          height: 640,
          borderRadius: 9999,
          background:
            'radial-gradient(closest-side, rgba(245,158,11,0.4), transparent 70%)',
          display: 'flex',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -240,
          left: -200,
          width: 720,
          height: 720,
          borderRadius: 9999,
          background:
            'radial-gradient(closest-side, rgba(217,119,6,0.22), transparent 70%)',
          display: 'flex',
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 30,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Z
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: 2,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {brand}
        </div>
      </div>
      <div
        style={{
          fontSize: 76,
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: -1,
          maxWidth: 1080,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 28,
          fontSize: 28,
          lineHeight: 1.5,
          color: '#57534e',
          maxWidth: 980,
        }}
      >
        {description.length > 100
          ? `${description.slice(0, 100)}…`
          : description}
      </div>
    </div>,
    {
      ...OG_SIZE,
      ...(fontData
        ? {
            fonts: [
              {
                name: 'Noto Sans SC',
                data: fontData,
                style: 'normal',
                weight: 600,
              },
            ],
          }
        : {}),
    },
  );
}
