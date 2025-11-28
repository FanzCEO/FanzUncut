// Test Setup File
// Global test configuration and utilities

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '5000';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.SESSION_SECRET = 'test-session-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/fanz_test_db';

// Increase timeout for slow operations
jest.setTimeout(30000);

// Global test utilities
global.testConfig = {
  baseUrl: 'http://localhost:5000',
  timeout: 30000,
  retries: 3
};

// Mock console methods in tests to reduce noise
global.beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

global.afterEach(() => {
  jest.restoreAllMocks();
});

// Helper function for async test delays
global.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function for retrying flaky tests
global.retryTest = async (testFn, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await testFn();
      return; // Success!
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        console.log(`Test attempt ${attempt} failed, retrying...`);
        await delay(1000 * attempt); // Exponential backoff
      }
    }
  }
  
  throw lastError;
};

// API test helper
global.apiTest = {
  get: (url, options = {}) => {
    const fetch = require('node-fetch');
    return fetch(`${global.testConfig.baseUrl}${url}`, {
      method: 'GET',
      timeout: global.testConfig.timeout,
      ...options
    });
  },
  
  post: (url, data, options = {}) => {
    const fetch = require('node-fetch');
    return fetch(`${global.testConfig.baseUrl}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      timeout: global.testConfig.timeout,
      ...options
    });
  }
};

console.log('🧪 Test environment setup complete');