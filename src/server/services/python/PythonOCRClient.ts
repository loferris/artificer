/**
 * Python OCR Service Client
 *
 * Connects to Python microservice for high-performance PDF/image processing.
 * Falls back to TypeScript implementation if Python service unavailable.
 */

import { logger } from '../../utils/logger';

export interface PythonPDFResult {
  text: string;
  metadata: {
    pages: number;
    method: string;
    hasTextContent: boolean;
    processingTime: number;
    title?: string;
    author?: string;
    creator?: string;
  };
}

export interface PythonOCRCheckResult {
  needsOCR: boolean;
  hasTextContent: boolean;
  pages: number;
  textLength: number;
  avgTextPerPage: number;
  estimatedOCRCost: number;
}

export interface PythonOCRResult {
  text: string;
  confidence: number;
  metadata: {
    processingTime: number;
    provider: string;
    model: string;
    tokensUsed: number;
    cost: number;
  };
}

export class PythonOCRClient {
  private baseUrl: string;
  private timeout: number;
  private available: boolean = false;

  constructor(
    baseUrl: string = process.env.PYTHON_OCR_URL || 'http://localhost:8000',
    timeout: number = 30000
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;

    // Check availability on startup
    this.checkAvailability();
  }

  /**
   * Check if Python service is available
   */
  private async checkAvailability(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        this.available = true;
        logger.info('Python OCR service is available', { url: this.baseUrl });
      } else {
        this.available = false;
        logger.warn('Python OCR service returned non-OK status', {
          status: response.status,
          url: this.baseUrl
        });
      }
    } catch (error) {
      this.available = false;
      logger.warn('Python OCR service not available', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: this.baseUrl
      });
    }
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.available;
  }

  /**
   * Extract text from PDF (10-20x faster than TypeScript)
   */
  async extractPdfText(
    pdfBuffer: Buffer,
    options: {
      forceOCR?: boolean;
      minTextThreshold?: number;
    } = {}
  ): Promise<PythonPDFResult> {
    if (!this.available) {
      throw new Error('Python OCR service not available');
    }

    try {
      const base64Data = pdfBuffer.toString('base64');

      const response = await fetch(`${this.baseUrl}/api/pdf/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdf_data: base64Data,
          force_ocr: options.forceOCR || false,
          min_text_threshold: options.minTextThreshold || 100,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      logger.info('PDF processed by Python service', {
        pages: result.metadata.pages,
        textLength: result.text.length,
        processingTime: result.metadata.processingTime,
        method: result.metadata.method,
      });

      return {
        text: result.text,
        metadata: {
          pages: result.metadata.pages,
          method: result.metadata.method,
          hasTextContent: result.metadata.has_text_content,
          processingTime: result.metadata.processing_time,
          title: result.metadata.title,
          author: result.metadata.author,
          creator: result.metadata.creator,
        },
      };
    } catch (error) {
      logger.error('Python PDF extraction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if PDF needs OCR
   */
  async checkPdfNeedsOCR(
    pdfBuffer: Buffer,
    minTextThreshold: number = 100
  ): Promise<PythonOCRCheckResult> {
    if (!this.available) {
      throw new Error('Python OCR service not available');
    }

    try {
      const base64Data = pdfBuffer.toString('base64');

      const response = await fetch(`${this.baseUrl}/api/pdf/check-needs-ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdf_data: base64Data,
          min_text_threshold: minTextThreshold,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      return {
        needsOCR: result.needs_ocr,
        hasTextContent: result.has_text_content,
        pages: result.pages,
        textLength: result.text_length,
        avgTextPerPage: result.avg_text_per_page,
        estimatedOCRCost: result.estimated_ocr_cost,
      };
    } catch (error) {
      logger.error('Python OCR check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Extract text from image
   */
  async extractImageText(
    imageBuffer: Buffer,
    contentType: string = 'image/png'
  ): Promise<PythonOCRResult> {
    if (!this.available) {
      throw new Error('Python OCR service not available');
    }

    try {
      const base64Data = imageBuffer.toString('base64');

      const response = await fetch(`${this.baseUrl}/api/images/extract-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: base64Data,
          content_type: contentType,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      logger.info('Image OCR by Python service', {
        textLength: result.text.length,
        confidence: result.confidence,
        provider: result.metadata.provider,
        processingTime: result.metadata.processing_time,
      });

      return {
        text: result.text,
        confidence: result.confidence,
        metadata: {
          processingTime: result.metadata.processing_time,
          provider: result.metadata.provider,
          model: result.metadata.model,
          tokensUsed: result.metadata.tokens_used,
          cost: result.metadata.cost,
        },
      };
    } catch (error) {
      logger.error('Python image OCR failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

// Singleton instance
export const pythonOCRClient = new PythonOCRClient();
