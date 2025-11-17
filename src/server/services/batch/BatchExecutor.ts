/**
 * BatchExecutor
 * Orchestrates batch execution through multi-phase pipelines
 * Uses existing ChainOrchestrator for individual item processing
 */

import { PrismaClient } from '@prisma/client';
import { ChainOrchestrator } from '../orchestration/ChainOrchestrator';
import { CheckpointService, BatchCheckpoint } from './CheckpointService';
import { Semaphore } from '~/server/utils/Semaphore';
import { logger } from '~/server/utils/logger';

export interface BatchConfig {
  jobId: string;
  items: any[]; // Input items to process
  phases: PhaseConfig[];
  concurrency?: number; // Max concurrent items (default: 5)
  checkpointFrequency?: number; // Save checkpoint every N items (default: 10)
  retryStrategy?: {
    maxRetries: number;
    backoff: 'exponential' | 'linear' | 'constant';
  };
}

export interface PhaseConfig {
  name: string;
  taskType?: string;
  model?: string;
  useRAG?: boolean;
  validation?: {
    enabled: boolean;
    minScore?: number;
  };
}

export interface BatchResult {
  jobId: string;
  status: 'COMPLETED' | 'FAILED' | 'PAUSED';
  results: any[];
  analytics: {
    totalItems: number;
    completedItems: number;
    failedItems: number;
    costIncurred: number;
    tokensUsed: number;
    processingTimeMs: number;
  };
}

export class BatchExecutor {
  private checkpointService: CheckpointService;

  constructor(
    private db: PrismaClient,
    private chainOrchestrator: ChainOrchestrator
  ) {
    this.checkpointService = new CheckpointService(db);
  }

