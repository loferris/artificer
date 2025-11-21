/**
 * Batch Processing tRPC Router
 * Provides endpoints for creating and managing batch jobs
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { BatchJobService } from '../services/batch/BatchJobService';
import { ChainOrchestrator } from '../services/orchestration/ChainOrchestrator';
import { logger } from '../utils/logger';
import { getModelRegistry } from '../services/orchestration/ModelRegistry';
import { createServicesFromContext } from '../services/ServiceFactory';
import { CheckpointService } from '../services/batch/CheckpointService';
import { ensureDatabase, sanitizeError, buildChainConfig } from '../utils/routerHelpers';

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
  metadata: z.record(z.string(), z.unknown()).optional(), // Optional metadata
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
