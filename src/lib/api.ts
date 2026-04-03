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

export function apiHealthUrl(): string | undefined {
  const base = getPublicApiBaseUrl();
  return base ? `${base}/api/health` : undefined;
}
