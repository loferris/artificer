/**
 * Batch Processing tRPC Router
 * Provides endpoints for creating and managing batch jobs
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { BatchJobService } from '../services/batch/BatchJobService';
import { ChainOrchestrator } from '../services/orchestration/ChainOrchestrator';
import type { ChainConfig } from '../services/orchestration/types';
import { logger } from '../utils/logger';
import { models } from '../config/models';
import { getModelRegistry } from '../services/orchestration/ModelRegistry';
import { createServicesFromContext } from '../services/ServiceFactory';
import { CheckpointService } from '../services/batch/CheckpointService';

// Validation schemas
const PhaseConfigSchema = z.object({
  name: z.string().min(1),
  taskType: z.string().optional(),
  model: z.string().optional(),
  useRAG: z.boolean().optional(),
  validation: z
    .object({
      enabled: z.boolean(),
      minScore: z.number().min(0).max(10).optional(),
    })
    .optional(),
});

// Batch item schema with size limits for security
const BatchItemSchema = z.object({
  input: z.string().min(1).max(100_000), // 100KB max per item input
  metadata: z.record(z.unknown()).optional(), // Optional metadata
});

const CreateBatchJobSchema = z.object({
  name: z.string().min(1).max(200),
  projectId: z.string().optional(),
  items: z.array(BatchItemSchema).min(1).max(10000), // Max 10k items per batch
  phases: z.array(PhaseConfigSchema).min(1).max(10), // Max 10 phases
  options: z
    .object({
      concurrency: z.number().min(1).max(50).optional(),
      checkpointFrequency: z.number().min(1).max(100).optional(),
      autoStart: z.boolean().optional(),
    })
    .optional(),
});

const ListJobsSchema = z.object({
  projectId: z.string().optional(),
  status: z.enum(['PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// Helper to ensure database is available
function ensureDatabase(ctx: any) {
  if (!ctx.db) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Database not available in demo mode',
    });
  }
  return ctx.db;
}

/**
 * Sanitize errors for client responses
 * Logs full error details server-side but only sends safe messages to client
 */
