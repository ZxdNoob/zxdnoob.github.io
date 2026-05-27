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

  it('GET /api/changelog?limit=&offset= paginated', () => {
    return request(app.getHttpServer())
      .get('/api/changelog?limit=2&offset=0')
      .expect(200)
      .expect((res) => {
        const body = res.body as {
          entries: unknown[];
          total: number;
          hasMore: boolean;
        };
        expect(Array.isArray(body.entries)).toBe(true);
        expect(typeof body.total).toBe('number');
        expect(typeof body.hasMore).toBe('boolean');
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

  /**
   * 新增的 AI 向导端点：
   * - 必须带 `X-Agent-User`，否则返回 400
   * - 完整 CRUD 流程能跑通（前端线上模式依赖该流程）
   */
  describe('AI Agent endpoints', () => {
    const userId = `u_test_${Date.now().toString(36)}`;

    it('GET /api/agent/sessions without user header → 400', () => {
      return request(app.getHttpServer())
        .get('/api/agent/sessions')
        .expect(400);
    });

    it('agent sessions: create → list → update → delete', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/agent/sessions')
        .set('X-Agent-User', userId)
        .send({ title: 'first', messages: [] })
        .expect(201);

      const sessionId = (created.body as { id: string }).id;
      expect(typeof sessionId).toBe('string');

      const list = await request(app.getHttpServer())
        .get('/api/agent/sessions')
        .set('X-Agent-User', userId)
        .expect(200);
      const sessions = (list.body as { sessions: { id: string }[] }).sessions;
      expect(sessions.some((s) => s.id === sessionId)).toBe(true);

      await request(app.getHttpServer())
        .put(`/api/agent/sessions/${sessionId}`)
        .set('X-Agent-User', userId)
        .send({ title: 'renamed', messages: [] })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/agent/sessions/${sessionId}`)
        .set('X-Agent-User', userId)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/agent/sessions/${sessionId}`)
        .set('X-Agent-User', userId)
        .expect(404);
    });

    it('agent sessions: rejects oversized messages payload', async () => {
      /** 构造一条远超 16KB 单条上限的 messages，触发服务端 BadRequest */
      const huge = 'a'.repeat(20 * 1024);
      await request(app.getHttpServer())
        .post('/api/agent/sessions')
        .set('X-Agent-User', userId)
        .send({
          title: 'oversize',
          messages: [
            { id: '1', role: 'user', content: huge, createdAt: Date.now() },
          ],
        })
        .expect(400);
    });

    it('agent memory: GET 默认空快照 / PUT 后能回读', async () => {
      const empty = await request(app.getHttpServer())
        .get('/api/agent/memory')
        .set('X-Agent-User', userId)
        .expect(200);
      expect(
        Array.isArray((empty.body as { messages: unknown[] }).messages),
      ).toBe(true);

      const payload = [
        { id: 'm1', role: 'user', content: 'hello', createdAt: Date.now() },
      ];
      await request(app.getHttpServer())
        .put('/api/agent/memory')
        .set('X-Agent-User', userId)
        .send({ messages: payload })
        .expect(200);

      const after = await request(app.getHttpServer())
        .get('/api/agent/memory')
        .set('X-Agent-User', userId)
        .expect(200);
      expect((after.body as { messages: unknown[] }).messages.length).toBe(1);
    });
  });
});
