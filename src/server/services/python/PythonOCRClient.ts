/**
 * Python OCR Service Client
 *
 * Connects to Python microservice for high-performance PDF/image processing.
 * Falls back to TypeScript implementation if Python service unavailable.
 *
 * Features:
 * - Circuit breaker pattern for fast failure
 * - Periodic health checks with auto-recovery
 * - Configurable via environment variables
 * - Detailed error logging for debugging
 */

import { logger } from '../../utils/logger';
import { CircuitBreaker } from '../../utils/CircuitBreaker';

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

export interface PythonPageImage {
  pageNumber: number;
  imageData: string; // base64
  contentType: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: string;
}

export interface PythonPdfToImagesResult {
  pages: PythonPageImage[];
  totalPages: number;
  processingTime: number;
}

export interface PythonImageConvertResult {
  imageData: string; // base64
  contentType: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: string;
  processingTime: number;
}

export class PythonOCRClient {
  private baseUrl: string;
  private timeout: number;
  private available: boolean = false;
  private circuitBreaker: CircuitBreaker;
  private healthCheckInterval?: NodeJS.Timeout;
  private forceDisabled: boolean;

  constructor(
    baseUrl: string = process.env.PYTHON_OCR_URL || 'http://localhost:8000',
    timeout: number = parseInt(process.env.PYTHON_TIMEOUT_MS || '30000', 10)
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.forceDisabled = process.env.FORCE_TYPESCRIPT_MODE === 'true';

    // Circuit breaker protects against repeated failures
    this.circuitBreaker = new CircuitBreaker({
      name: 'python-ocr-service',
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
    });

    if (this.forceDisabled) {
      logger.warn('Python OCR service DISABLED by FORCE_TYPESCRIPT_MODE environment variable');
      this.available = false;
      return;
    }

    // Initial health check
    this.checkAvailability();

    // Periodic health checks every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkAvailability();
    }, 30000);
  }

  /**
   * Check if Python service is available
   */
  private async checkAvailability(): Promise<void> {
    if (this.forceDisabled) {
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      const wasAvailable = this.available;
      this.available = response.ok;

      // Log state changes only
      if (!wasAvailable && this.available) {
        logger.info('Python OCR service recovered', {
          url: this.baseUrl,
          circuitState: this.circuitBreaker.getState(),
        });
      } else if (wasAvailable && !this.available) {
        logger.warn('Python OCR service went down', {
          url: this.baseUrl,
          status: response.status,
          circuitState: this.circuitBreaker.getState(),
        });
      } else if (!this.available) {
        // Only log at debug level if still unavailable
        logger.debug('Python OCR service health check failed', {
          status: response.status,
        });
      }
    } catch (error) {
      const wasAvailable = this.available;
      this.available = false;

      // Only log state changes
      if (wasAvailable) {
        logger.warn('Python OCR service became unavailable', {
          error: error instanceof Error ? error.message : 'Unknown error',
          url: this.baseUrl,
          circuitState: this.circuitBreaker.getState(),
        });
      }
    }
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return !this.forceDisabled && this.available && this.circuitBreaker.getState() !== 'OPEN';
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      available: this.available,
      forceDisabled: this.forceDisabled,
      baseUrl: this.baseUrl,
      circuitBreaker: this.circuitBreaker.getStats(),
    };
  }

  /**
   * Cleanup resources (stop health check interval)
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
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
    if (!this.isAvailable()) {
      const reason = this.forceDisabled
        ? 'FORCE_TYPESCRIPT_MODE enabled'
        : this.circuitBreaker.getState() === 'OPEN'
          ? 'circuit breaker is OPEN'
          : 'service not available';

      throw new Error(`Python OCR service unavailable: ${reason}`);
    }

    return this.circuitBreaker.execute(async () => {
      const startTime = Date.now();

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
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        const totalTime = Date.now() - startTime;

        logger.info('PDF processed by Python service', {
          pages: result.metadata.pages,
          textLength: result.text.length,
          pythonProcessingTime: result.metadata.processing_time,
          totalRequestTime: totalTime,
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const totalTime = Date.now() - startTime;

        logger.error('Python PDF extraction failed', {
          error: errorMessage,
          pdfSize: pdfBuffer.length,
          totalRequestTime: totalTime,
          url: `${this.baseUrl}/api/pdf/extract`,
          timeout: this.timeout,
          options,
        });

        throw error;
      }
    });
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

  /**
   * Convert PDF pages to images (2-10x faster than pdf2pic)
   */
  async extractPdfPagesToImages(
    pdfBuffer: Buffer,
    options: {
      dpi?: number;
      format?: string;
      maxWidth?: number;
      maxHeight?: number;
    } = {}
  ): Promise<PythonPdfToImagesResult> {
    if (!this.available) {
      throw new Error('Python OCR service not available');
    }

    try {
      const base64Data = pdfBuffer.toString('base64');

      const response = await fetch(`${this.baseUrl}/api/pdf/extract-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdf_data: base64Data,
          dpi: options.dpi || 200,
          format: options.format || 'png',
          max_width: options.maxWidth || 2000,
          max_height: options.maxHeight || 2000,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      logger.info('PDF to images conversion by Python service', {
        totalPages: result.total_pages,
        processingTime: result.processing_time_ms,
      });

      return {
        pages: result.pages.map((page: any) => ({
          pageNumber: page.page_number,
          imageData: page.image_data,
          contentType: page.content_type,
          width: page.width,
          height: page.height,
          sizeBytes: page.size_bytes,
          format: page.format,
        })),
        totalPages: result.total_pages,
        processingTime: result.processing_time_ms,
      };
    } catch (error) {
      logger.error('Python PDF to images conversion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Convert or resize an image
   */
  async convertImage(
    imageBuffer: Buffer,
    options: {
      outputFormat?: string;
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
    } = {}
  ): Promise<PythonImageConvertResult> {
    // Try Python service first
    if (this.available) {
      try {
        const startTime = Date.now();
        const base64Data = imageBuffer.toString('base64');

        const response = await fetch(`${this.baseUrl}/api/images/convert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_data: base64Data,
            output_format: options.outputFormat || 'png',
            max_width: options.maxWidth,
            max_height: options.maxHeight,
            quality: options.quality || 95,
          }),
          signal: AbortSignal.timeout(this.timeout),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Python service error: ${response.status} - ${error}`);
        }

        const result = await response.json();

        logger.info('Image conversion by Python service', {
          format: result.format,
          dimensions: `${result.width}x${result.height}`,
          sizeBytes: result.size_bytes,
          processingTime: result.processing_time_ms,
        });

        return {
          imageData: result.image_data,
          contentType: result.content_type,
          width: result.width,
          height: result.height,
          sizeBytes: result.size_bytes,
          format: result.format,
          processingTime: result.processing_time_ms,
        };
      } catch (error) {
        logger.warn('Python image conversion failed, falling back to TypeScript sharp', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Fall through to TypeScript fallback
      }
    }

    // Fallback to TypeScript ImageUtils (sharp)
    try {
      const { ImageUtils } = await import('../image/ImageUtils');
      const startTime = Date.now();

      logger.debug('Using TypeScript sharp for image conversion');

      // Convert image using sharp
      const convertedBuffer = await ImageUtils.convert(imageBuffer, {
        format: options.outputFormat as any,
        quality: options.quality || 95,
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
      });

      // Get image info
      const info = await ImageUtils.getInfo(convertedBuffer);
      const processingTime = Date.now() - startTime;

      logger.info('Image conversion by TypeScript sharp', {
        format: info.format,
        dimensions: `${info.width}x${info.height}`,
        sizeBytes: info.size,
        processingTime,
      });

      return {
        imageData: convertedBuffer.toString('base64'),
        contentType: `image/${info.format}`,
        width: info.width,
        height: info.height,
        sizeBytes: info.size,
        format: info.format,
        processingTime,
      };
    } catch (error) {
      logger.error('Image conversion failed (both Python and TypeScript)', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Image conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Singleton instance
export const pythonOCRClient = new PythonOCRClient();
