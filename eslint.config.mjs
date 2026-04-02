import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

/**
 * ESLint 扁平配置（ESLint 9+ `eslint.config.js` 风格）。
 *
 * - `eslint-config-next`：Next/React 推荐规则 + TypeScript
 * - `globalIgnores`：构建产物与自动生成声明，避免无意义告警
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 关闭与 Prettier 格式化冲突的 ESLint 规则（须放在扩展数组偏后位置）
  eslintConfigPrettier,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    /** Nest 后端使用独立 ESLint 配置（backend/eslint.config.mjs） */
    'backend/**',
  ]),
]);

export default eslintConfig;
