import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChangelogReleaseEntity } from '../database/changelog-release.entity';
import type { ChangelogItemPayload } from './types/changelog.types';

/**
 * 首次启动且表为空时写入与仓库当前 0.0.1 里程碑一致的示例数据。
 */
@Injectable()
export class ChangelogSeedService implements OnModuleInit {
  private readonly logger = new Logger(ChangelogSeedService.name);

  constructor(
    @InjectRepository(ChangelogReleaseEntity)
    private readonly repo: Repository<ChangelogReleaseEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    const rows = await this.repo.find({
      select: { id: true, webVersion: true, apiVersion: true, date: true },
    });

    // 防御性清理：删除 (webVersion, apiVersion) 完全相同的重复行。
    // 旧数据在引入「按版本键 upsert」之前可能已插入多份，此处保留最新 date 的一条。
    // 按「web|api」版本键分组，找出同一键下的多条记录
    const byKeyRows = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = `${r.webVersion ?? ''}|${r.apiVersion ?? ''}`;
      const list = byKeyRows.get(key) ?? [];
      list.push(r);
      byKeyRows.set(key, list);
    }
    const dupIds: string[] = [];
    for (const list of byKeyRows.values()) {
      if (list.length <= 1) continue;
      // 同键保留 date 最新的一条，其余 id 待删除
      list.sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return db - da;
      });
      dupIds.push(...list.slice(1).map((r) => r.id));
    }
    if (dupIds.length > 0) {
      await this.repo.delete(dupIds);
      this.logger.warn(`已清理重复版本历史记录 ${dupIds.length} 条`);
    }

    const freshRows =
      dupIds.length > 0
        ? await this.repo.find({
            select: { id: true, webVersion: true, apiVersion: true },
          })
        : rows;

    // 去重后的当前库内「版本键 → 行 id」，用于后续 upsert
    const byKey = new Map(
      freshRows.map((r) => [
        `${r.webVersion ?? ''}|${r.apiVersion ?? ''}`,
        r.id,
      ]),
    );

    // 内置种子列表：与站点发版说明同步；新增键插入，已有关键字更新整行
    const seeds: Partial<ChangelogReleaseEntity>[] = [
      SEED_RELEASE_001,
      SEED_RELEASE_002,
      SEED_RELEASE_003,
      SEED_RELEASE_004,
      SEED_RELEASE_005,
      SEED_RELEASE_006,
      SEED_RELEASE_007,
      SEED_RELEASE_008,
      SEED_RELEASE_009,
      SEED_RELEASE_010,
      SEED_RELEASE_011,
      SEED_RELEASE_012,
      SEED_RELEASE_013,
      SEED_RELEASE_014,
      SEED_RELEASE_015,
      SEED_RELEASE_016,
      SEED_RELEASE_017,
      SEED_RELEASE_018,
      SEED_RELEASE_019,
      SEED_RELEASE_020,
      SEED_RELEASE_021,
      SEED_RELEASE_022,
    ];
    const toInsert: Partial<ChangelogReleaseEntity>[] = [];
    const toUpdate: Partial<ChangelogReleaseEntity>[] = [];

    for (const seed of seeds) {
      const key = `${seed.webVersion ?? ''}|${seed.apiVersion ?? ''}`;
      const id = byKey.get(key);
      if (!id) {
        toInsert.push(seed);
        continue;
      }
      toUpdate.push({ id, ...seed });
    }

    if (toInsert.length === 0 && toUpdate.length === 0) return;
    if (toInsert.length > 0) await this.repo.save(toInsert);
    if (toUpdate.length > 0) await this.repo.save(toUpdate);
    this.logger.log(
      `已同步版本历史：新增 ${toInsert.length} 条，更新 ${toUpdate.length} 条`,
    );
  }
}

const SEED_ITEMS: ChangelogItemPayload[] = [
  {
    kind: 'feature',
    surface: 'web',
    text: 'Next.js App Router、中文排版与站点壳（顶栏 / 页脚 / 文章流）。',
  },
  {
    kind: 'feature',
    surface: 'web',
    text: '草书字标 SVG、统一 favicon 与「版本历史」页面。',
  },
  {
    kind: 'feature',
    surface: 'api',
    text: 'NestJS + TypeORM + SQLite，提供文章 REST 与健康检查。',
  },
  {
    kind: 'docs',
    surface: 'both',
    text: 'CI（Vercel / 容器镜像）、Dependabot 与站点 metadata / sitemap。',
  },
];

const SEED_RELEASE_001: Partial<ChangelogReleaseEntity> = {
  date: '2026-03-28T12:00:00',
  title: '初始里程碑（0.0.1）',
  webVersion: '0.0.1',
  apiVersion: '0.0.1',
  items: SEED_ITEMS,
  sortOrder: 0,
};

