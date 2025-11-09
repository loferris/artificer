// src/server/routers/subscriptions.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { createServicesFromContext } from '../services/ServiceFactory';
import { observable } from '@trpc/server/observable';
import type { ChatStreamChunk } from '../services/chat/ChatService';

export const subscriptionsRouter = router({
  // Subscription for streaming chat messages
  chatStream: protectedProcedure
    .input(
      z.object({
        content: z
          .string()
          .min(1, 'Message content cannot be empty')
          .max(10000, 'Message content too long (max 10,000 characters)'),
        conversationId: z.string().min(1, 'Conversation ID is required'),
      }),
    )
    .subscription(async ({ ctx, input }) => {
      const { chatService } = createServicesFromContext(ctx);

      return observable<ChatStreamChunk>((emit) => {
        // Create an AbortController for this subscription
        const controller = new AbortController();

        // Start the streaming process
        const startStreaming = async () => {
          try {
            const streamInput = {
              content: input.content,
              conversationId: input.conversationId,
              signal: controller.signal,
            };

            // Use the ChatService's async generator
            const stream = chatService.createMessageStream(streamInput, ctx.user?.sessionId);

            for await (const chunk of stream) {
              // Check if subscription was cancelled
              if (controller.signal.aborted) {
                break;
              }

              // Emit the chunk to the client
              emit.next(chunk);

              // If this is the final chunk, complete the stream
              if (chunk.finished) {
                emit.complete();
                break;
              }
            }
          } catch (error) {
            // Emit error chunk
            emit.next({
              content: '',
              finished: true,
              error: error instanceof Error ? error.message : 'Unknown error occurred',
            });
            emit.error(error as Error);
          }
        };

        // Start streaming
        startStreaming();

        // Return cleanup function
        return () => {
          controller.abort();
        };
      });
    }),

  // Subscription for conversation updates (future use)
  conversationUpdates: publicProcedure
    .input(z.object({ conversationId: z.string() }))
    .subscription(({ input }) => {
      return observable<{ type: 'update' | 'delete'; conversationId: string }>((emit) => {
        // Placeholder for conversation updates
        // This would typically listen to database changes or events

        // For now, just emit a test message
        setTimeout(() => {
          emit.next({
            type: 'update',
            conversationId: input.conversationId,
          });
        }, 1000);

        return () => {
          // Cleanup logic
        };
      });
    }),
});
