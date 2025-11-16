/**
 * tRPC Router for Repository Operations
 *
 * Provides API endpoints for connecting and syncing GitHub/GitLab repositories
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { RepositoryService } from '../services/repository/RepositoryService';

/**
 * Helper to ensure database is available
 */
function ensureDatabase(ctx: any) {
  if (!ctx.db) {
    throw new Error('DEMO_MODE');
  }
  return ctx.db;
}

const connectRepositorySchema = z.object({
  projectId: z.string(),
  provider: z.enum(['github', 'gitlab']),
  repoUrl: z.string().url(),
  accessToken: z.string().min(1),
  branch: z.string().default('main'),
  pathFilters: z.array(z.string()).default([]),
  ignorePatterns: z.array(z.string()).default([
    'node_modules/**',
    '.git/**',
    '**/*.lock',
    'dist/**',
    'build/**',
    '.next/**',
    'coverage/**',
  ]),
  autoSync: z.boolean().default(false),
});

const syncRepositorySchema = z.object({
  repositoryId: z.string(),
});

const listRepositoriesSchema = z.object({
  projectId: z.string(),
});

const deleteRepositorySchema = z.object({
  repositoryId: z.string(),
});

const updateRepositorySchema = z.object({
  repositoryId: z.string(),
  pathFilters: z.array(z.string()).optional(),
  ignorePatterns: z.array(z.string()).optional(),
  autoSync: z.boolean().optional(),
  branch: z.string().optional(),
});

const testConnectionSchema = z.object({
  provider: z.enum(['github', 'gitlab']),
  repoUrl: z.string(),
  accessToken: z.string().min(1),
});

export const repositoriesRouter = router({
  /**
   * Test repository connection without saving
   */
  testConnection: protectedProcedure
    .input(testConnectionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = ensureDatabase(ctx);
        const repositoryService = new RepositoryService(db);

        const result = await repositoryService.testConnection(input);

        return result;
      } catch (error) {
        if (error instanceof Error && error.message === 'DEMO_MODE') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Repository connections are not available in demo mode',
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to test connection',
        });
      }
    }),

  /**
   * Connect a new repository to a project
   */
  connect: protectedProcedure
    .input(connectRepositorySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = ensureDatabase(ctx);
        const repositoryService = new RepositoryService(db);

        const repository = await repositoryService.connectRepository(input);

        return {
          success: true,
          repository,
        };
      } catch (error) {
        if (error instanceof Error && error.message === 'DEMO_MODE') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Repository features require a database and are not available in demo mode',
          });
        }

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Failed to connect repository',
        });
      }
    }),

  /**
   * Trigger repository sync
   */
  sync: protectedProcedure
    .input(syncRepositorySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = ensureDatabase(ctx);
        const repositoryService = new RepositoryService(db);

        const result = await repositoryService.syncRepository(input.repositoryId);

        return {
          success: true,
          result,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Repository sync failed',
        });
      }
    }),

  /**
   * List all repositories for a project
   */
  list: protectedProcedure
    .input(listRepositoriesSchema)
    .query(async ({ ctx, input }) => {
      try {
        const db = ensureDatabase(ctx);
        const repositoryService = new RepositoryService(db);

        const repositories = await repositoryService.getProjectRepositories(input.projectId);

        return repositories;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch repositories',
        });
      }
    }),

  /**
   * Delete a repository connection
   */
  delete: protectedProcedure
    .input(deleteRepositorySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = ensureDatabase(ctx);
        const repositoryService = new RepositoryService(db);

        await repositoryService.deleteRepository(input.repositoryId);

        return {
          success: true,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete repository',
        });
      }
    }),

  /**
   * Update repository settings
   */
  update: protectedProcedure
    .input(updateRepositorySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = ensureDatabase(ctx);
        const { repositoryId, ...updates } = input;

        const repository = await db.repositoryConnection.update({
          where: { id: repositoryId },
          data: updates,
        });

        return {
          success: true,
          repository,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update repository',
        });
      }
    }),

  /**
   * Get repository details
   */
  get: protectedProcedure
    .input(z.object({ repositoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = ensureDatabase(ctx);

        const repository = await db.repositoryConnection.findUnique({
          where: { id: input.repositoryId },
          include: {
            _count: {
              select: { documents: true },
            },
            documents: {
              take: 10,
              orderBy: { lastSyncedAt: 'desc' },
              include: {
                document: {
                  select: {
                    id: true,
                    filename: true,
                    type: true,
                    language: true,
                    size: true,
                  },
                },
              },
            },
          },
        });

        if (!repository) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Repository not found',
          });
        }

        return repository;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch repository',
        });
      }
    }),
});