function sanitizeError(error: unknown, operation: string): TRPCError {
  // Log full error details for debugging
  logger.error(`Batch router error: ${operation}`, {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });

  // If it's already a TRPCError, return it
  if (error instanceof TRPCError) {
    return error;
  }

  // For known error types, create appropriate TRPC errors
  if (error instanceof Error) {
    // Database errors
    if (error.message.includes('not found') || error.message.includes('does not exist')) {
      return new TRPCError({
        code: 'NOT_FOUND',
        message: error.message,
      });
    }

    // Permission/auth errors
    if (error.message.includes('not authorized') || error.message.includes('permission denied')) {
      return new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action',
      });
    }

    // Validation errors
    if (error.message.includes('invalid') || error.message.includes('validation')) {
      return new TRPCError({
        code: 'BAD_REQUEST',
        message: error.message,
      });
    }

    // Default to internal server error with sanitized message
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Operation failed: ${error.message}`,
    });
  }

  // Unknown error type
  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}

/**
 * Builds chain configuration from centralized model registry and environment variables
 */
function buildChainConfig(): ChainConfig {
  const analyzerModel = models.analyzer;
  const routerModel = models.router;
  const validatorModel = models.validator;
  const availableModels = models.available;

  const minComplexity = parseInt(process.env.CHAIN_ROUTING_MIN_COMPLEXITY || '5', 10);
  const maxRetries = parseInt(process.env.MAX_RETRIES || '2', 10);
  const validationEnabled = process.env.VALIDATION_ENABLED !== 'false';
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
 * Singleton cache for ChainOrchestrator instances
 * Key format: "contextHash-dbPresent"
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

  // If cache is still too large, remove oldest entries
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
 * Uses singleton pattern to avoid repeated instantiation
 */
async function getOrCreateChainOrchestrator(ctx: any): Promise<ChainOrchestrator> {
  // Create cache key based on context
  const hasDb = !!ctx.db;
  const userId = ctx.authenticatedUser?.id || 'anonymous';
  const cacheKey = `${userId}-${hasDb}`;

  // Check cache
  const cached = orchestratorCache.get(cacheKey);
  if (cached) {
    // Update last used timestamp
    cached.lastUsed = Date.now();
    logger.debug('Using cached ChainOrchestrator', { cacheKey });
    return cached.instance;
  }

  // Create new instance
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

  // Cache the instance
  orchestratorCache.set(cacheKey, {
    instance,
    lastUsed: Date.now(),
  });

  // Cleanup old entries
  cleanupOrchestratorCache();

  return instance;
}

// Periodic cleanup of cache (every 5 minutes)
setInterval(cleanupOrchestratorCache, CACHE_TTL_MS);

export const batchRouter = router({
  /**
   * Create a new batch job
   */
  createJob: protectedProcedure
    .input(CreateBatchJobSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = ensureDatabase(ctx);
        const chainOrchestrator = await getOrCreateChainOrchestrator(ctx);
        const batchJobService = new BatchJobService(db, chainOrchestrator);

        logger.info('Creating batch job via API', {
          name: input.name,
          itemCount: input.items.length,
          phaseCount: input.phases.length,
          userId: ctx.authenticatedUser?.id || 'anonymous',
        });

        const job = await batchJobService.createBatchJob({
          name: input.name,
          projectId: input.projectId,
          userId: ctx.authenticatedUser?.id || 'anonymous',
          items: input.items,
          phases: input.phases,
          options: input.options,
        });

        return {
          success: true,
          job: {
            id: job.id,
            name: job.name,
            status: job.status,
            totalItems: job.totalItems,
            createdAt: job.createdAt,
          },
        };
      } catch (error) {
        throw sanitizeError(error, 'createJob');
      }
    }),

  /**
   * Get batch job status
   */
  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const db = ensureDatabase(ctx);
        const chainOrchestrator = await getOrCreateChainOrchestrator(ctx);
        const batchJobService = new BatchJobService(db, chainOrchestrator);

        const status = await batchJobService.getJobStatus(input.jobId);

        return {
          success: true,
          status,
        };
      } catch (error) {
        throw sanitizeError(error, 'getJobStatus');
      }
    }),

  /**
   * List batch jobs
   */
  listJobs: protectedProcedure
    .input(ListJobsSchema)
    .query(async ({ input, ctx }) => {
      try {
        const db = ensureDatabase(ctx);
        const chainOrchestrator = await getOrCreateChainOrchestrator(ctx);
        const batchJobService = new BatchJobService(db, chainOrchestrator);

        const result = await batchJobService.listJobs({
          projectId: input.projectId,
          userId: ctx.authenticatedUser?.id || 'anonymous',
          status: input.status,
          limit: input.limit,
          offset: input.offset,
        });

        return {
          success: true,
          ...result,
        };
      } catch (error) {
        throw sanitizeError(error, 'listJobs');
      }
    }),

  /**
   * Get batch job results
   */
  getJobResults: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const db = ensureDatabase(ctx);
        const chainOrchestrator = await getOrCreateChainOrchestrator(ctx);
        const batchJobService = new BatchJobService(db, chainOrchestrator);

        const results = await batchJobService.getJobResults(input.jobId);

        return {
          success: true,
          ...results,
        };
      } catch (error) {
        throw sanitizeError(error, 'getJobResults');
      }
    }),

  /**
   * Get batch job analytics
   */
  getJobAnalytics: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const db = ensureDatabase(ctx);
        const chainOrchestrator = await getOrCreateChainOrchestrator(ctx);
        const batchJobService = new BatchJobService(db, chainOrchestrator);

        const analytics = await batchJobService.getJobAnalytics(input.jobId);

        return {
          success: true,
          analytics,
        };
      } catch (error) {
        throw sanitizeError(error, 'getJobAnalytics');
      }
    }),

  /**
   * Resume a paused or failed job
   */
  resumeJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = ensureDatabase(ctx);
        const chainOrchestrator = await getOrCreateChainOrchestrator(ctx);
        const batchJobService = new BatchJobService(db, chainOrchestrator);

        await batchJobService.resumeJob(input.jobId);

        return {
          success: true,
          message: 'Job resumed successfully',
        };
      } catch (error) {
        throw sanitizeError(error, 'resumeJob');
      }
    }),

  /**
   * Pause a running job
   */
  pauseJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = ensureDatabase(ctx);
        const chainOrchestrator = await getOrCreateChainOrchestrator(ctx);
        const batchJobService = new BatchJobService(db, chainOrchestrator);

        await batchJobService.pauseJob(input.jobId);

        return {
          success: true,
          message: 'Job paused successfully',
        };
      } catch (error) {
        throw sanitizeError(error, 'pauseJob');
      }
    }),

  /**
   * Cancel a job
   */
  cancelJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = ensureDatabase(ctx);
        const chainOrchestrator = await getOrCreateChainOrchestrator(ctx);
        const batchJobService = new BatchJobService(db, chainOrchestrator);

        await batchJobService.cancelJob(input.jobId);

        return {
          success: true,
          message: 'Job cancelled successfully',
        };
      } catch (error) {
        throw sanitizeError(error, 'cancelJob');
      }
    }),

  /**
   * Delete a job
   */
  deleteJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = ensureDatabase(ctx);
        const chainOrchestrator = await getOrCreateChainOrchestrator(ctx);
        const batchJobService = new BatchJobService(db, chainOrchestrator);

        await batchJobService.deleteJob(input.jobId);

        return {
          success: true,
          message: 'Job deleted successfully',
        };
      } catch (error) {
        throw sanitizeError(error, 'deleteJob');
      }
    }),

  /**
   * Start a pending job
   */
  startJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = ensureDatabase(ctx);
        const chainOrchestrator = await getOrCreateChainOrchestrator(ctx);
        const batchJobService = new BatchJobService(db, chainOrchestrator);

        await batchJobService.executeBatchJob(input.jobId);

        return {
          success: true,
          message: 'Job started successfully',
        };
      } catch (error) {
        throw sanitizeError(error, 'startJob');
      }
    }),

  /**
   * Clean up old checkpoints
   * Removes checkpoint data from completed/failed/cancelled jobs older than specified days
   */
  cleanupCheckpoints: protectedProcedure
    .input(
      z.object({
        olderThanDays: z.number().min(1).max(365).default(30),
        status: z.enum(['COMPLETED', 'FAILED', 'CANCELLED']).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = ensureDatabase(ctx);
        const checkpointService = new CheckpointService(db);

        logger.info('Manual checkpoint cleanup triggered', {
          olderThanDays: input.olderThanDays,
          status: input.status,
          userId: ctx.authenticatedUser?.id || 'anonymous',
        });

        let cleanedCount: number;
        if (input.status) {
          cleanedCount = await checkpointService.cleanupCheckpointsByStatus(
            input.status,
            input.olderThanDays
          );
        } else {
          cleanedCount = await checkpointService.cleanupOldCheckpoints(input.olderThanDays);
        }

        return {
          success: true,
          cleanedCount,
          message: `Cleaned up ${cleanedCount} checkpoint(s)`,
        };
      } catch (error) {
        throw sanitizeError(error, 'cleanupCheckpoints');
      }
    }),
});
