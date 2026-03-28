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
    const count = await this.repo.count();
    if (count > 0) return;

    await this.repo.save(SEED_RELEASE);
    this.logger.log('已写入初始版本历史 1 条');
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

const SEED_RELEASE: Partial<ChangelogReleaseEntity> = {
  date: '2026-03-28',
  title: '初始里程碑（0.0.1）',
  webVersion: '0.0.1',
  apiVersion: '0.0.1',
  items: SEED_ITEMS,
  sortOrder: 0,
};
