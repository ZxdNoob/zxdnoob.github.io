import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyAppGlobals } from './setup-app';

/**
 * NestJS 应用入口：负责创建 HTTP 服务器并监听端口。
 *
 * - 默认端口 4000，避免与本仓库 Next 开发服务器（3000）冲突
 * - 全局前缀与 CORS 逻辑集中在 `setup-app.ts`，便于测试复用
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    /** 生产环境可改为 false 以略微减少日志量 */
    logger: ['error', 'warn', 'log'],
  });

  applyAppGlobals(app);

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`后端已启动: http://localhost:${port}/api`);
}

bootstrap().catch((err: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error('启动失败', err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
