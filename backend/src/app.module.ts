import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { ChangelogModule } from './changelog/changelog.module';
import { ChangelogReleaseEntity } from './database/changelog-release.entity';
import { PageViewCountEntity } from './database/page-view-count.entity';
import { PageViewEntity } from './database/page-view.entity';
import { PostEntity } from './database/post.entity';
import { ResumeEntity } from './database/resume.entity';
import { SiteViewCountEntity } from './database/site-view-count.entity';
import { PostsModule } from './posts/posts.module';
import { ResumeModule } from './resume/resume.module';
import { ViewsModule } from './views/views.module';

/**
 * 根模块：配置全局环境变量与 TypeORM（SQLite 文件库）。
 *
 * ## 关键设计点
 * - **SQLite 文件库**：适合个人站点/轻量 API（部署简单、迁移成本低）
 * - **TypeORM synchronize**：默认开启（开发友好）；生产可通过 `DATABASE_SYNC=false` 关闭
 * - **实体集中注册**：统一在这里维护，避免“新增表但忘记注册导致不建表”
 *
 * ## 本次新增
 * - `PageViewEntity` / `PageViewCountEntity`：用于浏览量统计
 * - `ViewsModule`：提供 `/api/views` 读写接口
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbPath =
          config.get<string>('DATABASE_PATH') ??
          path.join(process.cwd(), 'data', 'blog.sqlite');
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const sync = config.get<string>('DATABASE_SYNC') !== 'false';
        return {
          type: 'better-sqlite3' as const,
          database: dbPath,
          entities: [
            PostEntity,
            ChangelogReleaseEntity,
            ResumeEntity,
            PageViewEntity,
            PageViewCountEntity,
            SiteViewCountEntity,
          ],
          synchronize: sync,
        };
      },
    }),
    PostsModule,
    ChangelogModule,
    ResumeModule,
    ViewsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
