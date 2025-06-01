// Global test setup file
import { beforeAll, afterAll } from 'vitest';

// Set up test environment variables
process.env.NODE_ENV = 'test';

beforeAll(() => {
  // Global setup that runs once before all test files
  console.log('🧪 Starting test suite...');
});

afterAll(() => {
  // Global cleanup that runs once after all test files
  console.log('✅ Test suite completed');
});