// Global test setup file
import { beforeAll, afterAll, vi } from 'vitest';

// Set up test environment variables
process.env.NODE_ENV = 'test';

// Suppress console.error noise from handleError() in unit tests.
// Errors are intentionally thrown in many tests; the output is expected but unhelpful.
vi.spyOn(console, 'error').mockImplementation(() => {});

beforeAll(() => {
  // Global setup that runs once before all test files
  console.log('🧪 Starting test suite...');
});

afterAll(() => {
  // Global cleanup that runs once after all test files
  console.log('✅ Test suite completed');
});