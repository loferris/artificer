import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { createServicesFromContext } from '../services/ServiceFactory';
import { ExportService, type ExportOptions } from '../services/export';
import { DocumentConverter } from '@artificer/document-converter';
import type { ConvertedDocument } from '@artificer/document-converter/types';
import { pythonConversionClient } from '../services/python/PythonConversionClient';
import { logger } from '../utils/logger';

const converter = new DocumentConverter();

/**
 * Convert conversation messages to Portable Text format
 */
function convertConversationToPortableText(conversation: any): ConvertedDocument {
  const blocks: any[] = [];

  // Add conversation title as heading
  if (conversation.title) {
    blocks.push({
      _type: 'block',
      _key: `title-${conversation.id}`,
      style: 'h1',
      children: [{
        _type: 'span',
        _key: `title-span-${conversation.id}`,
        text: conversation.title,
        marks: [],
      }],
      markDefs: [],
    });
  }

  // Add messages
  for (const message of conversation.messages) {
    // Add message role as heading
    blocks.push({
      _type: 'block',
      _key: `role-${message.id}`,
      style: 'h3',
      children: [{
        _type: 'span',
        _key: `role-span-${message.id}`,
        text: message.role === 'user' ? '👤 User' : '🤖 Assistant',
        marks: [],
      }],
      markDefs: [],
    });

    // Add message content as paragraph(s)
    const paragraphs = message.content.split('\n\n');
    for (const paragraph of paragraphs) {
      if (paragraph.trim()) {
        blocks.push({
          _type: 'block',
          _key: `msg-${message.id}-${Math.random()}`,
          style: 'normal',
          children: [{
            _type: 'span',
            _key: `msg-span-${message.id}-${Math.random()}`,
            text: paragraph.trim(),
            marks: [],
          }],
          markDefs: [],
        });
      }
    }
  }

  return {
    content: blocks,
    metadata: {
      title: conversation.title || 'Untitled Conversation',
      createdAt: conversation.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: conversation.updatedAt?.toISOString() || new Date().toISOString(),
      source: 'artificer',
      conversationId: conversation.id,
      totalMessages: conversation.messages.length,
      totalTokens: conversation.metadata?.totalTokens,
      totalCost: conversation.metadata?.totalCost,
      model: conversation.model,
    },
  };
}

