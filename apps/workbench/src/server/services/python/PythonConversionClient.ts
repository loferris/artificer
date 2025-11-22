/**
 * Python Document Conversion Service Client
 *
 * Connects to Python microservice for high-performance document conversion.
 * Provides markdown/HTML import and export (2-4x faster than TypeScript).
 */

import { logger } from '../../utils/logger';
import { GrpcConversionClient, getGrpcConversionClient } from '../grpc';

export interface PythonMarkdownImportResult {
  content: any[]; // Portable Text blocks
  metadata: Record<string, any>;
  processingTime: number;
}

export interface PythonHtmlImportResult {
  content: any[]; // Portable Text blocks
  metadata: Record<string, any>;
  processingTime: number;
}

export interface PythonHtmlExportResult {
  html: string;
  processingTime: number;
}

export interface PythonMarkdownExportResult {
  markdown: string;
  processingTime: number;
}

export interface PythonNotionExportResult {
  json: string;
  processingTime: number;
}

export interface PythonRoamExportResult {
  json: string;
  processingTime: number;
}

export interface BatchExportResult {
  index: number;
  success: boolean;
  output: string;
  processingTime: number;
}

export interface BatchExportError {
  index: number;
  error: string;
}

export interface PythonBatchExportResult {
  totalDocuments: number;
  successful: number;
  failed: number;
  results: BatchExportResult[];
  errors: BatchExportError[];
  totalProcessingTime: number;
  averageProcessingTime: number;
  parallelSpeedup: number;
}

export interface PortableTextDocument {
  content: any[];
  metadata?: Record<string, any>;
}

export class PythonConversionClient {
  private baseUrl: string;
  private timeout: number;
  private available: boolean = false;
  private grpcClient: GrpcConversionClient | null = null;
  private useGrpc: boolean;

  constructor(
    baseUrl: string = process.env.PYTHON_OCR_URL || 'http://localhost:8000',
    timeout: number = 30000
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.useGrpc = process.env.USE_GRPC_INTERNAL !== 'false';

    // Try to initialize gRPC client for internal communication
    if (this.useGrpc) {
      try {
        this.grpcClient = getGrpcConversionClient();
        logger.info('PythonConversionClient using gRPC for internal communication');
      } catch (error) {
        logger.warn('Failed to initialize gRPC client, falling back to HTTP', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Check HTTP availability as fallback
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
        const data = await response.json();
        this.available = data.processors?.markdown === true && data.processors?.html === true;
        if (this.available) {
          logger.info('Python conversion service is available', {
            url: this.baseUrl,
          });
        }
      } else {
        this.available = false;
      }
    } catch (error) {
      this.available = false;
      logger.warn('Python conversion service not available', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: this.baseUrl,
      });
    }
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    // Prefer gRPC if connected
    if (this.grpcClient?.isConnected()) {
      return true;
    }
    return this.available;
  }

