import publicApiConfig from '@/config/public-api.json';

/**
 * 后端 API 基址。
 *
 * - **服务端**（RSC、`fetch`）：优先 `API_URL`（Docker / 内网），否则 `NEXT_PUBLIC_API_URL`，最后默认本机 `4000` 端口。
 * - **浏览器**：仅 `NEXT_PUBLIC_*` 可见，请同时设置 `NEXT_PUBLIC_API_URL` 若需在客户端直连。
 */
export function getBackendBaseUrl(): string {
  const a = process.env.API_URL?.trim();
  const b = process.env.NEXT_PUBLIC_API_URL?.trim();
  const c = resolvePublicApiBaseFromConfig();
  const raw = (a || b || c || 'http://127.0.0.1:4000').replace(/\/$/, '');
  return raw;
}

function resolvePublicApiBaseFromConfig(): string | undefined {
  const u = publicApiConfig.apiBaseUrl?.trim();
  return u ? u.replace(/\/$/, '') : undefined;
}

/** 浏览器端可用的公共变量（未设置时返回 `undefined`） */
export function getPublicApiBaseUrl(): string | undefined {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return resolvePublicApiBaseFromConfig();
}

/**
 * 是否在 UI 中展示访问量 / 文章浏览量，并挂载上报组件。
 *
 * - **开发**（`next dev`，`NODE_ENV === 'development'`）：始终展示，便于对接本机 `:4000`（客户端已有 localhost 回退）。
 * **生产**（静态导出、线上构建）：仅当配置了浏览器可用的 API 根（`NEXT_PUBLIC_API_URL` 或 `public-api.json`）时才展示；未配置公网 API 时隐藏，避免误导性数字。
 */
export function isPublicViewStatsEnabled(): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  return Boolean(getPublicApiBaseUrl());
}

export function apiHealthUrl(): string | undefined {
  const base = getPublicApiBaseUrl();
  return base ? `${base}/api/health` : undefined;
}