const SEED_RELEASE_002: Partial<ChangelogReleaseEntity> = {
  date: '2026-03-30T22:23:52',
  title: '系列分组与内容基建（0.0.2）',
  webVersion: '0.0.2',
  apiVersion: '0.0.2',
  sortOrder: 1,
  items: [
    {
      kind: 'feature',
      surface: 'web',
      text: '首页重新设计：更强的 Hero 区域、主推文章卡片 + 紧凑文章目录（固定 3 篇），引导更清晰、信息密度更克制。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '全站视觉 Token 升级：新增 `--surface`/`--border`/按钮与 focus-ring 变量，暗色模式对比度与一致性更好。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '导航与交互升级：顶栏加宽与玻璃化背景，新增主题切换（system/light/dark）与移动端菜单。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '文章列表升级为“系列目录”：系列卡片折叠展开、目录式条目、展开状态记忆与更完善的可访问性/动效。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '文章阅读体验增强：详情页新增阅读进度条、回到顶部按钮，排版（Typography）与代码/引用块样式统一升级。',
    },
    {
      kind: 'fix',
      surface: 'web',
      text: '版本历史页视觉细节优化：变更类型图标在容器内水平/垂直居中对齐，边框与间距更稳定。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '文章卡片与页脚重做：列表卡片更产品化（hover/阴影/“阅读全文”引导），页脚新增导航、GitHub 与 sitemap 入口。',
    },
    {
      kind: 'feature',
      surface: 'api',
      text: '文章新增 `series` 字段，并随 `/api/posts` 与 `/api/posts/:slug` 返回，支持前端按系列分组。',
    },
    {
      kind: 'feature',
      surface: 'api',
      text: '种子文章机制升级：按 slug 补齐缺失文章，并同步元信息（如发布时间）避免重启后看不到新内容。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: '新增 TailwindCSS 实战系列种子文章（三篇）用于演示系列目录与阅读体验。',
    },
  ],
};

const SEED_RELEASE_003: Partial<ChangelogReleaseEntity> = {
  date: '2026-03-30T23:35:00',
  title: '阅读体验增强与稳定性修复（0.0.3）',
  webVersion: '0.0.3',
  apiVersion: '0.0.3',
  sortOrder: 2,
  items: [
    {
      kind: 'fix',
      surface: 'web',
      text: '修复文章页 Markdown 渲染导致的 hydration 失败：消除 `<p>` 内嵌块级元素（如 `<pre>/<div>`）的非法结构。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '代码块体验升级：新增一键复制与自动换行开关，长代码在小屏下更易阅读。',
    },
    {
      kind: 'fix',
      surface: 'web',
      text: '修复移动端头部菜单导航项“闪烁/一闪而过”：菜单开合状态与路由切换正确联动，交互更稳定。',
    },
    {
      kind: 'fix',
      surface: 'api',
      text: '新增历史文章 Markdown 围栏修复：自动纠正被转义的 fenced code（`\\`\\`\\`\\`` → ```），启动时幂等修复存量数据。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: '前后端版本号统一升级至 0.0.3，并同步更新版本历史。',
    },
  ],
};

const SEED_RELEASE_004: Partial<ChangelogReleaseEntity> = {
  date: '2026-03-31T00:00:12',
  title: '工程化与格式化规范（0.0.4）',
  webVersion: '0.0.4',
  sortOrder: 3,
  items: [
    {
      kind: 'docs',
      surface: 'web',
      text: '前端版本号升级至 0.0.4；后端版本保持 0.0.3（本次无 API 行为变更）。',
    },
    {
      kind: 'docs',
      surface: 'web',
      text: '新增根目录 Prettier 配置与忽略规则，并提供 VSCode 保存时格式化/ESLint 修复建议，统一代码风格（single-quote、trailing-comma）。',
    },
    {
      kind: 'docs',
      surface: 'web',
      text: 'ESLint 与 Prettier 协作：引入 `eslint-config-prettier`（flat），新增 `lint:fix` / `format` / `format:check` 脚本，减少格式相关的 lint 噪音。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: 'CI 与 GitHub Pages 部署流程增加 Prettier 校验，并做了一次全仓格式化整理，降低 PR diff 噪音、让流水线更稳定可复现。',
    },
  ],
};

