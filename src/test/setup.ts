import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

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
