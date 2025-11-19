/**
 * Google Vision OCR Service
 * Provides OCR using Google Cloud Vision API (TypeScript fallback for Python implementation)
 *
 * Features:
 * - Text detection and extraction
 * - Document text detection (better for dense text)
 * - Confidence scoring
 * - Batch processing support
 */

import vision from '@google-cloud/vision';
import type { OCRResult } from '@ai-workflow/document-converter';
import { logger } from '../../utils/logger';

export interface GoogleVisionConfig {
  keyFilename?: string;
  projectId?: string;
  credentials?: {
    client_email: string;
    private_key: string;
  };
}

export class GoogleVisionOCR {
  private client: vision.ImageAnnotatorClient;
  private isConfigured: boolean = false;

  constructor(config?: GoogleVisionConfig) {
    try {
      // Initialize client with config or environment variables
      if (config) {
        this.client = new vision.ImageAnnotatorClient(config);
        this.isConfigured = true;
      } else {
        // Try to use environment variables
        // GOOGLE_APPLICATION_CREDENTIALS should point to a key file
        this.client = new vision.ImageAnnotatorClient();
        this.isConfigured = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }

      if (this.isConfigured) {
        logger.info('Google Vision OCR client initialized');
      } else {
        logger.warn('Google Vision OCR not configured (no credentials provided)');
      }
    } catch (error) {
      logger.error('Failed to initialize Google Vision client', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.isConfigured = false;
      // Create a dummy client to avoid null checks
      this.client = new vision.ImageAnnotatorClient();
    }
  }

  /**
   * Check if Google Vision is available
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Extract text from image using Google Vision API
   * Uses TEXT_DETECTION for general text in images
   */
  async extractText(buffer: Buffer, contentType: string = 'image/png'): Promise<OCRResult> {
    if (!this.isConfigured) {
      throw new Error(
        'Google Vision OCR is not configured. Set GOOGLE_APPLICATION_CREDENTIALS or provide credentials.'
      );
    }

    const startTime = Date.now();

    try {
      logger.debug('Starting Google Vision text detection', {
        bufferSize: buffer.length,
        contentType,
      });

      // Perform text detection
      const [result] = await this.client.textDetection({
        image: { content: buffer },
      });

      const detections = result.textAnnotations || [];

      if (detections.length === 0) {
        logger.warn('Google Vision found no text in image');
        return {
          text: '',
          confidence: 0,
          metadata: {
            provider: 'google-vision',
            processingTime: Date.now() - startTime,
            pagesProcessed: 1,
          },
        };
      }

      // First annotation contains all detected text
      const fullText = detections[0]?.description || '';

      // Calculate average confidence from all detections
      const confidences = detections
        .slice(1) // Skip first (full text annotation)
        .map((d) => d.confidence || 0)
        .filter((c) => c > 0);

      const avgConfidence =
        confidences.length > 0
          ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
          : 0.5; // Default if no confidence scores

      const processingTime = Date.now() - startTime;

      logger.info('Google Vision text detection completed', {
        textLength: fullText.length,
        confidence: avgConfidence,
        processingTime,
      });

      return {
        text: fullText,
        confidence: avgConfidence,
        metadata: {
          provider: 'google-vision',
          processingTime,
          pagesProcessed: 1,
          detectionCount: detections.length - 1,
        },
      };
    } catch (error) {
      logger.error('Google Vision text detection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        bufferSize: buffer.length,
      });
      throw new Error(
        `Google Vision OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract text from document using Google Vision API
   * Uses DOCUMENT_TEXT_DETECTION for better results on documents
   */
  async extractDocumentText(
    buffer: Buffer,
    contentType: string = 'image/png'
  ): Promise<OCRResult> {
    if (!this.isConfigured) {
      throw new Error(
        'Google Vision OCR is not configured. Set GOOGLE_APPLICATION_CREDENTIALS or provide credentials.'
      );
    }

    const startTime = Date.now();

    try {
      logger.debug('Starting Google Vision document text detection', {
        bufferSize: buffer.length,
        contentType,
      });

      // Perform document text detection (better for dense text)
      const [result] = await this.client.documentTextDetection({
        image: { content: buffer },
      });

      const fullTextAnnotation = result.fullTextAnnotation;

      if (!fullTextAnnotation || !fullTextAnnotation.text) {
        logger.warn('Google Vision found no text in document');
        return {
          text: '',
          confidence: 0,
          metadata: {
            provider: 'google-vision-document',
            processingTime: Date.now() - startTime,
            pagesProcessed: 1,
          },
        };
      }

      const text = fullTextAnnotation.text;

      // Calculate average confidence from pages
      const pages = fullTextAnnotation.pages || [];
      const confidences = pages.map((p) => p.confidence || 0).filter((c) => c > 0);

      const avgConfidence =
        confidences.length > 0
          ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
          : 0.8; // Default higher for document detection

      const processingTime = Date.now() - startTime;

      logger.info('Google Vision document text detection completed', {
        textLength: text.length,
        confidence: avgConfidence,
        processingTime,
        pageCount: pages.length,
      });

      return {
        text,
        confidence: avgConfidence,
        metadata: {
          provider: 'google-vision-document',
          processingTime,
          pagesProcessed: pages.length,
        },
      };
    } catch (error) {
      logger.error('Google Vision document text detection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        bufferSize: buffer.length,
      });
      throw new Error(
        `Google Vision document OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Process multiple images in batch
   * Note: Google Vision batch API is more complex, this does parallel processing
   */
  async extractTextBatch(
    buffers: Array<{ buffer: Buffer; contentType: string }>,
    options: { concurrency?: number; useDocumentDetection?: boolean } = {}
  ): Promise<OCRResult[]> {
    if (!this.isConfigured) {
      throw new Error(
        'Google Vision OCR is not configured. Set GOOGLE_APPLICATION_CREDENTIALS or provide credentials.'
      );
    }

    const concurrency = options.concurrency || 5;
    const useDocumentDetection = options.useDocumentDetection || false;

    logger.info('Starting Google Vision batch processing', {
      imageCount: buffers.length,
      concurrency,
      useDocumentDetection,
    });

    const results: OCRResult[] = [];

    // Process in batches to respect API rate limits
    for (let i = 0; i < buffers.length; i += concurrency) {
      const batch = buffers.slice(i, i + concurrency);

      const batchPromises = batch.map(({ buffer, contentType }) =>
        useDocumentDetection
          ? this.extractDocumentText(buffer, contentType)
          : this.extractText(buffer, contentType)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      logger.debug('Batch processed', {
        batchNumber: Math.floor(i / concurrency) + 1,
        processed: results.length,
        total: buffers.length,
      });
    }

    logger.info('Google Vision batch processing completed', {
      totalImages: buffers.length,
      successCount: results.filter((r) => r.text.length > 0).length,
    });

    return results;
  }

  /**
   * Detect language in image text
   */
  async detectLanguage(buffer: Buffer): Promise<string[]> {
    if (!this.isConfigured) {
      throw new Error('Google Vision OCR is not configured');
    }

    try {
      const [result] = await this.client.textDetection({
        image: { content: buffer },
      });

      const detections = result.textAnnotations || [];
      if (detections.length === 0) {
        return [];
      }

      // Get detected languages from first annotation
      const firstDetection = detections[0];
      const languages =
        firstDetection?.locale ? [firstDetection.locale] : [];

      return languages;
    } catch (error) {
      logger.error('Language detection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Get detailed OCR result with bounding boxes and structure
   */
  async extractDetailedText(
    buffer: Buffer
  ): Promise<{
    text: string;
    blocks: Array<{
      text: string;
      confidence: number;
      boundingBox: { x: number; y: number; width: number; height: number };
    }>;
  }> {
    if (!this.isConfigured) {
      throw new Error('Google Vision OCR is not configured');
    }

    try {
      const [result] = await this.client.documentTextDetection({
        image: { content: buffer },
      });

      const fullTextAnnotation = result.fullTextAnnotation;

      if (!fullTextAnnotation) {
        return { text: '', blocks: [] };
      }

      const text = fullTextAnnotation.text || '';
      const blocks: Array<{
        text: string;
        confidence: number;
        boundingBox: { x: number; y: number; width: number; height: number };
      }> = [];

      // Extract blocks with bounding boxes
      for (const page of fullTextAnnotation.pages || []) {
        for (const block of page.blocks || []) {
          const vertices = block.boundingBox?.vertices || [];
          if (vertices.length >= 4) {
            const minX = Math.min(...vertices.map((v) => v.x || 0));
            const minY = Math.min(...vertices.map((v) => v.y || 0));
            const maxX = Math.max(...vertices.map((v) => v.x || 0));
            const maxY = Math.max(...vertices.map((v) => v.y || 0));

            // Extract text from block
            const blockText = (block.paragraphs || [])
              .map((p) =>
                (p.words || [])
                  .map((w) =>
                    (w.symbols || [])
                      .map((s) => s.text || '')
                      .join('')
                  )
                  .join(' ')
              )
              .join('\n');

            blocks.push({
              text: blockText,
              confidence: block.confidence || 0,
              boundingBox: {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
              },
            });
          }
        }
      }

      return { text, blocks };
    } catch (error) {
      logger.error('Detailed text extraction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
