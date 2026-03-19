module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Match both unit tests in __tests__ and integration tests in tests/
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/tests/**/*.test.ts',
  ],
  // Path to setup file for environment variables
  setupFiles: ['<rootDir>/tests/setup.ts'],
  // Root directory for searching for tests and modules
  rootDir: '.',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tests/tsconfig.json' }],
  },
};
