import { z } from 'zod';
import { router, publicProcedure } from '../../server/trpc';
import { createServicesFromContext } from '../services/ServiceFactory';

export const conversationsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const { conversationService } = createServicesFromContext(ctx);
    return await conversationService.listConversations();
  }),

  create: publicProcedure
    .input(z.object({ firstMessage: z.string().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const { conversationService, chatService } = createServicesFromContext(ctx);

      // Create the conversation shell
      const newConversation = await conversationService.createConversation({
        title: null, // Title will be generated later
      });

      // If a first message is provided, send it and get the AI's reply
      if (input?.firstMessage) {
        await chatService.sendMessage(
          {
            content: input.firstMessage,
            conversationId: newConversation.id,
            signal: ctx.signal,
          },
          ctx.user?.sessionId,
        );
      }

      // Return the complete conversation, now with messages
      return await conversationService.getById(newConversation.id);
    }),

  updateTitle: publicProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, 'Conversation ID is required'),
        firstMessage: z.string().min(1, 'First message is required'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { conversationService } = createServicesFromContext(ctx);
      return await conversationService.updateConversationTitle(
        input.conversationId,
        input.firstMessage,
      );
    }),

  delete: publicProcedure
    .input(z.string().min(1, 'Conversation ID is required'))
    .mutation(async ({ ctx, input: conversationId }) => {
      const { conversationService } = createServicesFromContext(ctx);
      return await conversationService.deleteConversation(conversationId);
    }),
});
