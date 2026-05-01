import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Agent 多会话存储。
 *
 * - `userId`：匿名身份（由前端 localStorage 生成，并通过 `X-Agent-User` 传入）
 * - `messagesJson`：前端 AgentMessage[] 的 JSON 字符串
 */
@Entity({ name: 'agent_sessions' })
export class AgentSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 191 })
  title!: string;

  @Column({ type: 'text' })
  messagesJson!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
