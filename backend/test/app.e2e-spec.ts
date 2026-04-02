/**
 * Nest 端到端测试：拉起完整 `AppModule`，通过 supertest 请求真实 HTTP 管道。
 * 必须调用 `applyAppGlobals`，否则路由前缀与生产环境不一致。
 *
 * Jest 配置见同目录 `jest-e2e.config.cjs`（testRegex、ts-jest、Node 环境）；
 * 与 `package.json` 中 `test:e2e` 脚本引用路径一致。
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { applyAppGlobals } from './../src/setup-app';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    /** 与 `main.ts` 保持一致，否则路径会变成 `/health` 而非 `/api/health` */
    applyAppGlobals(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/health', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as { status: string };
        expect(body.status).toBe('ok');
      });
  });

  it('GET /api/posts', () => {
    return request(app.getHttpServer())
      .get('/api/posts')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('GET /api/changelog', () => {
    return request(app.getHttpServer())
      .get('/api/changelog')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('GET /api/resume', () => {
    return request(app.getHttpServer())
      .get('/api/resume')
      .expect(200)
      .expect((res) => {
        const body = res.body as { name?: string; projects?: unknown[] };
        expect(typeof body.name).toBe('string');
        expect(Array.isArray(body.projects)).toBe(true);
      });
  });
});
