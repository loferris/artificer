import { z } from 'zod';
import { router, publicProcedure } from '../../server/trpc';
import { TRPCError } from '@trpc/server';
import { isServerSideDemo } from '../../utils/demo';

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

// In-memory store for demo conversations (survives function lifetime)
const demoConversationStore = new Map<string, any>();

// Initialize with sample conversations
const initializeDemoStore = () => {
  if (demoConversationStore.size === 0) {
    demoConversationStore.set('demo-1', {
      id: 'demo-1',
      title: 'Welcome to the Chat App Demo!',
      model: 'demo-assistant-v1',
      systemPrompt: 'You are a helpful AI assistant.',
      temperature: 0.7,
      maxTokens: 1000,
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: new Date(Date.now() - 3600000),
    });
  }
};

export const conversationsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    // Use centralized demo mode detection
    
    if (isServerSideDemo()) {
      initializeDemoStore();
      // Return conversations from memory store
      return Array.from(demoConversationStore.values()).map(conv => ({
        ...conv,
        messages: [] // We'll fetch messages separately
      }));
    }
    
    try {
      if (!ctx.db) {
        throw new Error('Database not available');
      }
      const conversations = await ctx.db.conversation.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 1, // Only get the first message for preview
          },
        },
      });

      return conversations.map((conv) => ({
        id: conv.id,
        title: conv.title || generateTitle(conv.messages[0]?.content || 'New Conversation'),
        model: conv.model,
        systemPrompt: conv.systemPrompt,
        temperature: conv.temperature,
        maxTokens: conv.maxTokens,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messages: [], // Don't include messages in list view for performance
      }));
    } catch (error) {
      console.error('Database error in conversations.list:', error);
      
      // Auto-switch to demo mode if database fails
      initializeDemoStore();
      return Array.from(demoConversationStore.values()).map(conv => ({
        ...conv,
        title: `${conv.title} (Demo Mode)`,
        messages: []
      }));
    }
  }),

  create: publicProcedure.mutation(async ({ ctx }) => {
    // Use centralized demo mode detection
    
    if (isServerSideDemo()) {
      const id = `demo-${Date.now()}`;
      const newConversation = {
        id,
        title: null,
        model: 'demo-assistant-v1',
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7,
        maxTokens: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Store in memory for demo mode
      initializeDemoStore();
      demoConversationStore.set(id, newConversation);
      
      return newConversation;
    }

    try {
      if (!ctx.db) {
        throw new Error('Database not available');
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
      
      // Auto-fallback to demo mode if database fails
      const id = `demo-fallback-${Date.now()}`;
      const fallbackConversation = {
        id,
        title: null,
        model: 'demo-assistant-v1',
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7,
        maxTokens: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Store in demo store for persistence
      initializeDemoStore();
      demoConversationStore.set(id, fallbackConversation);
      
      return fallbackConversation;
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
        
        // In demo mode, just return success
        if (isServerSideDemo() || !ctx.db) {
          return {
            id: input.conversationId,
            title,
            model: 'demo-assistant-v1',
            systemPrompt: 'You are a helpful AI assistant.',
            temperature: 0.7,
            maxTokens: 1000,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        
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
      // In demo mode, just return success
      if (isServerSideDemo() || !ctx.db) {
        return { success: true };
      }
      
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
