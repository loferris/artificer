/**
 * Storage adapter that uses unified Document table for both artifacts and documents
 *
 * Use this pattern when you want artifacts and documents in one table with
 * user-controlled indexing for RAG search.
 */

import type { PrismaClient } from '@prisma/client';
import type {
  Artifact,
  ArtifactVersion,
  ArtifactType,
  ArtifactStorageAdapter,
} from '../core/types';

export interface UnifiedDocumentStorageOptions {
  /** Automatically add artifacts to RAG search index? Default: false */
  indexByDefault?: boolean;

  /** Default project ID to associate artifacts with */
  projectId?: string;

  /** Source label for created artifacts. Default: "generated" */
  source?: 'generated' | 'uploaded' | 'updated' | 'manual';
}

/**
 * Unified document storage adapter using Prisma
 * Stores artifacts as Documents with source="generated" and indexed=false by default
 */
export class UnifiedDocumentStorage implements ArtifactStorageAdapter {
  constructor(
    private prisma: PrismaClient | any,
    private options: UnifiedDocumentStorageOptions = {}
  ) {}

  /**
   * Save a new artifact as a Document
   */
  async save(artifact: Artifact): Promise<Artifact> {
    const created = await this.prisma.document.create({
      data: {
        id: artifact.id,
        type: artifact.type,
        content: artifact.content,
        filename: artifact.filename || 'untitled',
        title: artifact.title,
        description: artifact.description,
        language: artifact.language,
        fileExtension: artifact.fileExtension,

        // Unified document fields
        source: this.options.source || 'generated',
        indexed: this.options.indexByDefault ?? false,
        embedding: [], // Not indexed by default

        // Associations
        projectId: this.options.projectId,
        conversationId: artifact.conversationId,
        messageId: artifact.messageId,

        // Versioning
        version: artifact.version,

        // Metadata
        metadata: artifact.metadata || {},

        // Timestamps
        createdAt: artifact.createdAt,
        updatedAt: artifact.updatedAt,
      },
    });

    return this.mapToArtifact(created);
  }

  /**
   * Update an existing document/artifact
   */
  async update(id: string, updates: Partial<Artifact>): Promise<Artifact> {
    // If content is changing, create a new version
    if (updates.content) {
      const current = await this.get(id);
      if (current) {
        // Save current version
        await this.saveVersion(id, {
          version: current.version,
          content: current.content,
          createdAt: current.updatedAt,
          changeDescription: updates.description,
          messageId: updates.messageId,
        });
      }
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        ...(updates.type && { type: updates.type }),
        ...(updates.content && { content: updates.content }),
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.language !== undefined && { language: updates.language }),
        ...(updates.fileExtension !== undefined && { fileExtension: updates.fileExtension }),
        ...(updates.filename !== undefined && { filename: updates.filename }),
        ...(updates.metadata !== undefined && { metadata: updates.metadata }),
        ...(updates.content && { version: { increment: 1 } }),
        updatedAt: new Date(),
      },
    });

    return this.mapToArtifact(updated);
  }

  /**
   * Get a document/artifact by ID
   */
  async get(id: string): Promise<Artifact | null> {
    const doc = await this.prisma.document.findUnique({
      where: { id },
    });

    return doc ? this.mapToArtifact(doc) : null;
  }

  /**
   * Delete a document/artifact
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.document.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List documents/artifacts by conversation
   */
  async listByConversation(conversationId: string): Promise<Artifact[]> {
    const docs = await this.prisma.document.findMany({
      where: {
        conversationId,
        source: 'generated', // Only get generated artifacts
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d: any) => this.mapToArtifact(d));
  }

  /**
   * List documents/artifacts by type
   */
  async listByType(type: ArtifactType): Promise<Artifact[]> {
    const docs = await this.prisma.document.findMany({
      where: {
        type,
        source: 'generated', // Only get generated artifacts
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d: any) => this.mapToArtifact(d));
  }

  /**
   * Get all versions of a document/artifact
   */
  async getVersions(id: string): Promise<ArtifactVersion[]> {
    const versions = await this.prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { version: 'desc' },
    });

    return versions.map((v: any) => ({
      version: v.version,
      content: v.content,
      createdAt: v.createdAt,
      messageId: v.messageId,
      changeDescription: v.changeDescription,
    }));
  }

  /**
   * Save a new version of a document/artifact
   */
  async saveVersion(id: string, version: ArtifactVersion): Promise<void> {
    await this.prisma.documentVersion.create({
      data: {
        documentId: id,
        version: version.version,
        content: version.content,
        changeDescription: version.changeDescription,
        messageId: version.messageId,
        createdAt: version.createdAt,
      },
    });
  }

  /**
   * Promote an artifact to project knowledge (make it searchable)
   */
  async promoteToProjectKnowledge(id: string, embedding: number[]): Promise<Artifact> {
    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        indexed: true,
        embedding,
        source: 'generated', // Keep source, but now indexed
      },
    });

    return this.mapToArtifact(updated);
  }

  /**
   * Map Prisma document to library Artifact type
   */
  private mapToArtifact(prismaDoc: any): Artifact {
    return {
      id: prismaDoc.id,
      type: prismaDoc.type as ArtifactType,
      content: prismaDoc.content,
      title: prismaDoc.title,
      description: prismaDoc.description,
      language: prismaDoc.language,
      fileExtension: prismaDoc.fileExtension,
      filename: prismaDoc.filename,
      version: prismaDoc.version,
      createdAt: prismaDoc.createdAt,
      updatedAt: prismaDoc.updatedAt,
      conversationId: prismaDoc.conversationId,
      messageId: prismaDoc.messageId,
      metadata: prismaDoc.metadata || {},
    };
  }
}
