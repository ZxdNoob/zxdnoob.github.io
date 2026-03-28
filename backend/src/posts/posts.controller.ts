import { Controller, Get, Param } from '@nestjs/common';
import { PostsService } from './posts.service';
import type { PostDetail, PostSummary } from './types/post.types';

/**
 * 文章 REST 接口。
 *
 * 路由前缀在 `PostsModule` 中设为 `posts`，再结合全局前缀 `api`：
 * - `GET /api/posts`       → 列表
 * - `GET /api/posts/:slug` → 详情
 */
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  /**
   * 文章列表：仅摘要字段 + `readingMinutes`，不含 Markdown 正文。
   */
  @Get()
  async list(): Promise<PostSummary[]> {
    return this.postsService.findAllPublishedSummaries();
  }

  /**
   * 单篇文章：含完整 Markdown 字符串，由前端再交给渲染器。
   */
  @Get(':slug')
  async detail(@Param('slug') slug: string): Promise<PostDetail> {
    return this.postsService.findPublishedBySlug(slug);
  }
}
