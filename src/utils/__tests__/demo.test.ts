import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Demo Utilities', () => {
  const originalEnv = process.env;
  const originalWindow = global.window;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.window = originalWindow;
  });

  describe('isDemoMode', () => {
    it('should return true when DEMO_MODE is set to true', async () => {
      process.env.DEMO_MODE = 'true';
      
      const { isDemoMode } = await import('../demo');
      expect(isDemoMode()).toBe(true);
    });

    it('should return true when NEXT_PUBLIC_DEMO_MODE is set to true', async () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
      
      const { isDemoMode } = await import('../demo');
      expect(isDemoMode()).toBe(true);
    });

    it('should return true when VERCEL_ENV is preview', async () => {
      process.env.VERCEL_ENV = 'preview';
      
      const { isDemoMode } = await import('../demo');
      expect(isDemoMode()).toBe(true);
    });

    it('should return false when no demo mode is set', async () => {
      const { isDemoMode } = await import('../demo');
      expect(isDemoMode()).toBe(false);
    });
  });

  describe('isServerSideDemo', () => {
    it('should return true when DEMO_MODE is set to true', async () => {
      process.env.DEMO_MODE = 'true';
      
      const { isServerSideDemo } = await import('../demo');
      expect(isServerSideDemo()).toBe(true);
    });

    it('should return true when running server-side and VERCEL_ENV is preview', async () => {
      // Simulate server-side environment
      global.window = undefined as any;
      process.env.VERCEL_ENV = 'preview';
      
      const { isServerSideDemo } = await import('../demo');
      expect(isServerSideDemo()).toBe(true);
    });

    it('should return false when not in demo mode', async () => {
      const { isServerSideDemo } = await import('../demo');
      expect(isServerSideDemo()).toBe(false);
    });
  });

  describe('isClientSideDemo', () => {
    it('should return true when NEXT_PUBLIC_DEMO_MODE is set to true', async () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
      
      const { isClientSideDemo } = await import('../demo');
      expect(isClientSideDemo()).toBe(true);
    });

    it('should return true when running client-side and hostname includes vercel.app', async () => {
      // Simulate client-side environment with vercel.app hostname
      global.window = {
        location: {
          hostname: 'chat-app-git-feature-demo.vercel.app',
        },
      } as any;
      process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
      
      const { isClientSideDemo } = await import('../demo');
      expect(isClientSideDemo()).toBe(true);
    });

    it('should return false when not in client-side demo mode', async () => {
      const { isClientSideDemo } = await import('../demo');
      expect(isClientSideDemo()).toBe(false);
    });

    it('should return false when running server-side', async () => {
      // Simulate server-side environment
      global.window = undefined as any;
      process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
      
      const { isClientSideDemo } = await import('../demo');
      expect(isClientSideDemo()).toBe(false);
    });
  });

  describe('shouldUseDemoFallback', () => {
    it('should return false when error is null or undefined', async () => {
      const { shouldUseDemoFallback } = await import('../demo');
      expect(shouldUseDemoFallback(null)).toBe(false);
      expect(shouldUseDemoFallback(undefined)).toBe(false);
    });

    it('should return true for INTERNAL_SERVER_ERROR', async () => {
      const { shouldUseDemoFallback } = await import('../demo');
      const error = {
        data: {
          code: 'INTERNAL_SERVER_ERROR',
        },
      };
      
      expect(shouldUseDemoFallback(error)).toBe(true);
    });

    it('should return true for JSON parse errors', async () => {
      const { shouldUseDemoFallback } = await import('../demo');
      const error = {
        message: 'Unexpected token < in JSON.parse at position 0',
      };
      
      expect(shouldUseDemoFallback(error)).toBe(true);
    });

    it('should return true for 405 errors', async () => {
      const { shouldUseDemoFallback } = await import('../demo');
      const error = {
        message: 'Request failed with status code 405',
      };
      
      expect(shouldUseDemoFallback(error)).toBe(true);
    });

    it('should return true for database errors', async () => {
      const { shouldUseDemoFallback } = await import('../demo');
      const error = {
        message: 'Database connection failed',
      };
      
      expect(shouldUseDemoFallback(error)).toBe(true);
    });

    it('should return true for connection errors', async () => {
      const { shouldUseDemoFallback } = await import('../demo');
      const error = {
        message: 'Connection refused',
      };
      
      expect(shouldUseDemoFallback(error)).toBe(true);
    });

    it('should return true for Prisma errors', async () => {
      const { shouldUseDemoFallback } = await import('../demo');
      const error = {
        message: 'PrismaClientKnownRequestError',
      };
      
      expect(shouldUseDemoFallback(error)).toBe(true);
    });

    it('should return true for ENOENT errors', async () => {
      const { shouldUseDemoFallback } = await import('../demo');
      const error = {
        message: 'ENOENT: no such file or directory',
      };
      
      expect(shouldUseDemoFallback(error)).toBe(true);
    });

    it('should return false for unrelated errors', async () => {
      const { shouldUseDemoFallback } = await import('../demo');
      const error = {
        message: 'Validation failed',
      };
      
      expect(shouldUseDemoFallback(error)).toBe(false);
    });

    it('should handle errors with no message property', async () => {
      const { shouldUseDemoFallback } = await import('../demo');
      const error = {
        code: 'EACCES',
      };
      
      expect(shouldUseDemoFallback(error)).toBe(false);
    });
  });
});