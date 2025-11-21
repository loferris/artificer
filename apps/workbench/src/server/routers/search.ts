/**
 * Search Router - Semantic search across project documents
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { VectorService, EmbeddingService } from '../services/vector';
import { TRPCError } from '@trpc/server';
import { pythonTextClient } from '../services/python/PythonTextClient';
import { getLlamaIndexService } from '../services/search/LlamaIndexService';

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

        // Chunk document (requires Python service for 3-5x speedup)
        if (!pythonTextClient.isAvailable()) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Document chunking requires Python text service. Please ensure Python text service is running.',
          });
        }

        const result = await pythonTextClient.chunkDocument(
          document.id,
          document.projectId,
          document.content,
          document.filename
        );
        const chunks = result.chunks;

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

  // ==================== LlamaIndex Enhanced Retrieval ====================

  /**
   * Check if LlamaIndex is available
   */
  llamaIndexAvailable: publicProcedure.query(async () => {
    const llamaIndexService = getLlamaIndexService();
    return {
      available: llamaIndexService.isAvailable(),
    };
  }),

  /**
   * Rerank search results using cross-encoder
   */
  rerankResults: publicProcedure
    .input(
      z.object({
        searchResults: z.array(z.any()),
        query: z.string(),
        model: z
          .enum(['ms-marco-mini', 'ms-marco-base', 'bge-reranker', 'cohere-rerank'])
          .optional()
          .default('ms-marco-mini'),
        topN: z.number().int().min(1).max(20).optional().default(5),
      })
    )
    .mutation(async ({ input }) => {
      const llamaIndexService = getLlamaIndexService();

      if (!llamaIndexService.isAvailable()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'LlamaIndex not available. Install with: pip install llama-index',
        });
      }

      try {
        const reranked = await llamaIndexService.rerankResults(input.searchResults, input.query, {
          model: input.model,
          topN: input.topN,
        });

        return {
          query: input.query,
          results: reranked,
          count: reranked.length,
          reranked: true,
          reranker_model: input.model,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Reranking failed',
        });
      }
    }),

  /**
   * Search with reranking (convenience endpoint)
   */
  searchWithReranking: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        query: z.string().min(1).max(1000),
        topK: z.number().int().min(10).max(100).optional().default(20),
        topN: z.number().int().min(1).max(20).optional().default(5),
        model: z
          .enum(['ms-marco-mini', 'ms-marco-base', 'bge-reranker', 'cohere-rerank'])
          .optional()
          .default('ms-marco-mini'),
        minScore: z.number().min(0).max(1).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      const llamaIndexService = getLlamaIndexService();

      if (!llamaIndexService.isAvailable()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'LlamaIndex not available. Install with: pip install llama-index',
        });
      }

      try {
        // Step 1: Get more candidates via vector search
        const embeddingService = new EmbeddingService();
        const queryEmbedding = await embeddingService.generateEmbedding(input.query);

        const vectorService = new VectorService(ctx.db);
        const candidates = await vectorService.searchDocuments(input.projectId, queryEmbedding, {
          limit: input.topK,
          minScore: input.minScore,
        });

        // Step 2: Rerank top candidates
        const reranked = await llamaIndexService.rerankResults(candidates, input.query, {
          model: input.model,
          topN: input.topN,
        });

        return {
          query: input.query,
          results: reranked,
          count: reranked.length,
          reranked: true,
          candidates_count: candidates.length,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Search with reranking failed',
        });
      }
    }),

  /**
   * Generate hypothetical document for HyDE
   */
  generateHypotheticalDocument: publicProcedure
    .input(
      z.object({
        query: z.string(),
        llmModel: z.string().optional().default('gpt-4o-mini'),
      })
    )
    .mutation(async ({ input }) => {
      const llamaIndexService = getLlamaIndexService();

      if (!llamaIndexService.isAvailable()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'LlamaIndex not available',
        });
      }

      try {
        const hypothetical = await llamaIndexService.generateHypotheticalDocument(
          input.query,
          input.llmModel
        );

        return {
          query: input.query,
          hypothetical_document: hypothetical,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'HyDE generation failed',
        });
      }
    }),

  /**
   * Generate query variations for query fusion
   */
  generateQueryVariations: publicProcedure
    .input(
      z.object({
        query: z.string(),
        numVariations: z.number().int().min(1).max(5).optional().default(3),
        llmModel: z.string().optional().default('gpt-4o-mini'),
      })
    )
    .mutation(async ({ input }) => {
      const llamaIndexService = getLlamaIndexService();

      if (!llamaIndexService.isAvailable()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'LlamaIndex not available',
        });
      }

      try {
        const variations = await llamaIndexService.generateQueryVariations(
          input.query,
          input.numVariations,
          input.llmModel
        );

        return {
          original_query: input.query,
          variations,
          count: variations.length,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Query variation generation failed',
        });
      }
    }),

  /**
   * Decompose query into sub-questions
   */
  decomposeQuery: publicProcedure
    .input(
      z.object({
        query: z.string(),
        llmModel: z.string().optional().default('gpt-4o-mini'),
      })
    )
    .mutation(async ({ input }) => {
      const llamaIndexService = getLlamaIndexService();

      if (!llamaIndexService.isAvailable()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'LlamaIndex not available',
        });
      }

      try {
        const subquestions = await llamaIndexService.decomposeIntoSubquestions(
          input.query,
          input.llmModel
        );

        return {
          original_query: input.query,
          subquestions,
          count: subquestions.length,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Query decomposition failed',
        });
      }
    }),

  /**
   * Evaluate RAG faithfulness (no hallucination)
   */
  evaluateFaithfulness: publicProcedure
    .input(
      z.object({
        query: z.string(),
        response: z.string(),
        contexts: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const llamaIndexService = getLlamaIndexService();

      if (!llamaIndexService.isAvailable()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'LlamaIndex not available',
        });
      }

      try {
        const result = await llamaIndexService.evaluateFaithfulness(
          input.query,
          input.response,
          input.contexts
        );

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Faithfulness evaluation failed',
        });
      }
    }),

  /**
   * Evaluate retrieval relevancy
   */
  evaluateRelevancy: publicProcedure
    .input(
      z.object({
        query: z.string(),
        contexts: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const llamaIndexService = getLlamaIndexService();

      if (!llamaIndexService.isAvailable()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'LlamaIndex not available',
        });
      }

      try {
        const result = await llamaIndexService.evaluateRelevancy(input.query, input.contexts);

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Relevancy evaluation failed',
        });
      }
    }),

  /**
   * Evaluate answer relevancy
   */
  evaluateAnswerRelevancy: publicProcedure
    .input(
      z.object({
        query: z.string(),
        response: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const llamaIndexService = getLlamaIndexService();

      if (!llamaIndexService.isAvailable()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'LlamaIndex not available',
        });
      }

      try {
        const result = await llamaIndexService.evaluateAnswerRelevancy(input.query, input.response);

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Answer relevancy evaluation failed',
        });
      }
    }),

  /**
   * Comprehensive RAG evaluation
   */
  evaluateRAGPipeline: publicProcedure
    .input(
      z.object({
        query: z.string(),
        response: z.string(),
        contexts: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const llamaIndexService = getLlamaIndexService();

      if (!llamaIndexService.isAvailable()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'LlamaIndex not available',
        });
      }

      try {
        const result = await llamaIndexService.evaluateFullRAGPipeline(
          input.query,
          input.response,
          input.contexts
        );

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'RAG evaluation failed',
        });
      }
    }),

  /**
   * Batch evaluate RAG test cases
   */
  batchEvaluateRAG: publicProcedure
    .input(
      z.object({
        testCases: z.array(
          z.object({
            query: z.string(),
            response: z.string(),
            contexts: z.array(z.string()),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const llamaIndexService = getLlamaIndexService();

      if (!llamaIndexService.isAvailable()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'LlamaIndex not available',
        });
      }

      try {
        const result = await llamaIndexService.batchEvaluateRAG(input.testCases);

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Batch RAG evaluation failed',
        });
      }
    }),
});
