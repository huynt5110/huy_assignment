module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tests/tsconfig.json' }],
  },
};
