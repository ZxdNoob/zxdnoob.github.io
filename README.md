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
- **AI 向导（Agent）**：
  - 右下角悬浮入口 + 全局快捷键 `⌘/Ctrl + I`
  - 独立全屏页 `/agent`（含「能做什么」介绍与示例 prompt）
  - 9 种内建工具：列文章 / 搜文章 / 取正文 / 随机推荐 / 跳转 / 切主题 / 命令面板 / 查更新 / 查简历 / 复制
  - **LLM 模式**：OpenAI 兼容协议，支持流式输出与多轮 tool calling
  - **本地启发式兜底**：未配置 LLM 时仍可用，常见意图（搜索/导航/主题）皆有覆盖
- **部署**：
  - **GitHub Pages**：静态导出到 `out/`
  - **Vercel**：部署 Next.js（可选）
  - **GHCR**：发布后端 Docker 镜像（可选）并可通过 SSH 自动重启容器（可选）
  - **阿里云 OSS**：备份后端 SQLite（可选）

## 架构与数据流（简述）

- **前端（Next.js App Router）**
  - 页面渲染：从 API 拉文章/简历/版本历史；文章正文 Markdown 用 `react-markdown` 渲染
  - 统计上报：浏览器端 `POST /api/views/`\* 记录 PV
  - AI 向导：纯客户端 Agent，OpenAI 兼容流式 + 本地 tool calling，未配置 LLM 时降级为启发式 Agent
- **后端（NestJS + TypeORM + SQLite）**
  - 数据库：单文件 SQLite，默认 `backend/data/blog.sqlite`
  - 首次启动：自动创建表并写入种子数据（示例文章/简历/版本历史）
- **GitHub Pages 构建（静态导出）**
  - 构建期需要可访问的 API：默认在 Runner 上临时启动 Nest + SQLite；也可改为读取已部署的公网 API（见下文 `PAGES_REMOTE_API_URL`）

## AI 向导（Agent）

> 让访客「问一句话」就能看完该看的内容，告别在导航里翻来翻去。

- **入口**
  - 全站右下角浮动按钮（`/agent` 页除外）
  - 全局快捷键 `⌘/Ctrl + I` 唤起抽屉
  - `/agent` 全屏页，带能力介绍与示例 prompt
  - `⌘K` 命令面板里也有「打开 AI 向导」条目
- **协议**：OpenAI 兼容 `POST /chat/completions`（`stream: true` + `tools`），任意厂商接 BaseURL 即可
- **工具集合（lib/agent/tools.ts）**
  - `list_posts` / `search_posts` / `get_post` / `pick_random_post`
  - `get_changelog` / `get_resume`
  - `navigate` / `set_theme` / `open_command_palette` / `copy_text`
- **运行模式**
  - **LLM 模式**：配置 `NEXT_PUBLIC_AGENT_BASE_URL` + `NEXT_PUBLIC_AGENT_MODEL` 后启用流式 + tool calling
  - **本地启发式模式**：未配置时自动启用，覆盖搜索/导航/主题/命令面板等高频意图
- **静态导出友好**：所有 Agent 调用都跑在浏览器侧（构建期不需要任何额外服务），可直接随 GitHub Pages 一起部署
- **安全性**：浏览器侧 fetch 会让任何 `NEXT_PUBLIC_*` 暴露给客户端。生产建议把 BaseURL 指向你自己控制的反代，由反代注入真实 key
- **多会话同步（仅生产环境）**：当 `NEXT_PUBLIC_API_URL` / `public-api.json.apiBaseUrl` 可用时，浏览器会自动通过 `/api/agent/sessions` 把会话同步到后端 SQLite；本地 dev 始终走 localStorage（与浏览量逻辑一致），避免开发态污染线上数据
- **匿名身份**：前端在 localStorage 里生成 `u_<rand>` 作为 `X-Agent-User` 头；服务端有「每用户 50 个会话 / 每会话 120 条 / 单条 16KB / 整体 200KB / body 256KB」五道闸防止匿名滥用

## 技术栈

| 层级 | 技术                                                                 |
| ---- | -------------------------------------------------------------------- |
| 前端 | Next.js App Router、React、TypeScript、Tailwind CSS                  |
| 后端 | NestJS 11、TypeORM、better-sqlite3                                   |
| 数据 | SQLite 文件（默认 `backend/data/blog.sqlite`），首次启动自动种子数据 |

## 目录结构

```
.
├─ src/                       # Next.js 前端源码
│  ├─ app/agent/              # AI 向导全屏页（/agent）
│  ├─ components/agent/       # AI 向导 UI：FAB 入口、抽屉、消息、工具卡片
│  ├─ lib/agent/              # AI 向导核心：types / tools / runner / heuristic / llm-client
│  └─ config/public-api.json  # Actions/变量未配置时：浏览量上报 + Agent 配置兜底（可留空）
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
  - **用途**：浏览器端请求的 API 根 URL（尤其用于浏览量上报、Agent 工具调用）
  - **本地示例**：`http://127.0.0.1:4000`
