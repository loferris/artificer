/**
 * ShutdownManager
 * Handles graceful shutdown of batch jobs when server receives SIGTERM/SIGINT
 *
 * Ensures:
 * - Running batch jobs are paused
 * - Checkpoints are saved
 * - In-progress items complete (with timeout)
 * - Resources are cleaned up
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '~/server/utils/logger';
import { CheckpointService } from './CheckpointService';

export interface ShutdownOptions {
  gracePeriodMs?: number; // Time to wait for in-progress items (default: 30s)
  forceAfterMs?: number; // Force shutdown after this time (default: 60s)
}

export class ShutdownManager {
  private isShuttingDown = false;
  private shutdownPromise: Promise<void> | null = null;

  constructor(
    private db: PrismaClient,
    private checkpointService: CheckpointService
  ) {}

  /**
   * Register shutdown handlers for SIGTERM and SIGINT
   */
  registerHandlers(): void {
    process.on('SIGTERM', () => this.initiateShutdown('SIGTERM'));
    process.on('SIGINT', () => this.initiateShutdown('SIGINT'));

    logger.info('Shutdown handlers registered for batch jobs');
  }

  /**
   * Initiate graceful shutdown
   */
  private async initiateShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring signal', { signal });
      return;
    }

    this.isShuttingDown = true;
    logger.info(`${signal} received, initiating graceful shutdown of batch jobs...`);

    // Start shutdown process
    this.shutdownPromise = this.performShutdown();

    try {
      await this.shutdownPromise;
      logger.info('Graceful shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Shutdown failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  }

  /**
   * Perform the actual shutdown sequence
   */
  private async performShutdown(options: ShutdownOptions = {}): Promise<void> {
    const gracePeriodMs = options.gracePeriodMs || 30 * 1000; // 30 seconds
    const forceAfterMs = options.forceAfterMs || 60 * 1000; // 60 seconds

    const shutdownStartTime = Date.now();

    try {
      // Step 1: Find all running batch jobs
      const runningJobs = await this.db.batchJob.findMany({
        where: {
          status: 'RUNNING',
        },
        select: {
          id: true,
          name: true,
          currentPhase: true,
          completedItems: true,
          totalItems: true,
        },
      });

      if (runningJobs.length === 0) {
        logger.info('No running batch jobs to shut down');
        return;
      }

      logger.info(`Found ${runningJobs.length} running batch job(s), pausing...`, {
        jobs: runningJobs.map((j) => ({ id: j.id, name: j.name })),
      });

      // Step 2: Pause all running jobs
      await this.db.batchJob.updateMany({
        where: {
          status: 'RUNNING',
        },
        data: {
          status: 'PAUSED',
          updatedAt: new Date(),
        },
      });

      logger.info('All batch jobs paused');

      // Step 3: Wait for in-progress items to complete (with grace period)
      await this.waitForInProgressItems(runningJobs.map((j) => j.id), gracePeriodMs);

      // Step 4: Save checkpoints for all paused jobs
      await this.saveCheckpointsForJobs(runningJobs.map((j) => j.id));

      const shutdownTime = Date.now() - shutdownStartTime;
      logger.info('Batch jobs shutdown complete', {
        jobCount: runningJobs.length,
        shutdownTimeMs: shutdownTime,
      });
    } catch (error) {
      logger.error('Error during batch job shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Wait for in-progress items to complete
   * Polls database to check if any items are still PROCESSING
   */
  private async waitForInProgressItems(jobIds: string[], gracePeriodMs: number): Promise<void> {
    const startTime = Date.now();
    const pollIntervalMs = 1000; // Check every second

    logger.info('Waiting for in-progress items to complete...', {
      gracePeriodMs,
      jobCount: jobIds.length,
    });

    while (Date.now() - startTime < gracePeriodMs) {
      const processingItems = await this.db.batchItem.count({
        where: {
          batchJobId: {
            in: jobIds,
          },
          status: 'PROCESSING',
        },
      });

      if (processingItems === 0) {
        logger.info('All in-progress items completed');
        return;
      }

      logger.debug(`Waiting for ${processingItems} item(s) to complete...`);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    // Grace period expired
    const remainingItems = await this.db.batchItem.count({
      where: {
        batchJobId: {
          in: jobIds,
        },
        status: 'PROCESSING',
      },
    });

    if (remainingItems > 0) {
      logger.warn('Grace period expired with items still processing', {
        remainingItems,
        gracePeriodMs,
      });

      // Mark remaining processing items as PENDING for retry on restart
      await this.db.batchItem.updateMany({
        where: {
          batchJobId: {
            in: jobIds,
          },
          status: 'PROCESSING',
        },
        data: {
          status: 'PENDING',
        },
      });
    }
  }

  /**
   * Save checkpoints for all specified jobs
   */
  private async saveCheckpointsForJobs(jobIds: string[]): Promise<void> {
    logger.info('Saving checkpoints for paused jobs...', {
      jobCount: jobIds.length,
    });

    for (const jobId of jobIds) {
      try {
        // Get job details
        const job = await this.db.batchJob.findUnique({
          where: { id: jobId },
          include: {
            items: {
              select: {
                status: true,
                costIncurred: true,
                tokensUsed: true,
              },
            },
          },
        });

        if (!job) {
          logger.warn('Job not found for checkpoint save', { jobId });
          continue;
        }

        // Calculate current state
        const completedItems = job.items.filter((i) => i.status === 'COMPLETED').length;
        const failedItems = job.items.filter((i) => i.status === 'FAILED').length;
        const totalCost = job.items.reduce((sum, i) => sum + i.costIncurred, 0);
        const totalTokens = job.items.reduce((sum, i) => sum + i.tokensUsed, 0);

        // Save checkpoint
        await this.checkpointService.saveCheckpoint(jobId, {
          currentPhase: job.currentPhase || 'unknown',
          completedPhases: [], // TODO: Track from config
          lastCompletedItemIndex: completedItems - 1,
          totalItems: job.totalItems,
          completedItems,
          failedItems,
          costIncurred: totalCost,
          tokensUsed: totalTokens,
          phaseProgress: {},
        });

        logger.info('Checkpoint saved for job', {
          jobId,
          completedItems,
          totalItems: job.totalItems,
        });
      } catch (error) {
        logger.error('Failed to save checkpoint for job', {
          jobId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Check if shutdown is in progress
   */
  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }
}
