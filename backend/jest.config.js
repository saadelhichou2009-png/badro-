/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!server.ts'],
  coverageDirectory: '../coverage',
  clearMocks: true,
};
