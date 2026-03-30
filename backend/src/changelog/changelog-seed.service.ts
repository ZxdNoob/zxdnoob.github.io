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
    const rows = await this.repo.find({ select: { id: true, webVersion: true, apiVersion: true } });
    const byKey = new Map(rows.map((r) => [`${r.webVersion ?? ''}|${r.apiVersion ?? ''}`, r.id]));

    const seeds: Partial<ChangelogReleaseEntity>[] = [
      SEED_RELEASE_001,
      SEED_RELEASE_002,
      SEED_RELEASE_003,
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
    this.logger.log(`已同步版本历史：新增 ${toInsert.length} 条，更新 ${toUpdate.length} 条`);
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
