/**
 * Simple in-memory rate limiter using sliding window
 */

interface RateLimitEntry {
  requests: number[];
  resetAt: number;
}

export class RateLimiter {
  private cache = new Map<string, RateLimitEntry>();
  private windowMs: number;
  private maxRequests: number;

  constructor(options: { windowMs: number; maxRequests: number }) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request should be allowed
   * Returns { allowed: boolean, remaining: number, resetAt: number }
   */
  check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let entry = this.cache.get(identifier);

    // Clean up old requests outside the window
    if (entry) {
      entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);
    } else {
      entry = {
        requests: [],
        resetAt: now + this.windowMs,
      };
      this.cache.set(identifier, entry);
    }

    // Update reset time if needed
    if (entry.requests.length === 0) {
      entry.resetAt = now + this.windowMs;
    }

    const requestCount = entry.requests.length;
    const allowed = requestCount < this.maxRequests;

    if (allowed) {
      entry.requests.push(now);
    }

    return {
      allowed,
      remaining: Math.max(0, this.maxRequests - requestCount - (allowed ? 1 : 0)),
      resetAt: entry.resetAt,
    };
  }

  /**
   * Reset rate limit for a specific identifier
   */
  reset(identifier: string): void {
    this.cache.delete(identifier);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [identifier, entry] of this.cache.entries()) {
      // Remove entries with no recent requests
      if (entry.requests.every(timestamp => timestamp <= windowStart)) {
        this.cache.delete(identifier);
      }
    }
  }

  /**
   * Get current status for an identifier without incrementing
   */
  getStatus(identifier: string): {
    requests: number;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const entry = this.cache.get(identifier);

    if (!entry) {
      return {
        requests: 0,
        remaining: this.maxRequests,
        resetAt: now + this.windowMs,
      };
    }

    const recentRequests = entry.requests.filter(timestamp => timestamp > windowStart);
    const requestCount = recentRequests.length;

    return {
      requests: requestCount,
      remaining: Math.max(0, this.maxRequests - requestCount),
      resetAt: entry.resetAt,
    };
  }
}

/**
 * Rate limiter for document updates
 * Limit: 5 requests per minute per user/IP
 */
export const documentUpdateRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
});
