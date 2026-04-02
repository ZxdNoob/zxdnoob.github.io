import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { Repository } from 'typeorm';
import { PageViewCountEntity } from '../database/page-view-count.entity';
import { PageViewEntity } from '../database/page-view.entity';
import { SiteViewCountEntity } from '../database/site-view-count.entity';
import type { RecordViewResult, ViewCountDto } from './types/views.types';

/**
 * 防抖窗口：10 秒
 *
 * 这个窗口用于解决两类“非真实阅读”的重复计数：
 * - **刷新连击**：用户连续刷新页面（或浏览器恢复标签页）导致短时间内多次 POST
 * - **客户端路由重复触发**：Next.js 组件 mount/重渲染、prefetch 或某些浏览器行为造成的重复请求
 *
 * 选择 10 秒的原因：
 * - 足够覆盖“误触 + 连续刷新”的场景
 * - 又不会像 30 分钟 / 24 小时那样让本地调试或真实回访长期看不到增长
 *
 * 如果你希望更严格的去重（例如 30 分钟会话、按天 UV），只需把该窗口调大，
 * 同时可以把 fingerprint 加上日期因子（见后面 computeFingerprint 的注释）。
 */
const DEBOUNCE_WINDOW_MS = 10 * 1000;

/**
 * 浏览量服务：每次真实访问计数，短窗口防抖去重。
 *
 * 去重逻辑：
 *   fingerprint = SHA-256( IP | User-Agent | slug )
 *   同一指纹在 10 秒内重复请求只计 1 次（防刷新/导航重复）。
 *   超过 10 秒后再次访问即计为新的一次阅读。
 *
 * 与掘金、CSDN 等主流技术社区的计数行为一致。
 */
@Injectable()
export class ViewsService {
  private readonly logger = new Logger(ViewsService.name);

  /**
   * 机器人 UA 过滤列表（大小写不敏感）。
   *
   * ## 为什么要过滤？
   * - 搜索引擎、监控、性能测试工具会频繁抓取页面
   * - 不过滤会导致浏览量被“爬虫流量”污染，尤其是小站点非常明显
   *
   * ## 为什么用正则而不是依赖库？
   * - 依赖更少（后端镜像更小、风险更低）
   * - 覆盖常见来源：搜索引擎、社交预览、headless 浏览器、监控工具等
   *
   * 注意：它不是“绝对可靠”的 bot 检测（UA 可伪造），但对站点计数已经足够实用。
   */
  private static readonly BOT_PATTERNS: RegExp = new RegExp(
    [
      'bot',
      'crawl',
      'spider',
      'slurp',
      'scraper',
      'wget',
      'curl',
      'httpie',
      'facebookexternalhit',
      'twitterbot',
      'linkedinbot',
      'discordbot',
      'telegrambot',
      'whatsapp',
      'slackbot',
      'googlebot',
      'bingbot',
      'yandexbot',
      'baiduspider',
      'duckduckbot',
      'applebot',
      'semrushbot',
      'ahrefs',
      'mj12bot',
      'dotbot',
      'petalbot',
      'bytespider',
      'gptbot',
      'chatgpt',
      'headlesschrome',
      'phantomjs',
      'puppeteer',
      'playwright',
      'lighthouse',
      'pagespeed',
      'gtmetrix',
      'pingdom',
      'uptimerobot',
      'sitemonitor',
      'freshping',
    ].join('|'),
    'i',
  );

  constructor(
    @InjectRepository(PageViewEntity)
    private readonly viewRepo: Repository<PageViewEntity>,
    @InjectRepository(PageViewCountEntity)
    private readonly countRepo: Repository<PageViewCountEntity>,
    @InjectRepository(SiteViewCountEntity)
    private readonly siteCountRepo: Repository<SiteViewCountEntity>,
  ) {}

  async recordView(
    slug: string,
    ip: string,
    userAgent: string,
  ): Promise<RecordViewResult> {
    // 1) 过滤机器人：不写日志、不累加计数，直接返回当前缓存值
    if (ViewsService.isBot(userAgent)) {
      const views = await this.getViewCount(slug);
      return { slug, views, isNew: false };
    }

    // 2) 计算不可逆指纹：用于短窗口去重
    //    - 当前策略：IP + UA + slug（更接近“同一设备/浏览器访问同一页面”的定义）
    //    - 如果将来要按天 UV，可把 YYYY-MM-DD 加入这里（盐随天变化）
    const fingerprint = ViewsService.computeFingerprint(ip, userAgent, slug);

    try {
      // 3) 计算时间桶：用 DB 唯一约束做原子幂等（避免“先查再写”的竞态）
      const bucket = ViewsService.computeBucket(Date.now(), DEBOUNCE_WINDOW_MS);

      // 4) 写入日志（事实）：
      //    - 成功：说明是该指纹在该时间桶内的首次请求 → 计数 +1
      //    - 失败（唯一冲突）：说明窗口内已记过 → 不累加
      const view = this.viewRepo.create({
        slug,
        fingerprint,
        bucket,
        createdAt: new Date().toISOString(),
      });

      try {
        await this.viewRepo.insert(view);
      } catch (err: unknown) {
        if (ViewsService.isUniqueViolation(err)) {
          const views = await this.getViewCount(slug);
          return { slug, views, isNew: false };
        }
        throw err;
      }

      const newCount = await this.incrementCountAtomic(slug);
      return { slug, views: newCount, isNew: true };
    } catch (err: unknown) {
      // 失败不应该影响页面正常加载：返回当前计数即可
      this.logger.error(`Failed to record view for ${slug}`, err);
      const views = await this.getViewCount(slug);
      return { slug, views, isNew: false };
    }
  }

