import { z } from 'zod';
import { router, publicProcedure } from '../../server/trpc';
import { createServicesFromContext } from '../services/ServiceFactory';

export const messagesRouter = router({
  create: publicProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, 'Conversation ID is required'),
        role: z.enum(['user', 'assistant']),
        content: z
          .string()
          .min(1, 'Message content cannot be empty')
          .max(10000, 'Message content too long (max 10,000 characters)'),
        tokens: z.number().min(0, 'Token count must be non-negative'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { messageService } = createServicesFromContext(ctx);
      return await messageService.create({
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
      });
    }),

  getByConversation: publicProcedure
    .input(z.object({ conversationId: z.string().min(1, 'Conversation ID is required') }))
    .query(async ({ ctx, input }) => {
      const { messageService } = createServicesFromContext(ctx);
      return await messageService.getMessagesByConversation(input.conversationId);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string().min(1, 'Message ID is required'),
        content: z
          .string()
          .min(1, 'Message content cannot be empty')
          .max(10000, 'Message content too long (max 10,000 characters)'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { messageService } = createServicesFromContext(ctx);
      return await messageService.update(input.id, { content: input.content });
    }),

  delete: publicProcedure
    .input(z.string().min(1, 'Message ID is required'))
    .mutation(async ({ ctx, input: messageId }) => {
      const { messageService } = createServicesFromContext(ctx);
      return await messageService.delete(messageId);
    }),
});
