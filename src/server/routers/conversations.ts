import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../../server/trpc';
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

export const conversationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const user = ensureDemoUser(ctx);
      
      // Create services with proper dependency injection
      const { conversationService } = createServicesFromContext(ctx);

      // Use service to get conversations list
      const conversations = await conversationService.list();

      return conversations;
    } catch (error) {
      // Service layer handles error transformation
      throw error;
    }
  }),

  create: protectedProcedure
    .input(
      z
        .object({
          title: z.string().optional(),
          model: z.string().optional(),
          systemPrompt: z.string().optional(),
          temperature: z.number().min(0).max(2).optional(),
          maxTokens: z.number().min(1).max(4000).optional(),
          projectId: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Create services
        const { conversationService } = createServicesFromContext(ctx);

        // Use service to create conversation
        const conversation = await conversationService.create(input);

        return conversation;
      } catch (error) {
        throw error;
      }
    }),

  getById: protectedProcedure
    .input(z.string().min(1, 'Conversation ID is required'))
    .query(async ({ ctx, input: conversationId }) => {
      try {
        const user = ensureDemoUser(ctx);

        // Create services
        const { conversationService } = createServicesFromContext(ctx);

        // Validate access and get conversation
        const conversation = await conversationService.validateAccess(
          conversationId,
          user.sessionId,
        );

        return conversation;
      } catch (error) {
        throw error;
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, 'Conversation ID is required'),
        title: z.string().optional(),
        model: z.string().optional(),
        systemPrompt: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().min(1).max(4000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const user = ensureDemoUser(ctx);

        const { conversationId, ...updateData } = input;

        // Create services
        const { conversationService } = createServicesFromContext(ctx);

        // Validate access first
        await conversationService.validateAccess(conversationId, user.sessionId);

        // Update conversation
        const conversation = await conversationService.update(conversationId, updateData);

        return conversation;
      } catch (error) {
        throw error;
      }
    }),

  updateTitle: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, 'Conversation ID is required'),
        firstMessage: z.string().min(1, 'First message is required'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Create services
        const { conversationService } = createServicesFromContext(ctx);

        // Generate title from first message
        const title = conversationService.generateTitle(input.firstMessage);

        // Update title
        const conversation = await conversationService.updateTitle(input.conversationId, title);

        return conversation;
      } catch (error) {
        throw error;
      }
    }),

  delete: protectedProcedure
    .input(z.string().min(1, 'Conversation ID is required'))
    .mutation(async ({ ctx, input: conversationId }) => {
      try {
        const user = ensureDemoUser(ctx);

        // Create services
        const { conversationService } = createServicesFromContext(ctx);

        // Validate access first
        await conversationService.validateAccess(conversationId, user.sessionId);

        // Delete conversation
        await conversationService.delete(conversationId);

        return { success: true };
      } catch (error) {
        throw error;
      }
    }),
});
