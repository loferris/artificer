/**
 * Model Administration Router
 *
 * Provides admin endpoints for managing model discovery and selection
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { getDiscoveryService, getFilterService, refreshModelCache } from '../config/dynamicModels';
import { ModelDiscoveryService } from '../services/model/ModelDiscoveryService';
import { ModelRequirements } from '../services/model/types';
import { logger } from '../utils/logger';

// Validation schema for model requirements (for testing/debugging)
const ModelRequirementsSchema = z.object({
  minInputTokens: z.number().optional(),
  minOutputTokens: z.number().optional(),
  maxInputCostPer1M: z.number().optional(),
  maxOutputCostPer1M: z.number().optional(),
  preferredProviders: z.array(z.string()).optional(),
  excludedProviders: z.array(z.string()).optional(),
  requiresJson: z.boolean().optional(),
  preferQuality: z.boolean().optional(),
  preferSpeed: z.boolean().optional(),
  preferLatest: z.boolean().optional(),
  modality: z.string().optional(),
});

// Rate limiting for refresh endpoint
const lastRefresh = new Map<string, number>();
const REFRESH_COOLDOWN = 5 * 60 * 1000; // 5 minutes

export const modelAdminRouter = router({
  /**
   * Force refresh models from OpenRouter API
   */
  refreshModels: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        // Rate limiting check
        const userId = ctx.authenticatedUser?.id || ctx.clientIp;
        const now = Date.now();
        const last = lastRefresh.get(userId) || 0;

        if (now - last < REFRESH_COOLDOWN) {
          const waitSeconds = Math.ceil((REFRESH_COOLDOWN - (now - last)) / 1000);
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: `Please wait ${waitSeconds}s before refreshing again`,
          });
        }

        logger.info('[ModelAdmin] Manual model refresh requested', { userId });

        await refreshModelCache();
        const discoveryService = getDiscoveryService();
        const models = await discoveryService.getModels();

        // Update last refresh time
        lastRefresh.set(userId, now);

        return {
          success: true,
          modelCount: models.length,
          timestamp: new Date().toISOString(),
          message: `Successfully refreshed ${models.length} models from OpenRouter`,
        };
      } catch (error) {
        logger.error('[ModelAdmin] Model refresh failed', error);

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to refresh models',
        });
      }
    }),

  /**
   * Get current model cache status
   */
  getCacheStatus: protectedProcedure
    .query(async () => {
      try {
        const discoveryService = getDiscoveryService();
        const metadata = discoveryService.getCacheMetadata();

        if (!metadata) {
          return {
            cached: false,
            message: 'No cache available',
          };
        }

        const age = Date.now() - new Date(metadata.lastUpdated).getTime();
        const ageHours = Math.floor(age / (1000 * 60 * 60));
        const isValid = age < metadata.ttl;

        return {
          cached: true,
          modelCount: metadata.modelCount,
          lastUpdated: metadata.lastUpdated,
          source: metadata.source,
          ageHours,
          isValid,
          ttlHours: Math.floor(metadata.ttl / (1000 * 60 * 60)),
        };
      } catch (error) {
        logger.error('[ModelAdmin] Failed to get cache status', error);

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get cache status',
        });
      }
    }),

  /**
   * List all available models
   */
  listModels: protectedProcedure
    .input(z.object({
      provider: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      try {
        const discoveryService = getDiscoveryService();
        let models = await discoveryService.getModels();

        // Filter by provider if specified
        if (input.provider) {
          models = models.filter(m => m.id.startsWith(`${input.provider}/`));
        }

        // Limit results
        models = models.slice(0, input.limit);

        return {
          success: true,
          models: models.map(m => ({
            id: m.id,
            name: m.name,
            contextLength: m.context_length,
            inputCost: m.pricing.prompt,
            outputCost: m.pricing.completion,
            maxOutputTokens: m.top_provider?.max_completion_tokens,
          })),
          total: models.length,
        };
      } catch (error) {
        logger.error('[ModelAdmin] Failed to list models', error);

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list models',
        });
      }
    }),

  /**
   * Test model selection with custom requirements
   * Useful for debugging and understanding how filtering works
   */
  testSelection: protectedProcedure
    .input(z.object({
      requirements: ModelRequirementsSchema,
      showAll: z.boolean().default(false),
    }))
    .query(async ({ input }) => {
      try {
        const discoveryService = getDiscoveryService();
        const filterService = getFilterService();

        const models = await discoveryService.getModels();
        const requirements = input.requirements as ModelRequirements;

        if (input.showAll) {
          // Return all matches with scores
          const matches = filterService.getAllMatches(models, requirements);

          return {
            success: true,
            matchCount: matches.length,
            matches: matches.map(m => ({
              id: m.modelId,
              name: m.model.name,
              score: m.score,
              reason: m.reason,
              contextLength: m.model.context_length,
              inputCost: m.model.pricing.prompt,
              outputCost: m.model.pricing.completion,
            })),
          };
        } else {
          // Return best match only
          const result = filterService.selectModel(models, requirements);

          if (!result) {
            return {
              success: false,
              message: 'No models matched the requirements',
            };
          }

          return {
            success: true,
            selected: {
              id: result.modelId,
              name: result.model.name,
              score: result.score,
              reason: result.reason,
              contextLength: result.model.context_length,
              inputCost: result.model.pricing.prompt,
              outputCost: result.model.pricing.completion,
              maxOutputTokens: result.model.top_provider?.max_completion_tokens,
            },
          };
        }
      } catch (error) {
        logger.error('[ModelAdmin] Test selection failed', error);

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to test model selection',
        });
      }
    }),

  /**
   * Get fallback models list
   */
  getFallbackModels: protectedProcedure
    .query(async () => {
      const fallbacks = ModelDiscoveryService.getFallbackModels();

      return {
        success: true,
        models: fallbacks.map(m => ({
          id: m.id,
          name: m.name,
          contextLength: m.context_length,
          inputCost: m.pricing.prompt,
          outputCost: m.pricing.completion,
        })),
      };
    }),
});
