/**
 * Tesseract OCR Service
 * Provides offline OCR using Tesseract.js (TypeScript fallback for Python pytesseract)
 *
 * Features:
 * - Offline OCR (no API calls required)
 * - Multi-language support
 * - Confidence scoring
 * - Free and open source
 *
 * Note: Tesseract.js uses WASM and is slower than cloud APIs but doesn't require API keys
 */

import Tesseract from 'tesseract.js';
import type { OCRResult } from '@ai-workflow/document-converter';
import { logger } from '../../utils/logger';

export interface TesseractConfig {
  language?: string; // 'eng', 'fra', 'deu', etc. or 'eng+fra' for multiple
  oem?: number; // OCR Engine Mode (0-3)
  psm?: number; // Page Segmentation Mode (0-13)
}

export class TesseractOCR {
  private config: Required<TesseractConfig>;
  private worker: Tesseract.Worker | null = null;
  private isInitialized: boolean = false;

  constructor(config?: TesseractConfig) {
    this.config = {
      language: config?.language || 'eng',
      oem: config?.oem || 3, // Default: LSTM neural network
      psm: config?.psm || 3, // Default: Fully automatic page segmentation
    };

    logger.info('Tesseract OCR service created', {
      language: this.config.language,
    });
  }

  /**
   * Initialize Tesseract worker
   * This downloads language data and sets up the WASM worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('Tesseract worker already initialized');
      return;
    }

    try {
      logger.info('Initializing Tesseract worker', {
        language: this.config.language,
      });

      const startTime = Date.now();

      // Create worker
      this.worker = await Tesseract.createWorker(this.config.language, undefined, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.debug('Tesseract progress', {
              progress: Math.round(m.progress * 100),
            });
          }
        },
      });

      // Configure worker
      await this.worker.setParameters({
        tessedit_ocr_engine_mode: this.config.oem.toString(),
        tessedit_pageseg_mode: this.config.psm.toString(),
      });

      this.isInitialized = true;

      const initTime = Date.now() - startTime;
      logger.info('Tesseract worker initialized', {
        language: this.config.language,
        initTime,
      });
    } catch (error) {
      logger.error('Failed to initialize Tesseract worker', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Tesseract initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Terminate the Tesseract worker
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      logger.info('Tesseract worker terminated');
    }
  }

  /**
   * Check if Tesseract is available
   */
  isAvailable(): boolean {
    return true; // Tesseract.js is always available (offline)
  }

