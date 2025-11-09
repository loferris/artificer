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
    // Don't load .env files during tests (use test setup instead)
    env: {
      OPENROUTER_DEFAULT_MODEL: 'deepseek-chat',
      OPENROUTER_API_KEY: 'test-api-key',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    },
    // Reduce memory usage in CI by limiting concurrency
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: process.env.CI === 'true',
      },
    },
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
