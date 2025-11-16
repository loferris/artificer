/**
 * Batch Processing tRPC Router
 * Provides endpoints for creating and managing batch jobs
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { BatchJobService } from '../services/batch/BatchJobService';
import { ChainOrchestrator } from '../services/orchestration/ChainOrchestrator';
import { logger } from '../utils/logger';

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

const CreateBatchJobSchema = z.object({
  name: z.string().min(1).max(200),
  projectId: z.string().optional(),
  items: z.array(z.any()).min(1).max(10000), // Max 10k items per batch
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
    throw new Error('Database not available in demo mode');
  }
  return ctx.db;
}

export const batchRouter = router({
  /**
   * Create a new batch job
   */
  createJob: protectedProcedure
    .input(CreateBatchJobSchema)
    .mutation(async ({ input, ctx }) => {
      const db = ensureDatabase(ctx);
      const chainOrchestrator = new ChainOrchestrator(db);
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
    }),

  /**
   * Get batch job status
   */
  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = ensureDatabase(ctx);
      const chainOrchestrator = new ChainOrchestrator(db);
      const batchJobService = new BatchJobService(db, chainOrchestrator);

      const status = await batchJobService.getJobStatus(input.jobId);

      return {
        success: true,
        status,
      };
    }),

  /**
   * List batch jobs
   */
  listJobs: protectedProcedure
    .input(ListJobsSchema)
    .query(async ({ input, ctx }) => {
      const db = ensureDatabase(ctx);
      const chainOrchestrator = new ChainOrchestrator(db);
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
    }),

  /**
   * Get batch job results
   */
  getJobResults: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = ensureDatabase(ctx);
      const chainOrchestrator = new ChainOrchestrator(db);
      const batchJobService = new BatchJobService(db, chainOrchestrator);

      const results = await batchJobService.getJobResults(input.jobId);

      return {
        success: true,
        ...results,
      };
    }),

  /**
   * Get batch job analytics
   */
  getJobAnalytics: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = ensureDatabase(ctx);
      const chainOrchestrator = new ChainOrchestrator(db);
      const batchJobService = new BatchJobService(db, chainOrchestrator);

      const analytics = await batchJobService.getJobAnalytics(input.jobId);

      return {
        success: true,
        analytics,
      };
    }),

  /**
   * Resume a paused or failed job
   */
  resumeJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = ensureDatabase(ctx);
      const chainOrchestrator = new ChainOrchestrator(db);
      const batchJobService = new BatchJobService(db, chainOrchestrator);

      await batchJobService.resumeJob(input.jobId);

      return {
        success: true,
        message: 'Job resumed successfully',
      };
    }),

  /**
   * Pause a running job
   */
  pauseJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = ensureDatabase(ctx);
      const chainOrchestrator = new ChainOrchestrator(db);
      const batchJobService = new BatchJobService(db, chainOrchestrator);

      await batchJobService.pauseJob(input.jobId);

      return {
        success: true,
        message: 'Job paused successfully',
      };
    }),

  /**
   * Cancel a job
   */
  cancelJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = ensureDatabase(ctx);
      const chainOrchestrator = new ChainOrchestrator(db);
      const batchJobService = new BatchJobService(db, chainOrchestrator);

      await batchJobService.cancelJob(input.jobId);

      return {
        success: true,
        message: 'Job cancelled successfully',
      };
    }),

  /**
   * Delete a job
   */
  deleteJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = ensureDatabase(ctx);
      const chainOrchestrator = new ChainOrchestrator(db);
      const batchJobService = new BatchJobService(db, chainOrchestrator);

      await batchJobService.deleteJob(input.jobId);

      return {
        success: true,
        message: 'Job deleted successfully',
      };
    }),

  /**
   * Start a pending job
   */
  startJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = ensureDatabase(ctx);
      const chainOrchestrator = new ChainOrchestrator(db);
      const batchJobService = new BatchJobService(db, chainOrchestrator);

      await batchJobService.executeBatchJob(input.jobId);

      return {
        success: true,
        message: 'Job started successfully',
      };
    }),
});
