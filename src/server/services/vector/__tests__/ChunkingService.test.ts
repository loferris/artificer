import { describe, it, expect } from 'vitest';
import { ChunkingService } from '../ChunkingService';

describe('ChunkingService', () => {
  describe('chunkDocument', () => {
    it('should chunk a document into segments', () => {
      const service = new ChunkingService({ chunkSize: 100, chunkOverlap: 20 });

      const content = 'A'.repeat(250); // 250 characters
      const chunks = service.chunkDocument('doc-1', 'proj-1', content, 'test.md');

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].content.length).toBeLessThanOrEqual(100);
      expect(chunks[0].metadata.totalChunks).toBe(chunks.length);
    });

    it('should handle small documents', () => {
      const service = new ChunkingService();

      const content = 'Small document';
      const chunks = service.chunkDocument('doc-1', 'proj-1', content, 'test.md');

      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toBe(content);
    });

    it('should create proper chunk metadata', () => {
      const service = new ChunkingService();

      const content = 'Test content';
      const chunks = service.chunkDocument('doc-1', 'proj-1', content, 'test.md');

      expect(chunks[0]).toMatchObject({
        id: 'doc-1_chunk_0',
        documentId: 'doc-1',
        projectId: 'proj-1',
        metadata: {
          filename: 'test.md',
          chunkIndex: 0,
          totalChunks: 1,
          startChar: 0,
        },
      });
    });

    it('should handle empty content', () => {
      const service = new ChunkingService();

      const chunks = service.chunkDocument('doc-1', 'proj-1', '', 'test.md');

      expect(chunks).toEqual([]);
    });
  });

  describe('estimateChunkCount', () => {
    it('should estimate correct chunk count', () => {
      const service = new ChunkingService({ chunkSize: 1000, chunkOverlap: 200 });

      expect(service.estimateChunkCount(500)).toBe(1);
      expect(service.estimateChunkCount(1500)).toBe(2);
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const service = new ChunkingService({ chunkSize: 1000, chunkOverlap: 200 });

      const result = service.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should catch invalid chunk size', () => {
      const service = new ChunkingService({ chunkSize: -1 });

      const result = service.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chunk size must be positive');
    });

    it('should catch overlap >= chunk size', () => {
      const service = new ChunkingService({ chunkSize: 100, chunkOverlap: 100 });

      const result = service.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chunk overlap must be less than chunk size');
    });
  });
});
