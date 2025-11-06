import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ProjectService } from '../ProjectService';

// Mock logger to prevent console noise in tests
vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ProjectService', () => {
  let projectService: ProjectService;
  let mockPrisma: any;

  beforeEach(() => {
    // Create a fresh mock Prisma client for each test
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
    };

    projectService = new ProjectService(mockPrisma as unknown as PrismaClient);
  });

  describe('create', () => {
    it('should create a project with valid data', async () => {
      const input = {
        name: 'Test Project',
        description: 'Test description',
        userId: 'user-123',
        settings: { theme: 'dark' },
      };

      const mockProject = {
        id: 'proj-123',
        name: input.name,
        description: input.description,
        userId: input.userId,
        settings: input.settings,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.project.create.mockResolvedValue(mockProject);

      const result = await projectService.create(input);

      expect(result).toEqual(mockProject);
      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: {
          name: input.name,
          description: input.description,
          userId: input.userId,
          settings: input.settings,
        },
      });
    });

    it('should apply default empty settings when not provided', async () => {
      const input = {
        name: 'Test Project',
        userId: 'user-123',
      };

      const mockProject = {
        id: 'proj-123',
        name: input.name,
        description: null,
        userId: input.userId,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.project.create.mockResolvedValue(mockProject);

      await projectService.create(input);

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: {
          name: input.name,
          description: undefined,
          userId: input.userId,
          settings: {},
        },
      });
    });

    it('should throw error on database failure', async () => {
      const input = {
        name: 'Test Project',
        userId: 'user-123',
      };

      mockPrisma.project.create.mockRejectedValue(new Error('Database error'));

      await expect(projectService.create(input)).rejects.toThrow('Failed to create project');
    });
  });

  describe('findById', () => {
    it('should return project with related data', async () => {
      const projectId = 'proj-123';
      const mockProject = {
        id: projectId,
        name: 'Test Project',
        description: 'Test description',
        userId: 'user-123',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        conversations: [
          { id: 'conv-1', title: 'Conv 1', createdAt: new Date() },
        ],
        documents: [
          { id: 'doc-1', filename: 'test.txt', uploadedAt: new Date(), size: 100 },
        ],
        _count: {
          conversations: 5,
          documents: 3,
          knowledgeEntities: 10,
        },
      };

      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      const result = await projectService.findById(projectId);

      expect(result).toEqual(mockProject);
      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        include: {
          conversations: {
            select: { id: true, title: true, createdAt: true },
            orderBy: { updatedAt: 'desc' },
            take: 5,
          },
          documents: {
            select: { id: true, filename: true, uploadedAt: true, size: true },
            orderBy: { uploadedAt: 'desc' },
            take: 5,
          },
          _count: {
            select: {
              conversations: true,
              documents: true,
              knowledgeEntities: true,
            },
          },
        },
      });
    });

    it('should throw error when project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(projectService.findById('nonexistent')).rejects.toThrow('Project not found');
    });
  });

  describe('findAll', () => {
    it('should return all projects with stats', async () => {
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Project 1',
          description: 'Desc 1',
          settings: { theme: 'dark' },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-10'),
          _count: {
            conversations: 5,
            documents: 3,
            knowledgeEntities: 10,
          },
          conversations: [{ updatedAt: new Date('2024-01-15') }],
        },
        {
          id: 'proj-2',
          name: 'Project 2',
          description: null,
          settings: {},
          createdAt: new Date('2024-01-05'),
          updatedAt: new Date('2024-01-20'),
          _count: {
            conversations: 2,
            documents: 1,
            knowledgeEntities: 5,
          },
          conversations: [],
        },
      ];

      mockPrisma.project.findMany.mockResolvedValue(mockProjects);

      const result = await projectService.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'proj-1',
        name: 'Project 1',
        stats: {
          conversationCount: 5,
          documentCount: 3,
          knowledgeEntityCount: 10,
          lastActivity: mockProjects[0].conversations[0].updatedAt,
        },
      });
      expect(result[1].stats.lastActivity).toEqual(mockProjects[1].updatedAt);
    });

    it('should filter by userId when provided', async () => {
      const userId = 'user-123';
      mockPrisma.project.findMany.mockResolvedValue([]);

      await projectService.findAll(userId);

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: expect.any(Object),
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should throw error on database failure', async () => {
      mockPrisma.project.findMany.mockRejectedValue(new Error('Database error'));

      await expect(projectService.findAll()).rejects.toThrow('Failed to fetch projects');
    });
  });

  describe('update', () => {
    it('should update project fields', async () => {
      const projectId = 'proj-123';
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        settings: { theme: 'light' },
      };

      const mockUpdatedProject = {
        id: projectId,
        ...updateData,
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.project.update.mockResolvedValue(mockUpdatedProject);

      const result = await projectService.update(projectId, updateData);

      expect(result).toEqual(mockUpdatedProject);
      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: {
          ...updateData,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should throw error when project does not exist', async () => {
      mockPrisma.project.update.mockRejectedValue(new Error('Record not found'));

      await expect(
        projectService.update('nonexistent', { name: 'Test' })
      ).rejects.toThrow('Failed to update project');
    });
  });

  describe('delete', () => {
    it('should delete project successfully', async () => {
      const projectId = 'proj-123';
      mockPrisma.project.delete.mockResolvedValue({ id: projectId });

      const result = await projectService.delete(projectId);

      expect(result).toEqual({ success: true });
      expect(mockPrisma.project.delete).toHaveBeenCalledWith({
        where: { id: projectId },
      });
    });

    it('should throw error when project does not exist', async () => {
      mockPrisma.project.delete.mockRejectedValue(new Error('Record not found'));

      await expect(projectService.delete('nonexistent')).rejects.toThrow('Failed to delete project');
    });
  });

  describe('associateConversation', () => {
    it('should link conversation to project', async () => {
      const projectId = 'proj-123';
      const conversationId = 'conv-123';

      const mockConversation = {
        id: conversationId,
        projectId,
        title: 'Test Conversation',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.conversation.update.mockResolvedValue(mockConversation);

      const result = await projectService.associateConversation(projectId, conversationId);

      expect(result).toEqual(mockConversation);
      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: conversationId },
        data: { projectId },
      });
    });

    it('should throw error for invalid conversation', async () => {
      mockPrisma.conversation.update.mockRejectedValue(new Error('Record not found'));

      await expect(
        projectService.associateConversation('proj-123', 'invalid')
      ).rejects.toThrow('Failed to associate conversation with project');
    });
  });

  describe('getProjectConversations', () => {
    it('should return conversations with message preview', async () => {
      const projectId = 'proj-123';

      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Conversation 1',
          projectId,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [
            {
              id: 'msg-1',
              role: 'user',
              content: 'This is a long message that should be truncated to 100 characters for the preview display',
              createdAt: new Date(),
            },
          ],
          _count: { messages: 5 },
        },
      ];

      mockPrisma.conversation.findMany.mockResolvedValue(mockConversations);

      const result = await projectService.getProjectConversations(projectId);

      expect(result).toHaveLength(1);
      expect(result[0].messageCount).toBe(5);
      expect(result[0].lastMessagePreview?.length).toBeLessThanOrEqual(100);
      expect(result[0].lastMessagePreview).toBe(
        'This is a long message that should be truncated to 100 characters for the preview display'
      );
    });

    it('should return conversations ordered by updatedAt desc', async () => {
      const projectId = 'proj-123';

      mockPrisma.conversation.findMany.mockResolvedValue([]);

      await projectService.getProjectConversations(projectId);

      expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith({
        where: { projectId },
        include: expect.any(Object),
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should include message count and latest message', async () => {
      const projectId = 'proj-123';

      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          id: 'conv-1',
          title: 'Test',
          projectId,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [{ id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date() }],
          _count: { messages: 3 },
        },
      ]);

      const result = await projectService.getProjectConversations(projectId);

      expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith({
        where: { projectId },
        include: {
          messages: {
            select: { id: true, role: true, content: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      expect(result[0].messageCount).toBe(3);
    });

    it('should throw error on database failure', async () => {
      mockPrisma.conversation.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        projectService.getProjectConversations('proj-123')
      ).rejects.toThrow('Failed to fetch project conversations');
    });
  });
});
