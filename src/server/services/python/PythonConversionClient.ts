/**
 * Python Document Conversion Service Client
 *
 * Connects to Python microservice for high-performance document conversion.
 * Provides markdown/HTML import and export (2-4x faster than TypeScript).
 */

import { logger } from '../../utils/logger';

export interface PythonMarkdownImportResult {
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

export interface PortableTextDocument {
  content: any[];
  metadata?: Record<string, any>;
}

export class PythonConversionClient {
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
    return this.available;
  }

  /**
   * Import markdown to Portable Text (2-4x faster than TypeScript)
   */
  async importMarkdown(
    content: string,
    options: {
      strictMode?: boolean;
      includeMetadata?: boolean;
    } = {}
  ): Promise<PythonMarkdownImportResult> {
    if (!this.available) {
      throw new Error('Python conversion service not available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/convert/markdown-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

      logger.info('Markdown import by Python service', {
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
}

// Singleton instance
export const pythonConversionClient = new PythonConversionClient();
