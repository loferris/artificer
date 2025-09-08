import { z } from 'zod';
import { router, publicProcedure } from '../../server/trpc';
import { createServicesFromContext } from '../services/ServiceFactory';

export const conversationsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const { conversationService } = createServicesFromContext(ctx);
    return await conversationService.listConversations();
  }),

  create: publicProcedure.mutation(async ({ ctx }) => {
    const { conversationService } = createServicesFromContext(ctx);
    return await conversationService.createConversation({
      title: null,
      model: 'deepseek-chat',
      systemPrompt: 'You are a helpful AI assistant.',
      temperature: 0.7,
      maxTokens: 1000,
    });
  }),

  updateTitle: publicProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, 'Conversation ID is required'),
        firstMessage: z.string().min(1, 'First message is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { conversationService } = createServicesFromContext(ctx);
      return await conversationService.updateConversationTitle(
        input.conversationId,
        input.firstMessage
      );
    }),

  delete: publicProcedure
    .input(z.string().min(1, 'Conversation ID is required'))
    .mutation(async ({ ctx, input: conversationId }) => {
      const { conversationService } = createServicesFromContext(ctx);
      return await conversationService.deleteConversation(conversationId);
    }),
});
