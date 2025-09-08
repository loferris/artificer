import { z } from 'zod';
import { router, publicProcedure } from '../../server/trpc';
import { createServicesFromContext } from '../services/ServiceFactory';

export const chatRouter = router({
  sendMessage: publicProcedure
    .input(
      z.object({
        content: z
          .string()
          .min(1, 'Message content cannot be empty')
          .max(10000, 'Message content too long (max 10,000 characters)'),
        conversationId: z.string().min(1, 'Conversation ID is required'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { chatService } = createServicesFromContext(ctx);

      const result = await chatService.sendMessage(
        {
          content: input.content,
          conversationId: input.conversationId,
          signal: ctx.signal,
        },
        ctx.user?.sessionId,
      );

      return {
        id: result.assistantMessage.id,
        content: result.assistantMessage.content,
        role: 'assistant' as const,
        timestamp: result.assistantMessage.timestamp,
        model: result.assistantMessage.model || 'unknown',
        cost: result.assistantMessage.cost || 0,
      };
    }),
});
