/**
 * Jest 端到端测试配置（原 `jest-e2e.json`，改为 .cjs 以便写中文注释）。
 * 由 `npm run test:e2e` 引用；与 `package.json` 内 `jest` 字段（单元测试）独立。
 *
 * - testRegex：仅匹配 `*.e2e-spec.ts`
 * - transform：ts-jest 编译 TypeScript
 * - testEnvironment：node，配合 supertest 测 HTTP
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
};
