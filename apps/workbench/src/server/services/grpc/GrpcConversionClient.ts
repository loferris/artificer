/**
 * gRPC Document Conversion Client
 *
 * Connects to Python conversion service via gRPC for internal communication.
 * Replaces HTTP-based PythonConversionClient for better performance.
 */

import { GrpcClient, CallMetadata } from './GrpcClient';
import { logger } from '../../utils/logger';

// Response types matching the proto definitions
export interface PortableTextDocument {
  content: any[];
  metadata: Record<string, string>;
}

export interface ImportMarkdownResponse {
  document: PortableTextDocument;
  processingTimeMs: number;
}

export interface ImportHTMLResponse {
  document: PortableTextDocument;
  processingTimeMs: number;
}

export interface ExportHTMLResponse {
  html: string;
  processingTimeMs: number;
}

export interface ExportMarkdownResponse {
  markdown: string;
  processingTimeMs: number;
}

export interface ExportNotionResponse {
  json: string;
  processingTimeMs: number;
}

export interface ExportRoamResponse {
  json: string;
  processingTimeMs: number;
}

export interface BatchExportResult {
  index: number;
  success: boolean;
  output: string;
  processingTimeMs: number;
  error: string;
  summary?: {
    totalDocuments: number;
    successful: number;
    failed: number;
    totalProcessingTimeMs: number;
    averageProcessingTimeMs: number;
    parallelSpeedup: number;
  };
}

export class GrpcConversionClient extends GrpcClient {
  constructor() {
    super({
      serviceId: 'conversion',
      protoPath: 'proto/artificer/conversion_service.proto',
      packageName: 'artificer',
      serviceName: 'ConversionService',
    });
  }

  /**
   * Import markdown to Portable Text
   */
  async importMarkdown(
    content: string,
    options?: {
      strictMode?: boolean;
      includeMetadata?: boolean;
    },
    callMeta?: CallMetadata
  ): Promise<ImportMarkdownResponse> {
    const request = {
      content,
      strictMode: options?.strictMode ?? false,
      includeMetadata: options?.includeMetadata ?? true,
    };

    return this.unaryCall('importMarkdown', request, callMeta);
  }

  /**
   * Import HTML to Portable Text
   */
  async importHTML(
    content: string,
    callMeta?: CallMetadata
  ): Promise<ImportHTMLResponse> {
    const request = { content };
    return this.unaryCall('importHTML', request, callMeta);
  }

  /**
   * Export Portable Text to HTML
   */
  async exportHTML(
    document: PortableTextDocument,
    options?: {
      includeStyles?: boolean;
      includeMetadata?: boolean;
      className?: string;
      title?: string;
    },
    callMeta?: CallMetadata
  ): Promise<ExportHTMLResponse> {
    const request = {
      document,
      includeStyles: options?.includeStyles ?? true,
      includeMetadata: options?.includeMetadata ?? false,
      className: options?.className ?? '',
      title: options?.title ?? '',
    };

    return this.unaryCall('exportHTML', request, callMeta);
  }

  /**
   * Export Portable Text to Markdown
   */
  async exportMarkdown(
    document: PortableTextDocument,
    options?: {
      includeMetadata?: boolean;
    },
    callMeta?: CallMetadata
  ): Promise<ExportMarkdownResponse> {
    const request = {
      document,
      includeMetadata: options?.includeMetadata ?? false,
    };

    return this.unaryCall('exportMarkdown', request, callMeta);
  }

  /**
   * Export Portable Text to Notion JSON
   */
  async exportNotion(
    document: PortableTextDocument,
    options?: {
      prettyPrint?: boolean;
    },
    callMeta?: CallMetadata
  ): Promise<ExportNotionResponse> {
    const request = {
      document,
      prettyPrint: options?.prettyPrint ?? false,
    };

    return this.unaryCall('exportNotion', request, callMeta);
  }

  /**
   * Export Portable Text to Roam JSON
   */
  async exportRoam(
    document: PortableTextDocument,
    options?: {
      prettyPrint?: boolean;
    },
    callMeta?: CallMetadata
  ): Promise<ExportRoamResponse> {
    const request = {
      document,
      prettyPrint: options?.prettyPrint ?? false,
    };

    return this.unaryCall('exportRoam', request, callMeta);
  }

  /**
   * Batch export multiple documents (streaming)
   */
  async batchExport(
    documents: PortableTextDocument[],
    format: 'markdown' | 'html' | 'notion' | 'roam',
    options?: Record<string, string>,
    callMeta?: CallMetadata
  ): Promise<BatchExportResult[]> {
    if (!this.isConnected()) {
      throw new Error('Conversion service is not connected');
    }

    const formatMap: Record<string, number> = {
      markdown: 1,
      html: 2,
      notion: 3,
      roam: 4,
    };

    const request = {
      documents,
      format: formatMap[format] ?? 0,
      options: options ?? {},
    };

    const metadata = this.createMetadata(callMeta);
    const callOptions = this.createCallOptions(callMeta);

    return new Promise((resolve, reject) => {
      const results: BatchExportResult[] = [];

      const call = this.client.batchExport(request, metadata, callOptions);

      call.on('data', (result: BatchExportResult) => {
        results.push(result);
      });

      call.on('error', (error: Error) => {
        logger.error('Batch export stream error', {
          error: error.message,
          correlationId: callMeta?.correlationId,
        });
        reject(error);
      });

      call.on('end', () => {
        resolve(results);
      });
    });
  }
}

// Singleton instance
let conversionClient: GrpcConversionClient | null = null;

export function getGrpcConversionClient(): GrpcConversionClient {
  if (!conversionClient) {
    conversionClient = new GrpcConversionClient();
  }
  return conversionClient;
}