const SEED_RELEASE_005: Partial<ChangelogReleaseEntity> = {
  date: '2026-03-31T19:42:32',
  title: '文章索引与阅读体验（0.0.5 / API 0.0.4）',
  webVersion: '0.0.5',
  apiVersion: '0.0.4',
  sortOrder: 4,
  items: [
    {
      kind: 'feature',
      surface: 'web',
      text: '文章索引页重做为“可筛选列表”：支持按系列筛选、按标签筛选（含“更多/收起”）、关键词搜索（标题/描述/标签/系列）、最新/最早排序，并记忆“是否显示筛选区”的偏好。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '文章索引支持渐进加载：首屏展示 40 篇，滚动接近底部自动加载更多，同时保留“加载更多”按钮作为显式兜底；筛选条件变化会自动重置可见数量。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '文章详情页新增右侧目录（h2/h3/h4）：自动提取 Markdown 标题并高亮当前阅读小节，便于长文定位与快速跳转。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '文章详情页阅读工具条：提供沉浸式阅读模式（隐藏站点头/尾并可尝试进入全屏）、以及“回到顶部”按钮（滚动超过阈值后出现）；沉浸式开关会记忆。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '阅读进度条计算更精确：可配置以文章容器为起点、以正文末尾为 100%（视口底部到达正文底部），并保留整页滚动的回退逻辑。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '正文标题锚点体验升级：为 h2/h3/h4 提供可复制/可跳转的 # 锚点链接，并统一 scroll margin，配合目录跳转更稳定。',
    },
    {
      kind: 'fix',
      surface: 'web',
      text: '修复刷新后“闪屏/闪白”：主题初始化在首屏绘制前完成（避免先浅后深），并同步 `color-scheme` 与页面底色以减少主题切换闪烁。',
    },
    {
      kind: 'fix',
      surface: 'api',
      text: '阅读时长预估算法更新（后端）：综合中文字符/英文词、代码块行数、以及符号密度与代码占比的难度系数，调整 `/api/posts` 返回的 `readingMinutes` 使其更贴近技术类长文的实际阅读成本。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: '版本号升级：前端 0.0.5；后端 0.0.4，并在版本历史中同步记录本次改动。',
    },
  ],
};

const SEED_RELEASE_006: Partial<ChangelogReleaseEntity> = {
  date: '2026-04-01T18:50:36',
  title: '在线简历与站点导航完善（0.0.6 / API 0.0.5）',
  webVersion: '0.0.6',
  apiVersion: '0.0.5',
  sortOrder: 5,
  items: [
    {
      kind: 'feature',
      surface: 'web',
      text: '新增在线简历页 `/resume`：服务端渲染拉取后端简历 JSON，并提供独立的 SEO metadata（title/description/openGraph）。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '新增简历展示组件体系：章节目录（移动/桌面）、技术栈分组卡片、经历时间线（支持展开/收起与“Current/至今”识别）、代表项目卡片（职责与成果双栏可折叠）。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '新增简历数据访问与类型：`fetchResume()` 对接 `GET /api/resume`；补齐 `ResumePayload` 等类型定义并与后端结构对齐。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '站点导航与 SEO 覆盖完善：顶栏/页脚新增“简历”“版本历史”入口；`sitemap.xml` 新增 `/resume` 与 `/changelog` 静态页链接。',
    },
    {
      kind: 'feature',
      surface: 'api',
      text: '新增简历模块与数据持久化：SQLite 新增 `resume` 表（`payload` 为完整 JSON），提供 `GET /api/resume` 返回默认简历文档。',
    },
    {
      kind: 'feature',
      surface: 'api',
      text: '新增简历种子同步机制：启动时将 `default-resume.payload.ts` 同步写入数据库；支持 `RESUME_SKIP_SEED_SYNC=1/true` 跳过覆盖以便手动维护库内数据。',
    },
    {
      kind: 'docs',
      surface: 'api',
      text: '端到端测试补齐：新增 `GET /api/resume` e2e 覆盖，确保全局前缀配置与线上路径一致（`/api/*`）。',
    },
  ],
};

const SEED_RELEASE_007: Partial<ChangelogReleaseEntity> = {
  date: '2026-04-01T19:13:09',
  title: '部署稳定性与提交前格式化兜底（0.0.7）',
  webVersion: '0.0.7',
  sortOrder: 6,
  items: [
    {
      kind: 'fix',
      surface: 'both',
      text: '修复前后端 Prettier 校验失败的格式问题，避免部署/CI 在 `format:check` 阶段中断。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: '新增提交前自动格式化：引入 `husky` + `lint-staged`，对暂存区文件按各自 Prettier 配置执行 `--write`，从源头规避格式类部署失败。',
    },
  ],
};

const SEED_RELEASE_008: Partial<ChangelogReleaseEntity> = {
  date: '2026-04-01T19:46:20',
  title: '移动端菜单兼容性修复（0.0.8）',
  webVersion: '0.0.8',
  sortOrder: 7,
  items: [
    {
      kind: 'fix',
      surface: 'web',
      text: '修复移动端在部分浏览器中点击右上角菜单/下拉入口无反应：对不支持 Pointer Events 的环境降级使用 `touchstart`/`mousedown` 监听，保证可点击与点外部关闭逻辑可用。',
    },
    {
      kind: 'fix',
      surface: 'web',
      text: '兼容旧版 Safari 主题跟随系统：`matchMedia` 监听在缺失 `addEventListener` 时回退到 `addListener/removeListener`，避免报错影响页面交互。',
    },
  ],
};

