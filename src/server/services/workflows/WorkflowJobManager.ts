/**
 * Workflow Job Manager - Phase 4: Hybrid Execution Model
 *
 * Manages asynchronous workflow execution with job queuing,
 * status tracking, progress updates, and webhook callbacks.
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

export type JobStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMEOUT';

export interface WorkflowJob {
  jobId: string;
  workflowId: string;
  workflowType: 'pre-built' | 'custom' | 'template';
  status: JobStatus;
  inputs: Record<string, any>;
  result?: any;
  error?: string;
  progress: {
    current: number;
    total: number;
    message?: string;
    percentComplete: number;
  };
  metadata: {
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    executionTime?: number;
  };
  webhook?: {
    url: string;
    method?: 'POST' | 'PUT';
    headers?: Record<string, string>;
  };
}

export interface JobExecutionOptions {
  webhook?: {
    url: string;
    method?: 'POST' | 'PUT';
    headers?: Record<string, string>;
  };
  timeout?: number; // milliseconds
  priority?: 'low' | 'normal' | 'high';
}

export class WorkflowJobManager extends EventEmitter {
  private jobs: Map<string, WorkflowJob>;
  private executionQueue: string[];
  private runningJobs: Set<string>;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 3) {
    super();
    this.jobs = new Map();
    this.executionQueue = [];
    this.runningJobs = new Set();
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Create a new job
   */
  createJob(
    workflowId: string,
    workflowType: 'pre-built' | 'custom' | 'template',
    inputs: Record<string, any>,
    options?: JobExecutionOptions
  ): string {
    const jobId = this.generateJobId();

    const job: WorkflowJob = {
      jobId,
      workflowId,
      workflowType,
      status: 'PENDING',
      inputs,
      progress: {
        current: 0,
        total: 100,
        percentComplete: 0,
      },
      metadata: {
        createdAt: new Date().toISOString(),
      },
      webhook: options?.webhook,
    };

    this.jobs.set(jobId, job);

    logger.info('Workflow job created', {
      jobId,
      workflowId,
      workflowType,
    });

    // Add to queue based on priority
    if (options?.priority === 'high') {
      this.executionQueue.unshift(jobId);
    } else {
      this.executionQueue.push(jobId);
    }

    // Emit event
    this.emit('job:created', job);

    return jobId;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): WorkflowJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * List all jobs
   */
  listJobs(filters?: {
    status?: JobStatus;
    workflowId?: string;
    workflowType?: 'pre-built' | 'custom' | 'template';
    limit?: number;
  }): WorkflowJob[] {
    let jobs = Array.from(this.jobs.values());

    // Apply filters
    if (filters?.status) {
      jobs = jobs.filter((job) => job.status === filters.status);
    }
    if (filters?.workflowId) {
      jobs = jobs.filter((job) => job.workflowId === filters.workflowId);
    }
    if (filters?.workflowType) {
      jobs = jobs.filter((job) => job.workflowType === filters.workflowType);
    }

    // Sort by created date (newest first)
    jobs.sort((a, b) => {
      return (
        new Date(b.metadata.createdAt).getTime() -
        new Date(a.metadata.createdAt).getTime()
      );
    });

    // Limit results
    if (filters?.limit) {
      jobs = jobs.slice(0, filters.limit);
    }

    return jobs;
  }

  /**
   * Update job status
   */
  updateJobStatus(jobId: string, status: JobStatus, error?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.warn('Attempted to update non-existent job', { jobId });
      return;
    }

    const oldStatus = job.status;
    job.status = status;

    if (error) {
      job.error = error;
    }

    // Update metadata
    if (status === 'RUNNING' && !job.metadata.startedAt) {
      job.metadata.startedAt = new Date().toISOString();
    }

    if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
      job.metadata.completedAt = new Date().toISOString();

      if (job.metadata.startedAt) {
        job.metadata.executionTime =
          new Date(job.metadata.completedAt).getTime() -
          new Date(job.metadata.startedAt).getTime();
      }

      // Remove from running jobs
      this.runningJobs.delete(jobId);

      // Trigger webhook if configured
      if (job.webhook) {
        this.triggerWebhook(job);
      }
    }

    logger.info('Job status updated', {
      jobId,
      oldStatus,
      newStatus: status,
    });

    // Emit event
    this.emit('job:status', job);

    // Process queue if job finished
    if (!this.runningJobs.has(jobId)) {
      this.processQueue();
    }
  }

  /**
   * Update job progress
   */
  updateJobProgress(
    jobId: string,
    current: number,
    total: number,
    message?: string
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.progress = {
      current,
      total,
      message,
      percentComplete: total > 0 ? Math.round((current / total) * 100) : 0,
    };

    // Emit event
    this.emit('job:progress', job);
  }

  /**
   * Set job result
   */
  setJobResult(jobId: string, result: any): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.result = result;
    this.updateJobStatus(jobId, 'COMPLETED');
  }

  /**
   * Set job error
   */
  setJobError(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    this.updateJobStatus(jobId, 'FAILED', error);
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      return false; // Can't cancel completed jobs
    }

    // Remove from queue if pending
    if (job.status === 'PENDING') {
      const index = this.executionQueue.indexOf(jobId);
      if (index > -1) {
        this.executionQueue.splice(index, 1);
      }
    }

    this.updateJobStatus(jobId, 'CANCELLED');
    return true;
  }

  /**
   * Delete job
   */
  deleteJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    // Can't delete running jobs
    if (job.status === 'RUNNING') {
      return false;
    }

    this.jobs.delete(jobId);

    logger.info('Job deleted', { jobId });
    this.emit('job:deleted', { jobId });

    return true;
  }

  /**
   * Check if job can be executed
   */
  canExecute(): boolean {
    return this.runningJobs.size < this.maxConcurrent;
  }

  /**
   * Get next job from queue
   */
  getNextJob(): string | null {
    while (this.executionQueue.length > 0) {
      const jobId = this.executionQueue.shift();
      if (!jobId) continue;

      const job = this.jobs.get(jobId);
      if (job && job.status === 'PENDING') {
        return jobId;
      }
    }
    return null;
  }

  /**
   * Mark job as running
   */
  markJobRunning(jobId: string): void {
    this.runningJobs.add(jobId);
    this.updateJobStatus(jobId, 'RUNNING');
  }

  /**
   * Process execution queue
   */
  processQueue(): void {
    // This is called by external executor
    this.emit('queue:process');
  }

  /**
   * Trigger webhook for job completion
   */
  private async triggerWebhook(job: WorkflowJob): Promise<void> {
    if (!job.webhook) return;

    try {
      const payload = {
        jobId: job.jobId,
        workflowId: job.workflowId,
        status: job.status,
        result: job.result,
        error: job.error,
        metadata: job.metadata,
      };

      const response = await fetch(job.webhook.url, {
        method: job.webhook.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...job.webhook.headers,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.warn('Webhook failed', {
          jobId: job.jobId,
          status: response.status,
          url: job.webhook.url,
        });
      } else {
        logger.info('Webhook triggered successfully', {
          jobId: job.jobId,
          url: job.webhook.url,
        });
      }
    } catch (error) {
      logger.error('Webhook error', {
        jobId: job.jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get queue stats
   */
  getStats() {
    return {
      totalJobs: this.jobs.size,
      pendingJobs: this.executionQueue.length,
      runningJobs: this.runningJobs.size,
      maxConcurrent: this.maxConcurrent,
      jobsByStatus: {
        PENDING: this.listJobs({ status: 'PENDING' }).length,
        RUNNING: this.listJobs({ status: 'RUNNING' }).length,
        COMPLETED: this.listJobs({ status: 'COMPLETED' }).length,
        FAILED: this.listJobs({ status: 'FAILED' }).length,
        CANCELLED: this.listJobs({ status: 'CANCELLED' }).length,
      },
    };
  }
}
