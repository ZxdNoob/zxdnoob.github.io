import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * 浏览量计数缓存表：每个 slug 一行，`views` 为去重后的累计浏览数。
 *
 * 独立于日志表，避免列表页查询时对 `page_views` 做昂贵的 COUNT 聚合。
 * 由 ViewsService 在写入新日志时同步递增。
 */
@Entity({ name: 'page_view_counts' })
export class PageViewCountEntity {
  @PrimaryColumn({ type: 'varchar', length: 191 })
  slug!: string;

  @Column({ type: 'integer', default: 0 })
  views!: number;

  @Column({ name: 'updated_at', type: 'varchar', length: 64 })
  updatedAt!: string;
}
