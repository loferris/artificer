import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { VectorService, ChunkingService, EmbeddingService } from '../vector';

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

      // Create document in PostgreSQL
      const document = await this.prisma.document.create({
        data: {
          projectId: input.projectId,
          filename: input.filename,
          originalName: input.originalName,
          contentType: input.contentType,
          content: input.content,
          size: input.size,
          embedding: [], // Legacy field, keeping for schema compatibility
          metadata: input.metadata || {},
        },
      });

      logger.info('Document created successfully', {
        documentId: document.id,
        projectId: input.projectId
      });

      // Generate embeddings asynchronously (don't block document creation)
      this.generateEmbeddingsAsync(document.id, input.projectId, input.content, input.filename)
        .catch(error => {
          logger.error('Failed to generate embeddings for document', error, {
            documentId: document.id,
            projectId: input.projectId,
          });
        });

      return document;
    } catch (error) {
      logger.error('Failed to create document', error, { input });
      throw new Error('Failed to create document');
    }
  }

  /**
   * Generate embeddings for a document asynchronously
   */
  private async generateEmbeddingsAsync(
    documentId: string,
    projectId: string,
    content: string,
    filename: string
  ): Promise<void> {
    try {
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        logger.warn('OpenAI API key not configured, skipping embedding generation', {
          documentId,
        });
        return;
      }

      logger.info('Generating embeddings for document', { documentId, projectId });

      // Extract text content if available
      const textContent = content || '';
      if (!textContent.trim()) {
        logger.warn('No text content to embed', { documentId });
        return;
      }

      // Chunk the document
      const chunkingService = new ChunkingService();
      const chunks = chunkingService.chunkDocument(
        documentId,
        projectId,
        textContent,
        filename
      );

      if (chunks.length === 0) {
        logger.warn('No chunks created from document', { documentId });
        return;
      }

      logger.info('Document chunked', { documentId, chunkCount: chunks.length });

      // Generate embeddings
      const embeddingService = new EmbeddingService();
      const embeddings = await embeddingService.generateEmbeddings(
        chunks.map(c => c.content)
      );

      logger.info('Embeddings generated', { documentId, embeddingCount: embeddings.length });

      // Store in Chroma
      const vectorService = new VectorService(this.prisma);
      await vectorService.storeDocumentChunks(projectId, chunks, embeddings);

      logger.info('Embeddings stored successfully', {
        documentId,
        projectId,
        chunkCount: chunks.length
      });
    } catch (error) {
      logger.error('Failed to generate embeddings', error, { documentId, projectId });
      throw error;
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