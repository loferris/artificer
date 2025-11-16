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
      logger.error('Batch execution failed', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.updateJobStatus(jobId, 'FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
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
    let phaseCompletedItems = 0;
    let phaseFailedItems = 0;

    // Process items with concurrency control
    const processingTasks = itemsToProcess.map(async (item, idx) => {
      const itemIndex = startIndex + 1 + idx;

      await semaphore.withPermit(async () => {
        try {
          await this.processItem(jobId, itemIndex, item, phase, phaseIndex);
          phaseCompletedItems++;

          // Auto-checkpoint
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
            { frequency: checkpointFrequency, lastCheckpointAt }
          );

          if (shouldCheckpoint) {
            lastCheckpointAt = itemIndex;
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

    // Wait for all items to complete
    await Promise.allSettled(processingTasks);

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

      // Execute through ChainOrchestrator
      const result = await this.chainOrchestrator.executeChain({
        query: input,
        taskType: phase.taskType,
        model: phase.model,
        useRAG: phase.useRAG,
        validationConfig: phase.validation,
      });

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

      await this.db.batchItem.update({
        where: {
          batchJobId_itemIndex: {
            batchJobId: jobId,
            itemIndex,
          },
        },
        data: {
          status: 'FAILED',
          errors: {
            push: {
              phase: phase.name,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            },
          },
          processingTimeMs: processingTime,
          completedAt: new Date(),
        },
      });

      throw error;
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

    const phaseOutputs = (item.phaseOutputs as any) || {};
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

    // Update job analytics
    await this.db.batchJob.update({
      where: { id: jobId },
      data: {
        costIncurred: { increment: result.cost || 0 },
        tokensUsed: { increment: result.tokens || 0 },
        completedItems: { increment: 1 },
      },
    });
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
}
