import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use node environment for server tests, jsdom for components/client
    environmentMatchGlobs: [
      ['src/server/**/*.test.ts', 'node'],
      ['src/test/api/**/*.test.ts', 'node'],
      ['src/utils/**/*.test.ts', 'node'],
      // Everything else uses jsdom (components, hooks, lib/trpc which tests browser behavior)
      ['**/*.test.tsx', 'jsdom'],
      ['src/components/**/*.test.ts', 'jsdom'],
      ['src/hooks/**/*.test.ts', 'jsdom'],
      ['src/stores/**/*.test.ts', 'jsdom'],
      ['src/contexts/**/*.test.ts', 'jsdom'],
      ['src/lib/**/*.test.ts', 'jsdom'],
    ],
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    // Silence test output noise
    silent: false,
    reporter: process.env.CI === 'true' ? 'dot' : 'default',
    // CRITICAL: Set env vars for all test workers
    env: {
      OPENROUTER_DEFAULT_MODEL: 'deepseek-chat',
      OPENROUTER_API_KEY: 'test-api-key',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      NODE_ENV: 'test',
    },
    // Use threads for better memory sharing
    pool: 'threads',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: false, // Share module cache between tests
        maxForks: 1, // Limit to 1 fork to reduce memory usage
        execArgv: ['--max-old-space-size=5120'], // Set memory limit for worker processes (5GB for coverage)
      },
      threads: {
        singleThread: process.env.COVERAGE === 'true',
        isolate: false, // Share module cache between tests
        maxThreads: process.env.COVERAGE === 'true' ? 1 : undefined,
        minThreads: process.env.COVERAGE === 'true' ? 1 : undefined,
      },
    },
    // Limit parallel tests in CI and coverage runs
    maxConcurrency: (process.env.CI === 'true' || process.env.COVERAGE === 'true') ? 1 : 5,
    maxWorkers: (process.env.CI === 'true' || process.env.COVERAGE === 'true') ? 1 : undefined,
    // Skip slow tests in CI if needed
    testTimeout: 10000,
    coverage: {
      provider: 'istanbul', // More memory-efficient than v8
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '.next/',
        'dist/',
        '**/__tests__/**',
        '**/test/**',
        '**/*.test.*',
      ],
      // Reduce memory by limiting coverage collection
      all: false,
      clean: true,
      cleanOnRerun: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'node-fetch': 'node-fetch/lib/index.js',
    },
  },
});
