import { Controller, Get, Query } from '@nestjs/common';
import { ChangelogService } from './changelog.service';
import type {
  ChangelogKindFilter,
  ChangelogScopeFilter,
} from './changelog-filters';
import type {
  ChangelogListPageDto,
  ChangelogReleaseDto,
} from './types/changelog.types';

const CHANGELOG_KINDS = new Set(['feature', 'fix', 'breaking', 'docs', 'perf']);

/**
 * 版本历史：只读列表，数据存 SQLite。
 *
 * - `GET /api/changelog` → 全部发布记录（新在前），兼容 Agent 等旧客户端
 * - `GET /api/changelog?limit=&offset=` → 分页 + 筛选（`scope` / `kind`），见 `ChangelogListPageDto`
 */
@Controller('changelog')
export class ChangelogController {
  constructor(private readonly changelogService: ChangelogService) {}

  @Get()
  async list(
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
    @Query('scope') scopeStr?: string,
    @Query('kind') kindStr?: string,
  ): Promise<ChangelogReleaseDto[] | ChangelogListPageDto> {
    const paginated =
      limitStr !== undefined ||
      offsetStr !== undefined ||
      (scopeStr != null && scopeStr !== '') ||
      (kindStr != null && kindStr !== '');

    if (!paginated) {
      return this.changelogService.findAllForApi();
    }

    const limit = clampInt(limitStr, 8, 1, 50);
    const offset = clampInt(offsetStr, 0, 0, 10_000);
    const scope = parseScope(scopeStr);
    const kind = parseKind(kindStr);

    return this.changelogService.findPageForApi({
      limit,
      offset,
      scope,
      kind,
    });
  }
}

function clampInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = raw != null ? parseInt(raw, 10) : fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseScope(raw?: string): ChangelogScopeFilter {
  if (raw === 'web' || raw === 'api') return raw;
  return 'all';
}

function parseKind(raw?: string): ChangelogKindFilter {
  if (raw != null && CHANGELOG_KINDS.has(raw)) {
    return raw as ChangelogKindFilter;
  }
  return 'all';
}