const SEED_RELEASE_009: Partial<ChangelogReleaseEntity> = {
  date: '2026-04-03T00:02:26',
  title: '访问统计与首页主题排版更新（0.0.9 / API 0.0.6）',
  webVersion: '0.0.9',
  apiVersion: '0.0.6',
  sortOrder: 8,
  items: [
    {
      kind: 'feature',
      surface: 'web',
      text: '首页全面重排：Hero 采用更强的标题层级、背景氛围渐变与点阵纹理；模块分段更清晰，整体更“主题化”。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '首页新增“探索站点”Bento 卡片区：将「文章 / 简历 / 版本历史」作为明确入口，并使用 Spotlight/光晕交互强化可点击性。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '首页新增数据概览卡片：文章数、系列数、全站总浏览量（PV）用数字滚动计数器呈现，进入视口后再触发动画，避免首屏外“白跑”。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '首页“最新文章”区改为 1 主推 + 2 紧凑列表：卡片元信息中展示阅读时长/发布时间/浏览量，强化内容热度感知。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '新增 Scroll Reveal 动效体系：基于 IntersectionObserver 触发一次性显隐；遵循 `prefers-reduced-motion`，并统一在全局样式里管理过渡曲线与位移。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '新增 Cmd+K 命令面板（Command Palette）：支持搜索页面/链接、方向键选择、回车执行、ESC 关闭；作为全局能力挂载在根布局中。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '站点访问量展示：页脚展示“总访问量”，并在每次路由切换/进入时上报后立即广播事件，让 UI 能即时刷新。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '文章浏览量接入到列表与详情页：列表页服务端批量拉取各 slug 浏览量；详情页服务端预取首屏值，客户端 mount 时 POST 记录一次阅读并回写最新值。',
    },
    {
      kind: 'fix',
      surface: 'web',
      text: '返回/缓存恢复兼容：针对 bfcache 恢复后 IntersectionObserver 不重跑导致内容“永久隐藏”的情况，在 `pageshow/popstate` 触发多次 reveal 兜底。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '新增路由级骨架与空态：`/loading`、`/blog/loading`、`/resume/loading`、`/changelog/loading` 与全站 `not-found`，弱网/首次加载体验更稳定。',
    },
    {
      kind: 'perf',
      surface: 'web',
      text: '访问统计 API 封装分层：区分 RSC 服务端拉取（可用内网 `API_URL`）与浏览器端上报（仅用 `NEXT_PUBLIC_API_URL`）；静态导出场景下读接口使用 `force-cache` 避免构建失败。',
    },
    {
      kind: 'docs',
      surface: 'web',
      text: '主题与组件样式体系更新：新增 background/foreground/surface/border 等 Token、按钮样式（primary/secondary）、以及多组动效 keyframes（渐入、漂浮、慢速旋转等），用于统一首页与全站视觉语言。',
    },
    {
      kind: 'feature',
      surface: 'api',
      text: '新增浏览量模块 `ViewsModule`：提供 `GET /api/views`（批量/全量）、`GET /api/views/:slug`（单篇）、`POST /api/views/:slug`（记录阅读）、`GET /api/views/total`（全站累计阅读量 SUM）。',
    },
    {
      kind: 'feature',
      surface: 'api',
      text: '新增全站 PV 计数：`GET/POST /api/views/site` 读取或自增全站访问量（刷新/进入均累加），并持久化在 `site_view_counts` 单行表。',
    },
    {
      kind: 'feature',
      surface: 'api',
      text: '新增三表支撑统计：`page_views`（日志）、`page_view_counts`（按 slug 的计数缓存）、`site_view_counts`（全站 PV）；计数使用 SQLite UPSERT 原子自增，避免并发丢失更新。',
    },
    {
      kind: 'feature',
      surface: 'api',
      text: '文章浏览量“短窗口防抖去重”：指纹 = SHA-256(IP|UA|slug)，以 10 秒时间桶做 UNIQUE 约束，避免刷新连击与重复触发刷量，同时允许超过窗口后正常增长。',
    },
    {
      kind: 'fix',
      surface: 'api',
      text: '反向代理与跨域补齐：启用 `trust proxy` 以正确读取 `x-forwarded-for` 等真实 IP；CORS 显式放开 POST 以支持浏览器端上报。',
    },
    {
      kind: 'perf',
      surface: 'api',
      text: '爬虫/探针流量过滤：基于 UA 的 bot 关键字正则做实用级过滤，避免小站点 PV 被抓取污染；过滤命中时不写入日志也不累加计数。',
    },
  ],
};

