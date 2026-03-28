import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostEntity } from '../database/post.entity';
import { SeedService } from '../database/seed.service';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

/**
 * 文章模块：REST + 数据库实体 + 首次启动种子数据。
 */
@Module({
  imports: [TypeOrmModule.forFeature([PostEntity])],
  controllers: [PostsController],
  providers: [PostsService, SeedService],
  exports: [PostsService],
})
export class PostsModule {}
