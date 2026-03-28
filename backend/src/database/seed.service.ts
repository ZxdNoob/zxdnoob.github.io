import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostEntity } from './post.entity';

/**
 * 首次启动且表为空时写入示例数据（原 `content/posts` 示例的正文）。
 * 生产环境可通过管理接口或迁移追加数据；此处仅保证开箱即用。
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(PostEntity)
    private readonly postsRepo: Repository<PostEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.postsRepo.count();
    if (count > 0) return;

    await this.postsRepo.save(SEED_POSTS);
    this.logger.log(`已写入初始文章 ${SEED_POSTS.length} 篇`);
  }
}

const WELCOME_MD = `这是一份示例文章，用来展示 **Markdown** 与阅读样式：列表、链接与代码块都会很舒服。

## 你可以这样开始

1. 在数据库中维护文章记录（本示例由 Nest + SQLite 提供）。
2. 本地运行 \`npm run dev\`（前端）与 \`npm run start:dev\`（后端），在浏览器里预览。
3. 部署时设置 \`NEXT_PUBLIC_SITE_URL\`、\`NEXT_PUBLIC_API_URL\`（或服务端 \`API_URL\`），便于站点地图与跨域。

## 代码示例

\`\`\`ts
export const hello = "写你想写的，发你想发的。";
\`\`\`

> 阅读体验的目标很简单：字要清晰、行距要透气、暗色模式要护眼。

祝写作愉快。`;

const SEED_POSTS: Partial<PostEntity>[] = [
  {
    slug: 'welcome',
    title: '欢迎来到 ZxdNoob',
    date: '2026-03-28T22:21:20+08:00',
    description:
      '博客已用 Next.js、NestJS、SQLite 与精排版体系搭好骨架，接下来只管写好每一篇。',
    content: WELCOME_MD,
    tags: ['站务', 'Next.js'],
    draft: false,
  },
];
