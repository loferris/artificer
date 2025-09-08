import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { prisma } from './db/client';
import { getUserFromRequest } from './utils/session';
import { createRateLimitMiddleware, RATE_LIMITS } from './middleware/rateLimiter';
import { logger } from './utils/logger';

// Create context function
export const createContext = async (opts: CreateNextContextOptions) => {
  try {
    const user = getUserFromRequest(opts.req);

    // Create AbortController for request cancellation
    const controller = new AbortController();

    // Listen for request close/abort events
    opts.req.on('close', () => {
      if (!opts.req.complete) {
        controller.abort();
      }
    });

    opts.req.on('aborted', () => {
      controller.abort();
    });

    // In demo mode, skip database testing entirely
    const isDemoMode =
      process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    if (!isDemoMode && process.env.NODE_ENV === 'production') {
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (dbError) {
        logger.error('Database connection failed in context creation', dbError as Error);
        // Don't throw here, let individual routes handle DB issues
      }
    }

    return {
      req: opts.req,
      res: opts.res,
      db: isDemoMode ? null : prisma, // Don't provide prisma in demo mode
      user,
      signal: controller.signal,
    };
  } catch (error) {
    logger.error('Context creation failed', error as Error);

    // Return a minimal context to prevent complete failure
    const isDemoMode =
      process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const controller = new AbortController();

    return {
      req: opts.req,
      res: opts.res,
      db: isDemoMode ? null : prisma, // Don't provide prisma in demo mode
      user: null,
      signal: controller.signal,
    };
  }
};

// Initialize tRPC
const t = initTRPC.context<typeof createContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        message: error.message,
        code: error.code,
        cause: error.cause,
      },
    };
  },
});

// Rate limiting middleware
const rateLimitMiddleware = t.middleware(({ ctx, next, path }) => {
  // Get user identifier (IP + session for solo deployment)
  const userAgent = ctx.req.headers['user-agent'] || 'unknown';
  const sessionId = ctx.user?.sessionId || 'anonymous';
  const identifier = `${userAgent}-${sessionId}`;

  // Apply different rate limits based on endpoint
  let limitType: keyof typeof RATE_LIMITS = 'API';
  if (path?.includes('sendMessage')) {
    limitType = 'CHAT';
  } else if (path?.includes('export')) {
    limitType = 'EXPORT';
  }

  const rateLimit = createRateLimitMiddleware(limitType);
  const result = rateLimit(identifier);

  if (!result.allowed) {
    logger.rateLimitHit(identifier, path || 'unknown', result.resetTime);
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
    });
  }

  // Add rate limit info to response headers (for debugging)
  if (ctx.res) {
    ctx.res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    ctx.res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
  }

  return next();
});

// Export reusable router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure.use(rateLimitMiddleware);
