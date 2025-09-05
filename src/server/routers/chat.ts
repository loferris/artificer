import { z } from 'zod';
import { router, publicProcedure } from '../../server/trpc';
import { createAssistant } from '../services/assistant';
import { TRPCError } from '@trpc/server';
import { validateConversationAccess } from '../utils/session';

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
      try {
        const { content, conversationId } = input;

        // Basic session validation
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Session required',
          });
        }

        // Validate conversation exists
        const conversation = await ctx.db.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          });
        }

        // Basic conversation access validation
        if (!validateConversationAccess(conversation, ctx.user)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied',
          });
        }

        // Get conversation history for context
        const conversationHistory = await ctx.db.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            content: true,
          },
        });

        // Create assistant service and get response
        const assistant = createAssistant({});
        const result = await assistant.getResponse(content, conversationHistory);

        // Handle different response types
        const response = typeof result === 'string' ? result : result.response;
        const model = typeof result === 'string' ? 'unknown' : result.model;
        const cost = typeof result === 'string' ? 0 : result.cost;

        if (!response || response.trim() === '') {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Assistant response is empty',
          });
        }

        // Use database transaction to ensure consistency
        const dbResult = await ctx.db.$transaction(async (tx) => {
          // Save user message to database
          const userMessage = await tx.message.create({
            data: {
              conversationId,
              role: 'user',
              content,
              tokens: Math.ceil(content.length / 4), // Rough token estimation
            },
          });

          // Check if this is the first message in the conversation
          const messageCount = await tx.message.count({
            where: { conversationId, role: 'user' },
          });

          // Auto-generate title from first user message
          if (messageCount === 1) {
            const title = content.trim().replace(/\n/g, ' ');
            const finalTitle = title.length <= 50 ? title : title.substring(0, 47) + '...';
            
            await tx.conversation.update({
              where: { id: conversationId },
              data: { 
                title: finalTitle,
                updatedAt: new Date() 
              },
            });
          } else {
            // Just update timestamp
            await tx.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });
          }

          // Save assistant message to database
          const assistantMessage = await tx.message.create({
            data: {
              conversationId,
              role: 'assistant',
              content: response,
              tokens: Math.ceil(response.length / 4),
            },
          });

          return { userMessage, assistantMessage };
        });

        return {
          id: dbResult.assistantMessage.id,
          content: response,
          role: 'assistant' as const,
          timestamp: dbResult.assistantMessage.createdAt,
          model,
          cost,
        };
      } catch (error) {
        // If it's already a TRPC error, re-throw it
        if (error instanceof TRPCError) {
          throw error;
        }

        // Log the error for debugging
        console.error('Error in sendMessage:', error);

        // Provide more specific error messages based on error type
        let userMessage = 'Something went wrong. Please try again.';
        let errorCode: 'INTERNAL_SERVER_ERROR' | 'GATEWAY_TIMEOUT' | 'TOO_MANY_REQUESTS' | 'UNAUTHORIZED' | 'PAYMENT_REQUIRED' | 'BAD_REQUEST' = 'INTERNAL_SERVER_ERROR';

        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          
          // Network/API related errors
          if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
            userMessage = 'The AI service is taking too long to respond. Please try again in a moment.';
            errorCode = 'GATEWAY_TIMEOUT';
          } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
            userMessage = 'Too many requests. Please wait a moment before trying again.';
            errorCode = 'TOO_MANY_REQUESTS';
          } else if (errorMessage.includes('unauthorized') || errorMessage.includes('api key')) {
            userMessage = 'AI service configuration issue. Please check your settings.';
            errorCode = 'UNAUTHORIZED';
          } else if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
            userMessage = 'AI service quota exceeded. Please check your account or try again later.';
            errorCode = 'PAYMENT_REQUIRED';
          } else if (errorMessage.includes('database') || errorMessage.includes('connection')) {
            userMessage = 'Database connection issue. Please try again in a moment.';
            errorCode = 'INTERNAL_SERVER_ERROR';
          } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
            userMessage = 'Invalid request. Please check your message and try again.';
            errorCode = 'BAD_REQUEST';
          }
        }

        throw new TRPCError({
          code: errorCode,
          message: userMessage,
          cause: error,
        });
      }
    }),
});
