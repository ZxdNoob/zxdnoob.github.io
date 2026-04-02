import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * Next.js 主配置文件（TypeScript）。
 *
 * 职责概览：
 * - 配置 Turbopack 根目录，避免 monorepo / 多 lockfile 环境下误判项目根
 * - `STATIC_EXPORT=1` 时启用 `output: 'export'`，供 GitHub Pages 托管静态 `out/`
 *
 * 文档：https://nextjs.org/docs/app/api-reference/config/next-config-js
 */
const isStaticExport = process.env.STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        /** 静态导出到 `out/`，供 GitHub Pages 等纯静态托管 */
        output: 'export' as const,
        /** 静态导出无 Next 图片优化服务，需关闭默认 Image Optimization */
        images: { unoptimized: true },
      }
    : {}),
  /**
   * Turbopack（`next dev --turbopack` / Next 16 默认）相关选项。
   * `root` 显式指向当前包目录，避免拾取到用户主目录下其它 `package-lock.json`。
   */
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

/**
 * 其它根目录配置（部分为严格 JSON，无法在文件内写注释，字段含义如下备忘）：
 * - `vercel.json`：`framework: nextjs`，`installCommand: npm ci`，`buildCommand: npm run build`（内联说明见 `$comment`）
 * - `postcss.config.mjs`：Tailwind v4 PostCSS 插件
 * - `tsconfig.json`：路径别名 `@/*`、严格模式等
 * - `backend/nest-cli.json`：`sourceRoot`、`compilerOptions.deleteOutDir`；内联说明见文件内 `$comment`
 * - `backend/test/jest-e2e.config.cjs`：e2e 的 testRegex、ts-jest、Node 环境
 * - `.github/workflows/*`：CI/CD 与 Pages 部署
 */
export default nextConfig;
