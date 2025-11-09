import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { ProjectService } from '../services/project/ProjectService';
import { DocumentService } from '../services/project/DocumentService';

/**
 * Helper to check if demo mode is active
 */
function isDemoMode() {
  return process.env.DEMO_MODE === 'true' ||
         process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/**
 * Helper to ensure database is available
 * Throws error if in demo mode
 */
function ensureDatabase(ctx: any) {
  if (!ctx.db) {
    throw new Error('DEMO_MODE');
  }
  return ctx.db;
}

/**
 * Validation schemas for project operations
 */
const ProjectCreateSchema = z.object({
  name: z.string().min(1, { message: 'Project name is required' }).max(100, { message: 'Project name too long' }),
  description: z.string().max(500, { message: 'Description too long' }).optional(),
  settings: z.record(z.string(), z.any()).optional(),
});

const ProjectUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  settings: z.record(z.string(), z.any()).optional(),
});

const DocumentUploadSchema = z.object({
  projectId: z.string(),
  filename: z.string(),
  content: z.string(), // Base64 encoded file content
  contentType: z.string(),
});

/**
 * Projects router for project and document management
 */
export const projectsRouter = router({
  /**
   * Create a new project
   */
  create: protectedProcedure
    .input(ProjectCreateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = ensureDatabase(ctx);
        const projectService = new ProjectService(db);

        const project = await projectService.create({
          name: input.name,
          description: input.description,
          settings: input.settings,
          // TODO: Get userId from authentication when implemented
          userId: 'anonymous',
        });

        return {
          success: true,
          project,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        if (error instanceof Error && error.message === 'DEMO_MODE') {
          return {
            success: false,
            error: 'Project features require a database and are not available in demo mode',
            demoMode: true,
            timestamp: new Date().toISOString(),
          };
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create project',
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * List all projects
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = ensureDatabase(ctx);
      const projectService = new ProjectService(db);

      // TODO: Filter by userId when authentication is implemented
      const projects = await projectService.findAll();

      return {
        success: true,
        projects,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return {
          success: false,
          projects: [],
          error: 'Project features require a database and are not available in demo mode',
          demoMode: true,
          timestamp: new Date().toISOString(),
        };
      }
      return {
        success: false,
        projects: [],
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
        timestamp: new Date().toISOString(),
      };
    }
  }),

  /**
   * Get project by ID with detailed information
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = ensureDatabase(ctx);
        const projectService = new ProjectService(db);
        const project = await projectService.findById(input.id);

        return {
          success: true,
          project,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        if (error instanceof Error && error.message === 'DEMO_MODE') {
          return {
            success: false,
            project: null,
            error: 'Project features require a database and are not available in demo mode',
            demoMode: true,
            timestamp: new Date().toISOString(),
          };
        }
        return {
          success: false,
          project: null,
          error: error instanceof Error ? error.message : 'Failed to fetch project',
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * Update project
   */
  update: protectedProcedure
    .input(z.object({ 
      id: z.string(),
      data: ProjectUpdateSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const projectService = new ProjectService(ensureDatabase(ctx));
        const project = await projectService.update(input.id, input.data);

        return {
          success: true,
          project,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update project',
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * Delete project
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const projectService = new ProjectService(ensureDatabase(ctx));
        await projectService.delete(input.id);

        return {
          success: true,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete project',
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * Associate a conversation with a project
   */
  associateConversation: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      conversationId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const projectService = new ProjectService(ensureDatabase(ctx));
        const conversation = await projectService.associateConversation(
          input.projectId,
          input.conversationId
        );

        return {
          success: true,
          conversation,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to associate conversation',
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * Get all conversations for a project
   */
  getConversations: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const projectService = new ProjectService(ensureDatabase(ctx));
        const conversations = await projectService.getProjectConversations(input.projectId);

        return {
          success: true,
          conversations,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          conversations: [],
          error: error instanceof Error ? error.message : 'Failed to fetch conversations',
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * Upload a document to a project
   */
  uploadDocument: protectedProcedure
    .input(DocumentUploadSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const documentService = new DocumentService(ensureDatabase(ctx));
        
        // Decode base64 content
        const buffer = Buffer.from(input.content, 'base64');
        const extractedContent = documentService.extractTextContent(buffer, input.contentType);
        
        const document = await documentService.create({
          projectId: input.projectId,
          filename: input.filename,
          originalName: input.filename,
          contentType: input.contentType,
          content: extractedContent,
          size: buffer.length,
          metadata: {
            uploadedBy: 'anonymous', // TODO: Get from auth
            originalEncoding: 'base64',
          },
        });

        return {
          success: true,
          document: {
            id: document.id,
            filename: document.filename,
            size: document.size,
            contentType: document.contentType,
            uploadedAt: document.uploadedAt,
          },
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to upload document',
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * Get all documents for a project
   */
  getDocuments: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const documentService = new DocumentService(ensureDatabase(ctx));
        const documents = await documentService.findByProject(input.projectId);

        return {
          success: true,
          documents,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          documents: [],
          error: error instanceof Error ? error.message : 'Failed to fetch documents',
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * Search documents within a project
   */
  searchDocuments: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      query: z.string().min(1, 'Search query is required'),
      limit: z.number().min(1).max(20).default(5),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const documentService = new DocumentService(ensureDatabase(ctx));
        const results = await documentService.searchContent(
          input.projectId,
          input.query,
          input.limit
        );

        return {
          success: true,
          results,
          query: input.query,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          results: [],
          query: input.query,
          error: error instanceof Error ? error.message : 'Failed to search documents',
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * Delete a document
   */
  deleteDocument: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const documentService = new DocumentService(ensureDatabase(ctx));
        await documentService.delete(input.documentId);

        return {
          success: true,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete document',
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * Get document statistics for a project
   */
  getDocumentStats: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const documentService = new DocumentService(ensureDatabase(ctx));
        const stats = await documentService.getProjectDocumentStats(input.projectId);

        return {
          success: true,
          stats,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          stats: null,
          error: error instanceof Error ? error.message : 'Failed to fetch document stats',
          timestamp: new Date().toISOString(),
        };
      }
    }),
});