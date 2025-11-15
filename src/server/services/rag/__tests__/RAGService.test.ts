import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DefaultRAGService, NoOpRAGService } from '../RAGService';
import type { VectorService } from '../../vector/VectorService';
import type { EmbeddingService } from '../../vector/EmbeddingService';

describe('RAGService', () => {
  describe('NoOpRAGService', () => {
    it('should always return null for retrieveContext', async () => {
      const ragService = new NoOpRAGService();

      const result = await ragService.retrieveContext({
        projectId: 'project-1',
        query: 'test query',
      });

      expect(result).toBeNull();
    });

    it('should report as not available', () => {
      const ragService = new NoOpRAGService();
      expect(ragService.isAvailable()).toBe(false);
    });
  });

  describe('DefaultRAGService', () => {
    let mockVectorService: VectorService;
    let mockEmbeddingService: EmbeddingService;
    let ragService: DefaultRAGService;

    beforeEach(() => {
      // Mock VectorService
      mockVectorService = {
        searchDocuments: vi.fn(),
      } as any;

      // Mock EmbeddingService
      mockEmbeddingService = {
        generateEmbedding: vi.fn(),
      } as any;

      // Set ENABLE_RAG for tests
      process.env.ENABLE_RAG = 'true';

      ragService = new DefaultRAGService(mockVectorService, mockEmbeddingService);
    });

    it('should report as available when services are provided and enabled', () => {
      expect(ragService.isAvailable()).toBe(true);
    });

    it('should report as not available when ENABLE_RAG is false', () => {
      process.env.ENABLE_RAG = 'false';
      const disabledService = new DefaultRAGService(mockVectorService, mockEmbeddingService);
      expect(disabledService.isAvailable()).toBe(false);
    });

    it('should report as not available when services are null', () => {
      const serviceWithNulls = new DefaultRAGService(null, null);
      expect(serviceWithNulls.isAvailable()).toBe(false);
    });

    it('should retrieve context successfully', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockSearchResults = [
        {
          id: 'chunk-1',
          documentId: 'doc-1',
          projectId: 'project-1',
          content: 'This is relevant content from document 1',
          filename: 'doc1.txt',
          score: 0.95,
          metadata: {},
        },
        {
          id: 'chunk-2',
          documentId: 'doc-2',
          projectId: 'project-1',
          content: 'This is relevant content from document 2',
          filename: 'doc2.txt',
          score: 0.85,
          metadata: {},
        },
      ];

      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue(mockEmbedding);
      vi.mocked(mockVectorService.searchDocuments).mockResolvedValue(mockSearchResults);

      const result = await ragService.retrieveContext({
        projectId: 'project-1',
        query: 'What is the relevant information?',
      });

      expect(result).not.toBeNull();
      expect(result!.chunks).toHaveLength(2);
      expect(result!.chunks[0].content).toBe('This is relevant content from document 1');
      expect(result!.chunks[0].source).toBe('doc1.txt');
      expect(result!.chunks[0].score).toBe(0.95);
      expect(result!.systemMessage).toContain('relevant information');
      expect(result!.systemMessage).toContain('doc1.txt');
      expect(result!.systemMessage).toContain('doc2.txt');
    });

    it('should return null when no results found', async () => {
      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue([0.1, 0.2]);
      vi.mocked(mockVectorService.searchDocuments).mockResolvedValue([]);

      const result = await ragService.retrieveContext({
        projectId: 'project-1',
        query: 'irrelevant query',
      });

      expect(result).toBeNull();
    });

    it('should pass options to vector search correctly', async () => {
      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue([0.1, 0.2]);
      vi.mocked(mockVectorService.searchDocuments).mockResolvedValue([]);

      await ragService.retrieveContext({
        projectId: 'project-1',
        query: 'test query',
        maxChunks: 10,
        minScore: 0.8,
        documentIds: ['doc-1', 'doc-2'],
      });

      expect(mockVectorService.searchDocuments).toHaveBeenCalledWith(
        'project-1',
        [0.1, 0.2],
        {
          limit: 10,
          minScore: 0.8,
          documentIds: ['doc-1', 'doc-2'],
        }
      );
    });

    it('should handle errors gracefully and return null', async () => {
      vi.mocked(mockEmbeddingService.generateEmbedding).mockRejectedValue(
        new Error('Embedding failed')
      );

      const result = await ragService.retrieveContext({
        projectId: 'project-1',
        query: 'test query',
      });

      expect(result).toBeNull();
    });

    it('should use default options when not specified', async () => {
      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue([0.1, 0.2]);
      vi.mocked(mockVectorService.searchDocuments).mockResolvedValue([]);

      await ragService.retrieveContext({
        projectId: 'project-1',
        query: 'test query',
      });

      expect(mockVectorService.searchDocuments).toHaveBeenCalledWith(
        'project-1',
        [0.1, 0.2],
        {
          limit: 5,
          minScore: 0.3,
          documentIds: undefined,
        }
      );
    });
  });
});
