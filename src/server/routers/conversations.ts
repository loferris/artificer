import { z } from 'zod';
import { router, publicProcedure } from '../../server/trpc';
import { TRPCError } from '@trpc/server';

// Helper function to generate conversation title from first message
function generateTitle(firstMessage: string): string {
  // Clean and truncate the message
  const cleaned = firstMessage.trim().replace(/\n/g, ' ');
  
  // If it's very short, use it as-is
  if (cleaned.length <= 50) {
    return cleaned;
  }
  
  // If it's longer, truncate and add ellipsis
  return cleaned.substring(0, 47) + '...';
}

export const conversationsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    try {
      // In demo mode, return mock conversations
      if (process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'production') {
        return [
          {
            id: 'demo-1',
            title: 'Welcome to the Chat App Demo!',
            model: 'demo-assistant-v1',
            systemPrompt: 'You are a helpful AI assistant.',
            temperature: 0.7,
            maxTokens: 1000,
            createdAt: new Date(Date.now() - 3600000),
            updatedAt: new Date(Date.now() - 3600000),
            messages: [
              {
                id: 'msg-1',
                role: 'assistant',
                content: 'Welcome to this AI chat application! This is a showcase demo featuring real-time AI conversations, conversation management, export functionality, and more!',
                tokens: 25,
                createdAt: new Date(Date.now() - 3600000),
                conversationId: 'demo-1',
                parentId: null,
              }
            ]
          }
        ];
      }

      return await ctx.db.conversation.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      
      // Fallback to mock conversations if database fails
      return [
        {
          id: 'fallback-1',
          title: 'Demo Conversation',
          model: 'demo-assistant-v1',
          systemPrompt: 'You are a helpful AI assistant.',
          temperature: 0.7,
          maxTokens: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: []
        }
      ];
    }
  }),

  create: publicProcedure.mutation(async ({ ctx }) => {
    try {
      // In demo mode, return a mock conversation without database
      if (process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'production') {
        return {
          id: `demo-${Date.now()}`,
          title: null,
          model: 'demo-assistant-v1',
          systemPrompt: 'You are a helpful AI assistant.',
          temperature: 0.7,
          maxTokens: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      return await ctx.db.conversation.create({
        data: {
          title: null, // Will be auto-generated from first message
          model: 'deepseek-chat',
          systemPrompt: 'You are a helpful AI assistant.',
          temperature: 0.7,
          maxTokens: 1000,
        },
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      
      // Fallback to mock conversation if database fails
      return {
        id: `fallback-${Date.now()}`,
        title: null,
        model: 'demo-assistant-v1',
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7,
        maxTokens: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }),

  updateTitle: publicProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, 'Conversation ID is required'),
        firstMessage: z.string().min(1, 'First message is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const title = generateTitle(input.firstMessage);
        
        return await ctx.db.conversation.update({
          where: { id: input.conversationId },
          data: { title },
        });
      } catch (error) {
        console.error('Error updating conversation title:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update conversation title',
          cause: error,
        });
      }
    }),

  delete: publicProcedure.input(z.string().min(1, 'Conversation ID is required')).mutation(async ({ ctx, input: conversationId }) => {
    try {
      // Check if conversation exists
      const conversation = await ctx.db.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        });
      }

      // Delete all messages first (due to foreign key constraints)
      await ctx.db.message.deleteMany({
        where: { conversationId },
      });

      // Delete the conversation
      await ctx.db.conversation.delete({
        where: { id: conversationId },
      });

      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error('Error deleting conversation:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete conversation',
        cause: error,
      });
    }
  }),
});
