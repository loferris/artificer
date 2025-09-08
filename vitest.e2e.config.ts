import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/e2e/setup.ts'],
    include: ['src/test/e2e/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['src/test/e2e/setup.ts', 'node_modules/**', 'dist/**', '.next/**'],
    globals: true,
    testTimeout: 10000, // 10 seconds for E2E tests
    hookTimeout: 10000,
    teardownTimeout: 1000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
