import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumeEntity } from '../database/resume.entity';
import { DEFAULT_RESUME_PAYLOAD } from './default-resume.payload';

/** 与 `ResumeService` 读取时使用的 id 一致，保证单行简历文档。 */
const DEFAULT_ID = 'default';

@Injectable()
export class ResumeSeedService implements OnModuleInit {
  private readonly logger = new Logger(ResumeSeedService.name);

  constructor(
    @InjectRepository(ResumeEntity)
    private readonly resumeRepo: Repository<ResumeEntity>,
  ) {}

  /**
   * 每次启动将 `default-resume.payload.ts` 写入 `resume` 表，保证改代码后重启即可生效。
   * 若仅在库里改 JSON、且不希望被覆盖，可设置 `RESUME_SKIP_SEED_SYNC=1`。
   */
  async onModuleInit(): Promise<void> {
    const skip =
      process.env.RESUME_SKIP_SEED_SYNC === '1' ||
      process.env.RESUME_SKIP_SEED_SYNC === 'true';
    if (skip) {
      this.logger.log('已跳过简历种子同步（RESUME_SKIP_SEED_SYNC）');
      return;
    }

    const row = await this.resumeRepo.findOne({ where: { id: DEFAULT_ID } });
    await this.resumeRepo.save({
      id: DEFAULT_ID,
      payload: DEFAULT_RESUME_PAYLOAD,
    });
    this.logger.log(
      row
        ? '已同步简历数据至数据库（与 default-resume.payload 一致）'
        : '已写入默认简历数据（resume 表）',
    );
  }
}
