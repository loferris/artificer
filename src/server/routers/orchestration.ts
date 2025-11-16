import { z } from 'zod';
import { router, protectedProcedure } from '../../server/trpc';
import { TRPCError } from '@trpc/server';
import { createServicesFromContext } from '../services/ServiceFactory';
import { ChainOrchestrator } from '../services/orchestration/ChainOrchestrator';
import { ChainConfig } from '../services/orchestration/types';
import { ModelRegistry } from '../services/orchestration/ModelRegistry';
import { logger } from '../utils/logger';

// Global model registry singleton (initialized lazily)
let globalModelRegistry: ModelRegistry | null = null;

/**
 * Get or create the global model registry
 * The registry is initialized on first use
 */
async function getModelRegistry(): Promise<ModelRegistry> {
  if (!globalModelRegistry) {
    globalModelRegistry = new ModelRegistry();

    // Initialize in background (non-blocking)
    globalModelRegistry.initialize().catch(error => {
      logger.warn('[orchestrationRouter] Model registry initialization failed, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }

  return globalModelRegistry;
}

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
 * Builds chain configuration from environment variables
 */
function buildChainConfig(): ChainConfig {
  const analyzerModel = process.env.ANALYZER_MODEL || 'deepseek/deepseek-chat';
  const routerModel = process.env.ROUTER_MODEL || 'anthropic/claude-3-haiku';
  const validatorModel = process.env.VALIDATOR_MODEL || 'anthropic/claude-3-5-sonnet';

  // Get available models from environment or use defaults
  const modelsList = process.env.OPENROUTER_MODELS ||
    'deepseek/deepseek-chat,anthropic/claude-3-haiku,anthropic/claude-3-5-sonnet,openai/gpt-4o-mini';

  const availableModels = modelsList
    .split(',')
    .map(m => m.trim())
    .filter(m => m.length > 0);

  const minComplexity = parseInt(process.env.CHAIN_ROUTING_MIN_COMPLEXITY || '5', 10);
  const maxRetries = parseInt(process.env.MAX_RETRIES || '2', 10);
  const validationEnabled = process.env.VALIDATION_ENABLED !== 'false'; // Default true
  const preferCheapModels = process.env.PREFER_CHEAP_MODELS === 'true';

  return {
    analyzerModel,
    routerModel,
    validatorModel,
    availableModels,
    minComplexityForChain: minComplexity,
    maxRetries,
    validationEnabled,
    preferCheapModels,
  };
}

/**
 * The tRPC router for chain orchestration operations.
 *
 * This router provides intelligent multi-model routing with:
 * - Automatic complexity analysis
 * - Smart model selection
 * - Quality validation
 * - Automatic retries
 */
export const orchestrationRouter = router({
  /**
   * Sends a message using intelligent chain orchestration.
   *
   * This mutation analyzes the query, selects the optimal model(s),
   * executes the task, validates the response, and retries if needed.
   */
  chainChat: protectedProcedure
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

        // Check if chain routing is enabled
        const chainEnabled = process.env.CHAIN_ROUTING_ENABLED !== 'false';
        if (!chainEnabled) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Chain routing is not enabled. Use regular chat.sendMessage instead.',
          });
        }

        // Create services with proper dependency injection
        const { chatService, conversationService, messageService, assistant } = createServicesFromContext(ctx);

        // Validate conversation access
        await conversationService.validateConversationAccess(input.conversationId, user.sessionId);

        // Get conversation history
        const messages = await messageService.getMessages(input.conversationId, user.sessionId);
        const conversationHistory = messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

        // Build chain config
        const config = buildChainConfig();

        // Get global model registry
        const registry = await getModelRegistry();

        // Create chain orchestrator
        const orchestrator = new ChainOrchestrator(config, assistant, ctx.db, registry);

        // Run the chain orchestration
        const chainResult = await orchestrator.orchestrate({
          userMessage: input.content,
          conversationHistory,
          conversationId: input.conversationId,
          sessionId: user.sessionId,
          config,
          signal: ctx.signal,
        });

        logger.info('[orchestrationRouter] Chain orchestration complete', {
          conversationId: input.conversationId,
          model: chainResult.model,
          complexity: chainResult.analysis.complexity,
          successful: chainResult.successful,
          retryCount: chainResult.retryCount,
          totalCost: chainResult.totalCost,
        });

        // Store messages in database
        // Store user message
        const userMessage = await messageService.createMessage({
          conversationId: input.conversationId,
          role: 'user',
          content: input.content,
        });

        // Store assistant message
        const assistantMessage = await messageService.createMessage({
          conversationId: input.conversationId,
          role: 'assistant',
          content: chainResult.response,
          tokens: chainResult.totalTokens,
        });

        // Auto-generate title if this is the first user message
        let conversationTitle: string | undefined;
        if (messages.length === 0) {
          try {
            conversationTitle = await chatService.generateConversationTitle(
              input.content,
              chainResult.response
            );

            if (conversationTitle && ctx.db) {
              await ctx.db.conversation.update({
                where: { id: input.conversationId },
                data: { title: conversationTitle },
              });
            }
          } catch (error) {
            logger.error('[orchestrationRouter] Failed to generate title', error);
            // Don't fail the entire request if title generation fails
          }
        }

        // Return response in same format as regular chat
        return {
          id: assistantMessage.id,
          content: chainResult.response,
          role: 'assistant' as const,
          timestamp: assistantMessage.timestamp,
          model: chainResult.model,
          cost: chainResult.totalCost,
          tokens: chainResult.totalTokens,
          conversationTitle,

          // Additional chain metadata (optional, for debugging/analytics)
          chainMetadata: {
            complexity: chainResult.analysis.complexity,
            category: chainResult.analysis.category,
            strategy: chainResult.routingPlan.strategy,
            retryCount: chainResult.retryCount,
            successful: chainResult.successful,
            totalLatency: chainResult.totalLatency,
            validationScore: chainResult.validation?.score,
          },
        };
      } catch (error) {
        logger.error('[orchestrationRouter] Chain chat failed', error);

        // Provide helpful error messages
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Chain orchestration failed',
        });
      }
    }),

  /**
   * Gets analytics for routing decisions
   */
  getRoutingAnalytics: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        conversationId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const user = ensureDemoUser(ctx);

        if (!ctx.db) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Analytics not available in demo mode',
          });
        }

        // Query routing decisions
        const decisions = await ctx.db.routingDecision.findMany({
          where: input.conversationId ? {
            conversationId: input.conversationId,
          } : undefined,
          orderBy: {
            createdAt: 'desc',
          },
          take: input.limit,
        });

        // Calculate summary statistics
        const summary = {
          total: decisions.length,
          successful: decisions.filter(d => d.successful).length,
          averageCost: decisions.reduce((sum, d) => sum + Number(d.totalCost), 0) / decisions.length || 0,
          averageRetries: decisions.reduce((sum, d) => sum + d.retryCount, 0) / decisions.length || 0,
          modelDistribution: {} as Record<string, number>,
        };

        // Calculate model distribution
        for (const decision of decisions) {
          summary.modelDistribution[decision.executedModel] =
            (summary.modelDistribution[decision.executedModel] || 0) + 1;
        }

        return {
          decisions: decisions.map(d => ({
            id: d.id,
            prompt: d.prompt.substring(0, 100), // Truncate for privacy
            executedModel: d.executedModel,
            totalCost: Number(d.totalCost),
            successful: d.successful,
            retryCount: d.retryCount,
            createdAt: d.createdAt,
            analysis: d.analysis,
            routingPlan: d.routingPlan,
            validationResult: d.validationResult,
          })),
          summary,
        };
      } catch (error) {
        logger.error('[orchestrationRouter] Failed to get analytics', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve routing analytics',
        });
      }
    }),
});
