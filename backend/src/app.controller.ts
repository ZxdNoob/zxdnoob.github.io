import { Controller, Get } from '@nestjs/common';

/**
 * 应用级控制器：放置与「业务领域无关」的运维接口（健康检查等）。
 * 具体业务（文章）在 `PostsModule`。
 */
@Controller()
export class AppController {
  /**
   * 健康检查：负载均衡 / 容器探针 / 本地联调时可用于判断服务是否存活。
   * 完整路径：`GET /api/health`（受全局前缀影响）。
   */
  @Get('health')
  getHealth(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'zxdnoob-api',
      timestamp: new Date().toISOString(),
    };
  }
}
