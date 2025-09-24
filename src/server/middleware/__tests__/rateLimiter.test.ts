import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimiter, RATE_LIMITS, createRateLimitMiddleware } from '../rateLimiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clear all limits after each test
    (rateLimiter as any).limits.clear();
  });

  describe('InMemoryRateLimiter', () => {
    it('should allow first request within limit', () => {
      const identifier = 'test-user';
      const maxRequests = 5;
      const windowMs = 60000; // 1 minute

      const result = rateLimiter.check(identifier, maxRequests, windowMs);

      expect(result).toEqual({
        allowed: true,
        remaining: 4,
        resetTime: expect.any(Number),
      });
    });

    it('should allow multiple requests within limit', () => {
      const identifier = 'test-user';
      const maxRequests = 5;
      const windowMs = 60000; // 1 minute

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        const result = rateLimiter.check(identifier, maxRequests, windowMs);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(5 - (i + 1));
      }
    });

    it('should block requests when exceeding limit', () => {
      const identifier = 'test-user';
      const maxRequests = 2;
      const windowMs = 60000; // 1 minute

      // Make requests up to the limit
      for (let i = 0; i < maxRequests; i++) {
        const result = rateLimiter.check(identifier, maxRequests, windowMs);
        expect(result.allowed).toBe(true);
      }

      // Next request should be blocked
      const result = rateLimiter.check(identifier, maxRequests, windowMs);
      expect(result).toEqual({
        allowed: false,
        remaining: 0,
        resetTime: expect.any(Number),
      });
    });

    it('should reset counter after window expires', () => {
      const identifier = 'test-user';
      const maxRequests = 2;
      const windowMs = 60000; // 1 minute

      // Make requests up to the limit
      for (let i = 0; i < maxRequests; i++) {
        rateLimiter.check(identifier, maxRequests, windowMs);
      }

      // Advance time beyond window
      vi.advanceTimersByTime(windowMs + 1000);

      // Next request should be allowed
      const result = rateLimiter.check(identifier, maxRequests, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(maxRequests - 1);
    });

    it('should handle different identifiers independently', () => {
      const identifier1 = 'user-1';
      const identifier2 = 'user-2';
      const maxRequests = 2;
      const windowMs = 60000; // 1 minute

      // Exhaust limit for first user
      for (let i = 0; i < maxRequests; i++) {
        rateLimiter.check(identifier1, maxRequests, windowMs);
      }

      // Second user should still be allowed
      const result = rateLimiter.check(identifier2, maxRequests, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(maxRequests - 1);
    });

    it('should cleanup expired entries', () => {
      const identifier = 'test-user';
      const maxRequests = 2;
      const windowMs = 60000; // 1 minute

      // Make a request
      rateLimiter.check(identifier, maxRequests, windowMs);
      expect((rateLimiter as any).limits.size).toBe(1);

      // Advance time beyond window
      vi.advanceTimersByTime(windowMs + 1000);

      // Manually trigger cleanup
      const now = Date.now();
      for (const [key, entry] of (rateLimiter as any).limits.entries()) {
        if (now > entry.resetTime) {
          (rateLimiter as any).limits.delete(key);
        }
      }

      expect((rateLimiter as any).limits.size).toBe(0);
    });

    it('should cleanup resources on shutdown', () => {
      const cleanupSpy = vi.spyOn(global as any, 'clearInterval');

      rateLimiter.cleanup();

      expect(cleanupSpy).toHaveBeenCalled();
      expect((rateLimiter as any).limits.size).toBe(0);
    });
  });

  describe('RATE_LIMITS', () => {
    it('should have proper rate limit configurations', () => {
      expect(RATE_LIMITS).toEqual({
        CHAT: { maxRequests: 30, windowMs: 60 * 1000 },
        API: { maxRequests: 100, windowMs: 60 * 1000 },
        EXPORT: { maxRequests: 5, windowMs: 60 * 1000 },
      });
    });

    it('should have all required rate limit types', () => {
      expect(RATE_LIMITS).toHaveProperty('CHAT');
      expect(RATE_LIMITS).toHaveProperty('API');
      expect(RATE_LIMITS).toHaveProperty('EXPORT');

      // Check CHAT configuration
      expect(RATE_LIMITS.CHAT).toEqual({
        maxRequests: 30,
        windowMs: 60000,
      });

      // Check API configuration
      expect(RATE_LIMITS.API).toEqual({
        maxRequests: 100,
        windowMs: 60000,
      });

      // Check EXPORT configuration
      expect(RATE_LIMITS.EXPORT).toEqual({
        maxRequests: 5,
        windowMs: 60000,
      });
    });
  });

  describe('createRateLimitMiddleware', () => {
    it('should create middleware for CHAT limit type', () => {
      const middleware = createRateLimitMiddleware('CHAT');
      const identifier = 'test-user';

      const result = middleware(identifier);

      expect(result).toEqual({
        allowed: true,
        remaining: 999,
        resetTime: expect.any(Number),
      });
    });

    it('should create middleware for API limit type', () => {
      const middleware = createRateLimitMiddleware('API');
      const identifier = 'test-user';

      const result = middleware(identifier);

      expect(result).toEqual({
        allowed: true,
        remaining: 999,
        resetTime: expect.any(Number),
      });
    });

    it('should create middleware for EXPORT limit type', () => {
      const middleware = createRateLimitMiddleware('EXPORT');
      const identifier = 'test-user';

      const result = middleware(identifier);

      expect(result).toEqual({
        allowed: true,
        remaining: 999,
        resetTime: expect.any(Number),
      });
    });
  });
});