const SEED_RELEASE_010: Partial<ChangelogReleaseEntity> = {
  date: '2026-04-03T20:20:09',
  title: '前端 0.0.10：静态站访问统计与页脚总访问量（API 仍为 0.0.6）',
  webVersion: '0.0.10',
  apiVersion: '0.0.6',
  sortOrder: 9,
  items: [
    {
      kind: 'docs',
      surface: 'both',
      text: 'Summary：修复 GitHub Pages 静态站在生产环境无法正确上报/展示访问量的问题；通过“构建期注入公网 API 基址 + 前端仅对本地开发回退端口 + 页脚首屏预取”三步，保证 PV/文章浏览量可累计且 UI 首屏可见。',
    },
    {
      kind: 'fix',
      surface: 'both',
      text: 'Changed（共通 / 部署）：GitHub Pages 构建流程注入 NEXT_PUBLIC_API_URL（浏览器可见），并与 PAGES_REMOTE_API_URL/Actions Variables 对齐，确保静态导出与线上浏览器请求命中同一公网 API 根地址。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: 'Config（共通）：新增/强调构建期必须配置 NEXT_PUBLIC_API_URL（公网 API 根地址，无尾斜杠）。静态站点不会“自动猜到”后端地址；缺失该配置将导致浏览量无法上报。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: 'Release info（共通）：Web 版本升级至 0.0.10；API 版本保持 0.0.6（无后端发版）。Breaking changes：无。',
    },
    {
      kind: 'fix',
      surface: 'web',
      text: 'Fixed（前端 / API 基址）：getClientApiBaseUrl 仅在 localhost/127.0.0.1 下回退到 :4000；生产域名不再误连 “当前站点:4000”。未配置 NEXT_PUBLIC_API_URL 时返回 null，使统计请求显式失败而非悄悄打到错误主机。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: 'Added（前端 / 首屏数据）：RootLayout 构建期/SSR 预取全站 PV（fetchSiteTotalViews），作为 initialSiteTotalViews 注入页脚，避免“必须等客户端请求成功才出现总访问量”的空白体验。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: 'Changed（前端 / 展示策略）：页脚总访问量改为“始终渲染”，使用 initialSiteTotalViews 作为初值；客户端仍会 GET 刷新，并继续响应 site:total-views 事件实时更新。',
    },
  ],
};

const SEED_RELEASE_011: Partial<ChangelogReleaseEntity> = {
  date: '2026-04-03T21:32:06',
  title: '前端 0.0.11：未配置公网 API 时隐藏访问量展示（API 仍为 0.0.6）',
  webVersion: '0.0.11',
  apiVersion: '0.0.6',
  sortOrder: 10,
  items: [
    {
      kind: 'feature',
      surface: 'web',
      text: '未配置浏览器可访问的 API 根地址（`NEXT_PUBLIC_API_URL` 或 `src/config/public-api.json` 的 `apiBaseUrl`）时，隐藏首页/文章列表/文章详情/页脚中的访问量与浏览量展示，并停止全站 PV 上报，避免无后端时展示误导性数字。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: 'Release info（共通）：Web 版本升级至 0.0.11；API 版本保持 0.0.6（无后端发版）。Breaking changes：无。',
    },
  ],
};

const SEED_RELEASE_012: Partial<ChangelogReleaseEntity> = {
  date: '2026-04-07T18:52:33',
  title: '前端 0.0.12：文章索引页双视图与筛选体验升级（API 仍为 0.0.6）',
  webVersion: '0.0.12',
  apiVersion: '0.0.6',
  sortOrder: 11,
  items: [
    {
      kind: 'feature',
      surface: 'web',
      text: '文章索引页升级：新增网格/列表双视图、搜索 + 系列 + 标签筛选、排序（最新/最早/阅读时长）与“活跃筛选”摘要展示，整体信息密度与可用性更好。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '筛选状态与 URL 查询参数同步（q/series/tag/sort/view），支持分享与刷新后保留筛选；筛选条支持桌面端置顶与滚动后紧凑模式。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '文章列表卡片组件化：新增 `BlogPostCard`（Spotlight 卡片风格），在卡片内统一展示发布时间、阅读时长、系列/标签与“阅读全文”引导。',
    },
    {
      kind: 'perf',
      surface: 'web',
      text: '渐进加载体验优化：首屏更小的初始展示量，后续按屏幕尺寸自适应每次加载步长，并在移动端提供“继续下滑自动加载更多”的提示与加载状态。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: 'Release info（共通）：Web 版本升级至 0.0.12；API 版本保持 0.0.6（无后端发版）。Breaking changes：无。',
    },
  ],
};

const SEED_RELEASE_013: Partial<ChangelogReleaseEntity> = {
  date: '2026-04-08T11:06:32',
  title: '前端 0.0.13：全屏 Canvas 动态背景与首页性能优化（API 仍为 0.0.6）',
  webVersion: '0.0.13',
  apiVersion: '0.0.6',
  sortOrder: 12,
  items: [
    {
      kind: 'feature',
      surface: 'web',
      text: '首页新增沉浸式全屏 Canvas 动态背景：粒子星座连线 + 极光波浪层 + 鼠标交互，铺满整个视窗并作为固定背景渲染。',
    },
    {
      kind: 'perf',
      surface: 'web',
      text: 'Canvas 性能优化：帧率节流、粒子数量下调、空间网格加速邻域连线、连线按透明度分桶批量绘制、粒子精灵预渲染避免每帧创建渐变对象，并在页面隐藏时暂停动画。',
    },
    {
      kind: 'perf',
      surface: 'web',
      text: '首页与全站视觉层性能优化：减少 `backdrop-blur` 的使用、优化噪点纹理成本，并为 Spotlight 卡片增加 containment 以降低 hover/鼠标移动的布局开销。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: 'Release info（共通）：Web 版本升级至 0.0.13；API 版本保持 0.0.6（无后端发版）。Breaking changes：无。',
    },
  ],
};

