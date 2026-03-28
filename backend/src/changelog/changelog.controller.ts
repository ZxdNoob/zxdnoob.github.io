import { Controller, Get } from '@nestjs/common';
import { ChangelogService } from './changelog.service';
import type { ChangelogReleaseDto } from './types/changelog.types';

/**
 * 版本历史：只读列表，数据存 SQLite。
 *
 * `GET /api/changelog` → 全部发布记录（新在前）。
 */
@Controller('changelog')
export class ChangelogController {
  constructor(private readonly changelogService: ChangelogService) {}

  @Get()
  async list(): Promise<ChangelogReleaseDto[]> {
    return this.changelogService.findAllForApi();
  }
}
