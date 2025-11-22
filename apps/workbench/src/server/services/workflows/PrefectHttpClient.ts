/**
 * Prefect HTTP Client
 *
 * Communicates with Python workflow server via HTTP instead of subprocess.
 * More reliable, scalable, and production-ready.
 */

import { logger } from '../../utils/logger';
import { CircuitBreaker } from '../../utils/CircuitBreaker';

export interface WorkflowExecutionRequest {
  workflow_id: string;
  inputs: Record<string, any>;
  correlation_id?: string;
}

export interface WorkflowExecutionResponse {
  success: boolean;
  result?: any;
  error?: string;
  job_id?: string;
  metadata: {
    workflow_name: string;
    execution_time: number;
    timestamp: string;
    correlation_id?: string;
  };
}

export interface WorkflowJobStatus {
  job_id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  workflow_id: string;
  result?: any;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export class PrefectHttpClient {
  private baseUrl: string;
  private timeout: number;
  private circuitBreaker: CircuitBreaker;
  private available: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(
    baseUrl: string = process.env.WORKFLOW_SERVICE_URL || 'http://localhost:8000',
    timeout: number = parseInt(process.env.WORKFLOW_TIMEOUT_MS || '300000', 10)
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;

    this.circuitBreaker = new CircuitBreaker({
      name: 'workflow-service',
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 60000,
    });

    // Initial health check
    this.checkAvailability();

    // Periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.checkAvailability();
    }, 30000);
  }

  private async checkAvailability(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      const wasAvailable = this.available;
      this.available = response.ok;

      if (!wasAvailable && this.available) {
        logger.info('Workflow service recovered', { url: this.baseUrl });
      } else if (wasAvailable && !this.available) {
        logger.warn('Workflow service went down', { url: this.baseUrl });
      }
    } catch (error) {
      if (this.available) {
        logger.warn('Workflow service became unavailable', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      this.available = false;
    }
  }

  isAvailable(): boolean {
    return this.available && this.circuitBreaker.getState() !== 'OPEN';
  }

  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Execute a workflow synchronously
   */
  async executeWorkflow(
    workflowId: string,
    inputs: Record<string, any>,
    correlationId?: string
  ): Promise<WorkflowExecutionResponse> {
    if (!this.isAvailable()) {
      throw new Error('Workflow service unavailable');
    }

    return this.circuitBreaker.execute(async () => {
      const response = await fetch(`${this.baseUrl}/api/workflows/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(correlationId && { 'X-Correlation-ID': correlationId }),
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          inputs,
          correlation_id: correlationId,
        } as WorkflowExecutionRequest),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Workflow execution failed: ${response.status} ${errorText}`);
      }

      return response.json();
    });
  }

  /**
   * Execute a workflow asynchronously (returns job ID)
   */
  async executeWorkflowAsync(
    workflowId: string,
    inputs: Record<string, any>,
    correlationId?: string
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Workflow service unavailable');
    }

    return this.circuitBreaker.execute(async () => {
      const response = await fetch(`${this.baseUrl}/api/workflows/execute-async`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(correlationId && { 'X-Correlation-ID': correlationId }),
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          inputs,
          correlation_id: correlationId,
        } as WorkflowExecutionRequest),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Async workflow submission failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return result.job_id;
    });
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<WorkflowJobStatus> {
    if (!this.isAvailable()) {
      throw new Error('Workflow service unavailable');
    }

    const response = await fetch(`${this.baseUrl}/api/workflows/jobs/${jobId}`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get job status: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * List available workflows
   */
  async listWorkflows(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    inputs: Record<string, string>;
  }>> {
    if (!this.isAvailable()) {
      throw new Error('Workflow service unavailable');
    }

    const response = await fetch(`${this.baseUrl}/api/workflows`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Failed to list workflows: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Workflow service unavailable');
    }

    const response = await fetch(`${this.baseUrl}/api/workflows/jobs/${jobId}/cancel`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
    });

    return response.ok;
  }

  /**
   * Execute custom workflow definition
   */
  async executeCustomWorkflow(
    definition: Record<string, any>,
    inputs: Record<string, any>,
    correlationId?: string
  ): Promise<WorkflowExecutionResponse> {
    if (!this.isAvailable()) {
      throw new Error('Workflow service unavailable');
    }

    return this.circuitBreaker.execute(async () => {
      const response = await fetch(`${this.baseUrl}/api/workflows/execute-custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(correlationId && { 'X-Correlation-ID': correlationId }),
        },
        body: JSON.stringify({
          definition,
          inputs,
          correlation_id: correlationId,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Custom workflow execution failed: ${response.status} ${errorText}`);
      }

      return response.json();
    });
  }

  /**
   * List workflow templates
   */
  async listTemplates(category?: string): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    version: string;
    parameters: Record<string, any>;
  }>> {
    if (!this.isAvailable()) {
      throw new Error('Workflow service unavailable');
    }

    const url = new URL(`${this.baseUrl}/api/workflows/templates`);
    if (category) {
      url.searchParams.set('category', category);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Failed to list templates: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Instantiate a template
   */
  async instantiateTemplate(
    templateId: string,
    params: Record<string, any>
  ): Promise<{
    name: string;
    tasks: Array<{
      id: string;
      type: string;
      inputs: Record<string, any>;
      depends_on?: string[];
      outputs?: string[];
    }>;
    description?: string;
    version?: string;
    output?: Record<string, string>;
    options?: {
      parallel?: boolean;
      retry_failed_tasks?: boolean;
      timeout?: number;
      task_runner?: 'concurrent' | 'sequential' | 'dask';
      max_retries?: number;
    };
    metadata?: Record<string, any>;
  }> {
    if (!this.isAvailable()) {
      throw new Error('Workflow service unavailable');
    }

    const response = await fetch(`${this.baseUrl}/api/workflows/templates/${templateId}/instantiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to instantiate template: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  getStats() {
    return {
      available: this.available,
      baseUrl: this.baseUrl,
      circuitBreaker: this.circuitBreaker.getStats(),
    };
  }
}
