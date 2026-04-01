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

    // Defensive cleanup: remove duplicates that share the same (webVersion, apiVersion).
    // This can happen if older data was inserted before we enforced "upsert by key".
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

    const freshRows = dupIds.length > 0 ? await this.repo.find({
      select: { id: true, webVersion: true, apiVersion: true },
    }) : rows;

    const byKey = new Map(
      freshRows.map((r) => [`${r.webVersion ?? ''}|${r.apiVersion ?? ''}`, r.id]),
    );

    const seeds: Partial<ChangelogReleaseEntity>[] = [
      SEED_RELEASE_001,
      SEED_RELEASE_002,
      SEED_RELEASE_003,
      SEED_RELEASE_004,
      SEED_RELEASE_005,
      SEED_RELEASE_006,
      SEED_RELEASE_007,
      SEED_RELEASE_008,
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
