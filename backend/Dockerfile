# =============================================================================
# 生产镜像：NestJS + better-sqlite3（需在构建阶段编译原生模块）
# 运行时可挂载卷到 /app/data，并设置环境变量 DATABASE_PATH=/app/data/blog.sqlite
# =============================================================================
# ---------- 阶段 1：安装依赖并编译 TypeScript（含 better-sqlite3 原生编译）----------
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# node-gyp / 原生模块编译所需最小工具链
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
# 剔除 devDependencies，减小最终镜像体积
RUN npm prune --omit=dev

# ---------- 阶段 2：仅复制运行所需文件，非 root 用户启动 ----------
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# 默认 SQLite 目录（可被挂载卷覆盖）；非 root 用户需写权限
RUN mkdir -p /app/data \
  && chown -R node:node /app/data
ENV DATABASE_PATH=/app/data/blog.sqlite

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

RUN chown -R node:node /app

EXPOSE 4000

USER node

# 入口与 `npm run start:prod` 一致（编译后的 main）
CMD ["node", "dist/main.js"]
