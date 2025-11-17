/**
 * CheckpointService
 * Handles saving and restoring batch job state for crash recovery
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../../utils/logger';

// Zod schema for runtime validation of checkpoint data
const PhaseProgressSchema = z.record(
  z.string(),
  z.object({
    lastCompletedIndex: z.number(),
    itemsProcessed: z.number(),
    itemsFailed: z.number(),
  })
);

const CheckpointDataSchema = z.object({
  timestamp: z.string(),
  currentPhase: z.string(),
  completedPhases: z.array(z.string()).default([]),
  lastCompletedItemIndex: z.number(),
  totalItems: z.number(),
  completedItems: z.number(),
  failedItems: z.number(),
  costIncurred: z.number(),
  tokensUsed: z.number(),
  phaseProgress: PhaseProgressSchema.default({}),
});

export interface BatchCheckpoint {
  jobId: string;
  timestamp: Date;
  currentPhase: string;
  completedPhases: string[];
  lastCompletedItemIndex: number;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  costIncurred: number;
  tokensUsed: number;
  phaseProgress: {
    [phaseName: string]: {
      lastCompletedIndex: number;
      itemsProcessed: number;
      itemsFailed: number;
    };
  };
}

export class CheckpointService {
  constructor(private db: PrismaClient) {}

  /**
   * Save a checkpoint for a batch job
   */
  async saveCheckpoint(
    jobId: string,
    checkpoint: Omit<BatchCheckpoint, 'jobId' | 'timestamp'>
  ): Promise<void> {
    try {
      await this.db.batchJob.update({
        where: { id: jobId },
        data: {
          checkpoint: {
            ...checkpoint,
            timestamp: new Date().toISOString(),
          },
          currentPhase: checkpoint.currentPhase,
          completedItems: checkpoint.completedItems,
          failedItems: checkpoint.failedItems,
          costIncurred: checkpoint.costIncurred,
          tokensUsed: checkpoint.tokensUsed,
          updatedAt: new Date(),
        },
      });

      logger.info('Checkpoint saved', {
        jobId,
        currentPhase: checkpoint.currentPhase,
        completedItems: checkpoint.completedItems,
        totalItems: checkpoint.totalItems,
      });
    } catch (error) {
      logger.error('Failed to save checkpoint', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Load the latest checkpoint for a batch job
   */
  async loadCheckpoint(jobId: string): Promise<BatchCheckpoint | null> {
    try {
      const job = await this.db.batchJob.findUnique({
        where: { id: jobId },
        select: { checkpoint: true },
      });

      if (!job || !job.checkpoint) {
        return null;
      }

      // Validate checkpoint data with zod for type safety
      const validatedCheckpoint = CheckpointDataSchema.parse(job.checkpoint);

      return {
        jobId,
        timestamp: new Date(validatedCheckpoint.timestamp),
        currentPhase: validatedCheckpoint.currentPhase,
        completedPhases: validatedCheckpoint.completedPhases,
        lastCompletedItemIndex: validatedCheckpoint.lastCompletedItemIndex,
        totalItems: validatedCheckpoint.totalItems,
        completedItems: validatedCheckpoint.completedItems,
        failedItems: validatedCheckpoint.failedItems,
        costIncurred: validatedCheckpoint.costIncurred,
        tokensUsed: validatedCheckpoint.tokensUsed,
        phaseProgress: validatedCheckpoint.phaseProgress,
      };
    } catch (error) {
      logger.error('Failed to load checkpoint', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Clear checkpoint data for a completed/failed job
   */
  async clearCheckpoint(jobId: string): Promise<void> {
    try {
      await this.db.batchJob.update({
        where: { id: jobId },
        data: {
          checkpoint: Prisma.JsonNull,
        },
      });

      logger.info('Checkpoint cleared', { jobId });
    } catch (error) {
      logger.error('Failed to clear checkpoint', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check if a job has a saved checkpoint
   */
  async hasCheckpoint(jobId: string): Promise<boolean> {
    const checkpoint = await this.loadCheckpoint(jobId);
    return checkpoint !== null;
  }

  /**
   * Clean up checkpoints for old completed/failed jobs
   * Removes checkpoint data to reduce database bloat
   *
   * @param olderThanDays - Remove checkpoints older than this many days (default: 30)
   * @returns Number of checkpoints cleaned up
   */
  async cleanupOldCheckpoints(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    logger.info('Cleaning up old batch job checkpoints', {
      olderThanDays,
      cutoffDate: cutoffDate.toISOString(),
    });

    try {
      // Find completed/failed jobs older than cutoff with checkpoints
      const oldJobs = await this.db.batchJob.findMany({
        where: {
          AND: [
            {
              status: {
                in: ['COMPLETED', 'FAILED', 'CANCELLED'],
              },
            },
            {
              completedAt: {
                lt: cutoffDate,
              },
            },
            {
              checkpoint: {
                not: Prisma.JsonNull,
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          status: true,
          completedAt: true,
        },
      });

      if (oldJobs.length === 0) {
        logger.info('No old checkpoints to clean up');
        return 0;
      }

      logger.info(`Found ${oldJobs.length} old checkpoint(s) to clean up`);

      // Clear checkpoints for these jobs
      const result = await this.db.batchJob.updateMany({
        where: {
          id: {
            in: oldJobs.map((j) => j.id),
          },
        },
        data: {
          checkpoint: Prisma.JsonNull,
        },
      });

      logger.info('Checkpoint cleanup completed', {
        cleanedCount: result.count,
        jobs: oldJobs.map((j) => ({
          id: j.id,
          name: j.name,
          status: j.status,
          completedAt: j.completedAt,
        })),
      });

      return result.count;
    } catch (error) {
      logger.error('Checkpoint cleanup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Clean up checkpoints for specific job status
   * Useful for targeted cleanup (e.g., only FAILED jobs)
   */
  async cleanupCheckpointsByStatus(
    status: 'COMPLETED' | 'FAILED' | 'CANCELLED',
    olderThanDays = 30
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    logger.info('Cleaning up checkpoints by status', {
      status,
      olderThanDays,
      cutoffDate: cutoffDate.toISOString(),
    });

    try {
      const result = await this.db.batchJob.updateMany({
        where: {
          AND: [
            { status },
            {
              completedAt: {
                lt: cutoffDate,
              },
            },
            {
              checkpoint: {
                not: Prisma.JsonNull,
              },
            },
          ],
        },
        data: {
          checkpoint: Prisma.JsonNull,
        },
      });

      logger.info('Status-based checkpoint cleanup completed', {
        status,
        cleanedCount: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Status-based checkpoint cleanup failed', {
        status,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Auto-checkpoint at regular intervals (item count OR time-based)
   * Returns true if checkpoint was saved, false if skipped
   */
  async autoCheckpoint(
    jobId: string,
    currentState: Omit<BatchCheckpoint, 'jobId' | 'timestamp'>,
    options: {
      frequency: number; // Save every N items
      lastCheckpointAt?: number; // Last item index when checkpoint was saved
      lastCheckpointTime?: number; // Timestamp of last checkpoint (ms)
      timeIntervalMs?: number; // Save every N milliseconds (default: 5 minutes)
    }
  ): Promise<boolean> {
    const {
      frequency,
      lastCheckpointAt = -1,
      lastCheckpointTime = 0,
      timeIntervalMs = 5 * 60 * 1000, // Default: 5 minutes
    } = options;
    const { lastCompletedItemIndex } = currentState;

    // Check if we should save a checkpoint based on item count
    const itemCountReached =
      lastCompletedItemIndex > 0 &&
      lastCompletedItemIndex % frequency === 0 &&
      lastCompletedItemIndex !== lastCheckpointAt;

    // Check if we should save a checkpoint based on time
    const now = Date.now();
    const timeElapsed = now - lastCheckpointTime;
    const timeIntervalReached = timeElapsed >= timeIntervalMs && lastCompletedItemIndex > lastCheckpointAt;

    const shouldCheckpoint = itemCountReached || timeIntervalReached;

    if (shouldCheckpoint) {
      await this.saveCheckpoint(jobId, currentState);
      if (timeIntervalReached && !itemCountReached) {
        logger.info('Time-based checkpoint triggered', {
          jobId,
          timeElapsedMs: timeElapsed,
          itemsProcessed: lastCompletedItemIndex - lastCheckpointAt,
        });
      }
      return true;
    }

    return false;
  }
}
