import { z } from 'zod';
import { router, publicProcedure } from '../../server/trpc';
import { TRPCError } from '@trpc/server';
import { createServicesFromContext } from '../services/ServiceFactory';

// Helper function to ensure user exists in demo mode
function ensureDemoUser(ctx: any) {
  const isDemoMode = process.env.DEMO_MODE === 'true' || 
                    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || 
                    !ctx.db;
  
  let user = ctx.user;
  if (!user && isDemoMode) {
    user = {
      id: 'demo-user',
      sessionId: 'demo-session',
    };
  }

  if (!user && !isDemoMode) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Session required',
    });
  }

  return user;
}

/**
 * The tRPC router for chat-related operations.
 *
 * This router handles sending messages and retrieving message history, leveraging
 * a service-oriented architecture for improved separation of concerns.
 */
export const chatRouter = router({
  /**
   * Sends a message to a conversation and returns the assistant's response.
   *
   * This mutation handles the entire process of sending a message, including
   * session validation, calling the chat service, and returning the assistant's
   * reply with relevant metadata.
   */
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
        const user = ensureDemoUser(ctx);

        // Create services with proper dependency injection
        const { chatService } = createServicesFromContext(ctx);

        // Use chat service to handle the entire flow
        const result = await chatService.sendMessage(
          {
            content: input.content,
            conversationId: input.conversationId,
          },
          user.sessionId,
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

  /**
   * Retrieves the messages for a specific conversation.
   *
   * This query validates the user's session and fetches the complete
   * message history for a given conversation ID.
   */
  getMessages: publicProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, 'Conversation ID is required'),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const user = ensureDemoUser(ctx);

        // Create services
        const { chatService } = createServicesFromContext(ctx);

        // Get chat messages
        const messages = await chatService.getChatMessages(
          input.conversationId,
          user.sessionId,
        );

        return messages;
      } catch (error) {
        throw error;
      }
    }),
});
