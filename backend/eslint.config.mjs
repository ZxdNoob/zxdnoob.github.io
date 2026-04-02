// @ts-check
/**
 * 后端 ESLint 扁平配置（与前端 `eslint.config.mjs` 相互独立）。
 *
 * - `typescript-eslint`：类型感知规则（依赖 `parserOptions.projectService`）
 * - `eslint-plugin-prettier`：将 Prettier 作为 ESLint 规则，避免格式与 lint 打架
 */
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    /** 避免配置文件自引用导致解析循环 */
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      /** Nest 默认 CJS 输出；与 `module: nodenext` 源码可共存 */
      sourceType: 'commonjs',
      parserOptions: {
        /** 使用 TS 项目服务做类型感知 lint，无需手写 project 列表 */
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      /** 渐进式代码库允许 any；新代码仍应优先具体类型 */
      '@typescript-eslint/no-explicit-any': 'off',
      /** 未 await 的 Promise 常见为漏处理，警告级别不阻断提交 */
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      /** 与 Prettier 冲突时报错；endOfLine 随仓库换行符 */
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
