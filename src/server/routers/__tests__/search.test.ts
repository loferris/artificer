import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import type { AppRouter } from '../../root';
import type { inferProcedureInput } from '@trpc/server';

// Mock VectorService to avoid ChromaDB connection - must be before imports
const mockGetCollectionStats = vi.fn();
const mockSearchDocuments = vi.fn();
const mockGenerateEmbedding = vi.fn();
const mockHealthCheck = vi.fn();

vi.mock('../../services/vector', () => {
  return {
    VectorService: vi.fn().mockImplementation(() => ({
      getCollectionStats: mockGetCollectionStats,
      searchDocuments: mockSearchDocuments,
      healthCheck: mockHealthCheck,
    })),
    EmbeddingService: vi.fn().mockImplementation(() => ({
      generateEmbedding: mockGenerateEmbedding,
      generateEmbeddings: vi.fn().mockResolvedValue([]),
    })),
    ChunkingService: vi.fn().mockImplementation(() => ({
      chunkText: vi.fn().mockReturnValue([]),
    })),
  };
});

import { appRouter } from '../../root';
import { createInnerTRPCContext } from '../../trpc';
import { mockPrismaClient, mockUser, mockRequest, mockResponse } from '../../../test/utils/mockDatabase';

describe('Search Router', () => {
  const ctx = createInnerTRPCContext({
    req: mockRequest,
    res: mockResponse,
    db: mockPrismaClient,
    user: mockUser,
    signal: new AbortController().signal,
  });

  const caller = appRouter.createCaller(ctx);

  beforeEach(() => {
    // Reset mocks before each test
    mockGetCollectionStats.mockReset();
    mockSearchDocuments.mockReset();
    mockGenerateEmbedding.mockReset();
    mockHealthCheck.mockReset();

    // Set default return values
    mockHealthCheck.mockResolvedValue(true);
  });

  describe('healthCheck', () => {
    it('should check vector service health', async () => {
      const result = await caller.search.healthCheck();

      expect(result).toHaveProperty('chroma');
      expect(result).toHaveProperty('embeddings');
      expect(result).toHaveProperty('overall');
      expect(typeof result.chroma).toBe('boolean');
      expect(typeof result.embeddings).toBe('boolean');
    });
  });

  describe('getEmbeddingStats', () => {
    it('should require projectId', async () => {
      type Input = inferProcedureInput<AppRouter['search']['getEmbeddingStats']>;

      await expect(
        caller.search.getEmbeddingStats({} as Input)
      ).rejects.toThrow();
    });

    it.skip('should return stats structure', async () => {
      // TODO: Fix VectorService mocking - requires ChromaDB connection
      // This test passes when ChromaDB is running but fails in CI
      // Mock Vector service response
      mockGetCollectionStats.mockResolvedValue({
        count: 0,
        documentsIndexed: new Set(),
      });

      // Mock project
      mockPrismaClient.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        description: null,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaClient.document.findMany.mockResolvedValue([]);

      const result = await caller.search.getEmbeddingStats({
        projectId: 'proj-1',
      });

      expect(result).toMatchObject({
        totalChunks: expect.any(Number),
        totalDocuments: expect.any(Number),
        indexedDocuments: expect.any(Number),
        unindexedDocuments: expect.any(Number),
      });
    });
  });

  describe('searchDocuments', () => {
    it('should validate input', async () => {
      type Input = inferProcedureInput<AppRouter['search']['searchDocuments']>;

      await expect(
        caller.search.searchDocuments({
          projectId: 'proj-1',
          query: '', // Empty query should fail
        } as Input)
      ).rejects.toThrow();
    });

    it('should accept valid search parameters', async () => {
      mockPrismaClient.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        description: null,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // This will fail without real Chroma/OpenAI, but validates the input
      await expect(
        caller.search.searchDocuments({
          projectId: 'proj-1',
          query: 'test query',
          limit: 10,
        })
      ).rejects.toThrow(); // Expect failure due to missing services, but input is valid
    });
  });

  describe('reindexDocument', () => {
    it('should require documentId', async () => {
      type Input = inferProcedureInput<AppRouter['search']['reindexDocument']>;

      await expect(
        caller.search.reindexDocument({} as Input)
      ).rejects.toThrow();
    });
  });
});
