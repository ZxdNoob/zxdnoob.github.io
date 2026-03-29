import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { ChangelogItemPayload } from '../changelog/types/changelog.types';

/**
 * 版本历史发布记录：`items` 为 JSON 数组，结构与前端 `ChangelogItem` 一致。
 */
@Entity({ name: 'changelog_releases' })
export class ChangelogReleaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 发布时间：ISO 8601（含时分秒）；兼容历史 `YYYY-MM-DD` */
  @Column({ type: 'varchar', length: 64 })
  date!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  title!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  webVersion!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  apiVersion!: string | null;

  @Column({ type: 'simple-json' })
  items!: ChangelogItemPayload[];

  /**
   * 同一 `date` 下多条记录时的排序：越大越新（优先于 uuid 顺序）。
   */
  @Column({ type: 'integer', default: 0 })
  sortOrder!: number;
}
