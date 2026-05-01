import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { applyAppGlobals } from './setup-app';

/**
 * NestJS 应用入口：负责创建 HTTP 服务器并监听端口。
 *
 * - 默认端口 4000，避免与本仓库 Next 开发服务器（3000）冲突
 * - 全局前缀与 CORS 逻辑集中在 `setup-app.ts`，便于测试复用
 * - 脚手架与构建范围见 `nest-cli.json`（如 `sourceRoot`、`compilerOptions.deleteOutDir`）
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    /** 生产环境可改为 false 以略微减少日志量 */
    logger: ['error', 'warn', 'log'],
  });

  /**
   * 显式收紧 JSON body 上限（默认 100KB 偏被动）。
   *
   * 主要服务于 AI 向导：`/api/agent/sessions/:id` PUT 时会一次性把会话内
   * 的 `messages[]` 序列化回写。前端做了 `MAX_MESSAGES = 80` 的截断，配合
   * 正常长度的对话，256KB 完全够用；超出大概率是异常或攻击流量，应当 413。
   */
  const expressApp = app as unknown as NestExpressApplication;
  expressApp.useBodyParser('json', { limit: '256kb' });
  expressApp.useBodyParser('urlencoded', { limit: '256kb', extended: true });

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
