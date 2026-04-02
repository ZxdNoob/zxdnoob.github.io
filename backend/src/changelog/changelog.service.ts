import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChangelogReleaseEntity } from '../database/changelog-release.entity';
import type { ChangelogReleaseDto } from './types/changelog.types';

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
