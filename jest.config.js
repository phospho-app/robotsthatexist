/** @type {import('jest').Config} */
const config = {
  // The test environment that will be used for testing
  testEnvironment: 'jsdom',

  // Setup files after env
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform files with ts-jest
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },

  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js)',
  ],

  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],

  // Ignore patterns
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],

  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/src'],
};

module.exports = config;