const SEED_RELEASE_014: Partial<ChangelogReleaseEntity> = {
  date: '2026-04-15T17:05:06',
  title: '前端 0.0.14：移动端文章列表视图切换优化（API 仍为 0.0.6）',
  webVersion: '0.0.14',
  apiVersion: '0.0.6',
  sortOrder: 13,
  items: [
    {
      kind: 'fix',
      surface: 'web',
      text: '移动端文章列表页移除无效的「网格/列表」视图切换按钮：因移动端两种模式渲染结果完全一致，使用 `hidden sm:contents` 在小屏下隐藏切换入口，避免用户误操作。',
    },
    {
      kind: 'fix',
      surface: 'web',
      text: '移动端文章列表结果摘要中隐藏"展示模式为 网格/列表"描述文本，与切换按钮的可见性保持一致。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: 'Release info（共通）：Web 版本升级至 0.0.14；API 版本保持 0.0.6（无后端发版）。Breaking changes：无。',
    },
  ],
};

const SEED_RELEASE_015: Partial<ChangelogReleaseEntity> = {
  date: '2026-05-01T11:01:00',
  title: '站内 Agent 上线（Web 0.1.0 / API 0.0.7）',
  webVersion: '0.1.0',
  apiVersion: '0.0.7',
  sortOrder: 14,
  items: [
    {
      kind: 'feature',
      surface: 'web',
      text: '新增站内 AI 向导（Agent）页面 `/agent`：支持启动/切换会话、展示事件流（模型输出/工具步骤）、以及更贴近“可观测”的交互面板体验。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '新增 Agent 组件与运行时：`use-agent` 状态机、消息/工具步骤渲染、快捷操作与启动器组件，便于在站点内快速调用与复用。',
    },
    {
      kind: 'feature',
      surface: 'api',
      text: '新增 Agent Sessions 模块：提供会话管理与持久化（SQLite），支持创建/查询会话，为前端多会话切换与追踪奠定基础。',
    },
    {
      kind: 'feature',
      surface: 'api',
      text: '新增 Agent Memory 模块：提供记忆写入/读取接口与数据库实体，支持把关键上下文沉淀为长期信息以改善后续对话质量。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: 'Release info（共通）：前端版本升级至 0.1.0；后端版本升级至 0.0.7，并在版本历史中同步记录本次 Agent 能力上线。',
    },
  ],
};

const SEED_RELEASE_016: Partial<ChangelogReleaseEntity> = {
  date: '2026-05-02T09:35:23',
  title: 'Java 系列种子正文与 AI 向导站点露出（Web 0.1.1 / API 0.0.8）',
  webVersion: '0.1.1',
  apiVersion: '0.0.8',
  sortOrder: 15,
  items: [
    {
      kind: 'feature',
      surface: 'web',
      text: '首页强化站内 AI 向导露出：探索区新增「AI 向导」Bento 卡、Hero 区主操作与 ⌘I 快捷键提示；底部行动区补充「打开 AI 向导」入口。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: 'SEO：`sitemap.xml` 增加静态路由 `/agent`；页脚导航新增「AI 向导」，并在宽屏说明文案中补充 ⌘I 与 `/agent` 直达链接。',
    },
    {
      kind: 'feature',
      surface: 'api',
      text: 'SQLite 种子文章扩充：新增「Java 从基础到精通（初级 · 高级 · 专家路线）」系列多篇示例正文（路线图与基础/进阶/精通各篇），便于本地与 CI 构建拉取完整教程演示数据。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: 'Release info（共通）：前端版本升级至 0.1.1；后端版本升级至 0.0.8，并在版本历史中同步记录。',
    },
  ],
};

const SEED_RELEASE_017: Partial<ChangelogReleaseEntity> = {
  date: '2026-05-08T21:37:30',
  title: '混合检索、阅读增强与 PWA / OG（Web 0.1.2 / API 0.0.9）',
  webVersion: '0.1.2',
  apiVersion: '0.0.9',
  sortOrder: 16,
  items: [
    {
      kind: 'feature',
      surface: 'api',
      text: '文章检索增强：SQLite FTS5 与基于重叠度的 RRF 融合排序；新增 `GET /api/posts/search` 与 Agent 工具 `semantic_search_posts` 对接。',
    },
    {
      kind: 'feature',
      surface: 'api',
      text: '阅读与发现 API：新增 `POST /api/posts/relevant`、`GET /api/posts/:slug/related`、`GET /api/posts/daily-pick` 与 `GET /api/posts/graph`（节点/边供知识图谱页消费）。',
    },
    {
      kind: 'perf',
      surface: 'api',
      text: 'Agent RAG：`find_relevant_passages` 扩大候选并取 Top 10；系统提示引导模型先评估相关性再引用，减少误引与幻觉。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '博客阅读体验：文章页「相关阅读」与「每日精选」；文末集成 Giscus（GitHub Discussions）评论；主题切换启用 View Transitions。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '站内 AI：首页 Hero 可发起对话、文章页 Post Companion；命令面板未命中时转入 Agent；向导工具与后端新检索/相关接口对齐。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: 'PWA：`manifest`、Service Worker 离线缓存（HTML / 静态资源 / 近期文章）与注册组件。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '社交分享：`app/blog/[slug]/opengraph-image` 在构建期生成品牌化 OG 图；站点级默认 OG 图补充。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '新增 `/blog/graph`：力导向 SVG 可视化文章关联网络。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: 'Release info（共通）：前端版本升级至 0.1.2；后端版本升级至 0.0.9，并在版本历史中同步记录。',
    },
  ],
};

