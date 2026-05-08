/**
 * Service Worker — ZxdNoob 离线策略。
 *
 * 设计目标：
 * - 第一次访问后，再次离线打开仍然能看到首页 / 已访问过的文章 / 静态资源
 * - 不要让 stale 内容长期存在 — HTML 走「网络优先 + 缓存兜底」
 * - 不缓存 API（浏览量、Agent、giscus 等）— 这些必须实时
 *
 * 缓存版本：每次发布更新静态文件时，请把 `CACHE_VERSION` 改一个新值，
 * 老版本的缓存会在 activate 阶段自动清空。
 */

const CACHE_VERSION = 'zxdnoob-v1';
const CACHE_HTML = `${CACHE_VERSION}-html`;
const CACHE_STATIC = `${CACHE_VERSION}-static`;

const PRECACHE_URLS = ['/', '/blog', '/agent', '/icon.svg', '/logo.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_HTML);
      try {
        await cache.addAll(PRECACHE_URLS);
      } catch {
        /** 任意一条预缓存失败都不阻塞安装；运行期再 lazily 兜上 */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

/** 判断请求是否需要由 SW 介入；外链 / 跨域 / API 直接放行给浏览器原生 */
function shouldHandle(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  /** /api/* 由后端实时返回，不缓存 */
  if (url.pathname.startsWith('/api/')) return false;
  /** chrome-extension / data: 等异常协议直接绕过 */
  if (!url.protocol.startsWith('http')) return false;
  return true;
}

/** HTML 类请求：网络优先 + 缓存兜底（保证刷新看到最新内容） */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_HTML);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    /** 兜底返回首页，避免页面空白；标记为 redirect = 'manual' 防止历史污染 */
    const fallback = await cache.match('/');
    return (
      fallback ??
      new Response('离线模式：暂未缓存该页面。', {
        status: 503,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      })
    );
  }
}

/** 静态资源：缓存优先 + 后台更新（stale-while-revalidate） */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_STATIC);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached ?? (await fetchPromise) ?? new Response(null, { status: 504 });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!shouldHandle(request)) return;
  const url = new URL(request.url);

  /** 导航 / HTML 请求 */
  if (
    request.mode === 'navigate' ||
    request.headers.get('accept')?.includes('text/html')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  /** _next/static、字体、图片、svg 等 */
  if (
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|webp|avif|svg|gif|ico)$/i.test(
      url.pathname,
    )
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

/** 收到主线程 `SKIP_WAITING` 消息立即激活，配合前端"有新版本"提示按钮 */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
