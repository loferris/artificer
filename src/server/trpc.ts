import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { prisma } from './db/client';
import { getUserFromRequest } from './utils/session';
import { createRateLimitMiddleware, RATE_LIMITS } from './middleware/rateLimiter';
import { logger } from './utils/logger';
import { ApiKeyService } from './services/auth';

/**
 * Get client IP address from request
 */
function getClientIp(req: CreateNextContextOptions['req']): string {
  // Check various headers that proxies might set
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }

  return req.socket.remoteAddress || 'unknown';
}

/**
 * Check if authentication is required (production mode)
 */
function isAuthRequired(): boolean {
  return process.env.REQUIRE_AUTH === 'true';
}

/**
 * Check if IP is in global whitelist
 */
function isIpWhitelisted(ip: string): boolean {
  const whitelist = process.env.IP_WHITELIST?.split(',').map(i => i.trim()) || [];

  // Empty whitelist = allow all IPs
  if (whitelist.length === 0) {
    return true;
  }

  return whitelist.includes(ip);
}

// Create context function
export const createContext = async (opts: CreateNextContextOptions) => {
  try {
    const user = getUserFromRequest(opts.req);
    const clientIp = getClientIp(opts.req);

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

    // API key validation (if auth is required)
    let authenticatedUser: { id: string; keyId: string; scopes: string[] } | null = null;

    if (isAuthRequired() && !isDemoMode) {
      // Extract API key from Authorization header
      const authHeader = opts.req.headers.authorization;

      if (authHeader?.startsWith('Bearer ')) {
        const apiKey = authHeader.substring(7);
        const apiKeyService = new ApiKeyService(prisma);
        const validation = await apiKeyService.validate(apiKey, clientIp);

        if (validation.valid && validation.userId) {
          authenticatedUser = {
            id: validation.userId,
            keyId: validation.keyId!,
            scopes: validation.scopes || ['*'],
          };
        }
      }
    }

    return {
      req: opts.req,
      res: opts.res,
      db: isDemoMode ? null : prisma, // Don't provide prisma in demo mode
      user,
      authenticatedUser, // API key auth
      clientIp,
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
      authenticatedUser: null,
      clientIp: getClientIp(opts.req),
      signal: controller.signal,
    };
  }
};

// For creating inner context without request (used in tests)
export const createInnerTRPCContext = (opts: {
  req?: any;
  res?: any;
  db: any;
  user?: any;
  signal?: AbortSignal;
}) => {
  return {
    req: opts.req || null,
    res: opts.res || null,
    db: opts.db,
    user: opts.user || null,
    authenticatedUser: null,
    clientIp: 'test',
    signal: opts.signal || new AbortController().signal,
  };
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

// Authentication middleware
const authMiddleware = t.middleware(({ ctx, next }) => {
  // Skip auth check if auth is not required or in demo mode
  const isDemoMode =
    process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (!isAuthRequired() || isDemoMode) {
    return next();
  }

  // Check if user is authenticated
  if (!ctx.authenticatedUser) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'API key required. Include "Authorization: Bearer <key>" header.',
    });
  }

  // Check IP whitelist
  if (!isIpWhitelisted(ctx.clientIp)) {
    logger.warn(`IP ${ctx.clientIp} not in whitelist`);
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Access denied. IP ${ctx.clientIp} is not whitelisted.`,
    });
  }

  return next({
    ctx: {
      ...ctx,
      // Guaranteed to be non-null after this middleware
      authenticatedUser: ctx.authenticatedUser,
    },
  });
});

// Export reusable router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure.use(rateLimitMiddleware);
export const protectedProcedure = t.procedure
  .use(rateLimitMiddleware)
  .use(authMiddleware);
