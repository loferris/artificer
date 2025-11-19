/**
 * Workflows Router - Prefect workflow orchestration
 *
 * Exposes pre-built Prefect workflows via API for:
 * - Document processing pipelines
 * - Translation workflows
 * - Batch operations
 * - Custom DAG execution
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { PrefectService, WorkflowInput } from '../services/workflows/PrefectService';

const prefectService = new PrefectService();

export const workflowsRouter = router({
  /**
   * List all available workflows
   */
  list: publicProcedure.query(async () => {
    return {
      workflows: prefectService.listWorkflows(),
      available: await prefectService.isAvailable(),
    };
  }),

  /**
   * Get workflow details
   */
  get: publicProcedure
    .input(
      z.object({
        workflowId: z.string().describe('Workflow ID'),
      })
    )
    .query(({ input }) => {
      const workflow = prefectService.getWorkflow(input.workflowId);

      if (!workflow) {
        throw new Error(`Workflow not found: ${input.workflowId}`);
      }

      return {
        id: input.workflowId,
        ...workflow,
      };
    }),

  /**
   * Execute a workflow
   */
  execute: publicProcedure
    .input(
      z.object({
        workflowId: z.string().describe('Workflow ID to execute'),
        inputs: z.record(z.any()).describe('Workflow inputs'),
      })
    )
    .mutation(async ({ input }) => {
      const result = await prefectService.executeWorkflow(input.workflowId, input.inputs);

      if (!result.success) {
        throw new Error(result.error || 'Workflow execution failed');
      }

      return result;
    }),

  /**
   * Execute PDF to HTML pipeline
   */
  executePdfToHtml: publicProcedure
    .input(
      z.object({
        pdfData: z.string().describe('Base64 encoded PDF data'),
        includeStyles: z.boolean().optional().default(true),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prefectService.executeWorkflow('pdf-to-html', {
        pdf_data: input.pdfData,
        include_styles: input.includeStyles,
        title: input.title,
      });
    }),

  /**
   * Execute PDF with OCR pipeline
   */
  executePdfWithOcr: publicProcedure
    .input(
      z.object({
        pdfData: z.string().describe('Base64 encoded PDF data'),
        chunkSize: z.number().optional().default(1000),
        chunkOverlap: z.number().optional().default(200),
      })
    )
    .mutation(async ({ input }) => {
      return prefectService.executeWorkflow('pdf-with-ocr', {
        pdf_data: input.pdfData,
        chunk_size: input.chunkSize,
        chunk_overlap: input.chunkOverlap,
      });
    }),

  /**
   * Execute batch PDF processing
   */
  executeBatchPdf: publicProcedure
    .input(
      z.object({
        files: z
          .array(
            z.object({
              filename: z.string(),
              data: z.string().describe('Base64 encoded PDF data'),
            })
          )
          .min(1)
          .max(100),
      })
    )
    .mutation(async ({ input }) => {
      return prefectService.executeWorkflow('batch-pdf-processing', {
        pdf_files: input.files,
      });
    }),

  /**
   * Execute image OCR pipeline
   */
  executeImageOcr: publicProcedure
    .input(
      z.object({
        images: z
          .array(
            z.object({
              data: z.string().describe('Base64 encoded image data'),
              contentType: z.string().optional().default('image/png'),
            })
          )
          .min(1)
          .max(100),
        minConfidence: z.number().min(0).max(1).optional().default(0.7),
      })
    )
    .mutation(async ({ input }) => {
      return prefectService.executeWorkflow('image-ocr', {
        images: input.images.map((img) => ({
          data: img.data,
          content_type: img.contentType,
        })),
        min_confidence: input.minConfidence,
      });
    }),

  /**
   * Execute markdown conversion pipeline
   */
  executeMarkdownConversion: publicProcedure
    .input(
      z.object({
        markdownContent: z.string().min(1).max(1000000),
      })
    )
    .mutation(async ({ input }) => {
      return prefectService.executeWorkflow('markdown-conversion', {
        markdown_content: input.markdownContent,
      });
    }),

  /**
   * Execute translation pipeline
   */
  executeTranslation: publicProcedure
    .input(
      z.object({
        text: z.string().min(1).max(100000),
        language: z.enum(['kor', 'jpn', 'chi']),
        minSuccessfulSpecialists: z.number().min(1).max(5).optional().default(3),
        selectionStrategy: z
          .enum(['ensemble', 'vote', 'quality_score'])
          .optional()
          .default('ensemble'),
      })
    )
    .mutation(async ({ input }) => {
      return prefectService.executeWorkflow('translation', {
        text: input.text,
        language: input.language,
        min_successful_specialists: input.minSuccessfulSpecialists,
        selection_strategy: input.selectionStrategy,
      });
    }),

  /**
   * Execute batch translation
   */
  executeBatchTranslation: publicProcedure
    .input(
      z.object({
        documents: z
          .array(
            z.object({
              id: z.string(),
              text: z.string(),
            })
          )
          .min(1)
          .max(100),
        language: z.enum(['kor', 'jpn', 'chi']),
        minSuccessful: z.number().min(1).max(5).optional().default(3),
      })
    )
    .mutation(async ({ input }) => {
      return prefectService.executeWorkflow('batch-translation', {
        documents: input.documents,
        language: input.language,
        min_successful: input.minSuccessful,
      });
    }),

  /**
   * Check workflow system health
   */
  healthCheck: publicProcedure.query(async () => {
    const available = await prefectService.isAvailable();

    return {
      available,
      status: available ? 'healthy' : 'unavailable',
      message: available
        ? 'Prefect workflows are available'
        : 'Prefect is not installed or not accessible',
    };
  }),

  /**
   * CUSTOM WORKFLOWS - Phase 2: Declarative config → Prefect translation
   */

  /**
   * Register a custom workflow definition
   */
  registerCustomWorkflow: publicProcedure
    .input(
      z.object({
        workflowId: z.string().describe('Unique workflow ID'),
        definition: z.object({
          name: z.string(),
          description: z.string().optional(),
          version: z.string().optional(),
          tasks: z.array(
            z.object({
              id: z.string(),
              type: z.string(),
              inputs: z.record(z.any()),
              depends_on: z.array(z.string()).optional(),
              outputs: z.array(z.string()).optional(),
            })
          ),
          output: z.record(z.string()).optional(),
          options: z
            .object({
              parallel: z.boolean().optional(),
              retry_failed_tasks: z.boolean().optional(),
              timeout: z.number().optional(),
              task_runner: z.enum(['concurrent', 'sequential', 'dask']).optional(),
              max_retries: z.number().optional(),
            })
            .optional(),
          metadata: z.record(z.any()).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      // Validate workflow definition
      const validation = await prefectService.validateWorkflowDefinition(input.definition);

      if (!validation.valid) {
        throw new Error(`Invalid workflow definition: ${validation.error}`);
      }

      // Register workflow
      prefectService.registerCustomWorkflow(input.workflowId, input.definition);

      return {
        success: true,
        workflowId: input.workflowId,
        message: `Custom workflow ${input.definition.name} registered successfully`,
      };
    }),

  /**
   * List all custom workflows
   */
  listCustomWorkflows: publicProcedure.query(() => {
    return {
      workflows: prefectService.listCustomWorkflows(),
    };
  }),

  /**
   * Get a custom workflow definition
   */
  getCustomWorkflow: publicProcedure
    .input(
      z.object({
        workflowId: z.string().describe('Workflow ID'),
      })
    )
    .query(({ input }) => {
      const workflow = prefectService.getCustomWorkflow(input.workflowId);

      if (!workflow) {
        throw new Error(`Custom workflow not found: ${input.workflowId}`);
      }

      return {
        id: input.workflowId,
        ...workflow,
      };
    }),

  /**
   * Execute a custom workflow
   */
  executeCustomWorkflow: publicProcedure
    .input(
      z.object({
        workflowId: z.string().describe('Workflow ID'),
        inputs: z.record(z.any()).describe('Workflow inputs'),
      })
    )
    .mutation(async ({ input }) => {
      const result = await prefectService.executeCustomWorkflow(
        input.workflowId,
        input.inputs
      );

      if (!result.success) {
        throw new Error(result.error || 'Workflow execution failed');
      }

      return result;
    }),

  /**
   * Delete a custom workflow
   */
  deleteCustomWorkflow: publicProcedure
    .input(
      z.object({
        workflowId: z.string().describe('Workflow ID'),
      })
    )
    .mutation(({ input }) => {
      const deleted = prefectService.deleteCustomWorkflow(input.workflowId);

      if (!deleted) {
        throw new Error(`Custom workflow not found: ${input.workflowId}`);
      }

      return {
        success: true,
        workflowId: input.workflowId,
        message: 'Custom workflow deleted successfully',
      };
    }),

  /**
   * Validate a workflow definition without registering
   */
  validateWorkflowDefinition: publicProcedure
    .input(
      z.object({
        definition: z.object({
          name: z.string(),
          description: z.string().optional(),
          version: z.string().optional(),
          tasks: z.array(
            z.object({
              id: z.string(),
              type: z.string(),
              inputs: z.record(z.any()),
              depends_on: z.array(z.string()).optional(),
              outputs: z.array(z.string()).optional(),
            })
          ),
          output: z.record(z.string()).optional(),
          options: z.record(z.any()).optional(),
          metadata: z.record(z.any()).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const validation = await prefectService.validateWorkflowDefinition(input.definition);

      return {
        valid: validation.valid,
        error: validation.error,
      };
    }),

  /**
   * WORKFLOW TEMPLATES - Phase 3: Pre-built workflow patterns
   */

  /**
   * List all workflow templates
   */
  listTemplates: publicProcedure
    .input(
      z
        .object({
          category: z.string().optional().describe('Filter by category'),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const templates = await prefectService.listTemplates(input?.category);

      return {
        templates,
        categories: await prefectService.getTemplateCategories(),
      };
    }),

  /**
   * Get a workflow template
   */
  getTemplate: publicProcedure
    .input(
      z.object({
        templateId: z.string().describe('Template ID'),
      })
    )
    .query(async ({ input }) => {
      const template = await prefectService.getTemplate(input.templateId);

      if (!template) {
        throw new Error(`Template not found: ${input.templateId}`);
      }

      return template;
    }),

  /**
   * Get template categories
   */
  getTemplateCategories: publicProcedure.query(async () => {
    const categories = await prefectService.getTemplateCategories();

    return {
      categories,
    };
  }),

  /**
   * Instantiate a template with parameters
   */
  instantiateTemplate: publicProcedure
    .input(
      z.object({
        templateId: z.string().describe('Template ID'),
        params: z.record(z.any()).describe('Template parameters'),
        autoRegister: z.boolean().optional().describe('Automatically register the workflow'),
        workflowId: z.string().optional().describe('Workflow ID for auto-registration'),
      })
    )
    .mutation(async ({ input }) => {
      // Instantiate template
      const definition = await prefectService.instantiateTemplate(
        input.templateId,
        input.params
      );

      // Optionally auto-register
      if (input.autoRegister && input.workflowId) {
        // Validate
        const validation = await prefectService.validateWorkflowDefinition(definition);

        if (!validation.valid) {
          throw new Error(`Invalid workflow definition: ${validation.error}`);
        }

        // Register
        prefectService.registerCustomWorkflow(input.workflowId, definition);

        return {
          definition,
          registered: true,
          workflowId: input.workflowId,
        };
      }

      return {
        definition,
        registered: false,
      };
    }),

  /**
   * ASYNC EXECUTION - Phase 4: Hybrid execution model
   */

  /**
   * Execute workflow asynchronously (background)
   */
  executeAsync: publicProcedure
    .input(
      z.object({
        workflowId: z.string().describe('Workflow ID'),
        inputs: z.record(z.any()).describe('Workflow inputs'),
        webhook: z
          .object({
            url: z.string().url(),
            method: z.enum(['POST', 'PUT']).optional(),
            headers: z.record(z.string()).optional(),
          })
          .optional()
          .describe('Webhook for completion notification'),
        priority: z.enum(['low', 'normal', 'high']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const jobId = await prefectService.executeWorkflowAsync(input.workflowId, input.inputs, {
        webhook: input.webhook,
        priority: input.priority,
      });

      return {
        jobId,
        status: 'PENDING',
        message: 'Workflow queued for execution',
      };
    }),

  /**
   * Execute custom workflow asynchronously
   */
  executeCustomAsync: publicProcedure
    .input(
      z.object({
        workflowId: z.string().describe('Custom workflow ID'),
        inputs: z.record(z.any()).describe('Workflow inputs'),
        webhook: z
          .object({
            url: z.string().url(),
            method: z.enum(['POST', 'PUT']).optional(),
            headers: z.record(z.string()).optional(),
          })
          .optional(),
        priority: z.enum(['low', 'normal', 'high']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const jobId = await prefectService.executeCustomWorkflowAsync(
        input.workflowId,
        input.inputs,
        {
          webhook: input.webhook,
          priority: input.priority,
        }
      );

      return {
        jobId,
        status: 'PENDING',
        message: 'Custom workflow queued for execution',
      };
    }),

  /**
   * Get job status
   */
  getJobStatus: publicProcedure
    .input(
      z.object({
        jobId: z.string().describe('Job ID'),
      })
    )
    .query(({ input }) => {
      const job = prefectService.getJobStatus(input.jobId);

      if (!job) {
        throw new Error(`Job not found: ${input.jobId}`);
      }

      return job;
    }),

  /**
   * List jobs
   */
  listJobs: publicProcedure
    .input(
      z
        .object({
          status: z
            .enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'])
            .optional(),
          workflowId: z.string().optional(),
          workflowType: z.enum(['pre-built', 'custom', 'template']).optional(),
          limit: z.number().optional(),
        })
        .optional()
    )
    .query(({ input }) => {
      const jobs = prefectService.listJobs(input);

      return {
        jobs,
        total: jobs.length,
      };
    }),

  /**
   * Cancel job
   */
  cancelJob: publicProcedure
    .input(
      z.object({
        jobId: z.string().describe('Job ID'),
      })
    )
    .mutation(({ input }) => {
      const cancelled = prefectService.cancelJob(input.jobId);

      if (!cancelled) {
        throw new Error(`Cannot cancel job: ${input.jobId}`);
      }

      return {
        success: true,
        jobId: input.jobId,
        message: 'Job cancelled successfully',
      };
    }),

  /**
   * Delete job
   */
  deleteJob: publicProcedure
    .input(
      z.object({
        jobId: z.string().describe('Job ID'),
      })
    )
    .mutation(({ input }) => {
      const deleted = prefectService.deleteJob(input.jobId);

      if (!deleted) {
        throw new Error(`Cannot delete job: ${input.jobId}`);
      }

      return {
        success: true,
        jobId: input.jobId,
        message: 'Job deleted successfully',
      };
    }),

  /**
   * Get job queue stats
   */
  getJobStats: publicProcedure.query(() => {
    return prefectService.getJobStats();
  }),
});
