# ZxdNoob

[![CI](https://github.com/ZxdNoob/zxdnoob.github.io/actions/workflows/ci.yml/badge.svg)](https://github.com/ZxdNoob/zxdnoob.github.io/actions/workflows/ci.yml)
[![Deploy GitHub Pages](https://github.com/ZxdNoob/zxdnoob.github.io/actions/workflows/deploy-github-pages.yml/badge.svg)](https://github.com/ZxdNoob/zxdnoob.github.io/actions/workflows/deploy-github-pages.yml)
[![Deploy frontend (Vercel)](https://github.com/ZxdNoob/zxdnoob.github.io/actions/workflows/deploy-vercel.yml/badge.svg)](https://github.com/ZxdNoob/zxdnoob.github.io/actions/workflows/deploy-vercel.yml)
[![Publish backend image](https://github.com/ZxdNoob/zxdnoob.github.io/actions/workflows/publish-backend-image.yml/badge.svg)](https://github.com/ZxdNoob/zxdnoob.github.io/actions/workflows/publish-backend-image.yml)

> Fork 仓库后请把上面徽章链接里的 `ZxdNoob/zxdnoob.github.io` 改成你的 `用户名/仓库名`。

**ZxdNoob** 是全栈博客：**Next.js** 前端通过 **REST** 调用 **NestJS** 后端；文章数据保存在 **SQLite**（`better-sqlite3`），不再使用仓库内 Markdown 目录。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js App Router、React、TypeScript、Tailwind CSS |
| 后端 | NestJS 11、TypeORM、better-sqlite3 |
| 数据 | SQLite 文件（默认 `backend/data/blog.sqlite`），首次启动自动种子数据 |

## 本地运行（须同时起前后端）

**终端 1 — 后端（先启动，默认 http://127.0.0.1:4000）**

```bash
cd backend && npm install && npm run start:dev
```

**终端 2 — 前端（http://localhost:3000）**

```bash
npm install
# 建议复制 .env.example 为 .env.local，保证 NEXT_PUBLIC_API_URL 指向后端
npm run dev
```

根目录脚本：`npm run dev:api`、`npm run build:api`、`npm run start:api`。

## 环境变量（摘要）

- 根目录 `.env.local`：`NEXT_PUBLIC_SITE_URL`、`NEXT_PUBLIC_API_URL`（及可选服务端专用 `API_URL`）
- `backend/.env`：`PORT`、`DATABASE_PATH`、`DATABASE_SYNC`、`CORS_ORIGIN`

## 后端 API

- `GET /api/health`
- `GET /api/posts`：已发布文章摘要（含 `readingMinutes`）
- `GET /api/posts/:slug`：单篇 Markdown 正文

## 构建

```bash
npm run build
npm run build:static   # 静态站点输出到 out/（GitHub Pages）
npm run build:api
```

## GitHub 自动部署

推送代码到 GitHub 后，**Actions** 会按工作流执行；页面顶部徽章可点进对应流水线。

| 工作流 | 说明 |
|--------|------|
| [CI](.github/workflows/ci.yml) | 对 **main/master** 的 push 与 PR 运行：前端 `lint` + `build` + `build:static`，后端 `lint` + `build` + 单元/E2E 测试 |
| [Deploy GitHub Pages](.github/workflows/deploy-github-pages.yml) | 推送 **main/master** 时将 **`npm run build:static`** 产物 **`out/`** 部署到 **`https://zxdnoob.github.io/`**（见下节） |
| [Deploy frontend (Vercel)](.github/workflows/deploy-vercel.yml) | 配置了 `VERCEL_*` 密钥时，用 CLI 将 **Next.js** 推到 **Vercel 生产环境**；未配置时该工作流会跳过 |
| [Publish backend image](.github/workflows/publish-backend-image.yml) | 变更 **backend/** 或手动 **Run workflow** 时构建镜像并推送到 **`ghcr.io/<小写 owner>/<小写 repo>/backend`** |
| [Dependabot](.github/dependabot.yml) | 每周检查根目录与 `backend/` 的 npm 依赖，发起更新 PR |

仓库根目录 [vercel.json](vercel.json) 指定 `framework: nextjs` 与 `npm ci` / `npm run build`，便于 Vercel 与本地行为一致。

### 前端：GitHub Pages（`username.github.io` 仓库）

本仓库名为 **`zxdnoob.github.io`** 时，GitHub 会将站点发布到 **`https://zxdnoob.github.io/`**。

1. 打开仓库 **Settings → Pages**，在 **Build and deployment** 中将 **Source** 设为 **GitHub Actions**。  
   - **必须**从「**Deploy from a branch**」（例如 **`/ (root)` + `gh-pages` 分支**）切换过来；若仍保留为从 **`gh-pages` 分支**发布，Actions 部署会报错：`Invalid deployment branch … Deployments are only allowed from gh-pages`（或 API 返回 400），因为工作流实际是从 **`main`** 触发、用构件发布，与「仅允许 gh-pages 分支」的配置冲突。  
   - 切换后旧的分支发布配置会被取代，无需再向 `gh-pages` 推送构建产物。
2. 若曾给 **`github-pages` 环境** 配过「仅限某分支部署」：打开 **Settings → Environments → `github-pages`**，在 **Deployment branches** 中选 **All branches** 或至少包含 **`main`**，不要仅限 **`gh-pages`**（除非你永远不用 Actions 发布）。
3. 推送 **main** 后，[Deploy GitHub Pages](.github/workflows/deploy-github-pages.yml) 会执行 **`STATIC_EXPORT=1` 的 `next build`**，并把 **`out/`** 部署为站点根目录。
4. **文章与版本历史**在构建时通过 HTTP 从 Nest API 拉取。请在 **Settings → Secrets and variables → Actions** 中配置至少一项（指向公网可访问的 API 根 URL，无尾部斜杠）：
   - **`API_URL`**（推荐，仅构建机使用），或
   - **`NEXT_PUBLIC_API_URL`**
   
   未配置时，构建会回退到 `127.0.0.1:4000`，在 Actions 上无法连通，页面仍可部署但列表为空；配置好密钥并重新运行工作流后即可显示数据。
5. 根目录已包含 **`public/.nojekyll`**，避免 GitHub Pages 用 Jekyll 处理时忽略 **`_next`** 等目录。工作流上传构件时需 **`actions: write`** 权限（已在 [deploy-github-pages.yml](.github/workflows/deploy-github-pages.yml) 中声明）；若曾精简过 `permissions` 导致上传/部署失败，请恢复该权限。

### 前端：推荐用 Vercel 连接 GitHub（零配置 Actions）

1. 登录 [Vercel](https://vercel.com)，**Add New → Project**，导入本仓库。
2. 在 Project → **Settings → Environment Variables** 中配置：
   - `NEXT_PUBLIC_SITE_URL`：生产站点根 URL（如 `https://xxx.vercel.app`）
   - `NEXT_PUBLIC_API_URL`：线上 **Nest API** 根 URL（须与浏览器可访问域名、HTTPS 一致）
3. 保存后每次 push **main** 会自动构建部署（由 Vercel 托管，不依赖仓库内 `deploy-vercel.yml`）。

若更希望在 **GitHub Actions** 里调用 Vercel CLI 部署，可在仓库 **Settings → Secrets and variables → Actions** 添加 `VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`（本地执行 `npx vercel link` 后见 `.vercel/project.json`），再使用 [deploy-vercel.yml](.github/workflows/deploy-vercel.yml)。

### 后端：GitHub Container Registry 镜像

1. push **main/master** 且包含 `backend/` 变更后，Actions 会构建 [backend/Dockerfile](backend/Dockerfile) 并推送到 GHCR。
2. 首次使用需在 GitHub 仓库右侧 **Packages** 中将该包设为 **Public**（或保持 Private 并在部署机配置 `docker login ghcr.io`）。
3. 运行示例（持久化 SQLite；镜像地址以 Actions 日志为准，以下为默认命名空间示例）：

```bash
docker run -d --name zxd-api -p 4000:4000 \
  -v zxd-sqlite:/app/data \
  -e CORS_ORIGIN=https://你的前端域名 \
  -e DATABASE_PATH=/app/data/blog.sqlite \
  ghcr.io/zxdgoing/zxdnoob/backend:latest
```

（若仓库名含大写字母，GHCR 路径一律为小写，与 [publish-backend-image.yml](.github/workflows/publish-backend-image.yml) 中规则一致。）

---

*Hello — 热爱编程与生活，愿你我都能把每一天过好。*
