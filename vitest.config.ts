import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    // CRITICAL: Set env vars for all test workers
    env: {
      OPENROUTER_DEFAULT_MODEL: 'deepseek-chat',
      OPENROUTER_API_KEY: 'test-api-key',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      NODE_ENV: 'test',
    },
    // Reduce memory usage in CI
    pool: process.env.CI === 'true' ? 'forks' : 'threads',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: false, // Share module cache between tests
      },
      threads: {
        singleThread: process.env.CI === 'true',
      },
    },
    // Limit parallel tests in CI
    maxConcurrency: process.env.CI === 'true' ? 1 : 5,
    // Skip slow tests in CI if needed
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*', '.next/', 'dist/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'node-fetch': 'node-fetch/lib/index.js',
    },
  },
});
