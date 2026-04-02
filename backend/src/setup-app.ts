import type { INestApplication } from '@nestjs/common';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (app as any).set('trust proxy', true);

  /**
   * 浏览器端 fetch 需要服务端显式允许来源。
   * 生产环境建议把具体域名写进环境变量，而不是 `*`。
   */
  const raw = process.env.CORS_ORIGIN;
  const origins = raw
    ? raw.split(',').map((s) => s.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: origins,
    // 本项目主要是内容型站点：读接口是 GET；浏览量上报需要 POST，因此显式放开 POST。
    methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}
