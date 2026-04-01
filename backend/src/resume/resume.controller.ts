import { Controller, Get } from '@nestjs/common';
import { ResumeService } from './resume.service';
import type { ResumePayload } from './resume.types';

/**
 * 个人简历：单份文档，由 SQLite `resume` 表提供。
 *
 * `GET /api/resume` → 完整 JSON（与前端 `ResumePayload` 一致）
 */
@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Get()
  async getResume(): Promise<ResumePayload> {
    return this.resumeService.getDefault();
  }
}
