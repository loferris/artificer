import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { createServicesFromContext } from '../services/ServiceFactory';
import { ExportService, type ExportOptions } from '../services/export';
import { DocumentConverter } from '@ai-workflow/document-converter';
import type { ConvertedDocument } from '@ai-workflow/document-converter/types';

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
      source: 'ai-workflow-engine',
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
        format: z.enum(['markdown', 'notion', 'obsidian', 'google-docs', 'json', 'html']),
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
          result = await ExportService.exportToMarkdown(conversationsWithMessages, options);
          break;
        case 'obsidian':
          result = await ExportService.exportToObsidian(conversationsWithMessages, options);
          break;
        case 'notion':
          result = await ExportService.exportToNotion(conversationsWithMessages, options);
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
              source: 'ai-workflow-engine',
              exportDate: new Date().toISOString(),
              totalConversations: conversationsWithMessages.length,
            },
          };
          result = await converter.export(combinedDoc, 'html', {
            includeMetadata: input.includeMetadata,
            includeStyles: true,
          } as any); // HTML-specific options
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
        format: z.enum(['markdown', 'notion', 'obsidian', 'google-docs', 'json', 'html']),
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
          result = await ExportService.exportToMarkdown([conversationWithMessages], options);
          break;
        case 'obsidian':
          result = await ExportService.exportToObsidian([conversationWithMessages], options);
          break;
        case 'notion':
          result = await ExportService.exportToNotion([conversationWithMessages], options);
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
          result = await converter.export(portableText, 'html', {
            includeMetadata: input.includeMetadata,
            includeStyles: true,
          } as any); // HTML-specific options
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
