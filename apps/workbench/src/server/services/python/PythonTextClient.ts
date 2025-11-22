/**
 * Python Text Processing Service Client
 *
 * Connects to Python microservice for high-performance text processing.
 * Provides chunking and token counting (3-5x faster than TypeScript).
 */

import { logger } from '../../utils/logger';
import type { DocumentChunk } from '../vector/VectorService';

export interface PythonChunkResult {
  chunks: DocumentChunk[];
  totalChunks: number;
}

export interface PythonBatchChunkResult {
  chunksMap: Record<string, DocumentChunk[]>;
  totalDocuments: number;
  processingTime: number;
}

export interface PythonTokenCountResult {
  tokenCount: number;
  model: string;
  processingTime: number;
}

export interface PythonConversationTokenResult {
  totalTokens: number;
  messageCount: number;
  messageTokens: Array<{
    contentTokens: number;
    roleTokens: number;
    totalTokens: number;
  }>;
  model: string;
  processingTime: number;
}

export interface PythonMessageFitResult {
  count: number;
  totalTokens: number;
  maxTokens: number;
  model: string;
  processingTime: number;
}

export interface PythonContextWindowConfig {
  modelContextWindow: number;
  reservedForOutput: number;
  reservedForSystem: number;
  availableForHistory: number;
  recentMessagesWindow: number;
  summaryWindow: number;
}

export class PythonTextClient {
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
        this.available = data.processors?.text === true;
        if (this.available) {
          logger.info('Python text processing service is available', {
            url: this.baseUrl,
          });
        }
      } else {
        this.available = false;
      }
    } catch (error) {
      this.available = false;
      logger.warn('Python text processing service not available', {
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
   * Get service statistics
   */
  getStats() {
    return {
      available: this.available,
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
   * Chunk a document (3-5x faster than TypeScript)
   */
  async chunkDocument(
    documentId: string,
    projectId: string,
    content: string,
    filename: string,
    options: {
      chunkSize?: number;
      chunkOverlap?: number;
      separators?: string[];
    } = {}
  ): Promise<PythonChunkResult> {
    if (!this.available) {
      throw new Error('Python text processing service not available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/text/chunk-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: documentId,
          project_id: projectId,
          content,
          filename,
          chunk_size: options.chunkSize || 1000,
          chunk_overlap: options.chunkOverlap || 200,
          separators: options.separators,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      return {
        chunks: result.chunks,
        totalChunks: result.total_chunks,
      };
    } catch (error) {
      logger.error('Python document chunking failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Chunk multiple documents in batch
   */
  async chunkDocumentsBatch(
    documents: Array<{
      id: string;
      projectId: string;
      content: string;
      filename: string;
    }>,
    options: {
      chunkSize?: number;
      chunkOverlap?: number;
      separators?: string[];
    } = {}
  ): Promise<PythonBatchChunkResult> {
    if (!this.available) {
      throw new Error('Python text processing service not available');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/text/chunk-documents-batch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documents: documents.map(doc => ({
              id: doc.id,
              project_id: doc.projectId,
              content: doc.content,
              filename: doc.filename,
            })),
            chunk_size: options.chunkSize || 1000,
            chunk_overlap: options.chunkOverlap || 200,
            separators: options.separators,
          }),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      return {
        chunksMap: result.chunks_map,
        totalDocuments: result.total_documents,
        processingTime: result.processing_time_ms,
      };
    } catch (error) {
      logger.error('Python batch chunking failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Count tokens in content
   */
  async countTokens(
    content: string,
    model: string = 'gpt-4'
  ): Promise<PythonTokenCountResult> {
    if (!this.available) {
      throw new Error('Python text processing service not available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/text/count-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          model,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      return {
        tokenCount: result.token_count,
        model: result.model,
        processingTime: result.processing_time_ms,
      };
    } catch (error) {
      logger.error('Python token counting failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Count tokens in a conversation
   */
  async countConversationTokens(
    messages: Array<{ role: string; content: string }>,
    model: string = 'gpt-4',
    options: {
      messageOverhead?: number;
      conversationOverhead?: number;
    } = {}
  ): Promise<PythonConversationTokenResult> {
    if (!this.available) {
      throw new Error('Python text processing service not available');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/text/count-conversation-tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages,
            model,
            message_overhead: options.messageOverhead || 4,
            conversation_overhead: options.conversationOverhead || 3,
          }),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      return {
        totalTokens: result.total_tokens,
        messageCount: result.message_count,
        messageTokens: result.message_tokens.map((mt: any) => ({
          contentTokens: mt.content_tokens,
          roleTokens: mt.role_tokens,
          totalTokens: mt.total_tokens,
        })),
        model: result.model,
        processingTime: result.processing_time_ms,
      };
    } catch (error) {
      logger.error('Python conversation token counting failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Estimate how many messages fit within token budget
   */
  async estimateMessageFit(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number,
    model: string = 'gpt-4',
    options: {
      messageOverhead?: number;
      conversationOverhead?: number;
    } = {}
  ): Promise<PythonMessageFitResult> {
    if (!this.available) {
      throw new Error('Python text processing service not available');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/text/estimate-message-fit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages,
            max_tokens: maxTokens,
            model,
            message_overhead: options.messageOverhead || 4,
            conversation_overhead: options.conversationOverhead || 3,
          }),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      return {
        count: result.count,
        totalTokens: result.total_tokens,
        maxTokens: result.max_tokens,
        model: result.model,
        processingTime: result.processing_time_ms,
      };
    } catch (error) {
      logger.error('Python message fit estimation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Calculate context window configuration
   */
  async calculateContextWindow(
    modelContextWindow: number = 200000,
    outputTokens: number = 4096,
    systemTokens: number = 2000
  ): Promise<PythonContextWindowConfig> {
    if (!this.available) {
      throw new Error('Python text processing service not available');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/text/calculate-context-window?` +
          new URLSearchParams({
            model_context_window: modelContextWindow.toString(),
            output_tokens: outputTokens.toString(),
            system_tokens: systemTokens.toString(),
          }),
        {
          method: 'GET',
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Python service error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      return {
        modelContextWindow: result.model_context_window,
        reservedForOutput: result.reserved_for_output,
        reservedForSystem: result.reserved_for_system,
        availableForHistory: result.available_for_history,
        recentMessagesWindow: result.recent_messages_window,
        summaryWindow: result.summary_window,
      };
    } catch (error) {
      logger.error('Python context window calculation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

// Singleton instance
export const pythonTextClient = new PythonTextClient();
