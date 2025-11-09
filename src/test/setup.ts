import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Setup jsdom globals
if (typeof window !== 'undefined') {
  // Mock window.navigator
  Object.defineProperty(window, 'navigator', {
    writable: true,
    value: {
      userAgent: 'node.js',
      language: 'en-US',
      onLine: true,
    },
  });

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock HTMLIFrameElement if not present
  if (typeof HTMLIFrameElement === 'undefined') {
    (global as any).HTMLIFrameElement = class HTMLIFrameElement {};
  }
}

// Set default environment variables for tests
process.env.OPENROUTER_DEFAULT_MODEL = 'deepseek-chat';
process.env.OPENROUTER_API_KEY = 'test-api-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

vi.mock('./server/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    rateLimitHit: vi.fn(),
  },
}));

// Mock Prisma to avoid database connection during tests
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    conversation: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn(),
    },
  })),
}));

// Mock the database client module
vi.mock('../server/db/client', () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    conversation: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import { rateLimiter } from '../server/middleware/rateLimiter';

// Run cleanup after each test case
afterEach(() => {
  cleanup();
  // Clear rate limits to ensure tests are isolated
  (rateLimiter as any).limits.clear();
  vi.restoreAllMocks();
});
