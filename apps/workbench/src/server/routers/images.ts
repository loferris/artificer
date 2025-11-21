/**
 * Images tRPC Router
 * Handles OCR processing for images and PDFs
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { OCRService } from '../services/image/OCRService';
import { PdfService } from '../services/document/PdfService';

// Constants
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Validate buffer size and throw if exceeds limit
 */
function validateBufferSize(buffer: Buffer, maxSize: number, dataType: string): void {
  if (buffer.length > maxSize) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `${dataType} too large. Maximum size: ${maxSize / (1024 * 1024)}MB, received: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB`,
    });
  }
}

// Initialize services
const ocrService = new OCRService({
  provider: 'openai-vision',
  model: 'gpt-4o-mini',
});

const pdfService = new PdfService(ocrService);

export const imagesRouter = router({
  /**
   * Analyze image content with AI vision
   * Returns description and extracted information
   */
  analyzeImage: protectedProcedure
    .input(
      z.object({
        imageData: z.string(), // base64
        contentType: z.string(),
        prompt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!ocrService.isConfigured()) {
        throw new Error('OCR service not configured. Set OPENAI_API_KEY environment variable.');
      }

      const buffer = Buffer.from(input.imageData, 'base64');
      validateBufferSize(buffer, MAX_IMAGE_SIZE, 'Image');

      const result = await ocrService.analyzeImage(
        buffer,
        input.contentType,
        input.prompt
      );

      return result;
    }),

  /**
   * Extract text from image using OCR
   */
  extractTextFromImage: protectedProcedure
    .input(
      z.object({
        imageData: z.string(), // base64
        contentType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (!ocrService.isConfigured()) {
        throw new Error('OCR service not configured. Set OPENAI_API_KEY environment variable.');
      }

      const buffer = Buffer.from(input.imageData, 'base64');
      validateBufferSize(buffer, MAX_IMAGE_SIZE, 'Image');

      const result = await ocrService.extractText(buffer, input.contentType);

      return result;
    }),

  /**
   * Process PDF and extract text (with OCR if needed)
   */
  processPdf: protectedProcedure
    .input(
      z.object({
        pdfData: z.string(), // base64
        options: z
          .object({
            forceOCR: z.boolean().optional(),
            minTextThreshold: z.number().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.pdfData, 'base64');
      validateBufferSize(buffer, MAX_PDF_SIZE, 'PDF');

      const result = await pdfService.processPdf(buffer, input.options);

      return result;
    }),

  /**
   * Check if PDF needs OCR
   * Returns metadata and cost estimate
   */
  checkPdfNeedsOCR: protectedProcedure
    .input(
      z.object({
        pdfData: z.string(), // base64
        minTextThreshold: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const buffer = Buffer.from(input.pdfData, 'base64');
      validateBufferSize(buffer, MAX_PDF_SIZE, 'PDF');

      const result = await pdfService.checkNeedsOCR(buffer, input.minTextThreshold);

      return result;
    }),
});
