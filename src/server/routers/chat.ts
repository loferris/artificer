import { z } from 'zod';
import { router, publicProcedure } from '../../server/trpc';
import { createServicesFromContext } from '../services/ServiceFactory';

export const chatRouter = router({
  sendMessage: publicProcedure
    .input(
      z.object({
        content: z.string()
          .min(1, 'Message content cannot be empty')
          .max(10000, 'Message content too long (max 10,000 characters)'),
        conversationId: z.string().min(1, 'Conversation ID is required'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { chatService } = createServicesFromContext(ctx);
      
      const result = await chatService.sendMessage(
        input.content,
        input.conversationId,
        ctx.user?.sessionId
      );
      
      return {
        id: result.assistantMessage.id,
        content: result.assistantMessage.content,
        role: 'assistant' as const,
        timestamp: result.assistantMessage.createdAt,
        model: result.metadata?.model || 'unknown',
        cost: result.metadata?.cost || 0,
      };
    }),
});
