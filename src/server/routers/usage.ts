// z import removed as unused
import { router, publicProcedure } from '../../server/trpc';
import { TRPCError } from '@trpc/server';

export const usageRouter = router({
  getSessionStats: publicProcedure.query(async ({ ctx }) => {
    try {
      const [conversationCount, messageCount] = await Promise.all([
        ctx.db.conversation.count(),
        ctx.db.message.count(),
      ]);

      // Calculate total cost based on message tokens
      const messages = await ctx.db.message.findMany({
        select: { tokens: true },
      });

      const totalTokens = messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);
      const totalCost = totalTokens * 0.000002; // Rough cost per token

      return {
        conversationCount,
        messageCount,
        totalTokens,
        totalCost,
      };
    } catch (error) {
      console.error('Error fetching session stats:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch session statistics',
        cause: error,
      });
    }
  }),

  getModelUsage: publicProcedure.query(async ({ ctx }) => {
    try {
      const messages = await ctx.db.message.groupBy({
        by: ['role'],
        _count: {
          role: true,
        },
      });

      const totalMessages = messages.reduce((sum, group) => sum + group._count.role, 0);

      return {
        totalMessages,
        byRole: messages.map((group) => ({
          role: group.role,
          count: group._count.role,
          percentage: totalMessages > 0 ? (group._count.role / totalMessages) * 100 : 0,
        })),
      };
    } catch (error) {
      console.error('Error fetching model usage:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch model usage statistics',
        cause: error,
      });
    }
  }),
});
