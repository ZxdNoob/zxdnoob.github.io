import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Agent 记忆（会话快照）。
 *
 * 说明：
 * - 以 `userId` 为主键：一个用户一份“当前会话”快照（简单可靠，满足站内记忆需求）
 * - `messagesJson` 存储 UI 消息数组（与前端 AgentMessage 结构兼容）
 */
@Entity({ name: 'agent_memory' })
export class AgentMemoryEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'text' })
  messagesJson!: string;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
