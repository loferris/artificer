import { z } from 'zod';
import { router, publicProcedure } from '../../server/trpc';
import { TRPCError } from '@trpc/server';
import { createServicesFromContext } from '../services/ServiceFactory';

export const chatRouterRefactored = router({
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
      try {
        // Basic session validation
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Session required',
          });
        }

        // Create services with proper dependency injection
        const { chatService } = createServicesFromContext(ctx);

        // Use chat service to handle the entire flow
        const result = await chatService.sendMessage(
          {
            content: input.content,
            conversationId: input.conversationId,
          },
          ctx.user.sessionId,
        );

        // Return the assistant message with metadata
        return {
          id: result.assistantMessage.id,
          content: result.assistantMessage.content,
          role: 'assistant' as const,
          timestamp: result.assistantMessage.timestamp,
          model: result.assistantMessage.model,
          cost: result.assistantMessage.cost,
          tokens: result.assistantMessage.tokens,
          conversationTitle: result.conversationTitle, // Include title if it was auto-generated
        };
      } catch (error) {
        // Service layer already handles error transformation
        // Just re-throw to let tRPC handle the response
        throw error;
      }
    }),

  getMessages: publicProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, 'Conversation ID is required'),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        // Basic session validation
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Session required',
          });
        }

        // Create services
        const { chatService } = createServicesFromContext(ctx);

        // Get chat messages
        const messages = await chatService.getChatMessages(
          input.conversationId,
          ctx.user.sessionId,
        );

        return messages;
      } catch (error) {
        throw error;
      }
    }),
});
