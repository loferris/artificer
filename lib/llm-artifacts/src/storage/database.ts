/**
 * Database storage adapter for artifacts using Prisma
 */

import type { PrismaClient } from '@prisma/client';
import type {
  Artifact,
  ArtifactVersion,
  ArtifactType,
  ArtifactStorageAdapter,
} from '../core/types';

/**
 * Database storage adapter using Prisma
 */
export class DatabaseArtifactStorage implements ArtifactStorageAdapter {
  constructor(private prisma: PrismaClient | any) {}

  /**
   * Save a new artifact
   */
  async save(artifact: Artifact): Promise<Artifact> {
    const created = await this.prisma.artifact.create({
      data: {
        id: artifact.id,
        type: artifact.type,
        content: artifact.content,
        title: artifact.title,
        description: artifact.description,
        language: artifact.language,
        fileExtension: artifact.fileExtension,
        filename: artifact.filename,
        version: artifact.version,
        conversationId: artifact.conversationId,
        messageId: artifact.messageId,
        metadata: artifact.metadata || {},
        createdAt: artifact.createdAt,
        updatedAt: artifact.updatedAt,
      },
    });

    return this.mapToArtifact(created);
  }

  /**
   * Update an existing artifact
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

    const updated = await this.prisma.artifact.update({
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
   * Get an artifact by ID
   */
  async get(id: string): Promise<Artifact | null> {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id },
    });

    return artifact ? this.mapToArtifact(artifact) : null;
  }

  /**
   * Delete an artifact
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.artifact.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List artifacts by conversation
   */
  async listByConversation(conversationId: string): Promise<Artifact[]> {
    const artifacts = await this.prisma.artifact.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
    });

    return artifacts.map((a: any) => this.mapToArtifact(a));
  }

  /**
   * List artifacts by type
   */
  async listByType(type: ArtifactType): Promise<Artifact[]> {
    const artifacts = await this.prisma.artifact.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' },
    });

    return artifacts.map((a: any) => this.mapToArtifact(a));
  }

  /**
   * Get all versions of an artifact
   */
  async getVersions(id: string): Promise<ArtifactVersion[]> {
    const versions = await this.prisma.artifactVersion.findMany({
      where: { artifactId: id },
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
   * Save a new version of an artifact
   */
  async saveVersion(id: string, version: ArtifactVersion): Promise<void> {
    await this.prisma.artifactVersion.create({
      data: {
        artifactId: id,
        version: version.version,
        content: version.content,
        changeDescription: version.changeDescription,
        messageId: version.messageId,
        createdAt: version.createdAt,
      },
    });
  }

  /**
   * Map Prisma artifact to library Artifact type
   */
  private mapToArtifact(prismaArtifact: any): Artifact {
    return {
      id: prismaArtifact.id,
      type: prismaArtifact.type as ArtifactType,
      content: prismaArtifact.content,
      title: prismaArtifact.title,
      description: prismaArtifact.description,
      language: prismaArtifact.language,
      fileExtension: prismaArtifact.fileExtension,
      filename: prismaArtifact.filename,
      version: prismaArtifact.version,
      createdAt: prismaArtifact.createdAt,
      updatedAt: prismaArtifact.updatedAt,
      conversationId: prismaArtifact.conversationId,
      messageId: prismaArtifact.messageId,
      metadata: prismaArtifact.metadata || {},
    };
  }
}
