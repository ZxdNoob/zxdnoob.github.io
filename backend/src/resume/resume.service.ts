import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumeEntity } from '../database/resume.entity';
import type { ResumePayload } from './resume.types';

/** 简历表主键固定为单行文档，与种子写入逻辑一致。 */
const DEFAULT_ID = 'default';

/**
 * 简历服务：按固定 id 读取 `resume` 表中的 JSON，供 `GET /api/resume` 返回。
 */
@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(ResumeEntity)
    private readonly resumeRepo: Repository<ResumeEntity>,
  ) {}

  /** 返回默认简历 JSON；库中无记录时抛出 404（通常表示种子未执行或数据库异常）。 */
  async getDefault(): Promise<ResumePayload> {
    const row = await this.resumeRepo.findOne({ where: { id: DEFAULT_ID } });
    if (!row) {
      throw new NotFoundException(
        '简历数据不存在，请确认后端已启动并完成种子写入。',
      );
    }
    return row.payload;
  }
}
