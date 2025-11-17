/**
 * OCR Service
 * Implements text extraction from images using AI vision models
 * Supports OpenAI Vision API with fallback options
 */

import { OpenAI } from 'openai';
import type { OCRProvider, OCRResult } from '@ai-workflow/document-converter';
import { logger } from '../../utils/logger';
import { fromBuffer } from 'pdf2pic';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { circuitBreakerRegistry } from '../../utils/CircuitBreaker';
import pdf from 'pdf-parse';
import { pythonOCRClient } from '../python/PythonOCRClient';

// Constants
const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const API_TIMEOUT_MS = 30 * 1000; // 30 seconds for OpenAI API calls
const MAX_PDF_PAGES_FOR_OCR = 100; // Maximum pages to OCR (safety limit)

export interface OCRServiceConfig {
  provider: 'openai-vision' | 'tesseract';
  openaiApiKey?: string;
  model?: string; // 'gpt-4o' or 'gpt-4o-mini'
  maxRetries?: number;
}

export class OCRService implements OCRProvider {
  private openai?: OpenAI;
  private config: Required<OCRServiceConfig>;

  constructor(config: OCRServiceConfig) {
    this.config = {
      provider: config.provider,
      openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY || '',
      model: config.model || 'gpt-4o-mini',
      maxRetries: config.maxRetries || 3,
    };

    if (this.config.provider === 'openai-vision' && this.config.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.config.openaiApiKey,
      });
    }
  }

  /**
   * Extract text from image using configured provider
   */
  async extractText(buffer: Buffer, contentType: string): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      if (this.config.provider === 'openai-vision') {
        return await this.extractWithOpenAI(buffer, contentType, startTime);
      } else {
        throw new Error(`OCR provider '${this.config.provider}' not yet implemented`);
      }
    } catch (error) {
      logger.error('OCR extraction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentType,
        provider: this.config.provider,
      });
      throw error;
    }
  }

  /**
   * Extract text from PDF using OCR with parallel page processing
   * For scanned PDFs that don't have embedded text
   *
   * This method:
   * 1. Converts each PDF page to an image
   * 2. Processes pages in parallel using OCR
   * 3. Combines text results in page order
   */
  async extractTextFromPdf(buffer: Buffer): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // Get PDF metadata to determine page count
      const data = await pdf(buffer);
      const pageCount = data.numpages || 0;

      logger.info('Starting PDF OCR with parallel page processing', {
        pageCount,
        bufferSize: buffer.length,
      });

      // Safety check: prevent processing extremely large PDFs
      if (pageCount > MAX_PDF_PAGES_FOR_OCR) {
        throw new Error(
          `PDF has too many pages for OCR. Maximum: ${MAX_PDF_PAGES_FOR_OCR}, actual: ${pageCount}`
        );
      }

      if (pageCount === 0) {
        throw new Error('PDF has no pages');
      }

      // Create temporary directory for page images
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-ocr-'));

      try {
        // Convert PDF pages to images
        const pageImages = await this.extractPdfPagesToImages(buffer, tempDir, pageCount);

        // Process all pages in parallel using batch OCR
        logger.info('Processing PDF pages with OCR', {
          pageCount,
          concurrency: 3,
        });

        const pageResults = await this.extractTextBatch(pageImages, { concurrency: 3 });

        // Combine page texts in order
        const combinedText = pageResults
          .map((result, idx) => {
            const pageNum = idx + 1;
            return `--- Page ${pageNum} ---\n${result.text}`;
          })
          .join('\n\n');

        // Calculate combined metrics
        const totalTokens = pageResults.reduce(
          (sum, result) => sum + (result.metadata.tokensUsed || 0),
          0
        );
        const totalCost = pageResults.reduce(
          (sum, result) => sum + (result.metadata.cost || 0),
          0
        );
        const avgConfidence = pageResults.reduce(
          (sum, result) => sum + result.confidence,
          0
        ) / pageResults.length;

        const processingTime = Date.now() - startTime;

        logger.info('PDF OCR completed', {
          pageCount,
          totalTextLength: combinedText.length,
          totalTokens,
          totalCost,
          processingTime,
        });

        return {
          text: combinedText,
          confidence: avgConfidence,
          metadata: {
            processingTime,
            provider: 'openai-vision',
            model: this.config.model,
            pageCount,
            tokensUsed: totalTokens,
            cost: totalCost,
          },
        };
      } finally {
        // Clean up temporary directory
        await fs.rm(tempDir, { recursive: true, force: true }).catch((error) => {
          logger.warn('Failed to clean up temp directory', {
            tempDir,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        });
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('PDF OCR failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      });
      throw new Error(
        `PDF OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert PDF pages to images for OCR processing
   * Uses Python service (2-10x faster) with fallback to Node.js pdf2pic
   * @private
   */
  private async extractPdfPagesToImages(
    buffer: Buffer,
    tempDir: string,
    pageCount: number
  ): Promise<Array<{ buffer: Buffer; contentType: string }>> {
    // Try Python service first (2-10x faster)
    if (pythonOCRClient.isAvailable()) {
      try {
        logger.info('Using Python service for PDF to image conversion', { pageCount });
        const result = await pythonOCRClient.extractPdfPagesToImages(buffer, {
          dpi: 200,
          format: 'png',
          maxWidth: 2000,
          maxHeight: 2000,
        });

        // Convert base64 images to buffers
        const pageImages = result.pages.map((page) => ({
          buffer: Buffer.from(page.imageData, 'base64'),
          contentType: page.contentType,
        }));

        logger.info('Python PDF to image conversion completed', {
          pageCount: result.totalPages,
          processingTime: result.processingTime,
        });

        return pageImages;
      } catch (error) {
        logger.warn('Python PDF to image conversion failed, falling back to pdf2pic', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Fall through to pdf2pic fallback
      }
    }

    // Fallback to Node.js pdf2pic (slower but reliable)
    logger.info('Using Node.js pdf2pic for PDF to image conversion', { pageCount });
    const converter = fromBuffer(buffer, {
      density: 200, // DPI - higher = better quality but larger files
      saveFilename: 'page',
      savePath: tempDir,
      format: 'png',
      width: 2000, // Max width in pixels
      height: 2000, // Max height in pixels
    });

    const pageImages: Array<{ buffer: Buffer; contentType: string }> = [];

    // Convert each page to an image
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        const result = await converter(pageNum, { responseType: 'buffer' });

        if (!result?.buffer) {
          logger.warn('Failed to convert PDF page to image', { pageNum });
          // Create placeholder for failed page
          pageImages.push({
            buffer: Buffer.from('[Failed to extract page image]'),
            contentType: 'text/plain',
          });
          continue;
        }

        pageImages.push({
          buffer: result.buffer,
          contentType: 'image/png',
        });

        logger.debug('PDF page converted to image', {
          pageNum,
          imageSize: result.buffer.length,
        });
      } catch (error) {
        logger.warn('Error converting PDF page to image', {
          pageNum,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Create placeholder for failed page
        pageImages.push({
          buffer: Buffer.from(`[Failed to extract page ${pageNum}]`),
          contentType: 'text/plain',
        });
      }
    }

    return pageImages;
  }

  /**
   * Extract text using OpenAI Vision API
   */
  private async extractWithOpenAI(
    buffer: Buffer,
    contentType: string,
    startTime: number
  ): Promise<OCRResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Check OPENAI_API_KEY.');
    }

    // Validate buffer size before processing
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        `Image size exceeds maximum allowed size. Max: ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB, Actual: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB`
      );
    }

    // Convert buffer to base64
    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64Image}`;

    logger.info('Starting OpenAI Vision OCR', {
      model: this.config.model,
      contentType,
      imageSize: buffer.length,
    });

    try {
      // Get circuit breaker for OpenAI
      const circuitBreaker = circuitBreakerRegistry.getBreaker('openai-vision', {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000, // 1 minute
      });

      // Wrap API call with circuit breaker and timeout protection
      const response = await circuitBreaker.execute(async () => {
        return Promise.race([
          this.openai.chat.completions.create({
            model: this.config.model,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Extract all text from this image verbatim. Preserve formatting, line breaks, and structure as much as possible. If there is no text in the image, respond with "[No text found]".',
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: dataUrl,
                      detail: 'high', // Use 'high' for better OCR accuracy
                    },
                  },
                ],
              },
            ],
            max_tokens: 4096,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`OpenAI API call timeout after ${API_TIMEOUT_MS / 1000}s`)),
              API_TIMEOUT_MS
            )
          ),
        ]);
      });

      const extractedText = response.choices[0]?.message?.content || '';
      const processingTime = Date.now() - startTime;

      logger.info('OpenAI Vision OCR completed', {
        textLength: extractedText.length,
        processingTime,
        tokensUsed: response.usage?.total_tokens,
      });

      return {
        text: extractedText,
        confidence: 0.95, // OpenAI doesn't provide confidence, use estimated high value
        metadata: {
          processingTime,
          provider: 'openai-vision',
          model: this.config.model,
          tokensUsed: response.usage?.total_tokens,
          cost: this.calculateCost(response.usage?.total_tokens || 0),
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('OpenAI Vision OCR error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      });
      throw new Error(
        `OpenAI Vision OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Analyze image content with AI vision (beyond just text extraction)
   * Useful for understanding image context, objects, scenes
   */
  async analyzeImage(
    buffer: Buffer,
    contentType: string,
    prompt: string = 'Describe this image in detail.'
  ): Promise<{
    description: string;
    details: Record<string, any>;
  }> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Check OPENAI_API_KEY.');
    }

    // Validate buffer size before processing
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        `Image size exceeds maximum allowed size. Max: ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB, Actual: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB`
      );
    }

    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64Image}`;

    try {
      // Get circuit breaker for OpenAI
      const circuitBreaker = circuitBreakerRegistry.getBreaker('openai-vision', {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000,
      });

      // Wrap API call with circuit breaker and timeout protection
      const response = await circuitBreaker.execute(async () => {
        return Promise.race([
          this.openai.chat.completions.create({
            model: this.config.model,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: prompt,
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: dataUrl,
                      detail: 'high',
                    },
                  },
                ],
              },
            ],
            max_tokens: 1024,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`OpenAI API call timeout after ${API_TIMEOUT_MS / 1000}s`)),
              API_TIMEOUT_MS
            )
          ),
        ]);
      });

      const description = response.choices[0]?.message?.content || '';

      return {
        description,
        details: {
          model: this.config.model,
          tokensUsed: response.usage?.total_tokens,
          cost: this.calculateCost(response.usage?.total_tokens || 0),
        },
      };
    } catch (error) {
      logger.error('Image analysis error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Calculate approximate cost for OpenAI Vision API usage
   * Pricing as of 2024:
   * - gpt-4o: $2.50/1M input tokens, $10/1M output tokens
   * - gpt-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
   *
   * Note: OCR/Vision workloads are heavily input-weighted (image tokens)
   * with minimal output (extracted text), so we use 90/10 split
   */
  private calculateCost(totalTokens: number): number {
    const tokensInMillions = totalTokens / 1_000_000;

    if (this.config.model === 'gpt-4o') {
      // OCR workload: 90% input (image), 10% output (text)
      return tokensInMillions * (0.9 * 2.5 + 0.1 * 10);
    } else if (this.config.model === 'gpt-4o-mini') {
      // OCR workload: 90% input (image), 10% output (text)
      return tokensInMillions * (0.9 * 0.15 + 0.1 * 0.6);
    }

    return 0;
  }

  /**
   * Batch process multiple images with concurrency control
   * Useful for multi-page documents
   */
  async extractTextBatch(
    images: Array<{ buffer: Buffer; contentType: string }>,
    options: { concurrency?: number } = {}
  ): Promise<OCRResult[]> {
    const concurrency = options.concurrency || 3; // Process 3 images at a time by default
    const results: OCRResult[] = new Array(images.length);

    // Process images in concurrent batches
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);
      const batchPromises = batch.map(async (image, batchIdx) => {
        const resultIdx = i + batchIdx;
        try {
          // Handle placeholder text content (from failed page conversions)
          if (image.contentType === 'text/plain') {
            results[resultIdx] = {
              text: image.buffer.toString('utf-8'),
              confidence: 0,
              metadata: {
                processingTime: 0,
                provider: 'placeholder',
              },
            };
            return;
          }

          results[resultIdx] = await this.extractText(image.buffer, image.contentType);
        } catch (error) {
          logger.warn('Batch OCR: Image processing failed', {
            imageIndex: resultIdx,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue with other images even if one fails
          results[resultIdx] = {
            text: '[OCR failed for this image]',
            confidence: 0,
            metadata: {
              processingTime: 0,
              provider: this.config.provider,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          };
        }
      });

      // Wait for current batch to complete before processing next batch
      await Promise.all(batchPromises);
    }

    return results;
  }

  /**
   * Check if OCR service is properly configured
   */
  isConfigured(): boolean {
    if (this.config.provider === 'openai-vision') {
      return !!this.openai && !!this.config.openaiApiKey;
    }
    return false;
  }
}
