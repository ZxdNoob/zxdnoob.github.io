import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostEntity } from '../database/post.entity';
import { readingMinutesFromMarkdown } from './reading-minutes';
import type { PostDetail, PostSummary } from './types/post.types';

/**
 * 文章服务：TypeORM + SQLite（better-sqlite3）持久化。
 */
@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postsRepo: Repository<PostEntity>,
  ) {}

  /**
   * 已发布文章摘要列表（无正文），按日期倒序。
   */
  async findAllPublishedSummaries(): Promise<PostSummary[]> {
    const rows = await this.postsRepo.find({
      where: { draft: false },
      order: { date: 'DESC' },
    });
    return rows.map((row) => this.toSummary(row));
  }

  /**
   * 按 slug 返回正文；草稿或未找到 → 404。
   */
  async findPublishedBySlug(slug: string): Promise<PostDetail> {
    const row = await this.postsRepo.findOne({ where: { slug } });
    if (!row || row.draft) {
      throw new NotFoundException(`文章不存在或未发布: ${slug}`);
    }
    return this.toDetail(row);
  }

  private toSummary(row: PostEntity): PostSummary {
    return {
      slug: row.slug,
      title: row.title,
      date: row.date,
      description: row.description,
      tags: row.tags ?? undefined,
      draft: row.draft,
      readingMinutes: readingMinutesFromMarkdown(row.content),
    };
  }

  private toDetail(row: PostEntity): PostDetail {
    return {
      ...this.toSummary(row),
      content: row.content,
    };
  }
}