- **API_URL**（可选）
  - **用途**：仅服务端/构建期使用的 API 根 URL（静态导出拉文章数据）
  - **说明**：GitHub Pages 工作流会自行设置此值；本地如需从远端 API 拉数据可设置

#### AI 向导（Agent，全部可选）

未配置以下变量时，Agent 自动降级为「本地启发式模式」（支持站内导航/搜索/主题切换等 9 种工具，但不支持开放式问答）。

- **NEXT_PUBLIC_AGENT_BASE_URL**
  - **用途**：OpenAI 兼容 BaseURL（须以 `/v1` 等版本路径结尾）
  - **示例**：`https://api.openai.com/v1`、`https://api.deepseek.com/v1`
  - **建议**：生产环境务必指向你自己控制的反代，避免在浏览器里直接暴露真实 key
- **NEXT_PUBLIC_AGENT_MODEL**
  - **用途**：模型名，与 BaseURL 对应
  - **示例**：`gpt-4o-mini`、`deepseek-chat`
- **NEXT_PUBLIC_AGENT_API_KEY**（可选）
  - **用途**：以 Bearer 形式发送的 API Key
  - **警告**：浏览器侧调用会让 key 出现在客户端流量中。仅在你确信可控时使用，否则改用反代
- **NEXT_PUBLIC_AGENT_SYSTEM_PROMPT**（可选）：覆盖默认中文系统提示词
- **NEXT_PUBLIC_AGENT_TEMPERATURE**（可选）：温度，默认 `0.4`

> 也可以在 `src/config/public-api.json` 的 `agent` 节点配置同名字段（构建期写死，适合无法注入环境变量的场景，如 GitHub Pages 静态导出）。

#### LLM 接入指南（国内/海外通用）

本项目的 Agent（AI 向导）**只依赖 OpenAI 兼容的 Chat Completions 流式接口**：

- `POST <BASE_URL>/chat/completions`
- 请求体支持 `stream: true` 与 `tools`（function calling）

因此你可以用「**任意大模型**（中国/海外均可）」，只要满足以下二选一：

- **A. 该厂商本身提供 OpenAI 兼容网关**（你直接把 `NEXT_PUBLIC_AGENT_BASE_URL` 指过去）
- **B. 使用你自己部署/购买的“OpenAI 兼容聚合网关”**把不同厂商协议统一成 OpenAI 兼容（推荐，便于在国内外自由切换）

**推荐接入方式（按安全性从高到低）**

- **方式 1（推荐）— 自己的反代/网关注入 Key（安全）**
  - 浏览器端把 `NEXT_PUBLIC_AGENT_BASE_URL` 指向你的反代（例如 `https://llm-proxy.example.com/v1`）
  - 真实的 API Key 放在反代里注入（不要下发给前端）
  - 优点：不会把 key 暴露给访客；可做限流、审计、域名白名单、模型路由
- **方式 2 — 直连 OpenAI 兼容接口（仅适合私有环境）**
  - 直接在前端配置 `NEXT_PUBLIC_AGENT_API_KEY`（**强烈不建议用于公开站点**）
  - 风险：key 会出现在客户端网络请求中，等价于“公开给所有访客”

**配置步骤**

1. 选择一个 OpenAI 兼容的 BaseURL（通常以 `/v1` 结尾）
2. 选择一个模型名（`NEXT_PUBLIC_AGENT_MODEL`）
3. （可选）设置 `NEXT_PUBLIC_AGENT_SYSTEM_PROMPT` / `NEXT_PUBLIC_AGENT_TEMPERATURE`
4. 重新构建并部署前端（这些 `NEXT_PUBLIC_*` 是构建期注入）

**示例（仅示意，具体以各厂商文档/网关配置为准）**

```bash
# .env.local（或在 Vercel / Actions Variables 里配置）
NEXT_PUBLIC_AGENT_BASE_URL=https://your-openai-compatible-gateway.example.com/v1
NEXT_PUBLIC_AGENT_MODEL=deepseek-chat

# 不推荐在公开站点设置（见上文安全说明）
# NEXT_PUBLIC_AGENT_API_KEY=sk-xxxx
```

**国内/海外“全兼容”的关键建议**

- **优先选用 OpenAI 兼容聚合网关**：这样无论你实际底层用的是国内还是海外模型，前端都只改 `BASE_URL + MODEL`，不会改代码。
  - 常见选择包括：自建网关（Nginx/Cloudflare Worker/Serverless）或开源聚合（如 LiteLLM、一类 OpenAI-兼容 One-API 网关等）。
