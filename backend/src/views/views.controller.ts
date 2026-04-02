import { Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  RecordViewResult,
  SiteTotalViewsDto,
  TotalViewsDto,
  ViewCountDto,
} from './types/views.types';
import { ViewsService } from './views.service';

/**
 * 浏览量接口：
 *   POST /api/views/:slug  — 记录一次浏览
 *   GET  /api/views/:slug  — 查询单页浏览量
 *   GET  /api/views        — 批量查询（?slugs=a,b,c）或全量
 */
@Controller('views')
export class ViewsController {
  constructor(private readonly viewsService: ViewsService) {}

  @Get('total')
  async total(): Promise<TotalViewsDto> {
    const totalViews = await this.viewsService.getTotalViews();
    return { totalViews };
  }

  /**
   * 全站 PV（每次页面进入/刷新都累加一次）。
   *
   * GET：取当前值
   * POST：自增并返回自增后的值
   */
  @Get('site')
  async siteTotal(): Promise<SiteTotalViewsDto> {
    const siteTotalViews = await this.viewsService.getSiteTotalViews();
    return { siteTotalViews };
  }

  @Post('site')
  async recordSite(@Req() req: Request): Promise<SiteTotalViewsDto> {
    const ua = (req.headers['user-agent'] as string) ?? '';
    const siteTotalViews = await this.viewsService.recordSiteView(ua);
    return { siteTotalViews };
  }

  /**
   * 记录浏览。前端在文章详情页 mount 时调用一次。
   *
   * 通过反代头 `x-forwarded-for` 或 socket 取真实 IP；
   * `User-Agent` 从请求头获取。
   */
  @Post(':slug')
  async record(
    @Param('slug') slug: string,
    @Req() req: Request,
  ): Promise<RecordViewResult> {
    const ip = this.extractIp(req);
    const ua = (req.headers['user-agent'] as string) ?? '';
    return this.viewsService.recordView(slug, ip, ua);
  }

  @Get(':slug')
  async single(@Param('slug') slug: string): Promise<ViewCountDto> {
    const views = await this.viewsService.getViewCount(slug);
    return { slug, views };
  }

  /**
   * 批量或全量获取浏览量。
   *
   *   GET /api/views             → 全部
   *   GET /api/views?slugs=a,b,c → 指定列表
   */
  @Get()
  async batch(@Query('slugs') slugs?: string): Promise<ViewCountDto[]> {
    if (slugs) {
      const list = slugs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return this.viewsService.getViewCountsBatch(list);
    }
    return this.viewsService.getAllViewCounts();
  }

  /**
   * 从反向代理头或直连 socket 提取客户端 IP。
   * 支持 Cloudflare (cf-connecting-ip)、通用代理 (x-forwarded-for、x-real-ip)。
   */
  private extractIp(req: Request): string {
    const cf = req.headers['cf-connecting-ip'];
    if (typeof cf === 'string' && cf) return cf;

    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff) return xff.split(',')[0].trim();

    const real = req.headers['x-real-ip'];
    if (typeof real === 'string' && real) return real;

    return req.socket?.remoteAddress ?? '0.0.0.0';
  }
}