  async getViewCount(slug: string): Promise<number> {
    const row = await this.countRepo.findOne({ where: { slug } });
    return row?.views ?? 0;
  }

  async getAllViewCounts(): Promise<ViewCountDto[]> {
    const rows = await this.countRepo.find();
    return rows.map((r) => ({ slug: r.slug, views: r.views }));
  }

  async getViewCountsBatch(slugs: string[]): Promise<ViewCountDto[]> {
    if (slugs.length === 0) return [];
    const rows = await this.countRepo
      .createQueryBuilder('c')
      .where('c.slug IN (:...slugs)', { slugs })
      .getMany();
    const map = new Map(rows.map((r) => [r.slug, r.views]));
    return slugs.map((s) => ({ slug: s, views: map.get(s) ?? 0 }));
  }

  /**
   * 全站总浏览量（PV）：对计数表做 SUM 聚合。
   *
   * 注意：这是“已去重窗口后的累计 PV”，不是 UV。
   */
  async getTotalViews(): Promise<number> {
    const row = await this.countRepo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.views), 0)', 'total')
      .getRawOne<{ total: number | string }>();

    const raw = row?.total ?? 0;
    return typeof raw === 'number' ? raw : Number(raw) || 0;
  }

  /**
   * 全站 PV：每次页面进入/刷新都 +1（不做时间窗口去重）。
   *
   * 仍然复用 isBot 过滤爬虫，避免被搜索引擎等污染（UA 可伪造，但收益很高）。
   */
  async recordSiteView(userAgent: string): Promise<number> {
    if (ViewsService.isBot(userAgent)) return this.getSiteTotalViews();
    return this.incrementSiteCountAtomic();
  }

  async getSiteTotalViews(): Promise<number> {
    const row = await this.siteCountRepo.findOne({ where: { key: 'site' } });
    return row?.views ?? 0;
  }

  private async incrementSiteCountAtomic(): Promise<number> {
    const now = new Date().toISOString();
    await this.siteCountRepo.query(
      [
        `INSERT INTO site_view_counts (key, views, updated_at)`,
        `VALUES ('site', 1, ?)`,
        `ON CONFLICT(key) DO UPDATE SET`,
        `views = views + 1,`,
        `updated_at = excluded.updated_at`,
      ].join(' '),
      [now],
    );
    return this.getSiteTotalViews();
  }

  /**
   * 计数表原子自增：避免并发下的“读-改-写”丢失更新。
   * 使用 SQLite 的 UPSERT：
   *   INSERT ... ON CONFLICT(slug) DO UPDATE SET views=views+1
   */
  private async incrementCountAtomic(slug: string): Promise<number> {
    const now = new Date().toISOString();
    await this.countRepo.query(
      [
        `INSERT INTO page_view_counts (slug, views, updated_at)`,
        `VALUES (?, 1, ?)`,
        `ON CONFLICT(slug) DO UPDATE SET`,
        `views = views + 1,`,
        `updated_at = excluded.updated_at`,
      ].join(' '),
      [slug, now],
    );
    return this.getViewCount(slug);
  }

  static computeFingerprint(
    ip: string,
    userAgent: string,
    slug: string,
  ): string {
    // 这里输出 64 位 hex：更适合落库（SQLite varchar），也便于肉眼调试对比
    return createHash('sha256')
      .update(`${ip}|${userAgent}|${slug}`)
      .digest('hex');
  }

  static isBot(ua: string): boolean {
    // UA 为空或异常短，通常是脚本/探针/异常客户端：直接当作 bot
    if (!ua || ua.length < 10) return true;
    return ViewsService.BOT_PATTERNS.test(ua);
  }

  private static isUniqueViolation(err: unknown): boolean {
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      return msg.includes('unique') || msg.includes('duplicate');
    }
    return false;
  }

  static computeBucket(nowMs: number, windowMs: number): number {
    return Math.floor(nowMs / windowMs);
  }
}
