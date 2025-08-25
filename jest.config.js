/** @type {import('jest').Config} */
const config = {
  // Use different environments based on test file patterns
  projects: [
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)',
        '<rootDir>/src/**/*.(test|spec).(ts|tsx|js)',
      ],
      testPathIgnorePatterns: [
        '<rootDir>/.next/', 
        '<rootDir>/node_modules/',
        'github\\.test\\.ts$', // Exclude GitHub tests from jsdom
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      moduleDirectories: ['node_modules', '<rootDir>/src'],
    },
    {
      displayName: 'node',
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.node.ts'],
      testMatch: [
        '<rootDir>/src/**/__tests__/**/github.test.ts', // Only GitHub tests in node environment
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      moduleDirectories: ['node_modules', '<rootDir>/src'],
    },
  ],

  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],

  // Ignore patterns
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
};

module.exports = config;