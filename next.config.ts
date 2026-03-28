import path from "node:path";
import type { NextConfig } from "next";

/**
 * Next.js 主配置文件（TypeScript）。
 *
 * 职责概览：
 * - 配置 Turbopack 根目录，避免 monorepo / 多 lockfile 环境下误判项目根
 * - `STATIC_EXPORT=1` 时启用 `output: 'export'`，供 GitHub Pages 托管静态 `out/`
 *
 * 文档：https://nextjs.org/docs/app/api-reference/config/next-config-js
 */
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: "export" as const,
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

export default nextConfig;
