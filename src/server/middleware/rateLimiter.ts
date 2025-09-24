// Simple in-memory rate limiter for solo deployment
// For production with multiple instances, use Redis or database-backed solution

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private limits = new Map<string, RateLimitEntry>();

  // Clean up expired entries every 5 minutes
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(
      () => {
        const now = Date.now();
        this.limits.forEach((entry, key) => {
          if (now > entry.resetTime) {
            this.limits.delete(key);
          }
        });
      },
      5 * 60 * 1000,
    ); // 5 minutes
  }

  check(
    identifier: string,
    maxRequests: number,
    windowMs: number,
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      const resetTime = now + windowMs;
      this.limits.set(identifier, { count: 1, resetTime });
      return { allowed: true, remaining: maxRequests - 1, resetTime };
    }

    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    // Increment count
    entry.count++;
    this.limits.set(identifier, entry);
    return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime };
  }

  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.limits.clear();
  }
}

export const rateLimiter = new InMemoryRateLimiter();

// Rate limiting configurations for different endpoints
export const RATE_LIMITS = {
  // Chat messages - most expensive operation
  CHAT: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests per minute

  // General API calls
  API: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute

  // Export operations - resource intensive
  EXPORT: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 exports per minute
} as const;

export function createRateLimitMiddleware(limitType: keyof typeof RATE_LIMITS) {
  // Disable rate limiting for tests and development
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    return (identifier: string) => ({
      allowed: true,
      remaining: 999,
      resetTime: Date.now() + 60000,
    });
  }

  return (identifier: string) => {
    const config = RATE_LIMITS[limitType];
    return rateLimiter.check(identifier, config.maxRequests, config.windowMs);
  };
}

// Graceful shutdown
process.on('SIGTERM', () => rateLimiter.cleanup());
process.on('SIGINT', () => rateLimiter.cleanup());
