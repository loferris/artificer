import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, beforeEach, vi } from 'vitest';

// CRITICAL: Set env vars FIRST before any imports that might use them
process.env.OPENROUTER_DEFAULT_MODEL = 'deepseek-chat';
process.env.OPENROUTER_API_KEY = 'test-api-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';

// Silence console noise during tests (only show errors)
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  debug: console.debug,
};

beforeAll(() => {
  console.log = vi.fn();
  console.info = vi.fn();
  console.warn = vi.fn();
  console.debug = vi.fn();
  // Keep console.error for actual errors
});

// Setup jsdom globals
if (typeof window !== 'undefined') {
  // Mock localStorage
  const createStorageMock = () => {
    let store: Record<string, string> = {};
    return {
      getItem: function(key: string) { return store[key] || null; },
      setItem: function(key: string, value: string) { store[key] = value.toString(); },
      removeItem: function(key: string) { delete store[key]; },
      clear: function() { store = {}; },
      key: function(index: number) { return Object.keys(store)[index] || null; },
      get length() { return Object.keys(store).length; },
    };
  };

  Object.defineProperty(window, 'localStorage', {
    value: createStorageMock(),
    writable: true,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: createStorageMock(),
    writable: true,
  });

  // Mock window.navigator
  Object.defineProperty(window, 'navigator', {
    writable: true,
    configurable: true,
    value: {
      userAgent: 'node.js',
      language: 'en-US',
      onLine: true,
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(''),
      },
    },
  });

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
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

  // Mock window.location
  delete (window as any).location;
  (window as any).location = {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    reload: vi.fn(),
    replace: vi.fn(),
  };
}

// Mock logger to silence pino JSON output during tests
vi.mock('./server/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    rateLimitHit: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
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

// Run cleanup after each test case
afterEach(async () => {
  // Only import cleanup for React component tests
  if (typeof window !== 'undefined' && document.body.children.length > 0) {
    const { cleanup } = await import('@testing-library/react');
    cleanup();
  }

  // Lazy load rateLimiter only when needed
  try {
    const { rateLimiter } = await import('../server/middleware/rateLimiter');
    (rateLimiter as any).limits?.clear();
  } catch {
    // rateLimiter not available in all test contexts
  }

  // Clear localStorage/sessionStorage between tests (only if methods exist)
  if (typeof window !== 'undefined') {
    if (window.localStorage && typeof window.localStorage.clear === 'function') {
      window.localStorage.clear();
    }
    if (window.sessionStorage && typeof window.sessionStorage.clear === 'function') {
      window.sessionStorage.clear();
    }
  }

  vi.restoreAllMocks();
  vi.clearAllMocks();
});