- **如果某厂商不直接兼容 `tools`/`stream`**：也建议走聚合网关做协议抹平（否则 function calling 体验会退化）。
- **跨境网络不稳定/合规要求**：可以同时准备 2 套网关（境内/境外），通过部署环境变量切换，代码无需变化。

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
  - **方法白名单**：默认放行 `GET / HEAD / POST / PUT / DELETE / OPTIONS`（AI 向导多会话接口需要 `PUT` / `DELETE`）
  - **请求头白名单**：`Content-Type / Authorization / X-Agent-User`（最后一个为 AI 向导匿名身份头）
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
- **AI 向导（生产线上启用，本地 dev 不调用）**
  - **请求头**：所有 `/api/agent/*` 接口都要求带 `X-Agent-User`（前端在 localStorage 生成 `u_<rand>`）；缺失或不合法返回 400
  - **配额（服务端硬上限）**：每用户最多 50 个会话；每会话最多 120 条消息；单条 content 最大 16 KB；整段 messagesJson 最大 200 KB；body 上限 256 KB（在 `main.ts` 中显式设置）
  - **多会话（前端实际使用）**
    - `GET /api/agent/sessions`：列出当前用户的会话（按 `updatedAt` 倒序）
    - `POST /api/agent/sessions`：新建会话；body：`{ title?, messages? }`
    - `GET /api/agent/sessions/:id`：拉取一个会话的 messages
    - `PUT /api/agent/sessions/:id`：更新 title 或 messages（防抖回写）
    - `DELETE /api/agent/sessions/:id`：删除会话
  - **单用户记忆快照（兜底 API，便于其它客户端接入；前端默认未使用）**
    - `GET /api/agent/memory`
    - `PUT /api/agent/memory` body：`{ messages: [] }`

## 构建

```bash
npm run build
npm run build:static   # 静态站点输出到 out/（GitHub Pages）
npm run build:api
```

## GitHub 自动部署

推送代码到 GitHub 后，**Actions** 会按工作流执行；页面顶部徽章可点进对应流水线。

| 工作流                                                               | 说明                                                                                                                 |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [CI](.github/workflows/ci.yml)                                       | 对 **main/master** 的 push 与 PR 运行：前端 `lint` + `build` + `build:static`，后端 `lint` + `build` + 单元/E2E 测试 |
| [Deploy GitHub Pages](.github/workflows/deploy-github-pages.yml)     | 推送 **main/master** 时将 `**npm run build:static`** 产物 `**out/**`部署到`**https://zxdnoob.github.io/**`（见下节） |
| [Deploy frontend (Vercel)](.github/workflows/deploy-vercel.yml)      | 配置了 `VERCEL_*` 密钥时，用 CLI 将 **Next.js** 推到 **Vercel 生产环境**；未配置时该工作流会跳过                     |
| [Publish backend image](.github/workflows/publish-backend-image.yml) | 变更 **backend/** 或手动 **Run workflow** 时构建镜像并推送到 `**ghcr.io/<小写 owner>/<小写 repo>/backend`\*\*        |
| [Aliyun OSS backup](.github/workflows/aliyun-oss-backup.yml)         | （可选）将 ECS 上 Docker 卷中的 SQLite 备份到阿里云 OSS（可定时/链式触发）                                           |
| [Dependabot](.github/dependabot.yml)                                 | 每周检查根目录与 `backend/` 的 npm 依赖，发起更新 PR                                                                 |

仓库根目录 [vercel.json](vercel.json) 指定 `framework: nextjs` 与 `npm ci` / `npm run build`，便于 Vercel 与本地行为一致。

### 前端：GitHub Pages（`username.github.io` 仓库）

本仓库名为 `**zxdnoob.github.io**` 时，GitHub 会将站点发布到 `**https://zxdnoob.github.io/**`。

[Deploy GitHub Pages](.github/workflows/deploy-github-pages.yml) 在 `**main**` 上构建 `**out/**`，再通过官方 `**actions/upload-pages-artifact**` 与 `**actions/deploy-pages**` 发布；仓库 **[Deployments](https://github.com/ZxdNoob/zxdnoob.github.io/deployments)** 中会出现对应部署记录。

1. 打开 **Settings → Pages**，在 **Build and deployment** 中：

- **Source** 必须选 **GitHub Actions**（不要选 **Deploy from a branch** 指望本工作流去更新站点——仅推 `gh-pages` 分支在「Actions 源」下**不会**替换线上内容）。
- 首次使用若提示选择工作流，选 **Deploy GitHub Pages**。

2. 推送 **main** 或手动 **Run workflow** 后：先跑 **Build static site**，再跑 **Deploy to GitHub Pages**；成功几分钟后 `**https://zxdnoob.github.io/`** 更新。若 **github-pages\*\* 环境启用了审批，需在 Deployments / Environments 里批准后再上线。
3. **文章与版本历史**在构建时通过 HTTP 从 Nest API 拉取。默认在 Runner 上启动临时 Nest + SQLite（含种子文章），**无需**配置 Secret。若要从**已部署的公网 API**拉数据，在 Actions 中配置 Secret `**PAGES_REMOTE_API_URL`**（API 根 URL，无尾部斜杠）。不要用 `**API_URL**` 做这件事——工作流不读取它；且 **GitHub 禁止在 `if:` 里直接使用 `secrets.*`\*\*，旧版工作流会整段校验失败、部署不更新。若曾添加 `API_URL` 导致构建跳过本地 API 又拉不到远程，可删除该 Secret 或改用 `PAGES_REMOTE_API_URL`。
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

_Hello — 热爱编程与生活，愿你我都能把每一天过好。_