const SEED_RELEASE_018: Partial<ChangelogReleaseEntity> = {
  date: '2026-05-12T19:13:09',
  title: '悬浮导航 Dock 体验优化（Web 0.1.3 / API 仍为 0.0.9）',
  webVersion: '0.1.3',
  apiVersion: '0.0.9',
  sortOrder: 17,
  items: [
    {
      kind: 'feature',
      surface: 'web',
      text: '`public/theme-init.js`（beforeInteractive）在 hydration 前读取 `site-nav-dock-v1`，同步写入 `--nav-pad-*`、`data-nav-dock` 与折叠标记，正文边距与根节点状态首屏即与记忆位置一致。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '悬浮导航条在读完 localStorage 并完成 store 同步前保持不可见（`visibility`/`opacity`/`pointer-events`），再在记忆边缘位置显示，避免先出现在默认顶栏再跳动；`layout` 内 `noscript` 样式在无 JS 时强制显示 `[data-site-header]`。',
    },
    {
      kind: 'fix',
      surface: 'web',
      text: '首帧布局对齐后通过 `queueMicrotask`/`requestAnimationFrame` 再开启显隐与位置相关过渡，避免从默认位动画滑向记忆位的不自然感。',
    },
    {
      kind: 'fix',
      surface: 'web',
      text: '在位置设置菜单中选择顶/底/左/右后自动关闭下拉菜单，减少一次手动点击。',
    },
    {
      kind: 'docs',
      surface: 'web',
      text: '更新 `globals.css` 与根布局注释，说明 `--nav-pad-*` 可由首屏脚本与 `SiteHeader` 共同写入。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: 'Release info（共通）：前端版本升级至 0.1.3；API 版本保持 0.0.9（无后端发版）。Breaking changes：无。',
    },
  ],
};

const SEED_RELEASE_019: Partial<ChangelogReleaseEntity> = {
  date: '2026-05-14T21:25:02',
  title: '悬浮导航窄屏布局与拖拽体验（Web 0.1.4 / API 仍为 0.0.9）',
  webVersion: '0.1.4',
  apiVersion: '0.0.9',
  sortOrder: 18,
  items: [
    {
      kind: 'feature',
      surface: 'web',
      text: '窄屏（视口宽度小于 Tailwind `md`，与 `max-width: 767px` 一致）下 Dock 固定为顶栏：`SiteHeader` 与 `applyDockVars` 使用 `effectiveNavDockState`，`public/theme-init.js` 首屏写入的 `--nav-pad-*` / `data-nav-dock` 与之对齐；隐藏抓手与「悬浮位置」菜单；折叠态仅支持点击展开。订阅 `matchMedia` 在横竖屏与窗口缩放时重新应用边距变量。',
    },
    {
      kind: 'fix',
      surface: 'web',
      text: '横栏布局在 `md` 以下内联主导航收入汉堡时，Logo 与工具区之间不再出现两道紧贴的竖向分隔线。',
    },
    {
      kind: 'fix',
      surface: 'web',
      text: '拖拽起手用 `getBoundingClientRect` 计算 Dock 几何中心相对指针的偏移，拖动过程中以中心跟手，避免按下瞬间整条栏跳到指针正下方。',
    },
    {
      kind: 'fix',
      surface: 'web',
      text: '拖拽路径补充 `setPointerCapture` 与抓手/折叠球的 `touch-action: none`，减轻触摸环境下页面滚动与指针丢失导致的拖动中断。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: 'Release info（共通）：前端版本升级至 0.1.4；API 版本保持 0.0.9（无后端发版）。Breaking changes：无。',
    },
  ],
};

