import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentMemoryEntity } from '../database/agent-memory.entity';
import { AgentSessionsService } from '../agent-sessions/agent-sessions.service';

@Injectable()
export class AgentMemoryService {
  constructor(
    @InjectRepository(AgentMemoryEntity)
    private readonly repo: Repository<AgentMemoryEntity>,
  ) {}

  async getByUserId(userId: string): Promise<AgentMemoryEntity | null> {
    return (await this.repo.findOne({ where: { userId } })) ?? null;
  }

  /**
   * 单用户记忆快照写入。
   *
   * 校验逻辑直接复用 `AgentSessionsService.assertJsonWithinLimits`，
   * 保证两个接口的「防滥用上限」完全一致（避免被绕过其中之一）。
   */
  async upsert(
    userId: string,
    messagesJson: string,
  ): Promise<AgentMemoryEntity> {
    AgentSessionsService.assertJsonWithinLimits(messagesJson);
    const existing = await this.getByUserId(userId);
    if (existing) {
      existing.messagesJson = messagesJson;
      return await this.repo.save(existing);
    }
    const created = this.repo.create({ userId, messagesJson });
    return await this.repo.save(created);
  }
}
