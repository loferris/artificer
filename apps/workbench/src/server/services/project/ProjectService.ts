import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface ProjectCreateInput {
  name: string;
  description?: string;
  userId?: string;
  settings?: Record<string, any>;
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface ProjectWithStats {
  id: string;
  name: string;
  description: string | null;
  settings: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  stats: {
    conversationCount: number;
    documentCount: number;
    knowledgeEntityCount: number;
    lastActivity: Date | null;
  };
}

export class ProjectService {
  constructor(private prisma: PrismaClient) {}

  async create(input: ProjectCreateInput) {
    try {
      logger.info('Creating new project', { name: input.name });
      
      const project = await this.prisma.project.create({
        data: {
          name: input.name,
          description: input.description,
          userId: input.userId,
          settings: input.settings || {},
        },
      });

      logger.info('Project created successfully', { projectId: project.id });
      return project;
    } catch (error) {
      logger.error('Failed to create project', error, { input });
      throw new Error('Failed to create project');
    }
  }

  async findById(id: string) {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id },
        include: {
          conversations: {
            select: { id: true, title: true, createdAt: true },
            orderBy: { updatedAt: 'desc' },
            take: 5, // Latest 5 conversations for preview
          },
          documents: {
            select: { id: true, filename: true, uploadedAt: true, size: true },
            orderBy: { uploadedAt: 'desc' },
            take: 5, // Latest 5 documents for preview
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

      if (!project) {
        throw new Error('Project not found');
      }

      return project;
    } catch (error) {
      logger.error('Failed to find project by ID', error, { projectId: id });
      throw error;
    }
  }

  async findAll(userId?: string): Promise<ProjectWithStats[]> {
    try {
      const where = userId ? { userId } : {};
      
      const projects = await this.prisma.project.findMany({
        where,
        include: {
          _count: {
            select: {
              conversations: true,
              documents: true,
              knowledgeEntities: true,
            },
          },
          conversations: {
            select: { updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        settings: project.settings as Record<string, any>,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        stats: {
          conversationCount: project._count.conversations,
          documentCount: project._count.documents,
          knowledgeEntityCount: project._count.knowledgeEntities,
          lastActivity: project.conversations[0]?.updatedAt || project.updatedAt,
        },
      }));
    } catch (error) {
      logger.error('Failed to find projects', error, { userId });
      throw new Error('Failed to fetch projects');
    }
  }

  async update(id: string, input: ProjectUpdateInput) {
    try {
      logger.info('Updating project', { projectId: id, input });
      
      const project = await this.prisma.project.update({
        where: { id },
        data: {
          ...input,
          updatedAt: new Date(),
        },
      });

      logger.info('Project updated successfully', { projectId: project.id });
      return project;
    } catch (error) {
      logger.error('Failed to update project', error, { projectId: id, input });
      throw new Error('Failed to update project');
    }
  }

  async delete(id: string) {
    try {
      logger.info('Deleting project', { projectId: id });
      
      // Prisma will handle cascade deletion of related records
      await this.prisma.project.delete({
        where: { id },
      });

      logger.info('Project deleted successfully', { projectId: id });
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete project', error, { projectId: id });
      throw new Error('Failed to delete project');
    }
  }

  async associateConversation(projectId: string, conversationId: string) {
    try {
      logger.info('Associating conversation with project', { projectId, conversationId });
      
      const conversation = await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { projectId },
      });

      logger.info('Conversation associated with project', { projectId, conversationId });
      return conversation;
    } catch (error) {
      logger.error('Failed to associate conversation with project', error, { projectId, conversationId });
      throw new Error('Failed to associate conversation with project');
    }
  }

  async getProjectConversations(projectId: string) {
    try {
      const conversations = await this.prisma.conversation.findMany({
        where: { projectId },
        include: {
          messages: {
            select: { id: true, role: true, content: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1, // Latest message for preview
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return conversations.map(conv => ({
        ...conv,
        messageCount: conv._count.messages,
        lastMessagePreview: conv.messages[0]?.content?.substring(0, 100),
      }));
    } catch (error) {
      logger.error('Failed to get project conversations', error, { projectId });
      throw new Error('Failed to fetch project conversations');
    }
  }
}