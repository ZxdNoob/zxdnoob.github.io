/**
 * PostCSS 配置：Next.js 构建 CSS 时的管道入口。
 *
 * Tailwind CSS v4 通过 `@tailwindcss/postcss` 插件接入；
 * 全局样式写在 `src/app/globals.css`（`@import "tailwindcss"`）。
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
