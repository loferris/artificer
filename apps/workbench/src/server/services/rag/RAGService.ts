/**
 * RAGService - Retrieval-Augmented Generation
 *
 * Handles context retrieval for AI conversations from project documents.
 * Designed to be lightweight and easily replaceable.
 */

import type { VectorService, SearchResult } from '../vector/VectorService';
import type { EmbeddingService } from '../vector/EmbeddingService';
import { logger } from '../../utils/logger';

export interface RAGContext {
  chunks: Array<{
    content: string;
    source: string;
    score: number;
  }>;
  systemMessage: string;
}

export interface RAGRetrievalOptions {
  /** Project ID to search within */
  projectId: string;
  /** User's query/message */
  query: string;
  /** Maximum number of chunks to retrieve */
  maxChunks?: number;
  /** Minimum similarity score (0-1) */
  minScore?: number;
  /** Specific document IDs to search (optional) */
  documentIds?: string[];
}

/**
 * RAGService interface - easy to mock and swap implementations
 */
export interface RAGService {
  /**
   * Retrieve relevant context for a query
   * Returns null if no relevant context found or RAG disabled
   */
  retrieveContext(options: RAGRetrievalOptions): Promise<RAGContext | null>;

  /**
   * Check if RAG is available and configured
   */
  isAvailable(): boolean;
}

/**
 * Default RAG implementation using VectorService + EmbeddingService
 */
export class DefaultRAGService implements RAGService {
  private enabled: boolean;

  constructor(
    private vectorService: VectorService | null,
    private embeddingService: EmbeddingService | null,
  ) {
    this.enabled = process.env.ENABLE_RAG === 'true';
  }

  isAvailable(): boolean {
    return this.enabled && !!this.vectorService && !!this.embeddingService;
  }

  async retrieveContext(options: RAGRetrievalOptions): Promise<RAGContext | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const {
      projectId,
      query,
      maxChunks = 5,
      minScore = 0.3, // Cosine similarity threshold - 0.3 is reasonable for semantic search
      documentIds,
    } = options;

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService!.generateEmbedding(query);

      // Search for relevant document chunks
      const results = await this.vectorService!.searchDocuments(projectId, queryEmbedding, {
        limit: maxChunks,
        minScore,
        documentIds,
      });

      if (results.length === 0) {
        logger.debug('No relevant context found for RAG', { projectId, query: query.substring(0, 50) });
        return null;
      }

      // Format results into context chunks
      const chunks = results.map((result) => ({
        content: result.content,
        source: result.filename,
        score: result.score,
      }));

      // Build system message with context
      const systemMessage = this.formatSystemMessage(chunks);

      logger.info('RAG context retrieved', {
        projectId,
        chunkCount: chunks.length,
        avgScore: chunks.reduce((sum, c) => sum + c.score, 0) / chunks.length,
      });

      return { chunks, systemMessage };
    } catch (error) {
      logger.error('RAG context retrieval failed', error as Error, { projectId });
      return null; // Fail gracefully - don't break the conversation
    }
  }

  /**
   * Format retrieved chunks into a system message
   * Easy to customize based on your needs
   */
  private formatSystemMessage(chunks: Array<{ content: string; source: string; score: number }>): string {
    const contextParts = chunks.map((chunk, index) => {
      return `[Source: ${chunk.source}]\n${chunk.content}`;
    });

    return `You have access to the following relevant information from the project documents:

${contextParts.join('\n\n---\n\n')}

Use this information to provide accurate, contextual responses. If the information is relevant to the user's question, reference it in your answer.`;
  }
}

/**
 * No-op RAG service for when RAG is disabled or unavailable
 */
export class NoOpRAGService implements RAGService {
  isAvailable(): boolean {
    return false;
  }

  async retrieveContext(): Promise<null> {
    return null;
  }
}
