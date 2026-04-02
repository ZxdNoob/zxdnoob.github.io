/**
 * 根目录 Prettier 配置（前端 + 仓库内除 backend 外由根 `format` 脚本格式化的文件）。
 *
 * - `singleQuote: true`：字符串统一单引号，与 ESLint/团队习惯一致
 * - `trailingComma: all`：多行末尾逗号，减少 diff 噪音
 *
 * 后端独立配置见 `backend/prettier.config.mjs`（与 `eslint-plugin-prettier` 对齐）。
 */
const config = {
  singleQuote: true,
  trailingComma: 'all',
};

export default config;
