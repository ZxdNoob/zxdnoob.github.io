import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 文章表：正文为 Markdown 字符串，由前端 `react-markdown` 渲染。
 * `tags` 使用 simple-json 存字符串数组（SQLite 无原生数组类型）。
 */
@Entity({ name: 'posts' })
export class PostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 191, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 512 })
  title!: string;

  /** ISO 8601 日期时间字符串（含时分秒，可含时区） */
  @Column({ type: 'varchar', length: 64 })
  date!: string;

  @Column({ type: 'text' })
  description!: string;

  /**
   * 系列名：用于前端按系列分组展示。
   * 为空表示该文章不属于任何系列。
   */
  @Column({ type: 'varchar', length: 191, nullable: true })
  series!: string | null;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'simple-json', nullable: true })
  tags!: string[] | null;

  @Column({ type: 'boolean', default: false })
  draft!: boolean;
}
