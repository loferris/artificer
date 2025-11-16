/**
 * CheckpointService
 * Handles saving and restoring batch job state for crash recovery
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '~/server/utils/logger';

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

      const checkpoint = job.checkpoint as any;

      return {
        jobId,
        timestamp: new Date(checkpoint.timestamp),
        currentPhase: checkpoint.currentPhase,
        completedPhases: checkpoint.completedPhases || [],
        lastCompletedItemIndex: checkpoint.lastCompletedItemIndex,
        totalItems: checkpoint.totalItems,
        completedItems: checkpoint.completedItems,
        failedItems: checkpoint.failedItems,
        costIncurred: checkpoint.costIncurred,
        tokensUsed: checkpoint.tokensUsed,
        phaseProgress: checkpoint.phaseProgress || {},
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
          checkpoint: null,
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
   * Auto-checkpoint at regular intervals
   * Returns true if checkpoint was saved, false if skipped
   */
  async autoCheckpoint(
    jobId: string,
    currentState: Omit<BatchCheckpoint, 'jobId' | 'timestamp'>,
    options: {
      frequency: number; // Save every N items
      lastCheckpointAt?: number; // Last item index when checkpoint was saved
    }
  ): Promise<boolean> {
    const { frequency, lastCheckpointAt = -1 } = options;
    const { lastCompletedItemIndex } = currentState;

    // Check if we should save a checkpoint
    const shouldCheckpoint =
      lastCompletedItemIndex > 0 &&
      lastCompletedItemIndex % frequency === 0 &&
      lastCompletedItemIndex !== lastCheckpointAt;

    if (shouldCheckpoint) {
      await this.saveCheckpoint(jobId, currentState);
      return true;
    }

    return false;
  }
}
