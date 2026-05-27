import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChangelogReleaseEntity } from '../database/changelog-release.entity';
import {
  changelogYearsFromEntries,
  filterChangelogByKind,
  filterChangelogByScope,
  latestVersionsFromEntries,
  type ChangelogKindFilter,
  type ChangelogScopeFilter,
} from './changelog-filters';
import type {
  ChangelogListPageDto,
  ChangelogReleaseDto,
} from './types/changelog.types';

/**
 * 版本历史业务服务：从 `changelog_releases` 表读取记录并映射为 API DTO。
 * 排序规则与实体字段一致：先按 `date` 降序，同日再按 `sortOrder`、`id` 降序。
 */
@Injectable()
export class ChangelogService {
  constructor(
    @InjectRepository(ChangelogReleaseEntity)
    private readonly repo: Repository<ChangelogReleaseEntity>,
  ) {}

  /** 查询全部发布记录，供 `GET /api/changelog` 使用。 */
  async findAllForApi(): Promise<ChangelogReleaseDto[]> {
    const rows = await this.repo.find({
      order: { date: 'DESC', sortOrder: 'DESC', id: 'DESC' },
    });
    return rows.map((row) => this.toDto(row));
  }

  /**
   * 分页列表：先按库内顺序取全量再在内存中筛选（当前数据量可控）。
   * `latestWeb` / `latestApi` 始终基于未筛选的全量记录。
   */
  async findPageForApi(options: {
    limit: number;
    offset: number;
    scope?: ChangelogScopeFilter;
    kind?: ChangelogKindFilter;
  }): Promise<ChangelogListPageDto> {
    const all = await this.findAllForApi();
    const { latestWeb, latestApi } = latestVersionsFromEntries(all);

    const scope = options.scope ?? 'all';
    const kind = options.kind ?? 'all';
    let filtered = filterChangelogByScope(all, scope);
    filtered = filterChangelogByKind(filtered, kind);

    const years = changelogYearsFromEntries(filtered);
    const limit = Math.max(1, Math.min(50, options.limit));
    const offset = Math.max(0, options.offset);
    const entries = filtered.slice(offset, offset + limit);

    return {
      entries,
      total: filtered.length,
      limit,
      offset,
      hasMore: offset + entries.length < filtered.length,
      years,
      latestWeb,
      latestApi,
    };
  }

  /** 将 ORM 实体转为 API 层类型；`null` 字段转为 `undefined` 以精简 JSON。 */
  private toDto(row: ChangelogReleaseEntity): ChangelogReleaseDto {
    return {
      id: row.id,
      date: row.date,
      title: row.title ?? undefined,
      webVersion: row.webVersion ?? undefined,
      apiVersion: row.apiVersion ?? undefined,
      items: row.items,
    };
  }
}
