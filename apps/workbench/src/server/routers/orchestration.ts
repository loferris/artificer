import { z } from 'zod';
import { router, protectedProcedure } from '../../server/trpc';
import { TRPCError } from '@trpc/server';
import { createServicesFromContext } from '../services/ServiceFactory';
import { ChainOrchestrator } from '../services/orchestration/ChainOrchestrator';
import { getModelRegistry } from '../services/orchestration/ModelRegistry';
import { logger } from '../utils/logger';
import { buildChainConfig } from '../utils/routerHelpers';

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
 * Singleton cache for ChainOrchestrator instances
 * Shared with batch.ts for consistent caching
 */
const orchestratorCache = new Map<string, { instance: ChainOrchestrator; lastUsed: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 10;

/**
 * Cleanup expired cache entries
 */
function cleanupOrchestratorCache() {
  const now = Date.now();
  const expiredKeys: string[] = [];

  for (const [key, entry] of orchestratorCache.entries()) {
    if (now - entry.lastUsed > CACHE_TTL_MS) {
      expiredKeys.push(key);
    }
  }

  expiredKeys.forEach((key) => {
    logger.debug('Evicting expired ChainOrchestrator from cache', { key });
    orchestratorCache.delete(key);
  });

  if (orchestratorCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(orchestratorCache.entries()).sort(
      (a, b) => a[1].lastUsed - b[1].lastUsed
    );

    const toRemove = entries.slice(0, orchestratorCache.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => {
      logger.debug('Evicting old ChainOrchestrator from cache (size limit)', { key });
      orchestratorCache.delete(key);
    });
  }
}

/**
 * Get or create a cached ChainOrchestrator instance
 */
async function getOrCreateChainOrchestrator(ctx: any): Promise<ChainOrchestrator> {
  const hasDb = !!ctx.db;
  const userId = ctx.user?.id || 'anonymous';
  const cacheKey = `${userId}-${hasDb}`;

  const cached = orchestratorCache.get(cacheKey);
  if (cached) {
    cached.lastUsed = Date.now();
    logger.debug('Using cached ChainOrchestrator', { cacheKey });
    return cached.instance;
  }

  logger.debug('Creating new ChainOrchestrator instance', { cacheKey });
  const config = buildChainConfig();
  const registry = await getModelRegistry();
  const { assistant, structuredQueryService } = createServicesFromContext(ctx);

  const instance = new ChainOrchestrator(
    config,
    assistant,
    ctx.db || undefined,
    registry,
    structuredQueryService
  );

  orchestratorCache.set(cacheKey, {
    instance,
    lastUsed: Date.now(),
  });

  cleanupOrchestratorCache();

  return instance;
}

// Periodic cleanup
setInterval(cleanupOrchestratorCache, CACHE_TTL_MS);

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
        const { chatService, conversationService, messageService, assistant, structuredQueryService } = createServicesFromContext(ctx);

        // Validate conversation access
        await conversationService.validateAccess(input.conversationId, user.sessionId);

        // Get conversation history
        const messages = await messageService.getByConversation(input.conversationId);
        const conversationHistory = messages.map((msg: { role: string; content: string }) => ({
          role: msg.role,
          content: msg.content,
        }));

        // Get or create cached ChainOrchestrator instance
        const orchestrator = await getOrCreateChainOrchestrator(ctx);

        // Build chain configuration
        const config = buildChainConfig();

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
        const userMessage = await messageService.create({
          conversationId: input.conversationId,
          role: 'user',
          content: input.content,
        });

        // Store assistant message
        const assistantMessage = await messageService.create({
          conversationId: input.conversationId,
          role: 'assistant',
          content: chainResult.response,
        });

        // Auto-generate title if this is the first user message
        let conversationTitle: string | undefined;
        if (messages.length === 0) {
          try {
            conversationTitle = conversationService.generateTitle(input.content);

            if (conversationTitle) {
              await conversationService.updateTitle(input.conversationId, conversationTitle);
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
          timestamp: assistantMessage.createdAt,
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
            promptHash: d.promptHash.substring(0, 16) + '...', // Show truncated hash (PII-safe)
            promptLength: d.promptLength,
            complexity: d.complexity,
            category: d.category,
            executedModel: d.executedModel,
            totalCost: Number(d.totalCost),
            successful: d.successful,
            retryCount: d.retryCount,
            latencyMs: d.latencyMs,
            strategy: d.strategy,
            validationScore: d.validationScore,
            createdAt: d.createdAt,
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