const SEED_RELEASE_020: Partial<ChangelogReleaseEntity> = {
  date: '2026-05-16T10:08:12',
  title: '文章关系图谱画布增强（Web 0.1.5 / API 仍为 0.0.9）',
  webVersion: '0.1.5',
  apiVersion: '0.0.9',
  sortOrder: 19,
  items: [
    {
      kind: 'feature',
      surface: 'web',
      text: '`/blog/graph`：图谱数据变更时用稳定 `key` remount `<PostsGraph>`，缩放与平移回到默认，避免在数据 effect 内同步改写 viewBox。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '力导向画布交互对齐常见白板：空白 / 中键 / 空格+左键拖动画布；触控板双指平移；Ctrl/Meta+滚轮与捏合缩放；Shift+滚轮将纵向滚动转为横向平移；悬浮工具栏与键盘 `+`/`−`/`0`/方向键缩放与复位。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '系列筛选支持多选；顶栏胶囊在宽度不足时出现「更多」下拉（`ResizeObserver` 动态测算可容纳数量）。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '悬停卡片可捕获指针以点击「阅读全文」；短延迟收起降低误触；Esc 关闭卡片；输入框 / 工具栏 / tooltip 内不误触画布快捷键。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '`PostsGraph`：力学迭代封装在 `GraphSimulation`，渲染侧以 snapshot 浅拷贝同步坐标，兼容 React 19 不变性约束。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: 'Release info（共通）：前端版本升级至 0.1.5；API 版本保持 0.0.9（无后端发版）。Breaking changes：无。',
    },
  ],
};

const SEED_RELEASE_021: Partial<ChangelogReleaseEntity> = {
  date: '2026-05-26T11:25:02',
  title: '文章关系图谱移动端体验（Web 0.1.6 / API 仍为 0.0.9）',
  webVersion: '0.1.6',
  apiVersion: '0.0.9',
  sortOrder: 20,
  items: [
    {
      kind: 'feature',
      surface: 'web',
      text: '窄屏（`< md`）下 `/blog/graph` 使用移动端专属交互：`useMobileViewport` 切换 `PostsGraph` 布局；点选节点打开底部详情 Sheet（系列 / 阅读时长 / 标签 /「阅读全文」），不再依赖 hover 浮卡；系列筛选收入底部 Sheet 多选列表。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '移动端画布：`min(72dvh, 560px)` 可视高度、加大节点透明点击区、底部缩放工具条（44px 触控目标）；`useGraphPinchZoom` 双指捏合缩放；节点不进入力导向拖拽，避免与单指平移冲突。',
    },
    {
      kind: 'fix',
      surface: 'web',
      text: '底部 Sheet 打开时 `useBodyScrollLock`（`position: fixed` + 恢复 scrollY）锁定页面滚动；列表区 `useSheetScrollContain` 在顶/底边界拦截 touch 滚动链，修复系列筛选向上滑动时背后页面跟着滚的穿透问题。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '抽取 `posts-graph-viewbox.ts` 共享 viewBox / 缩放常量；`posts-graph-mobile.tsx` 承载移动端 UI 与捏合逻辑；图谱页窄屏文案与页头间距适配。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: 'Release info（共通）：前端版本升级至 0.1.6；API 版本保持 0.0.9（无后端发版）。Breaking changes：无。',
    },
  ],
};

const SEED_RELEASE_022: Partial<ChangelogReleaseEntity> = {
  date: '2026-05-27T12:13:52',
  title: '版本历史页体验与分页 API（Web 0.1.7 / API 0.0.10）',
  webVersion: '0.1.7',
  apiVersion: '0.0.10',
  sortOrder: 21,
  items: [
    {
      kind: 'feature',
      surface: 'api',
      text: '`GET /api/changelog?limit=&offset=` 返回分页对象（`entries`、`total`、`hasMore`、`years`、全局 `latestWeb` / `latestApi`）；支持 `scope`（web/api）与 `kind` 筛选；无查询参数时仍返回完整数组，兼容 Agent 等旧客户端。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '版本历史页首屏仅 SSR 最近 8 条发布记录，其余通过「加载更多」按需拉取；筛选切换时从 offset=0 重新请求，避免只过滤已加载片段。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '页面布局与交互重构：用户向 Hero 文案、2×2 统计卡片、横向滑动筛选 Chips（更大触控目标）、时间轴移动端年份标题；发布卡片抽至 `changelog-release-card.tsx`。',
    },
    {
      kind: 'feature',
      surface: 'web',
      text: '年份快捷跳转：目标年份未加载时自动连续分页直至可滚动定位；锚点 `scroll-margin` 与桌面侧栏年份 sticky 使用 `--changelog-sticky-offset` 避让吸顶区。',
    },
    {
      kind: 'fix',
      surface: 'web',
      text: '筛选栏吸顶：新增 `.sticky-below-site-nav`，`top` 与 `--nav-pad-top` 同步（随导航折叠动画），`z-index` 低于悬浮 Dock；筛选与年份跳转合并为同一吸顶块，修复移动端被导航遮挡与吸顶留白问题。',
    },
    {
      kind: 'docs',
      surface: 'both',
      text: 'Release info（共通）：前端版本升级至 0.1.7；后端版本升级至 0.0.10，并在版本历史中同步记录。Breaking changes：无（分页为可选查询参数）。',
    },
  ],
};
