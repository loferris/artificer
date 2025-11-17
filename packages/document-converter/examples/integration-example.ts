/**
 * Example integration with the AI Workflow Engine application
 * This shows how to use the document converter library with your existing DocumentService
 */

import { DocumentConverter } from '../src/index.js';
import type { ConvertedDocument } from '../src/types/index.js';

/**
 * Enhanced DocumentService that supports multiple formats
 */
export class EnhancedDocumentService {
  private converter: DocumentConverter;

  constructor() {
    this.converter = new DocumentConverter();
  }

  /**
   * Upload a document in any supported format
   */
  async uploadDocument(params: {
    projectId: string;
    content: string;
    format?: string;
    filename: string;
  }): Promise<{
    id: string;
    portableText: ConvertedDocument;
    metadata: Record<string, any>;
  }> {
    const { content, format, filename, projectId } = params;

    // Import to Portable Text
    const doc = await this.converter.import(content, { format });

    // Store the Portable Text format in your database
    // This is format-agnostic and can be exported to any format later
    const stored = {
      id: this.generateId(),
      projectId,
      filename,
      content: JSON.stringify(doc.content), // Store as JSON
      metadata: {
        ...doc.metadata,
        originalFormat: format || 'auto-detected',
        filename,
      },
      uploadedAt: new Date().toISOString(),
    };

    // In a real app, you would save this to your database:
    // await prisma.document.create({ data: stored });

    return {
      id: stored.id,
      portableText: doc,
      metadata: stored.metadata,
    };
  }

  /**
   * Export a document to a specific format
   */
  async exportDocument(params: {
    documentId: string;
    targetFormat: string;
    includeMetadata?: boolean;
  }): Promise<string> {
    const { documentId, targetFormat, includeMetadata } = params;

    // In a real app, fetch from database:
    // const stored = await prisma.document.findUnique({ where: { id: documentId } });

    // Mock retrieval
    const stored = this.getMockDocument(documentId);

    const doc: ConvertedDocument = {
      content: JSON.parse(stored.content),
      metadata: stored.metadata,
    };

    // Export to target format
    return this.converter.export(doc, targetFormat, {
      includeMetadata,
      prettyPrint: targetFormat !== 'markdown',
    });
  }

  /**
   * Convert between formats on-the-fly
   */
  async convertDocument(params: {
    content: string;
    sourceFormat: string;
    targetFormat: string;
  }): Promise<string> {
    return this.converter.convert(params.content, params.targetFormat, {
      sourceFormat: params.sourceFormat,
    });
  }

  /**
   * Bulk import documents from different sources
   */
  async bulkImport(
    documents: Array<{
      content: string;
      format: string;
      filename: string;
      projectId: string;
    }>
  ): Promise<
    Array<{
      id: string;
      filename: string;
      success: boolean;
      error?: string;
    }>
  > {
    const results = [];

    for (const doc of documents) {
      try {
        const uploaded = await this.uploadDocument(doc);
        results.push({
          id: uploaded.id,
          filename: doc.filename,
          success: true,
        });
      } catch (error) {
        results.push({
          id: '',
          filename: doc.filename,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Get document in multiple formats
   */
  async getDocumentInFormats(
    documentId: string,
    formats: string[]
  ): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    for (const format of formats) {
      try {
        result[format] = await this.exportDocument({
          documentId,
          targetFormat: format,
          includeMetadata: true,
        });
      } catch (error) {
        result[format] = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    return result;
  }

  /**
   * Search across documents (using the Portable Text format)
   */
  async searchDocuments(params: {
    projectId: string;
    query: string;
  }): Promise<
    Array<{
      id: string;
      filename: string;
      excerpt: string;
      score: number;
    }>
  > {
    // In a real app, you would:
    // 1. Extract plain text from Portable Text
    // 2. Use full-text search or vector search
    // 3. Return matching documents with excerpts

    // Mock implementation
    return [];
  }

  // Helper methods
  private generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private getMockDocument(id: string): {
    content: string;
    metadata: Record<string, any>;
  } {
    // Mock data for example
    return {
      content: JSON.stringify([
        {
          _type: 'block',
          _key: 'abc',
          style: 'h1',
          children: [{ _type: 'span', _key: 'def', text: 'Test', marks: [] }],
          markDefs: [],
        },
      ]),
      metadata: {
        title: 'Test Document',
        source: 'markdown',
      },
    };
  }
}

// Usage example with tRPC router
export function createDocumentRouter() {
  const service = new EnhancedDocumentService();

  return {
    upload: async (input: {
      projectId: string;
      content: string;
      format?: string;
      filename: string;
    }) => {
      return service.uploadDocument(input);
    },

    export: async (input: {
      documentId: string;
      format: string;
      includeMetadata?: boolean;
    }) => {
      return service.exportDocument({
        documentId: input.documentId,
        targetFormat: input.format,
        includeMetadata: input.includeMetadata,
      });
    },

    convert: async (input: {
      content: string;
      sourceFormat: string;
      targetFormat: string;
    }) => {
      return service.convertDocument(input);
    },

    bulkImport: async (input: {
      documents: Array<{
        content: string;
        format: string;
        filename: string;
        projectId: string;
      }>;
    }) => {
      return service.bulkImport(input.documents);
    },
  };
}

// Example API usage
async function exampleUsage() {
  const service = new EnhancedDocumentService();

  // 1. Upload Obsidian note
  const obsidianNote = `---
title: My Research Notes
tags: [research, ai]
---

# My Research Notes

Important findings about [[Machine Learning]].
`;

  const uploaded = await service.uploadDocument({
    projectId: 'proj_123',
    content: obsidianNote,
    format: 'markdown',
    filename: 'research-notes.md',
  });

  console.log('Uploaded:', uploaded);

  // 2. Export to Notion
  const notionFormat = await service.exportDocument({
    documentId: uploaded.id,
    targetFormat: 'notion',
    includeMetadata: true,
  });

  console.log('Notion format:', notionFormat);

  // 3. Get document in multiple formats
  const formats = await service.getDocumentInFormats(uploaded.id, [
    'markdown',
    'notion',
    'roam',
  ]);

  console.log('Available formats:', Object.keys(formats));

  // 4. Bulk import from Roam export
  await service.bulkImport([
    {
      projectId: 'proj_123',
      content: JSON.stringify({
        title: 'Daily Note 1',
        children: [{ string: 'Content 1', uid: 'a1' }],
      }),
      format: 'roam',
      filename: 'daily-1.json',
    },
    {
      projectId: 'proj_123',
      content: JSON.stringify({
        title: 'Daily Note 2',
        children: [{ string: 'Content 2', uid: 'a2' }],
      }),
      format: 'roam',
      filename: 'daily-2.json',
    },
  ]);
}

export default { EnhancedDocumentService, createDocumentRouter };
