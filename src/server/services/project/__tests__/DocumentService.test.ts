import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DocumentService } from '../DocumentService';

// Mock logger to prevent console noise in tests
vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('DocumentService', () => {
  let documentService: DocumentService;
  let mockPrisma: any;

  beforeEach(() => {
    // Create a fresh mock Prisma client for each test
    mockPrisma = {
      document: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        aggregate: vi.fn(),
        groupBy: vi.fn(),
      },
    };

    documentService = new DocumentService(mockPrisma as unknown as PrismaClient);
  });

  describe('create', () => {
    it('should create a document with valid data', async () => {
      const input = {
        projectId: 'proj-123',
        filename: 'test.txt',
        originalName: 'test.txt',
        contentType: 'text/plain',
        content: 'Hello world',
        size: 11,
        metadata: { uploadedBy: 'user-123' },
      };

      const mockDocument = {
        id: 'doc-123',
        ...input,
        embedding: [],
        uploadedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.document.create.mockResolvedValue(mockDocument);

      const result = await documentService.create(input);

      expect(result).toEqual(mockDocument);
      expect(mockPrisma.document.create).toHaveBeenCalledWith({
        data: {
          projectId: input.projectId,
          filename: input.filename,
          originalName: input.originalName,
          contentType: input.contentType,
          content: input.content,
          size: input.size,
          embedding: [],
          metadata: input.metadata,
        },
      });
    });

    it('should create document with empty embedding array', async () => {
      const input = {
        projectId: 'proj-123',
        filename: 'test.txt',
        originalName: 'test.txt',
        contentType: 'text/plain',
        content: 'Hello world',
        size: 11,
      };

      const mockDocument = {
        id: 'doc-123',
        ...input,
        embedding: [],
        metadata: {},
        uploadedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.document.create.mockResolvedValue(mockDocument);

      const result = await documentService.create(input);

      expect(result.embedding).toEqual([]);
    });

    it('should apply default empty metadata when not provided', async () => {
      const input = {
        projectId: 'proj-123',
        filename: 'test.txt',
        originalName: 'test.txt',
        contentType: 'text/plain',
        content: 'Hello world',
        size: 11,
      };

      mockPrisma.document.create.mockResolvedValue({
        id: 'doc-123',
        ...input,
        embedding: [],
        metadata: {},
        uploadedAt: new Date(),
        updatedAt: new Date(),
      });

      await documentService.create(input);

      expect(mockPrisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: {},
        }),
      });
    });

    it('should throw error on database failure', async () => {
      const input = {
        projectId: 'proj-123',
        filename: 'test.txt',
        originalName: 'test.txt',
        contentType: 'text/plain',
        content: 'Hello world',
        size: 11,
      };

      mockPrisma.document.create.mockRejectedValue(new Error('Database error'));

      await expect(documentService.create(input)).rejects.toThrow('Failed to create document');
    });
  });

  describe('findById', () => {
    it('should return document with project info', async () => {
      const documentId = 'doc-123';
      const mockDocument = {
        id: documentId,
        projectId: 'proj-123',
        filename: 'test.txt',
        originalName: 'test.txt',
        contentType: 'text/plain',
        content: 'Hello world',
        size: 11,
        embedding: [],
        metadata: {},
        uploadedAt: new Date(),
        updatedAt: new Date(),
        project: {
          id: 'proj-123',
          name: 'Test Project',
        },
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);

      const result = await documentService.findById(documentId);

      expect(result).toEqual(mockDocument);
      expect(mockPrisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: documentId },
        include: {
          project: {
            select: { id: true, name: true },
          },
        },
      });
    });

    it('should throw error when document not found', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);

      await expect(documentService.findById('nonexistent')).rejects.toThrow('Document not found');
    });
  });

  describe('findByProject', () => {
    it('should return all documents for a project', async () => {
      const projectId = 'proj-123';
      const mockDocuments = [
        {
          id: 'doc-1',
          filename: 'test1.txt',
          originalName: 'test1.txt',
          contentType: 'text/plain',
          size: 100,
          uploadedAt: new Date('2024-01-15'),
          metadata: {},
        },
        {
          id: 'doc-2',
          filename: 'test2.txt',
          originalName: 'test2.txt',
          contentType: 'text/plain',
          size: 200,
          uploadedAt: new Date('2024-01-10'),
          metadata: {},
        },
      ];

      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);

      const result = await documentService.findByProject(projectId);

      expect(result).toEqual(mockDocuments);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: { projectId },
        select: {
          id: true,
          filename: true,
          originalName: true,
          contentType: true,
          size: true,
          uploadedAt: true,
          metadata: true,
        },
        orderBy: { uploadedAt: 'desc' },
      });
    });

    it('should throw error on database failure', async () => {
      mockPrisma.document.findMany.mockRejectedValue(new Error('Database error'));

      await expect(documentService.findByProject('proj-123')).rejects.toThrow(
        'Failed to fetch project documents'
      );
    });
  });

  describe('delete', () => {
    it('should delete document successfully', async () => {
      const documentId = 'doc-123';
      mockPrisma.document.delete.mockResolvedValue({ id: documentId });

      const result = await documentService.delete(documentId);

      expect(result).toEqual({ success: true });
      expect(mockPrisma.document.delete).toHaveBeenCalledWith({
        where: { id: documentId },
      });
    });

    it('should throw error when document does not exist', async () => {
      mockPrisma.document.delete.mockRejectedValue(new Error('Record not found'));

      await expect(documentService.delete('nonexistent')).rejects.toThrow('Failed to delete document');
    });
  });

  describe('updateContent', () => {
    it('should update document content', async () => {
      const documentId = 'doc-123';
      const newContent = 'Updated content';

      const mockUpdatedDocument = {
        id: documentId,
        projectId: 'proj-123',
        filename: 'test.txt',
        originalName: 'test.txt',
        contentType: 'text/plain',
        content: newContent,
        size: 15,
        embedding: [],
        metadata: {},
        uploadedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.document.update.mockResolvedValue(mockUpdatedDocument);

      const result = await documentService.updateContent(documentId, newContent);

      expect(result).toEqual(mockUpdatedDocument);
      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: documentId },
        data: {
          content: newContent,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should throw error when document does not exist', async () => {
      mockPrisma.document.update.mockRejectedValue(new Error('Record not found'));

      await expect(
        documentService.updateContent('nonexistent', 'new content')
      ).rejects.toThrow('Failed to update document content');
    });
  });

  describe('searchContent', () => {
    it('should find documents by content match', async () => {
      const projectId = 'proj-123';
      const query = 'hello';

      const mockDocuments = [
        {
          id: 'doc-1',
          filename: 'test.txt',
          content: 'Hello world',
          metadata: {},
        },
      ];

      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);

      const results = await documentService.searchContent(projectId, query);

      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('Hello world');
      expect(results[0].similarity).toBe(0.8); // Placeholder score
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: {
          projectId,
          OR: [
            { content: { contains: query, mode: 'insensitive' } },
            { filename: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          filename: true,
          content: true,
          metadata: true,
        },
        take: 5,
      });
    });

    it('should find documents by filename match', async () => {
      const projectId = 'proj-123';
      const query = 'test';

      const mockDocuments = [
        {
          id: 'doc-1',
          filename: 'test.txt',
          content: 'Some content',
          metadata: {},
        },
      ];

      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);

      const results = await documentService.searchContent(projectId, query);

      expect(results).toHaveLength(1);
      expect(results[0].filename).toBe('test.txt');
    });

    it('should respect limit parameter', async () => {
      const projectId = 'proj-123';
      const query = 'test';
      const limit = 3;

      mockPrisma.document.findMany.mockResolvedValue([]);

      await documentService.searchContent(projectId, query, limit);

      expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: limit,
        })
      );
    });

    it('should perform case-insensitive search', async () => {
      const projectId = 'proj-123';
      const query = 'HELLO';

      mockPrisma.document.findMany.mockResolvedValue([]);

      await documentService.searchContent(projectId, query);

      expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ content: { contains: query, mode: 'insensitive' } }),
            ]),
          }),
        })
      );
    });

    it('should throw error on database failure', async () => {
      mockPrisma.document.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        documentService.searchContent('proj-123', 'query')
      ).rejects.toThrow('Failed to search documents');
    });
  });

  describe('extractTextContent', () => {
    it('should extract from text/plain', () => {
      const buffer = Buffer.from('Hello world', 'utf-8');
      const result = documentService.extractTextContent(buffer, 'text/plain');
      expect(result).toBe('Hello world');
    });

    it('should extract from text/markdown', () => {
      const buffer = Buffer.from('# Heading\n\nContent', 'utf-8');
      const result = documentService.extractTextContent(buffer, 'text/markdown');
      expect(result).toBe('# Heading\n\nContent');
    });

    it('should extract from application/json', () => {
      const buffer = Buffer.from('{"key": "value"}', 'utf-8');
      const result = documentService.extractTextContent(buffer, 'application/json');
      expect(result).toBe('{"key": "value"}');
    });

    it('should extract from text/csv', () => {
      const buffer = Buffer.from('name,age\nJohn,30', 'utf-8');
      const result = documentService.extractTextContent(buffer, 'text/csv');
      expect(result).toBe('name,age\nJohn,30');
    });

    it('should throw error for binary files with low printable ratio', () => {
      // Create a buffer with mostly non-printable characters
      const binaryBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);

      expect(() => {
        documentService.extractTextContent(binaryBuffer, 'application/pdf');
      }).toThrow('Failed to extract content from application/pdf file');
    });

    it('should accept text content in unsupported types if printable', () => {
      const buffer = Buffer.from('This is readable text content', 'utf-8');
      const result = documentService.extractTextContent(buffer, 'application/unknown');
      expect(result).toBe('This is readable text content');
    });
  });

  describe('getProjectDocumentStats', () => {
    it('should return total count and size', async () => {
      const projectId = 'proj-123';

      mockPrisma.document.aggregate.mockResolvedValue({
        _count: { id: 10 },
        _sum: { size: 5000 },
      });

      mockPrisma.document.groupBy.mockResolvedValue([
        { contentType: 'text/plain', _count: { id: 5 } },
        { contentType: 'text/markdown', _count: { id: 5 } },
      ]);

      const stats = await documentService.getProjectDocumentStats(projectId);

      expect(stats.totalCount).toBe(10);
      expect(stats.totalSize).toBe(5000);
      expect(stats.typeBreakdown).toHaveLength(2);
    });

    it('should group by content type', async () => {
      const projectId = 'proj-123';

      mockPrisma.document.aggregate.mockResolvedValue({
        _count: { id: 10 },
        _sum: { size: 5000 },
      });

      mockPrisma.document.groupBy.mockResolvedValue([
        { contentType: 'text/plain', _count: { id: 7 } },
        { contentType: 'text/csv', _count: { id: 3 } },
      ]);

      const stats = await documentService.getProjectDocumentStats(projectId);

      expect(stats.typeBreakdown).toEqual([
        { contentType: 'text/plain', count: 7 },
        { contentType: 'text/csv', count: 3 },
      ]);
    });

    it('should handle projects with no documents', async () => {
      mockPrisma.document.aggregate.mockResolvedValue({
        _count: { id: null },
        _sum: { size: null },
      });

      mockPrisma.document.groupBy.mockResolvedValue([]);

      const stats = await documentService.getProjectDocumentStats('proj-123');

      expect(stats.totalCount).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.typeBreakdown).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockPrisma.document.aggregate.mockRejectedValue(new Error('Database error'));

      await expect(
        documentService.getProjectDocumentStats('proj-123')
      ).rejects.toThrow('Failed to get document statistics');
    });
  });
});
