// src/server/routers/messages.ts
import { z } from 'zod';
import { router, publicProcedure } from '../../server/trpc';
import { TRPCError } from '@trpc/server';

// In-memory store for demo messages (survives function lifetime)
const demoMessageStore = new Map<string, any[]>();

export const messagesRouter = router({
  create: publicProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, 'Conversation ID is required'),
        role: z.enum(['user', 'assistant']),
        content: z.string()
          .min(1, 'Message content cannot be empty')
          .max(10000, 'Message content too long (max 10,000 characters)'),
        tokens: z.number().min(0, 'Token count must be non-negative'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const isDemoMode = process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
        
        if (isDemoMode) {
          const message = {
            id: `msg-${Date.now()}`,
            conversationId: input.conversationId,
            role: input.role,
            content: input.content,
            tokens: input.tokens,
            createdAt: new Date(),
            parentId: null,
          };
          
          // Store in demo store
          if (!demoMessageStore.has(input.conversationId)) {
            demoMessageStore.set(input.conversationId, []);
          }
          demoMessageStore.get(input.conversationId)!.push(message);
          
          return message;
        }

        // In non-demo mode, validate conversation exists
        if (!ctx.db) {
          throw new Error('Database not available');
        }
        
        const conversation = await ctx.db.conversation.findUnique({
          where: { id: input.conversationId },
        });

        if (!conversation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          });
        }

        return await ctx.db.message.create({
          data: input,
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error creating message:', error);
        
        // Fallback to mock message if database fails
        return {
          id: `fallback-msg-${Date.now()}`,
          conversationId: input.conversationId,
          role: input.role,
          content: input.content,
          tokens: input.tokens,
          createdAt: new Date(),
          parentId: null,
        };
      }
    }),

  getByConversation: publicProcedure
    .input(z.object({ conversationId: z.string().min(1, 'Conversation ID is required') }))
    .query(async ({ ctx, input }) => {
      try {
        const isDemoMode = process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
        
        if (isDemoMode) {
          // Return messages from demo store or default welcome message
          const messages = demoMessageStore.get(input.conversationId) || [
            {
              id: 'demo-msg-1',
              role: 'assistant' as const,
              content: 'Welcome to this AI chat application! This is a showcase demo featuring real-time AI conversations, conversation management, export functionality, and more!',
              timestamp: new Date(Date.now() - 3600000),
              model: 'demo-assistant-v1',
              cost: 0.001,
            }
          ];
          
          // Convert to expected format
          return messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.createdAt || msg.timestamp,
            model: msg.model || 'demo-assistant-v1',
            cost: msg.cost || 0.001,
          }));
        }

        // In non-demo mode, validate conversation exists
        if (!ctx.db) {
          throw new Error('Database not available');
        }
        
        const conversation = await ctx.db.conversation.findUnique({
          where: { id: input.conversationId },
        });

        if (!conversation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          });
        }

        const messages = await ctx.db.message.findMany({
          where: { conversationId: input.conversationId },
          orderBy: { createdAt: 'asc' },
        });

        // Transform database objects to match frontend interface
        return messages.map(message => ({
          id: message.id,
          role: message.role as 'user' | 'assistant',
          content: message.content,
          timestamp: message.createdAt, // Map createdAt to timestamp
          model: undefined, // Not stored in database yet
          cost: undefined, // Not stored in database yet
        }));
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error fetching messages:', error);
        
        // Fallback to mock messages if database fails
        return [
          {
            id: 'fallback-msg-1',
            role: 'assistant' as const,
            content: 'Demo mode - database unavailable. This is a showcase of the chat interface.',
            timestamp: new Date(),
            model: 'demo-assistant-v1',
            cost: 0.001,
          }
        ];
      }
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string().min(1, 'Message ID is required'),
        content: z.string()
          .min(1, 'Message content cannot be empty')
          .max(10000, 'Message content too long (max 10,000 characters)'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Validate message exists
        const message = await ctx.db.message.findUnique({
          where: { id: input.id },
        });

        if (!message) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Message not found',
          });
        }

        return await ctx.db.message.update({
          where: { id: input.id },
          data: { content: input.content },
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error updating message:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update message',
          cause: error,
        });
      }
    }),

  delete: publicProcedure.input(z.string().min(1, 'Message ID is required')).mutation(async ({ ctx, input: messageId }) => {
    try {
      // Validate message exists
      const message = await ctx.db.message.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Message not found',
        });
      }

      await ctx.db.message.delete({
        where: { id: messageId },
      });

      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error('Error deleting message:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete message',
        cause: error,
      });
    }
  }),
});
