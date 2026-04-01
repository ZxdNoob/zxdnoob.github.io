import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumeEntity } from '../database/resume.entity';
import type { ResumePayload } from './resume.types';

const DEFAULT_ID = 'default';

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(ResumeEntity)
    private readonly resumeRepo: Repository<ResumeEntity>,
  ) {}

  async getDefault(): Promise<ResumePayload> {
    const row = await this.resumeRepo.findOne({ where: { id: DEFAULT_ID } });
    if (!row) {
      throw new NotFoundException('简历数据不存在，请确认后端已启动并完成种子写入。');
    }
    return row.payload;
  }
}
