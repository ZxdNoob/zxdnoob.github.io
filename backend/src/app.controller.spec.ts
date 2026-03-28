import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('应返回 ok 状态', () => {
      const res = appController.getHealth();
      expect(res.status).toBe('ok');
      expect(res.service).toBe('zxdnoob-api');
      expect(res.timestamp).toBeDefined();
    });
  });
});
