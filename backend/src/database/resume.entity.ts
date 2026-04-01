import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { ResumePayload } from '../resume/resume.types';

/**
 * 个人简历：单行文档，`payload` 为完整 JSON（与前端 `ResumePayload` 一致）。
 */
@Entity({ name: 'resume' })
export class ResumeEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ type: 'simple-json' })
  payload!: ResumePayload;
}