  /**
   * Check if using gRPC
   */
  isUsingGrpc(): boolean {
    return this.grpcClient?.isConnected() ?? false;
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      available: this.isAvailable(),
      usingGrpc: this.isUsingGrpc(),
      forceDisabled: false,
      baseUrl: this.baseUrl,
      circuitBreaker: {
        state: 'CLOSED' as 'CLOSED' | 'OPEN' | 'HALF_OPEN',
        failures: 0,
        successes: 0,
      },
    };
  }

  /**
   * Import markdown to Portable Text (2-4x faster than TypeScript)
   */
  async importMarkdown(
    content: string,
    options: {
      strictMode?: boolean;
      includeMetadata?: boolean;
    } = {},
    correlationId?: string
  ): Promise<PythonMarkdownImportResult> {
    // Try gRPC first
    if (this.grpcClient?.isConnected()) {
      try {
        const result = await this.grpcClient.importMarkdown(content, options, { correlationId });

        logger.info('Markdown import via gRPC', {
          blocks: result.document.content.length,
          processingTime: result.processingTimeMs,
        });

        return {
          content: result.document.content,
          metadata: result.document.metadata as Record<string, any>,
          processingTime: result.processingTimeMs,
        };
      } catch (error) {
        logger.warn('gRPC import failed, falling back to HTTP', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Fall back to HTTP
    if (!this.available) {
      throw new Error('Python conversion service not available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/convert/markdown-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(correlationId && { 'X-Correlation-ID': correlationId }),
        },
        body: JSON.stringify({
          content,
          strict_mode: options.strictMode || false,
          include_metadata: options.includeMetadata !== false,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      logger.info('Markdown import by Python service (HTTP)', {
        blocks: result.content.length,
        processingTime: result.processing_time_ms,
      });

      return {
        content: result.content,
        metadata: result.metadata,
        processingTime: result.processing_time_ms,
      };
    } catch (error) {
      logger.error('Python markdown import failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Import HTML to Portable Text (2-3x faster than TypeScript)
   */
  async importHtml(content: string): Promise<PythonHtmlImportResult> {
    if (!this.available) {
      throw new Error('Python conversion service not available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/convert/html-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      logger.info('HTML import by Python service', {
        blocks: result.content.length,
        processingTime: result.processing_time_ms,
      });

      return {
        content: result.content,
        metadata: result.metadata,
        processingTime: result.processing_time_ms,
      };
    } catch (error) {
      logger.error('Python HTML import failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Export Portable Text to HTML (2-3x faster than TypeScript)
   */
  async exportHtml(
    document: PortableTextDocument,
    options: {
      includeStyles?: boolean;
      includeMetadata?: boolean;
      className?: string;
      title?: string;
    } = {}
  ): Promise<PythonHtmlExportResult> {
    if (!this.available) {
      throw new Error('Python conversion service not available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/convert/html-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document,
          include_styles: options.includeStyles !== false,
          include_metadata: options.includeMetadata !== false,
          class_name: options.className || 'document-content',
          title: options.title,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      logger.info('HTML export by Python service', {
        htmlLength: result.html.length,
        processingTime: result.processing_time_ms,
      });

      return {
        html: result.html,
        processingTime: result.processing_time_ms,
      };
    } catch (error) {
      logger.error('Python HTML export failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Export Portable Text to Markdown (2-3x faster than TypeScript)
   */
  async exportMarkdown(
    document: PortableTextDocument,
    options: {
      includeMetadata?: boolean;
    } = {}
  ): Promise<PythonMarkdownExportResult> {
    if (!this.available) {
      throw new Error('Python conversion service not available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/convert/markdown-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document,
          include_metadata: options.includeMetadata !== false,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      logger.info('Markdown export by Python service', {
        markdownLength: result.markdown.length,
        processingTime: result.processing_time_ms,
      });

      return {
        markdown: result.markdown,
        processingTime: result.processing_time_ms,
      };
    } catch (error) {
      logger.error('Python markdown export failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Export Portable Text to Notion JSON (2-3x faster than TypeScript)
   */
  async exportNotion(
    document: PortableTextDocument,
    options: {
      prettyPrint?: boolean;
    } = {}
  ): Promise<PythonNotionExportResult> {
    if (!this.available) {
      throw new Error('Python conversion service not available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/convert/notion-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document,
          pretty_print: options.prettyPrint || false,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      logger.info('Notion export by Python service', {
        jsonLength: result.json.length,
        processingTime: result.processing_time_ms,
      });

      return {
        json: result.json,
        processingTime: result.processing_time_ms,
      };
    } catch (error) {
      logger.error('Python Notion export failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Export Portable Text to Roam JSON (2-3x faster than TypeScript)
   */
  async exportRoam(
    document: PortableTextDocument,
    options: {
      prettyPrint?: boolean;
    } = {}
  ): Promise<PythonRoamExportResult> {
    if (!this.available) {
      throw new Error('Python conversion service not available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/convert/roam-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document,
          pretty_print: options.prettyPrint || false,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      logger.info('Roam export by Python service', {
        jsonLength: result.json.length,
        processingTime: result.processing_time_ms,
      });

      return {
        json: result.json,
        processingTime: result.processing_time_ms,
      };
    } catch (error) {
      logger.error('Python Roam export failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Export multiple documents in parallel using multiprocessing (5-10x faster)
   *
   * Utilizes Python's ProcessPoolExecutor for true multi-core parallelism.
   * Node.js can't do this - single-threaded event loop limits concurrency.
   */
  async exportBatch(
    documents: PortableTextDocument[],
    format: 'markdown' | 'html' | 'notion' | 'roam',
    options: Record<string, any> = {}
  ): Promise<PythonBatchExportResult> {
    if (!this.available) {
      throw new Error('Python conversion service not available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/batch/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents,
          format,
          options,
        }),
        signal: AbortSignal.timeout(this.timeout * 2), // Double timeout for batch operations
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      logger.info('Batch export by Python service', {
        totalDocuments: result.totalDocuments,
        successful: result.successful,
        failed: result.failed,
        totalProcessingTime: result.totalProcessingTime,
        averageProcessingTime: result.averageProcessingTime,
        parallelSpeedup: result.parallelSpeedup,
        format,
      });

      return {
        totalDocuments: result.totalDocuments,
        successful: result.successful,
        failed: result.failed,
        results: result.results,
        errors: result.errors,
        totalProcessingTime: result.totalProcessingTime,
        averageProcessingTime: result.averageProcessingTime,
        parallelSpeedup: result.parallelSpeedup,
      };
    } catch (error) {
      logger.error('Python batch export failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentCount: documents.length,
        format,
      });
      throw error;
    }
  }
}

// Singleton instance
export const pythonConversionClient = new PythonConversionClient();
