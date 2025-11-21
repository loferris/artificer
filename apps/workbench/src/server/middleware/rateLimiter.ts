// Simple in-memory rate limiter for solo deployment
// For production with multiple instances, use Redis or database-backed solution

import { TIME, RATE_LIMITS as RATE_LIMIT_CONSTANTS } from '../../constants';

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
      RATE_LIMIT_CONSTANTS.CLEANUP_INTERVAL_MS,
    );
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
export const ENDPOINT_RATE_LIMITS = {
  // Chat messages - most expensive operation
  CHAT: { maxRequests: RATE_LIMIT_CONSTANTS.CHAT_REQUESTS_PER_MINUTE, windowMs: TIME.MINUTE },

  // Orchestration - very expensive (runs analyzer + router + executor + validator)
  ORCHESTRATION: { maxRequests: RATE_LIMIT_CONSTANTS.ORCHESTRATION_REQUESTS_PER_MINUTE, windowMs: TIME.MINUTE },

  // General API calls
  API: { maxRequests: RATE_LIMIT_CONSTANTS.API_REQUESTS_PER_MINUTE, windowMs: TIME.MINUTE },

  // Export operations - resource intensive
  EXPORT: { maxRequests: RATE_LIMIT_CONSTANTS.EXPORT_REQUESTS_PER_MINUTE, windowMs: TIME.MINUTE },
} as const;

// Backwards compatibility alias
export const RATE_LIMITS = ENDPOINT_RATE_LIMITS;

export function createRateLimitMiddleware(limitType: keyof typeof ENDPOINT_RATE_LIMITS) {
  // Disable rate limiting for tests and development
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    return (identifier: string) => ({
      allowed: true,
      remaining: 999,
      resetTime: Date.now() + TIME.MINUTE,
    });
  }

  return (identifier: string) => {
    const config = ENDPOINT_RATE_LIMITS[limitType];
    return rateLimiter.check(identifier, config.maxRequests, config.windowMs);
  };
}

// Graceful shutdown
process.on('SIGTERM', () => rateLimiter.cleanup());
process.on('SIGINT', () => rateLimiter.cleanup());
