import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsSearchService } from './posts-search.service';
import type {
  PostDetail,
  PostSearchHit,
  PostSearchPassage,
  PostSummary,
} from './types/post.types';

/**
 * 文章 REST 接口。
 *
 * 路由前缀在 `PostsModule` 中设为 `posts`，再结合全局前缀 `api`：
 * - `GET  /api/posts`                    → 列表
 * - `GET  /api/posts/search?q=`          → 混合搜索（FTS5 + 字符 trigram Jaccard，RRF 融合）
 * - `POST /api/posts/relevant`           → RAG：返回与 query 最相关的若干正文 snippet（带 <mark>）
 * - `GET  /api/posts/daily-pick`         → 今日精选：基于日期 + 全库 slug 的确定性 hash
 * - `GET  /api/posts/graph`              → 知识图谱：节点 = 文章 / 边 = 相似度 + tag/series 加权
 * - `GET  /api/posts/:slug/related?...`  → 相关阅读：Jaccard + tag/series 加权评分
 * - `GET  /api/posts/:slug`              → 详情（含 Markdown 正文）
 *
 * **设计要点**
 * - search / relevant / daily-pick 放在 `:slug` 之前，避免被动态路由吃掉
 * - `:slug/related` 是子路径，与 `:slug` 同层不冲突
 * - relevant 使用 POST + body 是因为 query 可能很长（带文章选区上下文）
 */
@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly postsSearchService: PostsSearchService,
  ) {}

  /**
   * 文章列表：仅摘要字段 + `readingMinutes`，不含 Markdown 正文。
   */
  @Get()
  async list(): Promise<PostSummary[]> {
    return this.postsService.findAllPublishedSummaries();
  }

  /**
   * FTS5 全文搜索。query 为空或过短返回空数组。
   * 失败时（FTS5 不可用）回退到 LIKE 模糊匹配，保证可用性。
   */
  @Get('search')
  async search(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ): Promise<{ query: string; hits: PostSearchHit[] }> {
    const query = (q ?? '').trim();
    if (!query) return { query, hits: [] };
    const lim = Number.parseInt(limit ?? '', 10);
    const safeLim = Number.isFinite(lim) ? lim : 8;
    try {
      const hits = await this.postsSearchService.searchSummaries(
        query,
        safeLim,
      );
      if (hits.length > 0) return { query, hits };
      const fallback = await this.postsSearchService.fallbackLikeSearch(
        query,
        safeLim,
      );
      return { query, hits: fallback };
    } catch {
      const fallback = await this.postsSearchService.fallbackLikeSearch(
        query,
        safeLim,
      );
      return { query, hits: fallback };
    }
  }

  /**
   * RAG 段落检索：返回正文 snippet。Body 形如 `{ query, limit? }`。
   * 用 POST 的原因：query 可能携带较长的「选区上下文」（例如读者选中的一整段）。
   */
  @Post('relevant')
  @HttpCode(200)
  async relevant(
    @Body() body: { query?: string; limit?: number } | undefined,
  ): Promise<{ query: string; passages: PostSearchPassage[] }> {
    const query = (body?.query ?? '').toString().trim();
    if (!query) {
      throw new BadRequestException('query 不能为空');
    }
    if (query.length > 1024) {
      throw new BadRequestException('query 过长（最多 1024 字符）');
    }
    const lim =
      typeof body?.limit === 'number' && Number.isFinite(body.limit)
        ? body.limit
        : 6;
    try {
      const passages = await this.postsSearchService.findRelevantPassages(
        query,
        lim,
      );
      return { query, passages };
    } catch {
      return { query, passages: [] };
    }
  }

  /**
   * 今日精选：返回基于「日期 hash + 全库 slug」选中的一篇 PostSummary。
   * - 同一天访问拿到的是同一篇（与 SSG / CDN 缓存友好）
   * - 全库为空时返回 404
   */
  @Get('daily-pick')
  async dailyPick(): Promise<PostSummary> {
    const picked = await this.postsSearchService.pickDailyHighlight();
    if (!picked) {
      throw new NotFoundException('暂无可推荐的文章');
    }
    return picked;
  }

  /**
   * 知识图谱：返回所有已发布文章 + 文章间相似度边。
   * - `?threshold=1`：边权阈值（默认 1.0，约等于 Jaccard ≥ 0.01 起步）
   * - 数据足够前端做 force-directed layout 渲染
   */
  @Get('graph')
  async graph(@Query('threshold') threshold?: string): Promise<{
    nodes: Array<{
      slug: string;
      title: string;
      series: string;
      tags: string[];
      readingMinutes: number;
      url: string;
    }>;
    links: Array<{ source: string; target: string; weight: number }>;
  }> {
    const t = Number.parseFloat(threshold ?? '');
    const safeT = Number.isFinite(t) ? Math.max(0, t) : 1.0;
    return this.postsSearchService.buildGraph(safeT);
  }

  /**
   * 相关阅读：基于 char-trigram Jaccard + tag/series 加权评分。
   * - `?limit=4` 默认 4 条，最多 10 条
   * - 文章不存在 → 404；目标存在但没有相关项 → 200 + 空数组
   */
  @Get(':slug/related')
  async related(
    @Param('slug') slug: string,
    @Query('limit') limit?: string,
  ): Promise<{ slug: string; related: PostSearchHit[] }> {
    const lim = Number.parseInt(limit ?? '', 10);
    const safeLim = Number.isFinite(lim) ? lim : 4;
    /** 主动验证 slug 存在性，否则空数组与「不存在」会语义混淆 */
    await this.postsService.findPublishedBySlug(slug);
    const related = await this.postsSearchService.findRelated(slug, safeLim);
    return { slug, related };
  }

  /**
   * 单篇文章：含完整 Markdown 字符串，由前端再交给渲染器。
   */
  @Get(':slug')
  async detail(@Param('slug') slug: string): Promise<PostDetail> {
    return this.postsService.findPublishedBySlug(slug);
  }
}
