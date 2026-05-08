import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostEntity } from '../database/post.entity';
import { MarkdownFixupService } from '../database/markdown-fixup.service';
import { SeedService } from '../database/seed.service';
import { PostsController } from './posts.controller';
import { PostsSearchService } from './posts-search.service';
import { PostsService } from './posts.service';

/**
 * 文章模块：REST + 数据库实体 + 首次启动种子数据 + FTS5 全文搜索。
 *
 * `PostsSearchService` 在 `onModuleInit` 阶段建立 `posts_fts` 虚拟表与同步触发器，
 * 因此种子数据写完后再启动它，索引会被自动回填。
 */
@Module({
  imports: [TypeOrmModule.forFeature([PostEntity])],
  controllers: [PostsController],
  providers: [
    PostsService,
    PostsSearchService,
    SeedService,
    MarkdownFixupService,
  ],
  exports: [PostsService, PostsSearchService],
})
export class PostsModule {}
