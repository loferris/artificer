/**
 * Images tRPC Router
 * Handles OCR processing and image generation endpoints
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { OCRService } from '../services/image/OCRService';
import { ImageGenerationService } from '../services/image/ImageGenerationService';
import { PdfService } from '../services/document/PdfService';
import { logger } from '../utils/logger';

// Initialize services
const ocrService = new OCRService({
  provider: 'openai-vision',
  model: 'gpt-4o-mini',
});

const imageGenService = new ImageGenerationService();
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
      const result = await pdfService.checkNeedsOCR(buffer, input.minTextThreshold);

      return result;
    }),

  /**
   * Generate image from text prompt
   */
  generateImage: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(4000),
        projectId: z.string().optional(),
        conversationId: z.string().optional(),
        messageId: z.string().optional(),
        options: z
          .object({
            model: z.enum(['dall-e-3', 'dall-e-2']).optional(),
            size: z
              .enum(['1024x1024', '1792x1024', '1024x1792', '256x256', '512x512'])
              .optional(),
            quality: z.enum(['standard', 'hd']).optional(),
            style: z.enum(['vivid', 'natural']).optional(),
            n: z.number().min(1).max(10).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!imageGenService.isConfigured()) {
        throw new Error(
          'Image generation service not configured. Set OPENAI_API_KEY environment variable.'
        );
      }

      logger.info('Generating image', {
        userId: ctx.authenticatedUser?.id || 'anonymous',
        projectId: input.projectId,
        prompt: input.prompt.substring(0, 100),
      });

      // Generate image
      const generatedImage = await imageGenService.generateImage(
        input.prompt,
        input.options || {}
      );

      // Store in database
      if (!ctx.db) {
        throw new Error('Database not available');
      }

      const dbImage = await ctx.db.generatedImage.create({
        data: {
          userId: ctx.authenticatedUser?.id || 'anonymous',
          projectId: input.projectId,
          conversationId: input.conversationId,
          messageId: input.messageId,
          prompt: input.prompt,
          revisedPrompt: generatedImage.revisedPrompt,
          model: generatedImage.model,
          imageUrl: generatedImage.url,
          base64Data: generatedImage.b64_json,
          parameters: generatedImage.parameters,
          metadata: {
            cost: generatedImage.cost,
            createdAt: generatedImage.createdAt.toISOString(),
          },
        },
      });

      return {
        id: dbImage.id,
        url: generatedImage.url,
        b64_json: generatedImage.b64_json,
        revisedPrompt: generatedImage.revisedPrompt,
        cost: generatedImage.cost,
        createdAt: dbImage.createdAt,
      };
    }),

  /**
   * List generated images for a project/conversation
   */
  listGeneratedImages: protectedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        conversationId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const where: any = {
        userId: ctx.authenticatedUser?.id || 'anonymous',
      };

      if (input.projectId) {
        where.projectId = input.projectId;
      }

      if (input.conversationId) {
        where.conversationId = input.conversationId;
      }

      if (!ctx.db) {
        throw new Error('Database not available');
      }

      const images = await ctx.db.generatedImage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        skip: input.offset,
        select: {
          id: true,
          prompt: true,
          revisedPrompt: true,
          model: true,
          imageUrl: true,
          base64Data: true,
          parameters: true,
          metadata: true,
          createdAt: true,
          projectId: true,
          conversationId: true,
          messageId: true,
        },
      });

      const total = await ctx.db.generatedImage.count({ where });

      return {
        images,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Get a specific generated image
   */
  getGeneratedImage: protectedProcedure
    .input(
      z.object({
        imageId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new Error('Database not available');
      }

      const image = await ctx.db.generatedImage.findUnique({
        where: {
          id: input.imageId,
          userId: ctx.authenticatedUser?.id || 'anonymous',
        },
      });

      if (!image) {
        throw new Error('Image not found or access denied');
      }

      return image;
    }),

  /**
   * Delete a generated image
   */
  deleteGeneratedImage: protectedProcedure
    .input(
      z.object({
        imageId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new Error('Database not available');
      }

      const image = await ctx.db.generatedImage.findUnique({
        where: {
          id: input.imageId,
          userId: ctx.authenticatedUser?.id || 'anonymous',
        },
      });

      if (!image) {
        throw new Error('Image not found or access denied');
      }

      await ctx.db.generatedImage.delete({
        where: { id: input.imageId },
      });

      logger.info('Deleted generated image', {
        imageId: input.imageId,
        userId: ctx.authenticatedUser?.id || 'anonymous',
      });

      return { success: true };
    }),

  /**
   * Create image variation (DALL-E 2 only)
   */
  createVariation: protectedProcedure
    .input(
      z.object({
        imageData: z.string(), // base64 of original image
        n: z.number().min(1).max(10).default(1),
        size: z.enum(['256x256', '512x512', '1024x1024']).default('1024x1024'),
        projectId: z.string().optional(),
        conversationId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!imageGenService.isConfigured()) {
        throw new Error('Image generation service not configured.');
      }

      const buffer = Buffer.from(input.imageData, 'base64');
      const variations = await imageGenService.createVariation(buffer, input.n, input.size);

      if (!ctx.db) {
        throw new Error('Database not available');
      }

      // Store variations in database
      const dbImages = await Promise.all(
        variations.map((variation) =>
          ctx.db!.generatedImage.create({
            data: {
              userId: ctx.authenticatedUser?.id || 'anonymous',
              projectId: input.projectId,
              conversationId: input.conversationId,
              prompt: '[Image Variation]',
              model: variation.model,
              imageUrl: variation.url,
              base64Data: variation.b64_json,
              parameters: variation.parameters,
              metadata: {
                cost: variation.cost,
                type: 'variation',
              },
            },
          })
        )
      );

      return dbImages.map((img, i) => ({
        id: img.id,
        url: variations[i]?.url,
        b64_json: variations[i]?.b64_json,
        createdAt: img.createdAt,
      }));
    }),
});
