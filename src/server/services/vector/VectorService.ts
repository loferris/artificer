/**
 * VectorService - Manages document embeddings and semantic search via Chroma
 *
 * Responsibilities:
 * - Store document chunks with embeddings in Chroma collections
 * - Perform semantic search across documents
 * - Manage collection lifecycle (create, delete, list)
 */

import { ChromaClient, Collection, IncludeEnum } from 'chromadb';
import type { PrismaClient } from '@prisma/client';

export interface VectorServiceConfig {
  chromaUrl?: string;
  collectionPrefix?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  projectId: string;
  content: string;
  metadata: {
    filename: string;
    chunkIndex: number;
    totalChunks: number;
    startChar: number;
    endChar: number;
  };
}

export interface SearchResult {
  id: string;
  documentId: string;
  projectId: string;
  content: string;
  filename: string;
  score: number;
  metadata: Record<string, any>;
}

export class VectorService {
  private client: ChromaClient;
  private collectionPrefix: string;

  constructor(
    private db: PrismaClient | null,
    config: VectorServiceConfig = {}
  ) {
    const chromaUrl = config.chromaUrl || process.env.CHROMA_URL || 'http://localhost:8000';
    this.client = new ChromaClient({ path: chromaUrl });
    this.collectionPrefix = config.collectionPrefix || 'ai_workflow_';
  }

  /**
   * Get or create a Chroma collection for a project
   */
  async getOrCreateCollection(projectId: string): Promise<Collection> {
    const collectionName = `${this.collectionPrefix}project_${projectId}`;

    try {
      return await this.client.getOrCreateCollection({
        name: collectionName,
        metadata: { projectId },
      });
    } catch (error) {
      throw new Error(`Failed to get/create collection for project ${projectId}: ${error}`);
    }
  }

  /**
   * Store document chunks with embeddings in Chroma
   */
  async storeDocumentChunks(
    projectId: string,
    chunks: DocumentChunk[],
    embeddings: number[][]
  ): Promise<void> {
    if (chunks.length !== embeddings.length) {
      throw new Error('Number of chunks must match number of embeddings');
    }

    const collection = await this.getOrCreateCollection(projectId);

    const ids = chunks.map(c => c.id);
    const documents = chunks.map(c => c.content);
    const metadatas = chunks.map(c => ({
      documentId: c.documentId,
      projectId: c.projectId,
      filename: c.metadata.filename,
      chunkIndex: c.metadata.chunkIndex,
      totalChunks: c.metadata.totalChunks,
      startChar: c.metadata.startChar,
      endChar: c.metadata.endChar,
    }));

    try {
      await collection.add({
        ids,
        embeddings,
        documents,
        metadatas,
      });
    } catch (error) {
      throw new Error(`Failed to store document chunks: ${error}`);
    }
  }

  /**
   * Perform semantic search across project documents
   */
  async searchDocuments(
    projectId: string,
    queryEmbedding: number[],
    options: {
      limit?: number;
      minScore?: number;
      documentIds?: string[];
    } = {}
  ): Promise<SearchResult[]> {
    const collection = await this.getOrCreateCollection(projectId);
    const limit = options.limit || 10;

    try {
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
        include: ['documents', 'metadatas', 'distances'] as IncludeEnum[],
      });

      if (!results.ids[0] || !results.documents[0] || !results.metadatas[0] || !results.distances[0]) {
        return [];
      }

      const searchResults: SearchResult[] = [];

      for (let i = 0; i < results.ids[0].length; i++) {
        const distance = results.distances[0][i];
        if (distance === null || distance === undefined) continue;
        const score = 1 - distance; // Convert distance to similarity score

        // Filter by minimum score if specified
        if (options.minScore && score < options.minScore) {
          continue;
        }

        const metadata = results.metadatas[0][i] as any;

        // Filter by document IDs if specified
        if (options.documentIds && !options.documentIds.includes(metadata.documentId)) {
          continue;
        }

        searchResults.push({
          id: results.ids[0][i],
          documentId: metadata.documentId,
          projectId: metadata.projectId,
          content: results.documents[0][i] as string,
          filename: metadata.filename,
          score,
          metadata,
        });
      }

      return searchResults;
    } catch (error) {
      throw new Error(`Failed to search documents: ${error}`);
    }
  }

  /**
   * Delete all chunks for a document
   */
  async deleteDocument(projectId: string, documentId: string): Promise<void> {
    const collection = await this.getOrCreateCollection(projectId);

    try {
      await collection.delete({
        where: { documentId },
      });
    } catch (error) {
      throw new Error(`Failed to delete document ${documentId}: ${error}`);
    }
  }

  /**
   * Delete an entire project collection
   */
  async deleteProjectCollection(projectId: string): Promise<void> {
    const collectionName = `${this.collectionPrefix}project_${projectId}`;

    try {
      await this.client.deleteCollection({ name: collectionName });
    } catch (error) {
      // Ignore errors if collection doesn't exist
      if (!error?.toString().includes('does not exist')) {
        throw new Error(`Failed to delete project collection: ${error}`);
      }
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(projectId: string): Promise<{
    count: number;
    documentsIndexed: Set<string>;
  }> {
    const collection = await this.getOrCreateCollection(projectId);

    try {
      const count = await collection.count();

      // Get unique document IDs
      const results = await collection.get({
        include: ['metadatas'] as IncludeEnum[],
      });

      const documentsIndexed = new Set<string>();
      if (results.metadatas) {
        for (const metadata of results.metadatas) {
          if (metadata && typeof metadata === 'object' && 'documentId' in metadata) {
            documentsIndexed.add(metadata.documentId as string);
          }
        }
      }

      return { count, documentsIndexed };
    } catch (error) {
      throw new Error(`Failed to get collection stats: ${error}`);
    }
  }

  /**
   * Health check - verify Chroma is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.heartbeat();
      return true;
    } catch {
      return false;
    }
  }
}
