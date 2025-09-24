import { z } from 'zod';
import { router, publicProcedure } from '../../server/trpc';
import { TRPCError } from '@trpc/server';
import { createServicesFromContext } from '../services/ServiceFactory';

export const conversationsRouterRefactored = router({
  list: publicProcedure.query(async ({ ctx }) => {
    try {
      // Basic session validation
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Session required',
        });
      }

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

  create: publicProcedure
    .input(
      z
        .object({
          title: z.string().optional(),
          model: z.string().optional(),
          systemPrompt: z.string().optional(),
          temperature: z.number().min(0).max(2).optional(),
          maxTokens: z.number().min(1).max(4000).optional(),
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

  getById: publicProcedure
    .input(z.string().min(1, 'Conversation ID is required'))
    .query(async ({ ctx, input: conversationId }) => {
      try {
        // Basic session validation
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Session required',
          });
        }

        // Create services
        const { conversationService } = createServicesFromContext(ctx);

        // Validate access and get conversation
        const conversation = await conversationService.validateAccess(
          conversationId,
          ctx.user.sessionId,
        );

        return conversation;
      } catch (error) {
        throw error;
      }
    }),

  update: publicProcedure
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
        // Basic session validation
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Session required',
          });
        }

        const { conversationId, ...updateData } = input;

        // Create services
        const { conversationService } = createServicesFromContext(ctx);

        // Validate access first
        await conversationService.validateAccess(conversationId, ctx.user.sessionId);

        // Update conversation
        const conversation = await conversationService.update(conversationId, updateData);

        return conversation;
      } catch (error) {
        throw error;
      }
    }),

  updateTitle: publicProcedure
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

  delete: publicProcedure
    .input(z.string().min(1, 'Conversation ID is required'))
    .mutation(async ({ ctx, input: conversationId }) => {
      try {
        // Basic session validation
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Session required',
          });
        }

        // Create services
        const { conversationService } = createServicesFromContext(ctx);

        // Validate access first
        await conversationService.validateAccess(conversationId, ctx.user.sessionId);

        // Delete conversation
        await conversationService.delete(conversationId);

        return { success: true };
      } catch (error) {
        throw error;
      }
    }),
});
