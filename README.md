# ZxdNoob

[CI](https://github.com/ZxdNoob/zxdnoob.github.io/actions/workflows/ci.yml)
[Deploy GitHub Pages](https://github.com/ZxdNoob/zxdnoob.github.io/actions/workflows/deploy-github-pages.yml)
[Deploy frontend (Vercel)](https://github.com/ZxdNoob/zxdnoob.github.io/actions/workflows/deploy-vercel.yml)
[Publish backend image](https://github.com/ZxdNoob/zxdnoob.github.io/actions/workflows/publish-backend-image.yml)

> Fork 仓库后请把上面徽章链接里的 `ZxdNoob/zxdnoob.github.io` 改成你的 `用户名/仓库名`。

**ZxdNoob** 是全栈博客：**Next.js** 前端通过 **REST** 调用 **NestJS** 后端；文章/简历/版本历史/浏览量数据保存在 **SQLite**（`better-sqlite3`），不再使用仓库内 Markdown 目录。

## 功能概览

- **内容**：文章列表与详情（Markdown 正文由前端渲染）
- **站点信息**：版本历史（changelog）、简历（resume）
- **统计**：文章浏览量 + 全站 PV（含短窗口防刷/去重策略）
- **部署**：
  - **GitHub Pages**：静态导出到 `out/`
  - **Vercel**：部署 Next.js（可选）
  - **GHCR**：发布后端 Docker 镜像（可选）并可通过 SSH 自动重启容器（可选）
  - **阿里云 OSS**：备份后端 SQLite（可选）

## 架构与数据流（简述）

- **前端（Next.js App Router）**
  - 页面渲染：从 API 拉文章/简历/版本历史；文章正文 Markdown 用 `react-markdown` 渲染
  - 统计上报：浏览器端 `POST /api/views/`* 记录 PV
- **后端（NestJS + TypeORM + SQLite）**
  - 数据库：单文件 SQLite，默认 `backend/data/blog.sqlite`
  - 首次启动：自动创建表并写入种子数据（示例文章/简历/版本历史）
- **GitHub Pages 构建（静态导出）**
  - 构建期需要可访问的 API：默认在 Runner 上临时启动 Nest + SQLite；也可改为读取已部署的公网 API（见下文 `PAGES_REMOTE_API_URL`）

## 技术栈


| 层级  | 技术                                                  |
| --- | --------------------------------------------------- |
| 前端  | Next.js App Router、React、TypeScript、Tailwind CSS    |
| 后端  | NestJS 11、TypeORM、better-sqlite3                    |
| 数据  | SQLite 文件（默认 `backend/data/blog.sqlite`），首次启动自动种子数据 |


## 目录结构

```
.
├─ src/                       # Next.js 前端源码
│  └─ config/public-api.json  # Actions/变量未配置时：浏览量上报 API 兜底（可留空）
├─ public/
├─ backend/                   # NestJS API（独立 package.json）
│  ├─ src/
│  ├─ data/                   # 默认 SQLite 目录（本地/容器可挂载到 /app/data）
│  └─ Dockerfile              # 生产镜像（含 better-sqlite3 原生编译）
├─ .github/workflows/         # CI/CD：Pages/Vercel/GHCR/OSS 备份
├─ next.config.ts             # STATIC_EXPORT=1 时启用 output: 'export'
└─ vercel.json                # Vercel 构建/安装命令与本地 CI 对齐
```

## 本地运行（须同时起前后端）

**终端 1 — 后端（先启动，默认 [http://127.0.0.1:4000）](http://127.0.0.1:4000）)**

```bash
cd backend && npm install && npm run start:dev
```

也可以不进入 `backend/`，直接在仓库根目录运行（等价方式）：

```bash
npm run dev:api
```

**终端 2 — 前端（[http://localhost:3000）](http://localhost:3000）)**

```bash
npm install
# （可选）根目录创建 .env.local，保证 NEXT_PUBLIC_API_URL 指向后端
npm run dev
```

根目录脚本：`npm run dev:api`、`npm run build:api`、`npm run start:api`。

## 脚本速查

### 前端（根目录）

- **dev**：`npm run dev`
- **build**：`npm run build`
- **静态导出（GitHub Pages）**：`npm run build:static`（等价于 `STATIC_EXPORT=1 next build`，产物在 `out/`）
- **start**：`npm run start`（Next 生产模式）

### 后端（backend/）

- **dev**：`cd backend && npm run start:dev`
- **build**：`cd backend && npm run build`
- **prod**：`cd backend && npm run start:prod`

## 环境变量

### 前端（根目录 `.env.local`，可选）

- **NEXT_PUBLIC_SITE_URL**
  - **用途**：站点根 URL（用于 metadata / sitemap 等）
  - **示例**：`https://your-domain.com`
- **NEXT_PUBLIC_API_URL**
  - **用途**：浏览器端请求的 API 根 URL（尤其用于浏览量上报）
  - **本地示例**：`http://127.0.0.1:4000`
- **API_URL**（可选）
  - **用途**：仅服务端/构建期使用的 API 根 URL（静态导出拉文章数据）
  - **说明**：GitHub Pages 工作流会自行设置此值；本地如需从远端 API 拉数据可设置

### 后端（`backend/.env` 或 `backend/.env.local`，可选）

- **PORT**
  - **默认**：`4000`
- **DATABASE_PATH**
  - **默认**：`backend/data/blog.sqlite`（代码中以 `process.cwd()` 为基准，即 `backend/` 目录）
  - **容器建议**：`/app/data/blog.sqlite`（配合挂载卷到 `/app/data`）
- **DATABASE_SYNC**
  - **默认**：非 `false` 都视为开启（开发友好）
  - **生产建议**：设为 `false`
- **CORS_ORIGIN**
  - **用途**：允许跨域来源（逗号分隔）
  - **示例**：`https://xxx.vercel.app,https://xxx.github.io`
  - **未设置时的默认策略**：允许本地 `localhost:3000` 以及 `https://*.github.io`（便于 GitHub Pages 上报浏览量）
- **SEED_FORCE_CONTENT**（可选）
  - **用途**：种子文章存在时是否同步覆盖正文
  - **默认**：不覆盖正文（只更新元信息）；设为 `1` 则会覆盖正文

## 后端 API

- `GET /api/health`
- **文章**
  - `GET /api/posts`：已发布文章摘要（含 `readingMinutes`）
  - `GET /api/posts/:slug`：单篇文章（含 Markdown 正文）
- **版本历史**
  - `GET /api/changelog`：发布记录（新在前）
- **简历**
  - `GET /api/resume`：完整 JSON（`ResumePayload`）
- **浏览量**
  - `POST /api/views/:slug`：记录一次文章浏览（短窗口去重/防刷）
  - `GET /api/views/:slug`：单篇文章浏览量
  - `GET /api/views?slugs=a,b,c`：批量查询
  - `GET /api/views`：全量查询
  - `GET /api/views/total`：全部文章浏览量汇总
  - `GET /api/views/site`：获取全站 PV
  - `POST /api/views/site`：全站 PV 自增并返回最新值

## 构建

```bash
npm run build
npm run build:static   # 静态站点输出到 out/（GitHub Pages）
npm run build:api
```

## GitHub 自动部署

推送代码到 GitHub 后，**Actions** 会按工作流执行；页面顶部徽章可点进对应流水线。


| 工作流                                                                  | 说明                                                                                                       |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [CI](.github/workflows/ci.yml)                                       | 对 **main/master** 的 push 与 PR 运行：前端 `lint` + `build` + `build:static`，后端 `lint` + `build` + 单元/E2E 测试    |
| [Deploy GitHub Pages](.github/workflows/deploy-github-pages.yml)     | 推送 **main/master** 时将 `**npm run build:static`** 产物 `**out/**` 部署到 `**https://zxdnoob.github.io/**`（见下节） |
| [Deploy frontend (Vercel)](.github/workflows/deploy-vercel.yml)      | 配置了 `VERCEL_*` 密钥时，用 CLI 将 **Next.js** 推到 **Vercel 生产环境**；未配置时该工作流会跳过                                    |
| [Publish backend image](.github/workflows/publish-backend-image.yml) | 变更 **backend/** 或手动 **Run workflow** 时构建镜像并推送到 `**ghcr.io/<小写 owner>/<小写 repo>/backend`**                |
| [Aliyun OSS backup](.github/workflows/aliyun-oss-backup.yml)         | （可选）将 ECS 上 Docker 卷中的 SQLite 备份到阿里云 OSS（可定时/链式触发）                                                       |
| [Dependabot](.github/dependabot.yml)                                 | 每周检查根目录与 `backend/` 的 npm 依赖，发起更新 PR                                                                     |


仓库根目录 [vercel.json](vercel.json) 指定 `framework: nextjs` 与 `npm ci` / `npm run build`，便于 Vercel 与本地行为一致。

### 前端：GitHub Pages（`username.github.io` 仓库）

本仓库名为 `**zxdnoob.github.io**` 时，GitHub 会将站点发布到 `**https://zxdnoob.github.io/**`。

[Deploy GitHub Pages](.github/workflows/deploy-github-pages.yml) 在 `**main**` 上构建 `**out/**`，再通过官方 `**actions/upload-pages-artifact**` 与 `**actions/deploy-pages**` 发布；仓库 **[Deployments](https://github.com/ZxdNoob/zxdnoob.github.io/deployments)** 中会出现对应部署记录。

1. 打开 **Settings → Pages**，在 **Build and deployment** 中：
  - **Source** 必须选 **GitHub Actions**（不要选 **Deploy from a branch** 指望本工作流去更新站点——仅推 `gh-pages` 分支在「Actions 源」下**不会**替换线上内容）。
  - 首次使用若提示选择工作流，选 **Deploy GitHub Pages**。
2. 推送 **main** 或手动 **Run workflow** 后：先跑 **Build static site**，再跑 **Deploy to GitHub Pages**；成功几分钟后 `**https://zxdnoob.github.io/`** 更新。若 **github-pages** 环境启用了审批，需在 Deployments / Environments 里批准后再上线。
3. **文章与版本历史**在构建时通过 HTTP 从 Nest API 拉取。默认在 Runner 上启动临时 Nest + SQLite（含种子文章），**无需**配置 Secret。若要从**已部署的公网 API**拉数据，在 Actions 中配置 Secret `**PAGES_REMOTE_API_URL`**（API 根 URL，无尾部斜杠）。不要用 `**API_URL**` 做这件事——工作流不读取它；且 **GitHub 禁止在 `if:` 里直接使用 `secrets.*`**，旧版工作流会整段校验失败、部署不更新。若曾添加 `API_URL` 导致构建跳过本地 API 又拉不到远程，可删除该 Secret 或改用 `PAGES_REMOTE_API_URL`。
4. 根目录 `**public/.nojekyll**` 会进入 `**out/**`，避免 Jekyll 忽略 `**_next**`。工作流使用 `**pages: write**` 与 `**id-token: write**` 以通过 OIDC 部署 Pages（已在 YAML 中声明）。

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

### 数据备份：阿里云 OSS（可选）

用于把部署机（如 ECS）上 Docker 卷中的 SQLite（`blog.sqlite`）备份到对象存储。

- **工作流**：见 [aliyun-oss-backup.yml](.github/workflows/aliyun-oss-backup.yml)
- **触发方式**：
  - 手动触发 `workflow_dispatch`
  - 定时触发（默认每周日 UTC 02:00）
  - 在后端镜像发布成功后链式触发（`workflow_run`）

> 生产环境更推荐使用「ECS 实例 RAM 角色 + 服务器定时任务」做备份，减少在 GitHub 中长期存放 AK/SK 的需要（工作流文件里也有安全建议）。

## 常见问题（排错）

- **GitHub Pages 构建成功但 `out/blog` 没有文章 HTML**
  - Pages 工作流会校验 `out/blog/*.html` 是否有真实文章，否则报错：通常是构建期无法访问 API
  - 优先检查：是否正确配置了 `PAGES_REMOTE_API_URL`（无尾部斜杠），或本地 Nest 启动是否失败（看 Actions 日志 `api.log`）
- **GitHub Pages 上浏览量不增长**
  - 浏览器端上报依赖 `NEXT_PUBLIC_API_URL`
  - 解决：
    - 在 Actions Variables 配置 `NEXT_PUBLIC_API_URL` 为公网 API 根地址，或
    - 在 `src/config/public-api.json` 填 `apiBaseUrl` 作为兜底（但建议优先用 Variables/Secrets 管理）
  - 同时确保后端允许 CORS：设置 `CORS_ORIGIN`，或使用默认策略（允许 `https://*.github.io`）
- **容器跑起来但数据丢失**
  - SQLite 是文件库，需要把 `/app/data` 挂载到持久卷，并设置 `DATABASE_PATH=/app/data/blog.sqlite`

---

*Hello — 热爱编程与生活，愿你我都能把每一天过好。*