  /**
   * Execute a batch job through all phases
   */
  async executeBatch(config: BatchConfig): Promise<BatchResult> {
    const startTime = Date.now();
    const { jobId, items, phases, concurrency = 5, checkpointFrequency = 10 } = config;

    logger.info('Starting batch execution', {
      jobId,
      totalItems: items.length,
      phases: phases.map((p) => p.name),
      concurrency,
    });

    // Mark job as running
    await this.updateJobStatus(jobId, 'RUNNING', { startedAt: new Date() });

    try {
      // Check for existing checkpoint
      const checkpoint = await this.checkpointService.loadCheckpoint(jobId);

      // Execute each phase sequentially
      for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex++) {
        const phase = phases[phaseIndex];

        // Skip phases that are already completed (from checkpoint)
        if (checkpoint && checkpoint.completedPhases.includes(phase.name)) {
          logger.info('Skipping completed phase from checkpoint', {
            jobId,
            phase: phase.name,
          });
          continue;
        }

        await this.executePhase(jobId, phase, items, {
          concurrency,
          checkpointFrequency,
          phaseIndex,
          totalPhases: phases.length,
          checkpoint,
        });

        // Mark phase as completed
        if (checkpoint) {
          checkpoint.completedPhases.push(phase.name);
        }
      }

      // Get final results
      const results = await this.getItemResults(jobId);
      const analytics = await this.calculateAnalytics(jobId);

      // Mark job as completed
      await this.updateJobStatus(jobId, 'COMPLETED', {
        completedAt: new Date(),
      });

      // Clear checkpoint
      await this.checkpointService.clearCheckpoint(jobId);

      logger.info('Batch execution completed', {
        jobId,
        analytics,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        jobId,
        status: 'COMPLETED',
        results,
        analytics: {
          ...analytics,
          processingTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if job was paused or cancelled (not a real failure)
      if (errorMessage.includes('paused') || errorMessage.includes('cancelled')) {
        const job = await this.db.batchJob.findUnique({
          where: { id: jobId },
          select: { status: true },
        });

        logger.info('Batch execution stopped', {
          jobId,
          status: job?.status,
        });

        // Job status already set by pause/cancel action
        // Return current state
        const results = await this.getItemResults(jobId);
        const analytics = await this.calculateAnalytics(jobId);

        return {
          jobId,
          status: (job?.status as 'PAUSED') || 'PAUSED',
          results,
          analytics: {
            ...analytics,
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      // Actual failure
      logger.error('Batch execution failed', {
        jobId,
        error: errorMessage,
      });

      await this.updateJobStatus(jobId, 'FAILED', {
        error: errorMessage,
        completedAt: new Date(),
      });

      throw error;
    }
  }

  /**
   * Execute a single phase of the pipeline
   */
  private async executePhase(
    jobId: string,
    phase: PhaseConfig,
    items: any[],
    options: {
      concurrency: number;
      checkpointFrequency: number;
      phaseIndex: number;
      totalPhases: number;
      checkpoint: BatchCheckpoint | null;
    }
  ): Promise<void> {
    const { concurrency, checkpointFrequency, phaseIndex, checkpoint } = options;

    logger.info('Starting phase execution', {
      jobId,
      phase: phase.name,
      totalItems: items.length,
    });

    // Check if job should stop before starting phase
    const statusCheck = await this.checkJobStatus(jobId);
    if (statusCheck.shouldStop) {
      logger.info('Job stopped before phase execution', {
        jobId,
        phase: phase.name,
        status: statusCheck.status,
      });
      throw new Error(`Job ${statusCheck.status.toLowerCase()}`);
    }

    // Update job current phase
    await this.db.batchJob.update({
      where: { id: jobId },
      data: { currentPhase: phase.name },
    });

    // Get items for this phase (skip already completed if resuming)
    const startIndex = checkpoint?.phaseProgress[phase.name]?.lastCompletedIndex ?? -1;
    const itemsToProcess = items.slice(startIndex + 1);

    // Create semaphore for concurrency control
    const semaphore = new Semaphore(concurrency);

    // Track checkpoint state
    let lastCheckpointAt = startIndex;
    let lastCheckpointTime = Date.now();
    let phaseCompletedItems = 0;
    let phaseFailedItems = 0;
    let itemsProcessedSinceSync = 0;
    const ANALYTICS_SYNC_FREQUENCY = 50; // Sync analytics every 50 items
    const CHUNK_SIZE = 500; // Process items in chunks to reduce memory pressure

    // Process items in chunks to avoid creating thousands of promises at once
    for (let chunkStart = 0; chunkStart < itemsToProcess.length; chunkStart += CHUNK_SIZE) {
      const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, itemsToProcess.length);
      const chunk = itemsToProcess.slice(chunkStart, chunkEnd);

      logger.debug('Processing chunk', {
        jobId,
        phase: phase.name,
        chunkStart,
        chunkEnd,
        totalItems: itemsToProcess.length,
      });

      // Process chunk items with concurrency control
      const chunkTasks = chunk.map(async (item, idx) => {
        const itemIndex = startIndex + 1 + chunkStart + idx;

        await semaphore.withPermit(async () => {
          try {
            // Check job status before processing each item
            const statusCheck = await this.checkJobStatus(jobId);
            if (statusCheck.shouldStop) {
              logger.info('Job stopped during item processing, skipping item', {
                jobId,
                itemIndex,
                status: statusCheck.status,
              });
              return; // Skip this item
            }

            await this.processItem(jobId, itemIndex, item, phase, phaseIndex);
            phaseCompletedItems++;
            itemsProcessedSinceSync++;

            // Periodic analytics sync to reduce DB contention
            if (itemsProcessedSinceSync >= ANALYTICS_SYNC_FREQUENCY) {
              await this.syncJobAnalytics(jobId);
              itemsProcessedSinceSync = 0;
            }

            // Auto-checkpoint (item count OR time-based)
            const shouldCheckpoint = await this.checkpointService.autoCheckpoint(
              jobId,
              {
                currentPhase: phase.name,
                completedPhases: checkpoint?.completedPhases || [],
                lastCompletedItemIndex: itemIndex,
                totalItems: items.length,
                completedItems: phaseCompletedItems,
                failedItems: phaseFailedItems,
                costIncurred: 0, // Updated separately
                tokensUsed: 0, // Updated separately
                phaseProgress: {
                  [phase.name]: {
                    lastCompletedIndex: itemIndex,
                    itemsProcessed: phaseCompletedItems,
                    itemsFailed: phaseFailedItems,
                  },
                },
              },
              {
                frequency: checkpointFrequency,
                lastCheckpointAt,
                lastCheckpointTime,
                timeIntervalMs: 5 * 60 * 1000, // Checkpoint every 5 minutes
              }
            );

            if (shouldCheckpoint) {
              lastCheckpointAt = itemIndex;
              lastCheckpointTime = Date.now();
            }
          } catch (error) {
            phaseFailedItems++;
            logger.error('Item processing failed', {
              jobId,
              itemIndex,
              phase: phase.name,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            // Continue processing other items
          }
        });
      });

      // Wait for this chunk to complete before moving to next
      await Promise.allSettled(chunkTasks);
    }

    // Final analytics sync to ensure accuracy
    await this.syncJobAnalytics(jobId);

    logger.info('Phase execution completed', {
      jobId,
      phase: phase.name,
      completed: phaseCompletedItems,
      failed: phaseFailedItems,
    });
  }

  /**
   * Process a single item through a phase
   */
  private async processItem(
    jobId: string,
    itemIndex: number,
    item: any,
    phase: PhaseConfig,
    phaseIndex: number
  ): Promise<void> {
    const startTime = Date.now();
    const ITEM_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes per item

    try {
      // Mark item as processing
      await this.db.batchItem.update({
        where: {
          batchJobId_itemIndex: {
            batchJobId: jobId,
            itemIndex,
          },
        },
        data: {
          status: 'PROCESSING',
          currentPhase: phase.name,
          startedAt: new Date(),
        },
      });

      // Get input for this phase
      const input = phaseIndex === 0 ? item.input : await this.getPhaseInput(jobId, itemIndex, phaseIndex);

      // Execute through ChainOrchestrator with timeout protection
      const result = await Promise.race([
        this.chainOrchestrator.executeChain({
          query: input,
          taskType: phase.taskType,
          model: phase.model,
          useRAG: phase.useRAG,
          validationConfig: phase.validation,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Item processing timeout after ${ITEM_TIMEOUT_MS / 1000}s`)),
            ITEM_TIMEOUT_MS
          )
        ),
      ]);

      const processingTime = Date.now() - startTime;

      // Save phase output
      await this.savePhaseOutput(jobId, itemIndex, phase.name, result, processingTime);

      logger.debug('Item processed successfully', {
        jobId,
        itemIndex,
        phase: phase.name,
        processingTimeMs: processingTime,
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Get current item to check retry count
      const currentItem = await this.db.batchItem.findUnique({
        where: {
          batchJobId_itemIndex: {
            batchJobId: jobId,
            itemIndex,
          },
        },
        select: { retryCount: true },
      });

      const currentRetryCount = currentItem?.retryCount || 0;

      // Get retry strategy from job config
      const job = await this.db.batchJob.findUnique({
        where: { id: jobId },
        select: { config: true },
      });

      const config = job?.config as BatchConfig;
      const maxRetries = config?.retryStrategy?.maxRetries || 0;
      const backoffType = config?.retryStrategy?.backoff || 'exponential';

      // Determine if we should retry or mark as dead letter
      const shouldRetry = currentRetryCount < maxRetries;

      if (shouldRetry) {
        // Calculate backoff delay
        const backoffMs = this.calculateBackoff(currentRetryCount, backoffType);

        logger.info('Item failed, scheduling retry', {
          jobId,
          itemIndex,
          phase: phase.name,
          retryCount: currentRetryCount + 1,
          maxRetries,
          backoffMs,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Update item for retry
        await this.db.batchItem.update({
          where: {
            batchJobId_itemIndex: {
              batchJobId: jobId,
              itemIndex,
            },
          },
          data: {
            status: 'PENDING', // Reset to PENDING for retry
            retryCount: currentRetryCount + 1,
            errors: {
              push: {
                phase: phase.name,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
                retryAttempt: currentRetryCount + 1,
              },
            },
            processingTimeMs: processingTime,
          },
        });

        // Apply backoff delay if configured
        if (backoffMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }

        // Don't throw error - let the item be retried in next batch
      } else {
        // Max retries exhausted - mark as FAILED (dead letter)
        logger.warn('Item moved to dead letter queue (max retries exhausted)', {
          jobId,
          itemIndex,
          phase: phase.name,
          retryCount: currentRetryCount,
          maxRetries,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        await this.db.batchItem.update({
          where: {
            batchJobId_itemIndex: {
              batchJobId: jobId,
              itemIndex,
            },
          },
          data: {
            status: 'FAILED', // Dead letter
            errors: {
              push: {
                phase: phase.name,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
                deadLetter: true, // Mark as dead letter
              },
            },
            processingTimeMs: processingTime,
            completedAt: new Date(),
          },
        });

        throw error;
      }
    }
  }

  /**
   * Calculate backoff delay based on retry count and strategy
   * @private
   */
  private calculateBackoff(retryCount: number, backoffType: 'exponential' | 'linear' | 'constant'): number {
    const baseDelayMs = 1000; // 1 second base delay

    switch (backoffType) {
      case 'exponential':
        // 1s, 2s, 4s, 8s, 16s, ...
        return baseDelayMs * Math.pow(2, retryCount);
      case 'linear':
        // 1s, 2s, 3s, 4s, 5s, ...
        return baseDelayMs * (retryCount + 1);
      case 'constant':
        // Always 1s
        return baseDelayMs;
      default:
        return baseDelayMs;
    }
  }

  /**
   * Get input for a phase from previous phase output
   */
  private async getPhaseInput(jobId: string, itemIndex: number, phaseIndex: number): Promise<string> {
    const item = await this.db.batchItem.findUnique({
      where: {
        batchJobId_itemIndex: {
          batchJobId: jobId,
          itemIndex,
        },
      },
      select: { output: true },
    });

    if (!item || !item.output) {
      throw new Error(`No output found for item ${itemIndex} from previous phase`);
    }

    return item.output as string;
  }

  /**
   * Save phase output for an item
   */
  private async savePhaseOutput(
    jobId: string,
    itemIndex: number,
    phaseName: string,
    result: any,
    processingTime: number
  ): Promise<void> {
    // Get current item data
    const item = await this.db.batchItem.findUnique({
      where: {
        batchJobId_itemIndex: {
          batchJobId: jobId,
          itemIndex,
        },
      },
    });

    if (!item) {
      throw new Error(`Item not found: ${itemIndex}`);
    }

    // Type-safe handling of phase outputs (Prisma Json field)
    const phaseOutputs: Record<string, string> =
      (item.phaseOutputs as Record<string, string> | null) || {};
    phaseOutputs[phaseName] = result.response;

    // Update item with phase output
    await this.db.batchItem.update({
      where: {
        batchJobId_itemIndex: {
          batchJobId: jobId,
          itemIndex,
        },
      },
      data: {
        output: result.response, // Latest output
        phaseOutputs,
        status: 'COMPLETED',
        costIncurred: { increment: result.cost || 0 },
        tokensUsed: { increment: result.tokens || 0 },
        processingTimeMs: processingTime,
        completedAt: new Date(),
      },
    });

    // Note: Job-level analytics are synced periodically via syncJobAnalytics()
    // to reduce database contention from concurrent updates
  }

  /**
   * Get final results for all items
   */
  private async getItemResults(jobId: string): Promise<any[]> {
    const items = await this.db.batchItem.findMany({
      where: { batchJobId: jobId },
      orderBy: { itemIndex: 'asc' },
      select: {
        itemIndex: true,
        input: true,
        output: true,
        phaseOutputs: true,
        status: true,
        errors: true,
      },
    });

    return items;
  }

  /**
   * Calculate analytics for completed job
   */
  private async calculateAnalytics(jobId: string) {
    const job = await this.db.batchJob.findUnique({
      where: { id: jobId },
      include: {
        items: {
          select: {
            status: true,
            costIncurred: true,
            tokensUsed: true,
            processingTimeMs: true,
          },
        },
      },
    });

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const completedItems = job.items.filter((i) => i.status === 'COMPLETED').length;
    const failedItems = job.items.filter((i) => i.status === 'FAILED').length;

    return {
      totalItems: job.totalItems,
      completedItems,
      failedItems,
      costIncurred: job.costIncurred,
      tokensUsed: job.tokensUsed,
    };
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    status: string,
    updates: {
      startedAt?: Date;
      completedAt?: Date;
      error?: string;
    } = {}
  ): Promise<void> {
    await this.db.batchJob.update({
      where: { id: jobId },
      data: {
        status,
        ...updates,
      },
    });
  }

  /**
   * Check if job should stop processing (paused or cancelled)
   */
  private async checkJobStatus(jobId: string): Promise<{ shouldStop: boolean; status: string }> {
    const job = await this.db.batchJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    });

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const shouldStop = job.status === 'PAUSED' || job.status === 'CANCELLED';
    return { shouldStop, status: job.status };
  }

  /**
   * Sync job-level analytics from aggregated item totals
   * This reduces race conditions by calculating from source of truth
   */
  private async syncJobAnalytics(jobId: string): Promise<void> {
    const items = await this.db.batchItem.findMany({
      where: { batchJobId: jobId },
      select: {
        status: true,
        costIncurred: true,
        tokensUsed: true,
      },
    });

    const completedItems = items.filter((i) => i.status === 'COMPLETED').length;
    const totalCost = items.reduce((sum, i) => sum + (i.costIncurred || 0), 0);
    const totalTokens = items.reduce((sum, i) => sum + (i.tokensUsed || 0), 0);

    // Update job with calculated totals (atomic operation)
    await this.db.batchJob.update({
      where: { id: jobId },
      data: {
        costIncurred: totalCost,
        tokensUsed: totalTokens,
        completedItems,
      },
    });

    logger.debug('Synced job analytics', {
      jobId,
      completedItems,
      totalCost,
      totalTokens,
    });
  }
}