export const exportRouter = router({
  /**
   * Export all conversations to specified format
   */
  exportAll: protectedProcedure
    .input(
      z.object({
        format: z.enum(['markdown', 'notion', 'roam', 'obsidian', 'google-docs', 'json', 'html']),
        includeMetadata: z.boolean().default(true),
        includeTimestamps: z.boolean().default(true),
        includeCosts: z.boolean().default(true),
        groupByConversation: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { conversationService, messageService } = createServicesFromContext(ctx);

      const conversations = await conversationService.listConversations();
      const conversationsWithMessages = await Promise.all(
        conversations.map(async (conv) => {
          const messages = await messageService.getMessagesByConversation(conv.id);
          return {
            id: conv.id,
            title: conv.title || 'Untitled Conversation',
            model: conv.model,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            messages: messages.map((msg) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              tokens: msg.tokens || 0,
              cost: msg.cost || 0,
              createdAt: msg.createdAt || new Date(),
              parentId: msg.parentId || undefined,
            })),
            metadata: {
              totalMessages: messages.length,
              totalTokens: messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0),
              totalCost: messages.reduce((sum, msg) => sum + (msg.cost || 0), 0),
              systemPrompt: conv.systemPrompt || undefined,
              temperature: conv.temperature || undefined,
              maxTokens: conv.maxTokens || undefined,
            },
          };
        }),
      );

      const options: ExportOptions = {
        format: input.format,
        includeMetadata: input.includeMetadata,
        includeTimestamps: input.includeTimestamps,
        includeCosts: input.includeCosts,
        groupByConversation: input.groupByConversation,
      };

      let result;
      switch (input.format) {
        case 'markdown':
          // Try Python service first for 2-3x speedup
          const allMarkdownPortableText = conversationsWithMessages.map(convertConversationToPortableText);
          // Combine all blocks from all conversations
          const combinedMarkdownBlocks = allMarkdownPortableText.flatMap(doc => doc.content);
          const combinedMarkdownDoc: ConvertedDocument = {
            content: combinedMarkdownBlocks,
            metadata: {
              title: 'All Conversations',
              source: 'artificer',
              exportDate: new Date().toISOString(),
              totalConversations: conversationsWithMessages.length,
            },
          };

          if (pythonConversionClient.isAvailable()) {
            try {
              logger.debug('Using Python conversion service for Markdown export');
              const pythonResult = await pythonConversionClient.exportMarkdown(combinedMarkdownDoc, {
                includeMetadata: input.includeMetadata,
              });
              result = pythonResult.markdown;
              logger.info('Python Markdown export completed', {
                processingTime: pythonResult.processingTime,
                markdownLength: result.length,
              });
            } catch (error) {
              logger.warn('Python Markdown export failed, falling back to TypeScript', {
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              // Fallback to TypeScript
              result = await ExportService.exportToMarkdown(conversationsWithMessages, options);
            }
          } else {
            // Python service not available, use TypeScript
            result = await ExportService.exportToMarkdown(conversationsWithMessages, options);
          }
          break;
        case 'obsidian':
          result = await ExportService.exportToObsidian(conversationsWithMessages, options);
          break;
        case 'notion':
          // Try Python service first for 2-3x speedup
          const allNotionPortableText = conversationsWithMessages.map(convertConversationToPortableText);
          // Combine all blocks from all conversations
          const combinedNotionBlocks = allNotionPortableText.flatMap(doc => doc.content);
          const combinedNotionDoc: ConvertedDocument = {
            content: combinedNotionBlocks,
            metadata: {
              title: 'All Conversations',
              source: 'artificer',
              exportDate: new Date().toISOString(),
              totalConversations: conversationsWithMessages.length,
            },
          };

          if (pythonConversionClient.isAvailable()) {
            try {
              logger.debug('Using Python conversion service for Notion export');
              const pythonResult = await pythonConversionClient.exportNotion(combinedNotionDoc, {
                prettyPrint: false,
              });
              result = pythonResult.json;
              logger.info('Python Notion export completed', {
                processingTime: pythonResult.processingTime,
                jsonLength: result.length,
              });
            } catch (error) {
              logger.warn('Python Notion export failed, falling back to TypeScript', {
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              // Fallback to TypeScript
              result = await ExportService.exportToNotion(conversationsWithMessages, options);
            }
          } else {
            // Python service not available, use TypeScript
            result = await ExportService.exportToNotion(conversationsWithMessages, options);
          }
          break;
        case 'roam':
          // Try Python service first for 2-3x speedup
          const allRoamPortableText = conversationsWithMessages.map(convertConversationToPortableText);
          // Combine all blocks from all conversations
          const combinedRoamBlocks = allRoamPortableText.flatMap(doc => doc.content);
          const combinedRoamDoc: ConvertedDocument = {
            content: combinedRoamBlocks,
            metadata: {
              title: 'All Conversations',
              source: 'artificer',
              exportDate: new Date().toISOString(),
              totalConversations: conversationsWithMessages.length,
            },
          };

          if (pythonConversionClient.isAvailable()) {
            try {
              logger.debug('Using Python conversion service for Roam export');
              const pythonResult = await pythonConversionClient.exportRoam(combinedRoamDoc, {
                prettyPrint: false,
              });
              result = pythonResult.json;
              logger.info('Python Roam export completed', {
                processingTime: pythonResult.processingTime,
                jsonLength: result.length,
              });
            } catch (error) {
              logger.warn('Python Roam export failed, falling back to TypeScript', {
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              // Fallback to TypeScript
              result = await converter.export(combinedRoamDoc, 'roam', {
                prettyPrint: false,
              } as any);
            }
          } else {
            // Python service not available, use TypeScript
            result = await converter.export(combinedRoamDoc, 'roam', {
              prettyPrint: false,
            } as any);
          }
          break;
        case 'google-docs':
          result = await ExportService.exportToGoogleDocs(conversationsWithMessages, options);
          break;
        case 'json':
          result = await ExportService.exportToJSON(conversationsWithMessages, options);
          break;
        case 'html':
          // Use document converter for HTML export - combine all conversations
          const allPortableText = conversationsWithMessages.map(convertConversationToPortableText);
          // Combine all blocks from all conversations
          const combinedBlocks = allPortableText.flatMap(doc => doc.content);
          const combinedDoc: ConvertedDocument = {
            content: combinedBlocks,
            metadata: {
              title: 'All Conversations',
              source: 'artificer',
              exportDate: new Date().toISOString(),
              totalConversations: conversationsWithMessages.length,
            },
          };

          // Try Python service first for 2-3x speedup
          if (pythonConversionClient.isAvailable()) {
            try {
              logger.debug('Using Python conversion service for HTML export');
              const pythonResult = await pythonConversionClient.exportHtml(combinedDoc, {
                includeMetadata: input.includeMetadata,
                includeStyles: true,
                title: 'All Conversations',
              });
              result = pythonResult.html;
              logger.info('Python HTML export completed', {
                processingTime: pythonResult.processingTime,
                htmlLength: result.length,
              });
            } catch (error) {
              logger.warn('Python HTML export failed, falling back to TypeScript', {
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              // Fallback to TypeScript
              result = await converter.export(combinedDoc, 'html', {
                includeMetadata: input.includeMetadata,
                includeStyles: true,
              } as any);
            }
          } else {
            // Python service not available, use TypeScript
            result = await converter.export(combinedDoc, 'html', {
              includeMetadata: input.includeMetadata,
              includeStyles: true,
            } as any);
          }
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
          totalMessages: conversationsWithMessages.reduce(
            (sum, conv) => sum + conv.metadata.totalMessages,
            0,
          ),
          totalTokens: conversationsWithMessages.reduce(
            (sum, conv) => sum + conv.metadata.totalTokens,
            0,
          ),
          totalCost: conversationsWithMessages.reduce(
            (sum, conv) => sum + conv.metadata.totalCost,
            0,
          ),
          exportDate: new Date().toISOString(),
        },
      };
    }),

  /**
   * Export specific conversation to specified format
   */
  exportConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().min(1, 'Conversation ID is required'),
        format: z.enum(['markdown', 'notion', 'roam', 'obsidian', 'google-docs', 'json', 'html']),
        includeMetadata: z.boolean().default(true),
        includeTimestamps: z.boolean().default(true),
        includeCosts: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { conversationService, messageService } = createServicesFromContext(ctx);

      const conversations = await conversationService.listConversations();
      const conversation = conversations.find((c) => c.id === input.conversationId);

      if (!conversation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        });
      }

      const messages = await messageService.getMessagesByConversation(input.conversationId);
      const conversationWithMessages = {
        id: conversation.id,
        title: conversation.title || 'Untitled Conversation',
        model: conversation.model,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          tokens: msg.tokens || 0,
          cost: msg.cost || 0,
          createdAt: msg.createdAt || new Date(),
          parentId: msg.parentId || undefined,
        })),
        metadata: {
          totalMessages: messages.length,
          totalTokens: messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0),
          totalCost: messages.reduce((sum, msg) => sum + (msg.cost || 0), 0),
          systemPrompt: conversation.systemPrompt || undefined,
          temperature: conversation.temperature || undefined,
          maxTokens: conversation.maxTokens || undefined,
        },
      };

      const options: ExportOptions = {
        format: input.format,
        includeMetadata: input.includeMetadata,
        includeTimestamps: input.includeTimestamps,
        includeCosts: input.includeCosts,
      };

      let result;
      switch (input.format) {
        case 'markdown':
          // Try Python service first for 2-3x speedup
          const markdownPortableText = convertConversationToPortableText(conversationWithMessages);
          if (pythonConversionClient.isAvailable()) {
            try {
              logger.debug('Using Python conversion service for Markdown export');
              const pythonResult = await pythonConversionClient.exportMarkdown(markdownPortableText, {
                includeMetadata: input.includeMetadata,
              });
              result = pythonResult.markdown;
              logger.info('Python Markdown export completed', {
                processingTime: pythonResult.processingTime,
                markdownLength: result.length,
              });
            } catch (error) {
              logger.warn('Python Markdown export failed, falling back to TypeScript', {
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              // Fallback to TypeScript
              result = await ExportService.exportToMarkdown([conversationWithMessages], options);
            }
          } else {
            // Python service not available, use TypeScript
            result = await ExportService.exportToMarkdown([conversationWithMessages], options);
          }
          break;
        case 'obsidian':
          result = await ExportService.exportToObsidian([conversationWithMessages], options);
          break;
        case 'notion':
          // Use document converter for Notion export
          const notionPortableText = convertConversationToPortableText(conversationWithMessages);

          // Try Python service first for 2-3x speedup
          if (pythonConversionClient.isAvailable()) {
            try {
              logger.debug('Using Python conversion service for Notion export');
              const pythonResult = await pythonConversionClient.exportNotion(notionPortableText, {
                prettyPrint: false,
              });
              result = pythonResult.json;
              logger.info('Python Notion export completed', {
                processingTime: pythonResult.processingTime,
                jsonLength: result.length,
              });
            } catch (error) {
              logger.warn('Python Notion export failed, falling back to TypeScript', {
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              // Fallback to TypeScript
              result = await ExportService.exportToNotion([conversationWithMessages], options);
            }
          } else {
            // Python service not available, use TypeScript
            result = await ExportService.exportToNotion([conversationWithMessages], options);
          }
          break;
        case 'roam':
          // Use document converter for Roam export
          const roamPortableText = convertConversationToPortableText(conversationWithMessages);

          // Try Python service first for 2-3x speedup
          if (pythonConversionClient.isAvailable()) {
            try {
              logger.debug('Using Python conversion service for Roam export');
              const pythonResult = await pythonConversionClient.exportRoam(roamPortableText, {
                prettyPrint: false,
              });
              result = pythonResult.json;
              logger.info('Python Roam export completed', {
                processingTime: pythonResult.processingTime,
                jsonLength: result.length,
              });
            } catch (error) {
              logger.warn('Python Roam export failed, falling back to TypeScript', {
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              // Fallback to TypeScript
              result = await converter.export(roamPortableText, 'roam', {
                prettyPrint: false,
              } as any);
            }
          } else {
            // Python service not available, use TypeScript
            result = await converter.export(roamPortableText, 'roam', {
              prettyPrint: false,
            } as any);
          }
          break;
        case 'google-docs':
          result = await ExportService.exportToGoogleDocs([conversationWithMessages], options);
          break;
        case 'json':
          result = await ExportService.exportToJSON([conversationWithMessages], options);
          break;
        case 'html':
          // Use document converter for HTML export
          const portableText = convertConversationToPortableText(conversationWithMessages);

          // Try Python service first for 2-3x speedup
          if (pythonConversionClient.isAvailable()) {
            try {
              logger.debug('Using Python conversion service for HTML export');
              const pythonResult = await pythonConversionClient.exportHtml(portableText, {
                includeMetadata: input.includeMetadata,
                includeStyles: true,
                title: conversationWithMessages.title,
              });
              result = pythonResult.html;
              logger.info('Python HTML export completed', {
                processingTime: pythonResult.processingTime,
                htmlLength: result.length,
              });
            } catch (error) {
              logger.warn('Python HTML export failed, falling back to TypeScript', {
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              // Fallback to TypeScript
              result = await converter.export(portableText, 'html', {
                includeMetadata: input.includeMetadata,
                includeStyles: true,
              } as any);
            }
          } else {
            // Python service not available, use TypeScript
            result = await converter.export(portableText, 'html', {
              includeMetadata: input.includeMetadata,
              includeStyles: true,
            } as any);
          }
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
          totalMessages: conversationWithMessages.metadata.totalMessages,
          totalTokens: conversationWithMessages.metadata.totalTokens,
          totalCost: conversationWithMessages.metadata.totalCost,
          exportDate: new Date().toISOString(),
        },
      };
    }),

  /**
   * Get available export formats
   */
  getFormats: protectedProcedure.query(() => {
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
          id: 'roam',
          name: 'Roam Research',
          description: 'JSON format for Roam Research import',
          extensions: ['.json'],
        },
        {
          id: 'google-docs',
          name: 'Google Docs',
          description: 'HTML format for Google Docs API',
          extensions: ['.html'],
        },
        {
          id: 'html',
          name: 'HTML',
          description: 'Styled HTML document for viewing in browser',
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
