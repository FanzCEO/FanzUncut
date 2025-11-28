// Jest Configuration for FANZ Ecosystem Testing
// Comprehensive test configuration for all backend services

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/server/tests/**/*.test.js',
    '<rootDir>/server/tests/**/*.test.ts',
    '<rootDir>/**/__tests__/**/*.(js|ts)',
    '<rootDir>/**/(*.)+(spec|test).(js|ts)'
  ],
  
  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  
  // Coverage collection from
  collectCoverageFrom: [
    'server/**/*.{js,ts}',
    '!server/**/*.d.ts',
    '!server/node_modules/**',
    '!server/dist/**',
    '!server/build/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Setup files
  setupFilesAfterEnv: [],
  
  // Module path mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/server/$1',
    '^@test/(.*)$': '<rootDir>/test/$1'
  },
  
  // Transform configuration (for TypeScript)
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json'
  ],
  
  // Test timeout (30 seconds for integration tests)
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Global test variables
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.PORT': '5000',
    'process.env.TEST_BASE_URL': 'http://localhost:5000',
    'process.env.JWT_SECRET': 'test-jwt-secret-key-for-testing-only'
  }
};