  /**
   * Extract text from image using Tesseract OCR
   */
  async extractText(buffer: Buffer, contentType: string = 'image/png'): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // Initialize if not already done
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.worker) {
        throw new Error('Tesseract worker not initialized');
      }

      logger.debug('Starting Tesseract OCR', {
        bufferSize: buffer.length,
        contentType,
        language: this.config.language,
      });

      // Perform OCR
      const result = await this.worker.recognize(buffer);

      const text = result.data.text;
      const confidence = result.data.confidence / 100; // Convert 0-100 to 0-1

      const processingTime = Date.now() - startTime;

      logger.info('Tesseract OCR completed', {
        textLength: text.length,
        confidence,
        processingTime,
        wordCount: result.data.words?.length || 0,
      });

      return {
        text,
        confidence,
        metadata: {
          provider: 'tesseract',
          processingTime,
          pagesProcessed: 1,
          language: this.config.language,
          wordCount: result.data.words?.length || 0,
          lineCount: result.data.lines?.length || 0,
        },
      };
    } catch (error) {
      logger.error('Tesseract OCR failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        bufferSize: buffer.length,
      });
      throw new Error(
        `Tesseract OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Process multiple images in batch
   */
  async extractTextBatch(
    buffers: Array<{ buffer: Buffer; contentType: string }>,
    options: { concurrency?: number } = {}
  ): Promise<OCRResult[]> {
    // Initialize if not already done
    if (!this.isInitialized) {
      await this.initialize();
    }

    const concurrency = options.concurrency || 1; // Tesseract is CPU-intensive, limit concurrency

    logger.info('Starting Tesseract batch processing', {
      imageCount: buffers.length,
      concurrency,
    });

    const results: OCRResult[] = [];

    // Process in batches
    for (let i = 0; i < buffers.length; i += concurrency) {
      const batch = buffers.slice(i, i + concurrency);

      const batchPromises = batch.map(({ buffer, contentType }) =>
        this.extractText(buffer, contentType)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      logger.debug('Batch processed', {
        batchNumber: Math.floor(i / concurrency) + 1,
        processed: results.length,
        total: buffers.length,
      });
    }

    logger.info('Tesseract batch processing completed', {
      totalImages: buffers.length,
      successCount: results.filter((r) => r.text.length > 0).length,
    });

    return results;
  }

  /**
   * Get detailed OCR result with bounding boxes
   */
  async extractDetailedText(
    buffer: Buffer
  ): Promise<{
    text: string;
    words: Array<{
      text: string;
      confidence: number;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }>;
    lines: Array<{
      text: string;
      confidence: number;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }>;
  }> {
    // Initialize if not already done
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('Tesseract worker not initialized');
    }

    try {
      logger.debug('Starting Tesseract detailed OCR');

      const result = await this.worker.recognize(buffer);

      const text = result.data.text;

      // Extract words with bounding boxes
      const words = (result.data.words || []).map((word) => ({
        text: word.text,
        confidence: word.confidence / 100,
        bbox: word.bbox,
      }));

      // Extract lines with bounding boxes
      const lines = (result.data.lines || []).map((line) => ({
        text: line.text,
        confidence: line.confidence / 100,
        bbox: line.bbox,
      }));

      logger.info('Tesseract detailed OCR completed', {
        textLength: text.length,
        wordCount: words.length,
        lineCount: lines.length,
      });

      return { text, words, lines };
    } catch (error) {
      logger.error('Tesseract detailed OCR failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Detect text rotation angle
   */
  async detectRotation(buffer: Buffer): Promise<number> {
    // Initialize if not already done
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('Tesseract worker not initialized');
    }

    try {
      const result = await this.worker.detect(buffer);
      const rotation = result.data.orientation_degrees || 0;

      logger.debug('Rotation detected', { rotation });

      return rotation;
    } catch (error) {
      logger.error('Rotation detection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0; // Default to no rotation
    }
  }

  /**
   * Change OCR language
   */
  async setLanguage(language: string): Promise<void> {
    // Terminate existing worker
    await this.terminate();

    // Update config
    this.config.language = language;

    // Reinitialize with new language
    await this.initialize();

    logger.info('Tesseract language changed', { language });
  }

  /**
   * Set page segmentation mode
   * Modes:
   * 0 = Orientation and script detection (OSD) only
   * 1 = Automatic page segmentation with OSD
   * 3 = Fully automatic page segmentation (default)
   * 4 = Single column of text
   * 6 = Single uniform block of text
   * 7 = Single text line
   * 11 = Sparse text (find as much text as possible)
   * 13 = Raw line (treat image as single text line)
   */
  async setPageSegmentationMode(psm: number): Promise<void> {
    if (psm < 0 || psm > 13) {
      throw new Error('PSM must be between 0 and 13');
    }

    this.config.psm = psm;

    if (this.worker) {
      await this.worker.setParameters({
        tessedit_pageseg_mode: psm.toString(),
      });

      logger.info('Page segmentation mode updated', { psm });
    }
  }

  /**
   * Extract text with automatic rotation correction
   */
  async extractTextWithRotationCorrection(
    buffer: Buffer,
    contentType: string = 'image/png'
  ): Promise<OCRResult> {
    try {
      // Detect rotation first
      const rotation = await this.detectRotation(buffer);

      if (rotation !== 0 && rotation !== 360) {
        logger.info('Applying rotation correction', { rotation });

        // Import ImageUtils for rotation
        const { ImageUtils } = await import('./ImageUtils');
        const correctedBuffer = await ImageUtils.rotate(buffer, -rotation);

        // Perform OCR on corrected image
        return await this.extractText(correctedBuffer, contentType);
      }

      // No rotation needed
      return await this.extractText(buffer, contentType);
    } catch (error) {
      logger.error('OCR with rotation correction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
