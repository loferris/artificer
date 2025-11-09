/**
 * Auth Router - Test endpoints for authentication
 */

import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const authRouter = router({
  /**
   * Public endpoint - no auth required
   */
  public: publicProcedure.query(() => {
    return {
      message: 'This is a public endpoint - no authentication required',
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Protected endpoint - requires API key
   */
  protected: protectedProcedure.query(({ ctx }) => {
    return {
      message: 'Successfully authenticated!',
      userId: ctx.authenticatedUser?.id,
      keyId: ctx.authenticatedUser?.keyId,
      scopes: ctx.authenticatedUser?.scopes,
      clientIp: ctx.clientIp,
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Get current user info (if authenticated)
   */
  whoami: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.db) {
      return { error: 'Database not available in demo mode' };
    }

    const user = await ctx.db.user.findUnique({
      where: { id: ctx.authenticatedUser!.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return {
      user,
      keyId: ctx.authenticatedUser?.keyId,
      scopes: ctx.authenticatedUser?.scopes,
    };
  }),
});
