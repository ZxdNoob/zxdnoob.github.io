import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChangelogReleaseEntity } from '../database/changelog-release.entity';
import type { ChangelogReleaseDto } from './types/changelog.types';

@Injectable()
export class ChangelogService {
  constructor(
    @InjectRepository(ChangelogReleaseEntity)
    private readonly repo: Repository<ChangelogReleaseEntity>,
  ) {}

  async findAllForApi(): Promise<ChangelogReleaseDto[]> {
    const rows = await this.repo.find({
      order: { date: 'DESC', sortOrder: 'DESC', id: 'DESC' },
    });
    return rows.map((row) => this.toDto(row));
  }

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
