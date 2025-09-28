// Unified Jest configuration (previous duplicate module.exports caused loss of testTimeout & setup)
module.exports = {
  preset: 'jest-expo',
  // Rely on preset environment; override if jsdom specifically needed: testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  testTimeout: 30000, // Global per-test timeout
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/types/**'
  ]
};