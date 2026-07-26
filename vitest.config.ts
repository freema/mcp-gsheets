import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      // lcov is what Codecov consumes — without it CI has nothing to upload.
      reporter: ['text', 'json', 'html', 'lcov'],
      // Measure every source file, not just the ones some test happened to
      // import. Without this the denominator tracks the import graph: the
      // suite reported 95% while a third of src/ was never looked at, and the
      // number moved whenever a test added an import.
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'tests/**',
        'scripts/**',
      ],
      // Set just under the current real numbers so they act as a ratchet:
      // coverage cannot slip, and each improvement should raise the floor.
      // Target is 80 across the board once the untested tool handlers are
      // covered.
      thresholds: {
        branches: 64,
        functions: 76,
        lines: 67,
        statements: 67,
      },
    },
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});