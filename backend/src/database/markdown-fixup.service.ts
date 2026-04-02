import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { PostEntity } from './post.entity';

/**
 * 一次性修复历史文章中的 Markdown 转义问题。
 *
 * 目前主要处理：`\`\`\`` 这类被写入为 `\`\`\`` 的 fenced code 转义，
 * 会导致前端无法识别代码块。
 *
 * 该修复是幂等的：执行多次结果一致；无匹配时不会写库。
 */
@Injectable()
export class MarkdownFixupService implements OnModuleInit {
  private readonly logger = new Logger(MarkdownFixupService.name);

  constructor(
    @InjectRepository(PostEntity)
    private readonly postsRepo: Repository<PostEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    // 仅处理 content 中含反引号三连转义序列的行（SQLite LIKE 需转义反引号）
    const candidates = await this.postsRepo.find({
      where: { content: Like('%\\`\\`\\`%') },
      select: { id: true, slug: true, content: true },
    });
    if (candidates.length === 0) return;

    let changed = 0;
    const updates: Array<Pick<PostEntity, 'id' | 'content'>> = [];

    for (const row of candidates) {
      const before = row.content;
      const after = before.replaceAll('\\`\\`\\`', '```');
      if (after !== before) {
        changed += 1;
        updates.push({ id: row.id, content: after });
      }
    }

    if (updates.length === 0) return;

    await this.postsRepo.save(updates);
    this.logger.log(
      `已修复 Markdown 围栏转义：影响 ${changed}/${candidates.length} 篇文章`,
    );
  }
}
