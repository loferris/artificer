import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { ExportService, type ExportOptions } from '../services/export';

export const exportRouter = router({
  /**
   * Export all conversations to specified format
   */
  exportAll: publicProcedure
    .input(
      z.object({
        format: z.enum(['markdown', 'notion', 'obsidian', 'google-docs', 'json', 'html']),
        includeMetadata: z.boolean().default(true),
        includeTimestamps: z.boolean().default(true),
        includeCosts: z.boolean().default(true),
        groupByConversation: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Get all conversations with messages
        const conversations = await ctx.db.conversation.findMany({
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { updatedAt: 'desc' },
        });

        // Transform to export format
        const exportConversations = conversations.map(conv => ({
          id: conv.id,
          title: conv.title || 'Untitled Conversation',
          model: conv.model,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          messages: conv.messages.map(msg => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
            tokens: msg.tokens,
            cost: msg.tokens ? msg.tokens * 0.000002 : 0, // Rough cost calculation
            createdAt: msg.createdAt,
            parentId: msg.parentId,
          })),
          metadata: {
            totalMessages: conv.messages.length,
            totalTokens: conv.messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0),
            totalCost: conv.messages.reduce((sum, msg) => sum + ((msg.tokens || 0) * 0.000002), 0),
            systemPrompt: conv.systemPrompt,
            temperature: conv.temperature,
            maxTokens: conv.maxTokens,
          },
        }));

        const options: ExportOptions = {
          format: input.format,
          includeMetadata: input.includeMetadata,
          includeTimestamps: input.includeTimestamps,
          includeCosts: input.includeCosts,
          groupByConversation: input.groupByConversation,
        };

        let result: string | { [filename: string]: string } | unknown[];

        switch (input.format) {
          case 'markdown':
            result = await ExportService.exportToMarkdown(exportConversations, options);
            break;
          case 'obsidian':
            result = await ExportService.exportToObsidian(exportConversations, options);
            break;
          case 'notion':
            result = await ExportService.exportToNotion(exportConversations, options);
            break;
          case 'google-docs':
            result = await ExportService.exportToGoogleDocs(exportConversations, options);
            break;
          case 'json':
            result = await ExportService.exportToJSON(exportConversations, options);
            break;
          default:
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Unsupported export format',
            });
        }

        return {
          format: input.format,
          data: result,
          metadata: {
            totalConversations: conversations.length,
            totalMessages: exportConversations.reduce((sum, conv) => sum + conv.metadata.totalMessages, 0),
            totalTokens: exportConversations.reduce((sum, conv) => sum + conv.metadata.totalTokens, 0),
            totalCost: exportConversations.reduce((sum, conv) => sum + conv.metadata.totalCost, 0),
            exportDate: new Date().toISOString(),
          },
        };
      } catch (error) {
        console.error('Export error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to export conversations',
          cause: error,
        });
      }
    }),

  /**
   * Export specific conversation to specified format
   */
  exportConversation: publicProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, 'Conversation ID is required'),
        format: z.enum(['markdown', 'notion', 'obsidian', 'google-docs', 'json', 'html']),
        includeMetadata: z.boolean().default(true),
        includeTimestamps: z.boolean().default(true),
        includeCosts: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Get specific conversation with messages
        const conversation = await ctx.db.conversation.findUnique({
          where: { id: input.conversationId },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        });

        if (!conversation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          });
        }

        // Transform to export format
        const exportConversation = {
          id: conversation.id,
          title: conversation.title || 'Untitled Conversation',
          model: conversation.model,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          messages: conversation.messages.map(msg => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
            tokens: msg.tokens,
            cost: msg.tokens ? msg.tokens * 0.000002 : 0,
            createdAt: msg.createdAt,
            parentId: msg.parentId,
          })),
          metadata: {
            totalMessages: conversation.messages.length,
            totalTokens: conversation.messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0),
            totalCost: conversation.messages.reduce((sum, msg) => sum + ((msg.tokens || 0) * 0.000002), 0),
            systemPrompt: conversation.systemPrompt,
            temperature: conversation.temperature,
            maxTokens: conversation.maxTokens,
          },
        };

        const options: ExportOptions = {
          format: input.format,
          includeMetadata: input.includeMetadata,
          includeTimestamps: input.includeTimestamps,
          includeCosts: input.includeCosts,
        };

        let result: string | { [filename: string]: string } | unknown[];

        switch (input.format) {
          case 'markdown':
            result = await ExportService.exportToMarkdown([exportConversation], options);
            break;
          case 'obsidian':
            result = await ExportService.exportToObsidian([exportConversation], options);
            break;
          case 'notion':
            result = await ExportService.exportToNotion([exportConversation], options);
            break;
          case 'google-docs':
            result = await ExportService.exportToGoogleDocs([exportConversation], options);
            break;
          case 'json':
            result = await ExportService.exportToJSON([exportConversation], options);
            break;
          default:
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Unsupported export format',
            });
        }

        return {
          format: input.format,
          data: result,
          metadata: {
            conversationId: conversation.id,
            title: conversation.title,
            totalMessages: exportConversation.metadata.totalMessages,
            totalTokens: exportConversation.metadata.totalTokens,
            totalCost: exportConversation.metadata.totalCost,
            exportDate: new Date().toISOString(),
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Export conversation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to export conversation',
          cause: error,
        });
      }
    }),

  /**
   * Get available export formats
   */
  getFormats: publicProcedure.query(() => {
    return {
      formats: [
        {
          id: 'markdown',
          name: 'Markdown',
          description: 'Plain text with Markdown formatting',
          extensions: ['.md'],
        },
        {
          id: 'obsidian',
          name: 'Obsidian',
          description: 'Markdown files optimized for Obsidian with linking',
          extensions: ['.md'],
        },
        {
          id: 'notion',
          name: 'Notion',
          description: 'JSON format for Notion API integration',
          extensions: ['.json'],
        },
        {
          id: 'google-docs',
          name: 'Google Docs',
          description: 'HTML format for Google Docs API',
          extensions: ['.html'],
        },
        {
          id: 'json',
          name: 'JSON',
          description: 'Structured JSON data',
          extensions: ['.json'],
        },
      ],
    };
  }),
});
