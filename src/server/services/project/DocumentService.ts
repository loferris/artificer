import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface DocumentCreateInput {
  projectId: string;
  filename: string;
  originalName: string;
  contentType: string;
  content: string;
  size: number;
  metadata?: Record<string, any>;
}

export interface DocumentSearchResult {
  id: string;
  filename: string;
  content: string;
  similarity?: number;
  metadata?: Record<string, any>;
}

export class DocumentService {
  constructor(private prisma: PrismaClient) {}

  async create(input: DocumentCreateInput) {
    try {
      logger.info('Creating new document', { 
        projectId: input.projectId, 
        filename: input.filename,
        size: input.size 
      });

      // TODO: Generate embedding for the content
      // For now, we'll use an empty array and implement embeddings later
      const embedding: number[] = [];
      
      const document = await this.prisma.document.create({
        data: {
          projectId: input.projectId,
          filename: input.filename,
          originalName: input.originalName,
          contentType: input.contentType,
          content: input.content,
          size: input.size,
          embedding,
          metadata: input.metadata || {},
        },
      });

      logger.info('Document created successfully', { 
        documentId: document.id,
        projectId: input.projectId 
      });
      
      return document;
    } catch (error) {
      logger.error('Failed to create document', error, { input });
      throw new Error('Failed to create document');
    }
  }

  async findById(id: string) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id },
        include: {
          project: {
            select: { id: true, name: true },
          },
        },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      return document;
    } catch (error) {
      logger.error('Failed to find document by ID', error, { documentId: id });
      throw error;
    }
  }

  async findByProject(projectId: string) {
    try {
      const documents = await this.prisma.document.findMany({
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

      return documents;
    } catch (error) {
      logger.error('Failed to find documents by project', error, { projectId });
      throw new Error('Failed to fetch project documents');
    }
  }

  async searchContent(projectId: string, query: string, limit = 5): Promise<DocumentSearchResult[]> {
    try {
      // TODO: Implement proper vector similarity search
      // For now, we'll do a simple text search
      const documents = await this.prisma.document.findMany({
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
        take: limit,
      });

      return documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        content: doc.content,
        metadata: doc.metadata as Record<string, any>,
        similarity: 0.8, // Placeholder similarity score
      }));
    } catch (error) {
      logger.error('Failed to search document content', error, { projectId, query });
      throw new Error('Failed to search documents');
    }
  }

  async delete(id: string) {
    try {
      logger.info('Deleting document', { documentId: id });
      
      await this.prisma.document.delete({
        where: { id },
      });

      logger.info('Document deleted successfully', { documentId: id });
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete document', error, { documentId: id });
      throw new Error('Failed to delete document');
    }
  }

  async updateContent(id: string, content: string) {
    try {
      logger.info('Updating document content', { documentId: id });
      
      // TODO: Regenerate embedding when content changes
      const document = await this.prisma.document.update({
        where: { id },
        data: {
          content,
          updatedAt: new Date(),
          // embedding: newEmbedding, // TODO: Generate new embedding
        },
      });

      logger.info('Document content updated successfully', { documentId: id });
      return document;
    } catch (error) {
      logger.error('Failed to update document content', error, { documentId: id });
      throw new Error('Failed to update document content');
    }
  }

  /**
   * Extract text content from various file types
   * This is a placeholder implementation - in production, you'd use libraries like:
   * - pdf-parse for PDFs
   * - mammoth for Word documents
   * - xlsx for Excel files
   */
  extractTextContent(buffer: Buffer, contentType: string): string {
    try {
      switch (contentType) {
        case 'text/plain':
        case 'text/markdown':
        case 'application/json':
          return buffer.toString('utf-8');
        
        case 'text/csv':
          return buffer.toString('utf-8');
        
        default:
          // For unsupported types, try to convert as text
          const text = buffer.toString('utf-8');
          
          // Basic validation - if it contains mostly non-printable characters, it's probably binary
          const printableRatio = (text.match(/[\x20-\x7E\s]/g) || []).length / text.length;
          if (printableRatio < 0.7) {
            throw new Error(`Unsupported file type: ${contentType}`);
          }
          
          return text;
      }
    } catch (error) {
      logger.error('Failed to extract text content', error, { contentType });
      throw new Error(`Failed to extract content from ${contentType} file`);
    }
  }

  /**
   * Get document statistics for a project
   */
  async getProjectDocumentStats(projectId: string) {
    try {
      const stats = await this.prisma.document.aggregate({
        where: { projectId },
        _count: { id: true },
        _sum: { size: true },
      });

      const typeBreakdown = await this.prisma.document.groupBy({
        by: ['contentType'],
        where: { projectId },
        _count: { id: true },
      });

      return {
        totalCount: stats._count.id || 0,
        totalSize: stats._sum.size || 0,
        typeBreakdown: typeBreakdown.map(group => ({
          contentType: group.contentType,
          count: group._count.id,
        })),
      };
    } catch (error) {
      logger.error('Failed to get project document stats', error, { projectId });
      throw new Error('Failed to get document statistics');
    }
  }
}