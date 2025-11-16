/**
 * tRPC router for artifact operations (using unified document storage)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { UnifiedDocumentStorage } from '../../../lib/llm-artifacts/src';
import { ArtifactDetector, ArtifactExtractor } from '../../../lib/llm-artifacts/src';
import { ensureDatabase } from '../middleware/database';
import type { ArtifactType, CodeLanguage } from '../../../lib/llm-artifacts/src/core/types';

const detector = new ArtifactDetector();
const extractor = new ArtifactExtractor();

export const artifactsRouter = router({
  /**
   * List artifacts for a conversation
   */
  listByConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, 'Conversation ID is required'),
      })
    )
    .query(async ({ ctx, input }) => {
      const storage = new UnifiedDocumentStorage(ensureDatabase(ctx));
      const artifacts = await storage.listByConversation(input.conversationId);

      return {
        success: true,
        artifacts,
        timestamp: new Date().toISOString(),
      };
    }),

  /**
   * Get a single artifact by ID
   */
  get: protectedProcedure
    .input(
      z.object({
        artifactId: z.string().min(1, 'Artifact ID is required'),
      })
    )
    .query(async ({ ctx, input }) => {
      const storage = new UnifiedDocumentStorage(ensureDatabase(ctx));
      const artifact = await storage.get(input.artifactId);

      if (!artifact) {
        throw new Error('Artifact not found');
      }

      return {
        success: true,
        artifact,
        timestamp: new Date().toISOString(),
      };
    }),

  /**
   * Create a new artifact
   */
  create: protectedProcedure
    .input(
      z.object({
        type: z.string(),
        content: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        language: z.string().optional(),
        filename: z.string().optional(),
        conversationId: z.string().optional(),
        messageId: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const storage = new UnifiedDocumentStorage(ensureDatabase(ctx));

      // Infer file extension if not provided
      const fileExtension = input.filename
        ? input.filename.split('.').pop()
        : inferFileExtension(input.type as ArtifactType, input.language);

      const artifact = await storage.save({
        id: `artifact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: input.type as ArtifactType,
        content: input.content,
        title: input.title,
        description: input.description,
        language: input.language as CodeLanguage,
        fileExtension,
        filename: input.filename,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        conversationId: input.conversationId,
        messageId: input.messageId,
        metadata: input.metadata || {},
      });

      return {
        success: true,
        artifact,
        timestamp: new Date().toISOString(),
      };
    }),

  /**
   * Update an existing artifact
   */
  update: protectedProcedure
    .input(
      z.object({
        artifactId: z.string().min(1, 'Artifact ID is required'),
        content: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        language: z.string().optional(),
        filename: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
        changeDescription: z.string().optional(),
        messageId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const storage = new UnifiedDocumentStorage(ensureDatabase(ctx));

      const artifact = await storage.update(input.artifactId, {
        content: input.content,
        title: input.title,
        description: input.description,
        language: input.language as CodeLanguage,
        filename: input.filename,
        metadata: input.metadata,
        messageId: input.messageId,
      });

      return {
        success: true,
        artifact,
        timestamp: new Date().toISOString(),
      };
    }),

  /**
   * Delete an artifact
   */
  delete: protectedProcedure
    .input(
      z.object({
        artifactId: z.string().min(1, 'Artifact ID is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const storage = new UnifiedDocumentStorage(ensureDatabase(ctx));
      const success = await storage.delete(input.artifactId);

      return {
        success,
        timestamp: new Date().toISOString(),
      };
    }),

  /**
   * Get version history for an artifact
   */
  getVersions: protectedProcedure
    .input(
      z.object({
        artifactId: z.string().min(1, 'Artifact ID is required'),
      })
    )
    .query(async ({ ctx, input }) => {
      const storage = new UnifiedDocumentStorage(ensureDatabase(ctx));
      const versions = await storage.getVersions(input.artifactId);

      return {
        success: true,
        versions,
        timestamp: new Date().toISOString(),
      };
    }),

  /**
   * Detect artifacts in text (useful for preview/suggestions)
   */
  detect: protectedProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .query(async ({ input }) => {
      const detection = detector.detect(input.text);

      return {
        success: true,
        detection,
        timestamp: new Date().toISOString(),
      };
    }),

  /**
   * Extract artifacts from text
   */
  extract: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        conversationId: z.string().optional(),
        messageId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const artifacts = extractor.extract(input.text, {
        conversationId: input.conversationId,
        messageId: input.messageId,
        generateIds: true,
        autoDetectType: true,
      });

      // Save extracted artifacts
      const storage = new UnifiedDocumentStorage(ensureDatabase(ctx));
      const savedArtifacts = await Promise.all(
        artifacts.map((artifact) => storage.save(artifact))
      );

      return {
        success: true,
        artifacts: savedArtifacts,
        count: savedArtifacts.length,
        timestamp: new Date().toISOString(),
      };
    }),

  /**
   * Promote artifact to project knowledge (make it searchable in RAG)
   */
  promoteToProject: protectedProcedure
    .input(
      z.object({
        artifactId: z.string().min(1, 'Artifact ID is required'),
        projectId: z.string().min(1, 'Project ID is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ensureDatabase(ctx);

      // Get the artifact/document
      const doc = await db.document.findUnique({
        where: { id: input.artifactId },
      });

      if (!doc) {
        throw new Error('Artifact not found');
      }

      // Generate embedding (would use actual embedding service in production)
      // For now, just mark as indexed and associate with project
      const updated = await db.document.update({
        where: { id: input.artifactId },
        data: {
          indexed: true,
          projectId: input.projectId,
          source: 'generated', // Keep as generated, but now indexed
        },
      });

      return {
        success: true,
        document: {
          id: updated.id,
          filename: updated.filename,
          indexed: updated.indexed,
          projectId: updated.projectId,
        },
        timestamp: new Date().toISOString(),
      };
    }),
});

/**
 * Helper: Infer file extension from type and language
 */
function inferFileExtension(
  type: ArtifactType,
  language?: string
): string {
  if (language) {
    const langMap: Record<string, string> = {
      typescript: 'ts',
      javascript: 'js',
      python: 'py',
      java: 'java',
      rust: 'rs',
      go: 'go',
      cpp: 'cpp',
      c: 'c',
      csharp: 'cs',
      ruby: 'rb',
      php: 'php',
      swift: 'swift',
      kotlin: 'kt',
      sql: 'sql',
      bash: 'sh',
      shell: 'sh',
      powershell: 'ps1',
    };
    if (langMap[language.toLowerCase()]) {
      return langMap[language.toLowerCase()];
    }
  }

  const typeMap: Record<ArtifactType, string> = {
    code: 'txt',
    markdown: 'md',
    mermaid: 'mmd',
    html: 'html',
    svg: 'svg',
    json: 'json',
    yaml: 'yml',
    text: 'txt',
    csv: 'csv',
    'react-component': 'tsx',
  };

  return typeMap[type] || 'txt';
}
