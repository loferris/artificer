/**
 * ChunkingService - Splits documents into chunks for embedding and retrieval
 *
 * Responsibilities:
 * - Split long documents into semantic chunks
 * - Maintain context with overlapping windows
 * - Handle different content types (markdown, code, plain text)
 */

import type { DocumentChunk } from './VectorService';

export interface ChunkingConfig {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

export class ChunkingService {
  private chunkSize: number;
  private chunkOverlap: number;
  private separators: string[];

  constructor(config: ChunkingConfig = {}) {
    this.chunkSize = config.chunkSize || 1000; // characters
    this.chunkOverlap = config.chunkOverlap || 200; // characters
    this.separators = config.separators || ['\n\n', '\n', '. ', ' '];
  }

  /**
   * Split document content into overlapping chunks
   */
  chunkDocument(
    documentId: string,
    projectId: string,
    content: string,
    filename: string
  ): DocumentChunk[] {
    if (!content || content.trim().length === 0) {
      return [];
    }

    const chunks: DocumentChunk[] = [];
    let startChar = 0;
    let chunkIndex = 0;

    while (startChar < content.length) {
      const endChar = Math.min(startChar + this.chunkSize, content.length);
      let chunkContent = content.slice(startChar, endChar);

      // If not at the end, try to break at a natural boundary
      if (endChar < content.length) {
        const breakPoint = this.findBreakPoint(content, startChar, endChar);
        if (breakPoint > startChar) {
          chunkContent = content.slice(startChar, breakPoint);
        }
      }

      // Create chunk
      chunks.push({
        id: `${documentId}_chunk_${chunkIndex}`,
        documentId,
        projectId,
        content: chunkContent.trim(),
        metadata: {
          filename,
          chunkIndex,
          totalChunks: 0, // Will be updated after all chunks are created
          startChar,
          endChar: startChar + chunkContent.length,
        },
      });

      // Move to next chunk with overlap
      startChar += chunkContent.length - this.chunkOverlap;
      chunkIndex++;

      // Prevent infinite loop
      if (startChar + chunkContent.length >= content.length) {
        break;
      }
    }

    // Update total chunks count
    const totalChunks = chunks.length;
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = totalChunks;
    });

    return chunks;
  }

  /**
   * Find a natural break point (separator) near the target position
   */
  private findBreakPoint(content: string, startChar: number, targetEnd: number): number {
    // Try each separator in order
    for (const separator of this.separators) {
      // Look backward from target for separator
      const searchStart = Math.max(startChar, targetEnd - 200);
      const searchContent = content.slice(searchStart, targetEnd);
      const lastIndex = searchContent.lastIndexOf(separator);

      if (lastIndex !== -1) {
        return searchStart + lastIndex + separator.length;
      }
    }

    // No separator found, use target
    return targetEnd;
  }

  /**
   * Chunk multiple documents in batch
   */
  chunkDocuments(
    documents: Array<{
      id: string;
      projectId: string;
      content: string;
      filename: string;
    }>
  ): Map<string, DocumentChunk[]> {
    const chunksMap = new Map<string, DocumentChunk[]>();

    for (const doc of documents) {
      const chunks = this.chunkDocument(
        doc.id,
        doc.projectId,
        doc.content,
        doc.filename
      );
      chunksMap.set(doc.id, chunks);
    }

    return chunksMap;
  }

  /**
   * Calculate estimated number of chunks for content
   */
  estimateChunkCount(contentLength: number): number {
    if (contentLength <= this.chunkSize) {
      return 1;
    }

    const effectiveChunkSize = this.chunkSize - this.chunkOverlap;
    return Math.ceil((contentLength - this.chunkSize) / effectiveChunkSize) + 1;
  }

  /**
   * Validate chunk configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.chunkSize <= 0) {
      errors.push('Chunk size must be positive');
    }

    if (this.chunkOverlap < 0) {
      errors.push('Chunk overlap cannot be negative');
    }

    if (this.chunkOverlap >= this.chunkSize) {
      errors.push('Chunk overlap must be less than chunk size');
    }

    if (this.separators.length === 0) {
      errors.push('At least one separator is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
