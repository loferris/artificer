/**
 * Search Router - Semantic search across project documents
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { VectorService, ChunkingService, EmbeddingService } from '../services/vector';
import { TRPCError } from '@trpc/server';

export const searchRouter = router({
  /**
   * Semantic search across project documents
   */
  searchDocuments: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        query: z.string().min(1).max(1000),
        limit: z.number().int().min(1).max(50).optional().default(10),
        minScore: z.number().min(0).max(1).optional(),
        documentIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        // Verify project exists
        const project = await ctx.db.project.findUnique({
          where: { id: input.projectId },
        });

        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found',
          });
        }

        // Generate embedding for query
        const embeddingService = new EmbeddingService();
        const queryEmbedding = await embeddingService.generateEmbedding(input.query);

        // Search in Chroma
        const vectorService = new VectorService(ctx.db);
        const results = await vectorService.searchDocuments(
          input.projectId,
          queryEmbedding,
          {
            limit: input.limit,
            minScore: input.minScore,
            documentIds: input.documentIds,
          }
        );

        return {
          query: input.query,
          results,
          count: results.length,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to search documents',
        });
      }
    }),

  /**
   * Get embedding statistics for a project
   */
  getEmbeddingStats: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const vectorService = new VectorService(ctx.db);
        const stats = await vectorService.getCollectionStats(input.projectId);

        // Get document details from PostgreSQL
        const documents = await ctx.db.document.findMany({
          where: { projectId: input.projectId },
          select: {
            id: true,
            filename: true,
            size: true,
            contentType: true,
            uploadedAt: true,
          },
        });

        const indexedDocuments = documents.filter(doc =>
          stats.documentsIndexed.has(doc.id)
        );

        const unindexedDocuments = documents.filter(doc =>
          !stats.documentsIndexed.has(doc.id)
        );

        return {
          totalChunks: stats.count,
          totalDocuments: documents.length,
          indexedDocuments: indexedDocuments.length,
          unindexedDocuments: unindexedDocuments.length,
          indexedFiles: indexedDocuments.map(doc => ({
            id: doc.id,
            filename: doc.filename,
            size: doc.size,
            uploadedAt: doc.uploadedAt,
          })),
          unindexedFiles: unindexedDocuments.map(doc => ({
            id: doc.id,
            filename: doc.filename,
            size: doc.size,
            uploadedAt: doc.uploadedAt,
          })),
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get embedding stats',
        });
      }
    }),

  /**
   * Re-index a specific document
   */
  reindexDocument: publicProcedure
    .input(
      z.object({
        documentId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        // Get document from database
        const document = await ctx.db.document.findUnique({
          where: { id: input.documentId },
        });

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Document not found',
          });
        }

        if (!document.content) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Document has no text content to index',
          });
        }

        // Delete existing chunks
        const vectorService = new VectorService(ctx.db);
        await vectorService.deleteDocument(document.projectId, document.id);

        // Chunk document
        const chunkingService = new ChunkingService();
        const chunks = chunkingService.chunkDocument(
          document.id,
          document.projectId,
          document.content,
          document.filename
        );

        // Generate embeddings
        const embeddingService = new EmbeddingService();
        const embeddings = await embeddingService.generateEmbeddings(
          chunks.map(c => c.content)
        );

        // Store in Chroma
        await vectorService.storeDocumentChunks(
          document.projectId,
          chunks,
          embeddings
        );

        return {
          documentId: document.id,
          filename: document.filename,
          chunksCreated: chunks.length,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to reindex document',
        });
      }
    }),

  /**
   * Health check for vector services
   */
  healthCheck: publicProcedure.query(async ({ ctx }) => {
    const vectorService = new VectorService(ctx.db);

    let chromaHealthy = false;
    let embeddingsHealthy = false;

    try {
      chromaHealthy = await vectorService.healthCheck();
    } catch {
      chromaHealthy = false;
    }

    try {
      const embeddingService = new EmbeddingService();
      embeddingsHealthy = await embeddingService.healthCheck();
    } catch {
      embeddingsHealthy = false;
    }

    return {
      chroma: chromaHealthy,
      embeddings: embeddingsHealthy,
      overall: chromaHealthy && embeddingsHealthy,
    };
  }),
});
