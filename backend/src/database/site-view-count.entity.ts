import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * 全站 PV 计数表（每次页面进入/刷新都累加一次）。
 *
 * 与文章浏览量不同，这里不做时间窗口去重：满足“刷新也累加”的定义。
 */
@Entity({ name: 'site_view_counts' })
export class SiteViewCountEntity {
  /** 固定主键：只用一行存储全站累计 PV */
  @PrimaryColumn({ type: 'varchar', length: 32 })
  key!: 'site';

  @Column({ type: 'integer', default: 0 })
  views!: number;

  @Column({ name: 'updated_at', type: 'varchar', length: 64 })
  updatedAt!: string;
}
