import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * 页面浏览日志表（写入频繁 / 读少）。
 *
 * ## 设计目标
 * - **能累加**：用户反复阅读同一篇文章时，浏览量应该能增长（符合内容站直觉）。
 * - **防刷**：用户手滑连点刷新 / 客户端路由重复触发时，不应该瞬间把数字刷爆。
 * - **隐私合规**：不落地 IP / UA 原文，只做不可逆摘要。
 *
 * ## 去重策略（短窗口防抖）
 * - 指纹：`fingerprint = SHA-256(IP | User-Agent | slug)`
 * - 计算时间桶：`bucket = floor(Date.now() / windowMs)`（当前 window=10 秒）
 * - 通过唯一约束 `(fingerprint, bucket)` 让“同一指纹同一时间桶”最多写入 1 次
 * - 超过窗口后 bucket 变化，允许再次写入并累加计数
 *
 * ## 为什么用 UNIQUE 约束反而更好？
 * - 去重本质是“时间窗口内幂等写入”，最可靠的是交给数据库做原子仲裁
 * - 避免并发/重试导致的双写（先查再写在并发下会竞态）
 *
 * ## 字段说明
 * - `slug`: 逻辑页面标识（这里对应文章 slug）
 * - `fingerprint`: 不可逆摘要，用于短窗口去重
 * - `createdAt`: ISO 时间字符串（SQLite 友好），用于窗口判断与按时间分析
 */
@Entity({ name: 'page_views' })
@Index('idx_page_views_slug', ['slug'])
@Index('idx_page_views_fingerprint_bucket', ['fingerprint', 'bucket'])
@Unique('uq_page_views_fingerprint_bucket', ['fingerprint', 'bucket'])
export class PageViewEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 191 })
  slug!: string;

  /** SHA-256 hex（64 字符），不含时间因子 */
  @Column({ type: 'varchar', length: 64 })
  fingerprint!: string;

  /**
   * 时间桶（整数）：用于窗口去重的幂等键。
   * 由 ViewsService 以同一个 windowMs 计算并写入。
   */
  @Column({ type: 'integer', nullable: true })
  bucket!: number | null;

  /** ISO 8601 时间戳，用于会话窗口判断 */
  @Column({ name: 'created_at', type: 'varchar', length: 64 })
  createdAt!: string;
}
