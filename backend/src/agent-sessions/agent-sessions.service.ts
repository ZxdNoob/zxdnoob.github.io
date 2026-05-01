import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentSessionEntity } from '../database/agent-session.entity';

/**
 * AI 向导多会话服务。
 *
 * ## 服务端配额（防止匿名用户把 SQLite 撑爆）
 * - **每用户最多 50 个会话**：超过则拒绝创建（前端 UI 也会因此提示失败）
 * - **每会话最多 120 条消息**：略大于前端 `MAX_MESSAGES = 80`，留出 LLM 多轮工具调用的余量
 * - **单条消息最多 16 KB**：避免单条 message 把 messagesJson 撑到 body limit 之外
 * - **整段 messagesJson 最多 200 KB**：与 `main.ts` 的 256 KB body limit 留出余量
 *
 * 这些上限只在「服务端」做防御性校验。即便前端被绕过，
 * 也能保证单个匿名 userId 无法无限增长写入。
 */
const MAX_SESSIONS_PER_USER = 50;
const MAX_MESSAGES_PER_SESSION = 120;
const MAX_SINGLE_MESSAGE_BYTES = 16 * 1024;
const MAX_MESSAGES_JSON_BYTES = 200 * 1024;

@Injectable()
export class AgentSessionsService {
  constructor(
    @InjectRepository(AgentSessionEntity)
    private readonly repo: Repository<AgentSessionEntity>,
  ) {}

  async listByUserId(userId: string): Promise<AgentSessionEntity[]> {
    return await this.repo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async getById(
    userId: string,
    id: string,
  ): Promise<AgentSessionEntity | null> {
    return (
      (await this.repo.findOne({
        where: { id, userId },
      })) ?? null
    );
  }

  async create(args: {
    userId: string;
    title: string;
    messagesJson: string;
  }): Promise<AgentSessionEntity> {
    AgentSessionsService.assertJsonWithinLimits(args.messagesJson);
    const count = await this.repo.count({ where: { userId: args.userId } });
    if (count >= MAX_SESSIONS_PER_USER) {
      throw new BadRequestException(
        `Sessions per user reached limit (${MAX_SESSIONS_PER_USER}).`,
      );
    }
    const entity = this.repo.create(args);
    return await this.repo.save(entity);
  }

  async update(
    userId: string,
    id: string,
    patch: { title?: string; messagesJson?: string },
  ): Promise<AgentSessionEntity | null> {
    const entity = await this.getById(userId, id);
    if (!entity) return null;
    if (typeof patch.title === 'string') entity.title = patch.title;
    if (typeof patch.messagesJson === 'string') {
      AgentSessionsService.assertJsonWithinLimits(patch.messagesJson);
      entity.messagesJson = patch.messagesJson;
    }
    return await this.repo.save(entity);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const res = await this.repo.delete({ id, userId });
    return (res.affected ?? 0) > 0;
  }

  /**
   * 校验 messagesJson 体量。
   *
   * - 这里不重新 parse 检查 schema（前端结构由 lib/agent/types 控制，且单元测试覆盖）
   * - 仅做体量上限校验，是「防滥用 / 防爆库」最关键的一道闸
   */
  static assertJsonWithinLimits(messagesJson: string): void {
    const byteLength = Buffer.byteLength(messagesJson, 'utf8');
    if (byteLength > MAX_MESSAGES_JSON_BYTES) {
      throw new BadRequestException(
        `messagesJson too large (${byteLength} bytes > ${MAX_MESSAGES_JSON_BYTES}).`,
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(messagesJson);
    } catch {
      throw new BadRequestException('messagesJson is not valid JSON.');
    }
    if (!Array.isArray(parsed)) return;
    if (parsed.length > MAX_MESSAGES_PER_SESSION) {
      throw new BadRequestException(
        `messages length too large (${parsed.length} > ${MAX_MESSAGES_PER_SESSION}).`,
      );
    }
    for (const m of parsed) {
      if (!m || typeof m !== 'object') continue;
      const content = (m as { content?: unknown }).content;
      if (typeof content !== 'string') continue;
      if (Buffer.byteLength(content, 'utf8') > MAX_SINGLE_MESSAGE_BYTES) {
        throw new BadRequestException(
          `single message content too large (> ${MAX_SINGLE_MESSAGE_BYTES} bytes).`,
        );
      }
    }
  }
}

export const AGENT_SESSION_LIMITS = {
  MAX_SESSIONS_PER_USER,
  MAX_MESSAGES_PER_SESSION,
  MAX_SINGLE_MESSAGE_BYTES,
  MAX_MESSAGES_JSON_BYTES,
} as const;
