import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * 对 Nest 应用实例应用与 `main.ts` 一致的「全局行为」：
 * - 统一 API 前缀（便于反向代理与版本管理）
 * - 跨域（CORS），供浏览器中的 Next 前端调用
 *
 * E2E 测试里也需要调用此函数，否则路由前缀与线上一致性无法保证。
 */
export function applyAppGlobals(app: INestApplication): void {
  /** 所有控制器路径前加 `/api`，例如 `@Get('health')` → `GET /api/health` */
  app.setGlobalPrefix('api');

  /**
   * 反向代理场景下让 Express 正确理解 `x-forwarded-for`。
   * 这会影响 `req.ip` / `req.ips` 等行为，也让日志/限流更接近真实客户端。
   */
  (app as NestExpressApplication).set('trust proxy', true);

  /**
   * 浏览器端 fetch 需要服务端显式允许来源。
   * 生产环境建议把具体域名写进环境变量，而不是 `*`。
   *
   * 未设置 `CORS_ORIGIN` 时除本机开发端口外，额外允许 `https://*.github.io`（GitHub Pages），
   * 否则静态站上的浏览量 POST 会被浏览器拦截，计数无法累加。
   */
  const raw = process.env.CORS_ORIGIN;
  const corsOptions = {
    /**
     * `PUT` / `DELETE` 是 AI 向导多会话接口（`/api/agent/sessions/:id`、
     * `/api/agent/memory`）必需的方法。漏掉它们会让浏览器 preflight 直接被拒，
     * 线上「重命名 / 删除会话 / 写回 messages」会全部失败。
     */
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'] as const,
    /**
     * `X-Agent-User` 是匿名身份头（前端在 localStorage 里生成 `u_<rand>`），
     * 必须显式加入 allowedHeaders，否则 preflight 阶段就会被浏览器拦截。
     */
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Agent-User'],
    /** 让 preflight 缓存一段时间，减少高频 PUT 时的重复 OPTIONS 请求 */
    maxAge: 600,
  };

  if (raw) {
    const origins = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    app.enableCors({
      ...corsOptions,
      origin: origins,
    });
  } else {
    app.enableCors({
      ...corsOptions,
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (
          origin === 'http://localhost:3000' ||
          origin === 'http://127.0.0.1:3000'
        ) {
          callback(null, true);
          return;
        }
        if (/^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
    });
  }
}
