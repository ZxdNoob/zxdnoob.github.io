# ZxdNoob 后端（NestJS + TypeORM + SQLite）

## 数据存储

- 默认数据库文件：`data/blog.sqlite`（相对 `backend` 工作目录），路径可用环境变量 `DATABASE_PATH` 覆盖。
- `DATABASE_SYNC` 默认为开启（开发便利）；生产环境建议使用迁移并关闭同步。
- 首次启动且表为空时，`SeedService` 会写入两篇示例文章。

## 配置文件

| 文件 | 说明 |
|------|------|
| `src/app.module.ts` | `TypeOrmModule.forRootAsync` 注册 `better-sqlite3` |
| `src/database/post.entity.ts` | 文章实体 |
| `src/database/seed.service.ts` | 初始数据 |
| `nest-cli.json` | Nest CLI（标准 JSON，无行内注释） |

## 常用命令

```bash
npm run start:dev
npm run build
npm run start:prod
npm test
npm run test:e2e
```
