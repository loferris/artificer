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
});
