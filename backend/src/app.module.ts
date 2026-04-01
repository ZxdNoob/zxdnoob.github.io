import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { ChangelogModule } from './changelog/changelog.module';
import { ChangelogReleaseEntity } from './database/changelog-release.entity';
import { PostEntity } from './database/post.entity';
import { ResumeEntity } from './database/resume.entity';
import { PostsModule } from './posts/posts.module';
import { ResumeModule } from './resume/resume.module';

/**
 * 根模块：配置全局环境变量与 TypeORM（SQLite 文件库）。
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
          entities: [PostEntity, ChangelogReleaseEntity, ResumeEntity],
          synchronize: sync,
        };
      },
    }),
    PostsModule,
    ChangelogModule,
    ResumeModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
