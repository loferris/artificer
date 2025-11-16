/**
 * BatchJobService
 * High-level service for managing batch job lifecycle
 * Creates, starts, pauses, resumes, and monitors batch jobs
 */

import { PrismaClient } from '@prisma/client';
import { BatchExecutor, BatchConfig, PhaseConfig } from './BatchExecutor';
import { CheckpointService } from './CheckpointService';
import { ChainOrchestrator } from '../orchestration/ChainOrchestrator';
import { logger } from '~/server/utils/logger';

export interface CreateBatchJobInput {
  name: string;
  projectId?: string;
  userId?: string;
  items: any[]; // Array of items to process
  phases: PhaseConfig[];
  options?: {
    concurrency?: number;
    checkpointFrequency?: number;
    autoStart?: boolean; // Start execution immediately (default: true)
  };
}

export interface BatchJobStatus {
  id: string;
  name: string;
  status: string;
  currentPhase?: string;
  progress: {
    totalItems: number;
    completedItems: number;
    failedItems: number;
    percentComplete: number;
  };
  analytics: {
    costIncurred: number;
    tokensUsed: number;
    estimatedTimeRemaining?: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export class BatchJobService {
  private checkpointService: CheckpointService;
  private batchExecutor: BatchExecutor;

  constructor(
    private db: PrismaClient,
    chainOrchestrator: ChainOrchestrator
  ) {
    this.checkpointService = new CheckpointService(db);
    this.batchExecutor = new BatchExecutor(db, chainOrchestrator);
  }

  /**
   * Create a new batch job
   */
  async createBatchJob(input: CreateBatchJobInput) {
    const { name, projectId, userId, items, phases, options = {} } = input;
    const { concurrency = 5, checkpointFrequency = 10, autoStart = true } = options;

    logger.info('Creating batch job', {
      name,
      totalItems: items.length,
      phases: phases.map((p) => p.name),
    });

    // Create job in database
    const job = await this.db.batchJob.create({
      data: {
        name,
        projectId,
        userId,
        status: 'PENDING',
        totalItems: items.length,
        config: {
          phases,
          concurrency,
          checkpointFrequency,
        },
      },
    });

    // Create batch items
    await this.db.batchItem.createMany({
      data: items.map((item, index) => ({
        batchJobId: job.id,
        itemIndex: index,
        input: item,
        status: 'PENDING',
      })),
    });

    logger.info('Batch job created', {
      jobId: job.id,
      itemsCreated: items.length,
    });

    // Start execution if requested
    if (autoStart) {
      // Execute asynchronously (don't await)
      this.executeBatchJob(job.id).catch((error) => {
        logger.error('Batch job execution failed', {
          jobId: job.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }

    return job;
  }

  /**
   * Start executing a batch job
   */
  async executeBatchJob(jobId: string): Promise<void> {
    const job = await this.db.batchJob.findUnique({
      where: { id: jobId },
      include: {
        items: {
          orderBy: { itemIndex: 'asc' },
          select: { itemIndex: true, input: true },
        },
      },
    });

    if (!job) {
      throw new Error(`Batch job not found: ${jobId}`);
    }

    const config = job.config as any;

    const batchConfig: BatchConfig = {
      jobId: job.id,
      items: job.items,
      phases: config.phases,
      concurrency: config.concurrency || 5,
      checkpointFrequency: config.checkpointFrequency || 10,
    };

    await this.batchExecutor.executeBatch(batchConfig);
  }

  /**
   * Get batch job status
   */
  async getJobStatus(jobId: string): Promise<BatchJobStatus> {
    const job = await this.db.batchJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Batch job not found: ${jobId}`);
    }

    const percentComplete =
      job.totalItems > 0 ? (job.completedItems / job.totalItems) * 100 : 0;

    // Estimate time remaining
    let estimatedTimeRemaining: number | undefined;
    if (job.startedAt && job.completedItems > 0 && job.status === 'RUNNING') {
      const elapsedMs = Date.now() - job.startedAt.getTime();
      const avgTimePerItem = elapsedMs / job.completedItems;
      const remainingItems = job.totalItems - job.completedItems;
      estimatedTimeRemaining = Math.round(avgTimePerItem * remainingItems);
    }

    return {
      id: job.id,
      name: job.name,
      status: job.status,
      currentPhase: job.currentPhase || undefined,
      progress: {
        totalItems: job.totalItems,
        completedItems: job.completedItems,
        failedItems: job.failedItems,
        percentComplete: Math.round(percentComplete * 100) / 100,
      },
      analytics: {
        costIncurred: job.costIncurred,
        tokensUsed: job.tokensUsed,
        estimatedTimeRemaining,
      },
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
      error: job.error || undefined,
    };
  }

  /**
   * List batch jobs with filters
   */
  async listJobs(filters?: {
    projectId?: string;
    userId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const { projectId, userId, status, limit = 20, offset = 0 } = filters || {};

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const [jobs, total] = await Promise.all([
      this.db.batchJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.db.batchJob.count({ where }),
    ]);

    return {
      jobs,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get batch job results
   */
  async getJobResults(jobId: string) {
    const job = await this.db.batchJob.findUnique({
      where: { id: jobId },
      include: {
        items: {
          orderBy: { itemIndex: 'asc' },
          select: {
            itemIndex: true,
            input: true,
            output: true,
            phaseOutputs: true,
            status: true,
            errors: true,
            costIncurred: true,
            tokensUsed: true,
            processingTimeMs: true,
          },
        },
      },
    });

    if (!job) {
      throw new Error(`Batch job not found: ${jobId}`);
    }

    return {
      jobId: job.id,
      name: job.name,
      status: job.status,
      results: job.items,
      analytics: {
        totalItems: job.totalItems,
        completedItems: job.completedItems,
        failedItems: job.failedItems,
        costIncurred: job.costIncurred,
        tokensUsed: job.tokensUsed,
      },
    };
  }

  /**
   * Resume a failed or paused batch job
   */
  async resumeJob(jobId: string): Promise<void> {
    const job = await this.db.batchJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Batch job not found: ${jobId}`);
    }

    if (job.status !== 'FAILED' && job.status !== 'PAUSED') {
      throw new Error(`Cannot resume job in status: ${job.status}`);
    }

    logger.info('Resuming batch job', { jobId });

    // Check if we have a checkpoint
    const hasCheckpoint = await this.checkpointService.hasCheckpoint(jobId);
    if (!hasCheckpoint) {
      logger.warn('No checkpoint found, starting from beginning', { jobId });
    }

    // Reset status to RUNNING
    await this.db.batchJob.update({
      where: { id: jobId },
      data: {
        status: 'RUNNING',
        error: null,
      },
    });

    // Execute asynchronously
    this.executeBatchJob(jobId).catch((error) => {
      logger.error('Batch job resume failed', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }

  /**
   * Pause a running batch job
   */
  async pauseJob(jobId: string): Promise<void> {
    const job = await this.db.batchJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Batch job not found: ${jobId}`);
    }

    if (job.status !== 'RUNNING') {
      throw new Error(`Cannot pause job in status: ${job.status}`);
    }

    logger.info('Pausing batch job', { jobId });

    await this.db.batchJob.update({
      where: { id: jobId },
      data: { status: 'PAUSED' },
    });

    // Note: Actual pause happens when executor checks status
    // between item processing
  }

  /**
   * Cancel a batch job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.db.batchJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Batch job not found: ${jobId}`);
    }

    if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
      throw new Error(`Cannot cancel job in status: ${job.status}`);
    }

    logger.info('Cancelling batch job', { jobId });

    await this.db.batchJob.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Delete a batch job and all its items
   */
  async deleteJob(jobId: string): Promise<void> {
    const job = await this.db.batchJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Batch job not found: ${jobId}`);
    }

    if (job.status === 'RUNNING') {
      throw new Error('Cannot delete a running job. Please cancel it first.');
    }

    logger.info('Deleting batch job', { jobId });

    // Delete job (cascade will delete items)
    await this.db.batchJob.delete({
      where: { id: jobId },
    });
  }

  /**
   * Get analytics for a batch job
   */
  async getJobAnalytics(jobId: string) {
    const job = await this.db.batchJob.findUnique({
      where: { id: jobId },
      include: {
        items: {
          select: {
            status: true,
            costIncurred: true,
            tokensUsed: true,
            processingTimeMs: true,
            phaseOutputs: true,
          },
        },
      },
    });

    if (!job) {
      throw new Error(`Batch job not found: ${jobId}`);
    }

    const config = job.config as any;
    const phases = config.phases || [];

    // Calculate per-phase analytics
    const phaseAnalytics = phases.map((phase: any) => {
      const phaseItems = job.items.filter((item) => {
        const outputs = item.phaseOutputs as any;
        return outputs && outputs[phase.name];
      });

      const phaseCost = phaseItems.reduce((sum, item) => sum + item.costIncurred, 0);
      const phaseTokens = phaseItems.reduce((sum, item) => sum + item.tokensUsed, 0);
      const avgProcessingTime =
        phaseItems.reduce((sum, item) => sum + (item.processingTimeMs || 0), 0) /
        (phaseItems.length || 1);

      return {
        phase: phase.name,
        itemsProcessed: phaseItems.length,
        cost: phaseCost,
        tokens: phaseTokens,
        avgProcessingTimeMs: Math.round(avgProcessingTime),
      };
    });

    // Calculate overall stats
    const avgCostPerItem = job.completedItems > 0 ? job.costIncurred / job.completedItems : 0;
    const avgTokensPerItem = job.completedItems > 0 ? job.tokensUsed / job.completedItems : 0;

    const allProcessingTimes = job.items
      .filter((i) => i.processingTimeMs)
      .map((i) => i.processingTimeMs!);
    const avgProcessingTime =
      allProcessingTimes.length > 0
        ? allProcessingTimes.reduce((a, b) => a + b, 0) / allProcessingTimes.length
        : 0;

    return {
      jobId: job.id,
      name: job.name,
      status: job.status,
      overall: {
        totalItems: job.totalItems,
        completedItems: job.completedItems,
        failedItems: job.failedItems,
        successRate:
          job.totalItems > 0 ? (job.completedItems / job.totalItems) * 100 : 0,
      },
      cost: {
        total: job.costIncurred,
        perItem: avgCostPerItem,
        byPhase: phaseAnalytics.map((p) => ({ phase: p.phase, cost: p.cost })),
      },
      tokens: {
        total: job.tokensUsed,
        perItem: avgTokensPerItem,
        byPhase: phaseAnalytics.map((p) => ({ phase: p.phase, tokens: p.tokens })),
      },
      performance: {
        avgProcessingTimeMs: Math.round(avgProcessingTime),
        byPhase: phaseAnalytics.map((p) => ({
          phase: p.phase,
          avgMs: p.avgProcessingTimeMs,
        })),
      },
      phases: phaseAnalytics,
    };
  }
}
