import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { projectsRouter } from '../projects';
import { TRPCError } from '@trpc/server';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Projects Router', () => {
  let mockPrisma: any;
  let mockContext: any;

  beforeEach(() => {
    mockPrisma = {
      project: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      conversation: {
        update: vi.fn(),
        findMany: vi.fn(),
      },
      document: {
        create: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
        aggregate: vi.fn(),
        groupBy: vi.fn(),
      },
    };

    mockContext = {
      req: {
        headers: {
          'user-agent': 'test-agent',
        },
      },
      res: {
        setHeader: vi.fn(),
      },
      db: mockPrisma,
      user: { id: 'user-123', sessionId: 'test-session' },
    };
  });

  describe('Input Validation', () => {
    it('should reject empty project name', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      await expect(
        caller.create({ name: '', description: 'Test' })
      ).rejects.toThrow();
    });

    it('should reject project name longer than 100 characters', async () => {
      const caller = projectsRouter.createCaller(mockContext);
      const longName = 'a'.repeat(101);

      await expect(
        caller.create({ name: longName })
      ).rejects.toThrow();
    });

    it('should reject description longer than 500 characters', async () => {
      const caller = projectsRouter.createCaller(mockContext);
      const longDescription = 'a'.repeat(501);

      await expect(
        caller.create({ name: 'Test', description: longDescription })
      ).rejects.toThrow();
    });

    it('should accept valid project data', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      const mockProject = {
        id: 'proj-123',
        name: 'Test Project',
        description: 'Test description',
        userId: 'anonymous',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.project.create.mockResolvedValue(mockProject);

      const result = await caller.create({
        name: 'Test Project',
        description: 'Test description',
      });

      expect(result.success).toBe(true);
      expect(result.project).toEqual(mockProject);
    });
  });

  describe('create', () => {
    it('should create project and return success response', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      const mockProject = {
        id: 'proj-123',
        name: 'Test Project',
        description: 'Test description',
        userId: 'anonymous',
        settings: { theme: 'dark' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.project.create.mockResolvedValue(mockProject);

      const result = await caller.create({
        name: 'Test Project',
        description: 'Test description',
        settings: { theme: 'dark' },
      });

      expect(result.success).toBe(true);
      expect(result.project).toEqual(mockProject);
      expect(result.timestamp).toBeDefined();
    });

    it('should return error response on failure without throwing', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      mockPrisma.project.create.mockRejectedValue(new Error('Database error'));

      const result = await caller.create({
        name: 'Test Project',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should return error when database not available (demo mode)', async () => {
      const demoContext = {
        req: {
          headers: {
            'user-agent': 'test-agent',
          },
        },
        res: {
          setHeader: vi.fn(),
        },
        db: null,
        user: { id: 'user-123', sessionId: 'test-session' },
      };
      const caller = projectsRouter.createCaller(demoContext);

      const result = await caller.create({ name: 'Test Project' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available in demo mode');
    });
  });

  describe('list', () => {
    it('should return all projects with stats', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Project 1',
          description: 'Desc 1',
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: {
            conversations: 5,
            documents: 3,
            knowledgeEntities: 10,
          },
          conversations: [{ updatedAt: new Date() }],
        },
      ];

      mockPrisma.project.findMany.mockResolvedValue(mockProjects);

      const result = await caller.list();

      expect(result.success).toBe(true);
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0]).toHaveProperty('stats');
    });

    it('should return error response on database failure', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      mockPrisma.project.findMany.mockRejectedValue(new Error('Database error'));

      const result = await caller.list();

      expect(result.success).toBe(false);
      expect(result.projects).toEqual([]);
      expect(result.error).toBeDefined();
    });
  });

  describe('getById', () => {
    it('should return project details', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      const mockProject = {
        id: 'proj-123',
        name: 'Test Project',
        description: 'Test',
        userId: 'user-123',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        conversations: [],
        documents: [],
        _count: {
          conversations: 0,
          documents: 0,
          knowledgeEntities: 0,
        },
      };

      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      const result = await caller.getById({ id: 'proj-123' });

      expect(result.success).toBe(true);
      expect(result.project).toEqual(mockProject);
    });

    it('should return error for invalid project ID', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      mockPrisma.project.findUnique.mockResolvedValue(null);

      const result = await caller.getById({ id: 'nonexistent' });

      expect(result.success).toBe(false);
      expect(result.project).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update project and return updated data', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      const mockUpdatedProject = {
        id: 'proj-123',
        name: 'Updated Name',
        description: 'Updated description',
        userId: 'user-123',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.project.update.mockResolvedValue(mockUpdatedProject);

      const result = await caller.update({
        id: 'proj-123',
        data: {
          name: 'Updated Name',
          description: 'Updated description',
        },
      });

      expect(result.success).toBe(true);
      expect(result.project).toEqual(mockUpdatedProject);
    });

    it('should return error when project does not exist', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      mockPrisma.project.update.mockRejectedValue(new Error('Record not found'));

      const result = await caller.update({
        id: 'nonexistent',
        data: { name: 'Test' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete project successfully', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      mockPrisma.project.delete.mockResolvedValue({ id: 'proj-123' });

      const result = await caller.delete({ id: 'proj-123' });

      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('should return error when project does not exist', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      mockPrisma.project.delete.mockRejectedValue(new Error('Record not found'));

      const result = await caller.delete({ id: 'nonexistent' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Document Operations', () => {
    it('should upload document successfully', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      const content = Buffer.from('Hello world').toString('base64');

      const mockDocument = {
        id: 'doc-123',
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
      };

      mockPrisma.document.create.mockResolvedValue(mockDocument);

      const result = await caller.uploadDocument({
        projectId: 'proj-123',
        filename: 'test.txt',
        content,
        contentType: 'text/plain',
      });

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document?.filename).toBe('test.txt');
    });

    it('should get documents for project', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      const mockDocuments = [
        {
          id: 'doc-1',
          filename: 'test1.txt',
          originalName: 'test1.txt',
          contentType: 'text/plain',
          size: 100,
          uploadedAt: new Date(),
          metadata: {},
        },
      ];

      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);

      const result = await caller.getDocuments({ projectId: 'proj-123' });

      expect(result.success).toBe(true);
      expect(result.documents).toEqual(mockDocuments);
    });

    it('should delete document successfully', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      mockPrisma.document.delete.mockResolvedValue({ id: 'doc-123' });

      const result = await caller.deleteDocument({ documentId: 'doc-123' });

      expect(result.success).toBe(true);
    });

    it('should validate search query minimum length', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      await expect(
        caller.searchDocuments({ projectId: 'proj-123', query: '' })
      ).rejects.toThrow();
    });
  });

  describe('Association Operations', () => {
    it('should associate conversation with project', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      const mockConversation = {
        id: 'conv-123',
        projectId: 'proj-123',
        title: 'Test Conversation',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.conversation.update.mockResolvedValue(mockConversation);

      const result = await caller.associateConversation({
        projectId: 'proj-123',
        conversationId: 'conv-123',
      });

      expect(result.success).toBe(true);
      expect(result.conversation).toEqual(mockConversation);
    });

    it('should return error when conversation does not exist', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      mockPrisma.conversation.update.mockRejectedValue(new Error('Record not found'));

      const result = await caller.associateConversation({
        projectId: 'proj-123',
        conversationId: 'invalid',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should get conversations for project', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Test',
          projectId: 'proj-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [{ id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date() }],
          _count: { messages: 3 },
          messageCount: 3,
          lastMessagePreview: 'Hello',
        },
      ];

      mockPrisma.conversation.findMany.mockResolvedValue(mockConversations);

      const result = await caller.getConversations({ projectId: 'proj-123' });

      expect(result.success).toBe(true);
      expect(result.conversations).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should return error object with message on create failure', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      mockPrisma.project.create.mockRejectedValue(new Error('Unique constraint violation'));

      const result = await caller.create({ name: 'Duplicate' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create project');
      expect(result.timestamp).toBeDefined();
    });

    it('should return error object on upload failure', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      mockPrisma.document.create.mockRejectedValue(new Error('Storage error'));

      const content = Buffer.from('Test').toString('base64');

      const result = await caller.uploadDocument({
        projectId: 'proj-123',
        filename: 'test.txt',
        content,
        contentType: 'text/plain',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid base64 content gracefully', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      // Base64 will decode anything, but extraction might fail
      mockPrisma.document.create.mockRejectedValue(new Error('Invalid content'));

      const result = await caller.uploadDocument({
        projectId: 'proj-123',
        filename: 'test.txt',
        content: 'invalid-base64!!!',
        contentType: 'text/plain',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return empty array on search failure', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      mockPrisma.document.findMany.mockRejectedValue(new Error('Search error'));

      const result = await caller.searchDocuments({
        projectId: 'proj-123',
        query: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.results).toEqual([]);
      expect(result.error).toBeDefined();
    });

    it('should return null stats on stats failure', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      mockPrisma.document.aggregate.mockRejectedValue(new Error('Stats error'));

      const result = await caller.getDocumentStats({ projectId: 'proj-123' });

      expect(result.success).toBe(false);
      expect(result.stats).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should return empty conversations on getConversations failure', async () => {
      const caller = projectsRouter.createCaller(mockContext);

      mockPrisma.conversation.findMany.mockRejectedValue(new Error('Database error'));

      const result = await caller.getConversations({ projectId: 'proj-123' });

      expect(result.success).toBe(false);
      expect(result.conversations).toEqual([]);
      expect(result.error).toBeDefined();
    });
  });
});
