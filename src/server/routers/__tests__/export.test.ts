import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { exportRouter } from '../export';
import { ExportService } from '../../services/export';

// Mock the ExportService
vi.mock('../../services/export', () => ({
  ExportService: {
    exportToMarkdown: vi.fn(),
    exportToObsidian: vi.fn(),
    exportToNotion: vi.fn(),
    exportToGoogleDocs: vi.fn(),
    exportToJSON: vi.fn(),
  },
}));

// Mock the rate limiter
vi.mock('../../middleware/rateLimiter', () => ({
  createRateLimitMiddleware: vi.fn(() => vi.fn().mockReturnValue({ allowed: true, remaining: 10, resetTime: Date.now() + 60000 })),
}));

// Mock the logger to prevent rate limit logging errors
vi.mock('../../utils/logger', () => ({
  logger: {
    rateLimitHit: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Export Router', () => {
  const mockContext = {
    db: {
      conversation: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    },
    req: {
      headers: {
        'user-agent': 'test-agent',
      },
    },
    user: null,
  };

  const mockConversations = [
    {
      id: 'conv-1',
      title: 'Test Conversation 1',
      model: 'gpt-3.5-turbo',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T11:00:00Z'),
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          tokens: 10,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          parentId: null,
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          tokens: 15,
          createdAt: new Date('2024-01-01T10:01:00Z'),
          parentId: 'msg-1',
        },
      ],
    },
    {
      id: 'conv-2',
      title: 'Test Conversation 2',
      model: 'gpt-4',
      createdAt: new Date('2024-01-02T10:00:00Z'),
      updatedAt: new Date('2024-01-02T11:00:00Z'),
      messages: [
        {
          id: 'msg-3',
          role: 'user',
          content: 'How are you?',
          tokens: 8,
          createdAt: new Date('2024-01-02T10:00:00Z'),
          parentId: null,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportAll', () => {
    it('exports all conversations in markdown format', async () => {
      const mockMarkdown = '# Chat Export\n\n## Test Conversation 1\n\nHello\nHi there!';
      
      mockContext.db.conversation.findMany.mockResolvedValue(mockConversations);
      (ExportService.exportToMarkdown as any).mockResolvedValue(mockMarkdown);

      const caller = exportRouter.createCaller(mockContext);
      const result = await caller.exportAll({
        format: 'markdown',
        includeMetadata: true,
        includeTimestamps: true,
        includeCosts: true,
        groupByConversation: true,
      });

      expect(result.format).toBe('markdown');
      expect(result.data).toBe(mockMarkdown);
      expect(result.metadata.totalConversations).toBe(2);
      expect(result.metadata.totalMessages).toBe(3);
      expect(result.metadata.totalTokens).toBe(33);
      expect(result.metadata.totalCost).toBeCloseTo(0.000066, 5); // 33 * 0.000002
      expect(result.metadata.exportDate).toBeDefined();

      expect(ExportService.exportToMarkdown).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'conv-1',
            title: 'Test Conversation 1',
            messages: expect.arrayContaining([
              expect.objectContaining({
                id: 'msg-1',
                role: 'user',
                content: 'Hello',
                tokens: 10,
                cost: expect.closeTo(0.00002, 5),
              }),
            ]),
            metadata: expect.objectContaining({
              totalMessages: 2,
              totalTokens: 25,
              totalCost: expect.closeTo(0.00005, 5),
            }),
          }),
        ]),
        expect.objectContaining({
          format: 'markdown',
          includeMetadata: true,
          includeTimestamps: true,
          includeCosts: true,
          groupByConversation: true,
        })
      );
    });

    it('exports all conversations in JSON format', async () => {
      const mockJson = { conversations: [] };
      
      mockContext.db.conversation.findMany.mockResolvedValue(mockConversations);
      (ExportService.exportToJSON as any).mockResolvedValue(mockJson);

      const caller = exportRouter.createCaller(mockContext);
      const result = await caller.exportAll({
        format: 'json',
        includeMetadata: false,
        includeTimestamps: false,
        includeCosts: false,
        groupByConversation: false,
      });

      expect(result.format).toBe('json');
      expect(result.data).toBe(mockJson);
      expect(ExportService.exportToJSON).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          format: 'json',
          includeMetadata: false,
          includeTimestamps: false,
          includeCosts: false,
          groupByConversation: false,
        })
      );
    });

    it('exports all conversations in Obsidian format', async () => {
      const mockObsidian = '# Obsidian Export\n\n[[Test Conversation 1]]';
      
      mockContext.db.conversation.findMany.mockResolvedValue(mockConversations);
      (ExportService.exportToObsidian as any).mockResolvedValue(mockObsidian);

      const caller = exportRouter.createCaller(mockContext);
      const result = await caller.exportAll({
        format: 'obsidian',
      });

      expect(result.format).toBe('obsidian');
      expect(result.data).toBe(mockObsidian);
      expect(ExportService.exportToObsidian).toHaveBeenCalled();
    });

    it('exports all conversations in Notion format', async () => {
      const mockNotion = { notion: 'export' };
      
      mockContext.db.conversation.findMany.mockResolvedValue(mockConversations);
      (ExportService.exportToNotion as any).mockResolvedValue(mockNotion);

      const caller = exportRouter.createCaller(mockContext);
      const result = await caller.exportAll({
        format: 'notion',
      });

      expect(result.format).toBe('notion');
      expect(result.data).toBe(mockNotion);
      expect(ExportService.exportToNotion).toHaveBeenCalled();
    });

    it('exports all conversations in Google Docs format', async () => {
      const mockGoogleDocs = '<html><body>Google Docs Export</body></html>';
      
      mockContext.db.conversation.findMany.mockResolvedValue(mockConversations);
      (ExportService.exportToGoogleDocs as any).mockResolvedValue(mockGoogleDocs);

      const caller = exportRouter.createCaller(mockContext);
      const result = await caller.exportAll({
        format: 'google-docs',
      });

      expect(result.format).toBe('google-docs');
      expect(result.data).toBe(mockGoogleDocs);
      expect(ExportService.exportToGoogleDocs).toHaveBeenCalled();
    });

    it('handles database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockContext.db.conversation.findMany.mockRejectedValue(dbError);

      const caller = exportRouter.createCaller(mockContext);

      await expect(caller.exportAll({
        format: 'markdown',
      })).rejects.toThrow(TRPCError);

      await expect(caller.exportAll({
        format: 'markdown',
      })).rejects.toThrow('Failed to export conversations');
    });

    it('handles unsupported format', async () => {
      const caller = exportRouter.createCaller(mockContext);

      await expect(caller.exportAll({
        format: 'unsupported' as any,
      })).rejects.toThrow(TRPCError);

      await expect(caller.exportAll({
        format: 'unsupported' as any,
      })).rejects.toThrow('Invalid enum value');
    });

    it('handles empty conversations list', async () => {
      mockContext.db.conversation.findMany.mockResolvedValue([]);
      (ExportService.exportToMarkdown as any).mockResolvedValue('');

      const caller = exportRouter.createCaller(mockContext);
      const result = await caller.exportAll({
        format: 'markdown',
      });

      expect(result.metadata.totalConversations).toBe(0);
      expect(result.metadata.totalMessages).toBe(0);
      expect(result.metadata.totalTokens).toBe(0);
      expect(result.metadata.totalCost).toBe(0);
    });
  });

  describe('exportConversation', () => {
    const mockConversation = {
      id: 'conv-1',
      title: 'Test Conversation',
      model: 'gpt-3.5-turbo',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T11:00:00Z'),
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          tokens: 10,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          parentId: null,
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          tokens: 15,
          createdAt: new Date('2024-01-01T10:01:00Z'),
          parentId: 'msg-1',
        },
      ],
    };

    it('exports single conversation in markdown format', async () => {
      const mockMarkdown = '# Test Conversation\n\nHello\nHi there!';
      
      mockContext.db.conversation.findUnique.mockResolvedValue(mockConversation);
      (ExportService.exportToMarkdown as any).mockResolvedValue(mockMarkdown);

      const caller = exportRouter.createCaller(mockContext);
      const result = await caller.exportConversation({
        conversationId: 'conv-1',
        format: 'markdown',
        includeMetadata: true,
        includeTimestamps: true,
        includeCosts: true,
      });

      expect(result.format).toBe('markdown');
      expect(result.data).toBe(mockMarkdown);
      expect(result.metadata.conversationId).toBe('conv-1');
      expect(result.metadata.title).toBe('Test Conversation');
      expect(result.metadata.totalMessages).toBe(2);
      expect(result.metadata.totalTokens).toBe(25);
      expect(result.metadata.totalCost).toBeCloseTo(0.00005, 5);
      expect(result.metadata.exportDate).toBeDefined();

      expect(ExportService.exportToMarkdown).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'conv-1',
            title: 'Test Conversation',
            messages: expect.arrayContaining([
              expect.objectContaining({
                id: 'msg-1',
                role: 'user',
                content: 'Hello',
                tokens: 10,
                cost: expect.closeTo(0.00002, 5),
              }),
            ]),
          }),
        ]),
        expect.objectContaining({
          format: 'markdown',
          includeMetadata: true,
          includeTimestamps: true,
          includeCosts: true,
        })
      );
    });

    it('exports single conversation in JSON format', async () => {
      const mockJson = { conversation: { id: 'conv-1' } };
      
      mockContext.db.conversation.findUnique.mockResolvedValue(mockConversation);
      (ExportService.exportToJSON as any).mockResolvedValue(mockJson);

      const caller = exportRouter.createCaller(mockContext);
      const result = await caller.exportConversation({
        conversationId: 'conv-1',
        format: 'json',
      });

      expect(result.format).toBe('json');
      expect(result.data).toBe(mockJson);
      expect(ExportService.exportToJSON).toHaveBeenCalled();
    });

    it('handles conversation not found', async () => {
      mockContext.db.conversation.findUnique.mockResolvedValue(null);

      const caller = exportRouter.createCaller(mockContext);

      await expect(caller.exportConversation({
        conversationId: 'nonexistent',
        format: 'markdown',
      })).rejects.toThrow(TRPCError);

      await expect(caller.exportConversation({
        conversationId: 'nonexistent',
        format: 'markdown',
      })).rejects.toThrow('Conversation not found');
    });

    it('handles database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockContext.db.conversation.findUnique.mockRejectedValue(dbError);

      const caller = exportRouter.createCaller(mockContext);

      await expect(caller.exportConversation({
        conversationId: 'conv-1',
        format: 'markdown',
      })).rejects.toThrow(TRPCError);

      await expect(caller.exportConversation({
        conversationId: 'conv-1',
        format: 'markdown',
      })).rejects.toThrow('Failed to export conversation');
    });

    it('handles unsupported format', async () => {
      const caller = exportRouter.createCaller(mockContext);

      await expect(caller.exportConversation({
        conversationId: 'conv-1',
        format: 'unsupported' as any,
      })).rejects.toThrow(TRPCError);

      await expect(caller.exportConversation({
        conversationId: 'conv-1',
        format: 'unsupported' as any,
      })).rejects.toThrow('Invalid enum value');
    });

    it('handles conversation with no messages', async () => {
      const conversationWithoutMessages = {
        ...mockConversation,
        messages: [],
      };
      
      mockContext.db.conversation.findUnique.mockResolvedValue(conversationWithoutMessages);
      (ExportService.exportToMarkdown as any).mockResolvedValue('# Empty Conversation');

      const caller = exportRouter.createCaller(mockContext);
      const result = await caller.exportConversation({
        conversationId: 'conv-1',
        format: 'markdown',
      });

      expect(result.metadata.totalMessages).toBe(0);
      expect(result.metadata.totalTokens).toBe(0);
      expect(result.metadata.totalCost).toBe(0);
    });
  });

  describe('getFormats', () => {
    it('returns available export formats', async () => {
      const caller = exportRouter.createCaller(mockContext);
      const result = await caller.getFormats();

      expect(result.formats).toHaveLength(5);
      expect(result.formats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'markdown',
            name: 'Markdown',
            description: 'Plain text with Markdown formatting',
            extensions: ['.md'],
          }),
          expect.objectContaining({
            id: 'obsidian',
            name: 'Obsidian',
            description: 'Markdown files optimized for Obsidian with linking',
            extensions: ['.md'],
          }),
          expect.objectContaining({
            id: 'notion',
            name: 'Notion',
            description: 'JSON format for Notion API integration',
            extensions: ['.json'],
          }),
          expect.objectContaining({
            id: 'google-docs',
            name: 'Google Docs',
            description: 'HTML format for Google Docs API',
            extensions: ['.html'],
          }),
          expect.objectContaining({
            id: 'json',
            name: 'JSON',
            description: 'Structured JSON data',
            extensions: ['.json'],
          }),
        ])
      );
    });
  });

  describe('Input Validation', () => {
    it('validates required conversationId for exportConversation', async () => {
      const caller = exportRouter.createCaller(mockContext);

      await expect(caller.exportConversation({
        conversationId: '',
        format: 'markdown',
      })).rejects.toThrow('Conversation ID is required');
    });

    it('validates format enum values', async () => {
      const caller = exportRouter.createCaller(mockContext);

      await expect(caller.exportAll({
        format: 'invalid' as any,
      })).rejects.toThrow();
    });

    it('uses default values for optional parameters', async () => {
      mockContext.db.conversation.findMany.mockResolvedValue([]);
      (ExportService.exportToMarkdown as any).mockResolvedValue('');

      const caller = exportRouter.createCaller(mockContext);
      await caller.exportAll({
        format: 'markdown',
      });

      expect(ExportService.exportToMarkdown).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          includeMetadata: true,
          includeTimestamps: true,
          includeCosts: true,
          groupByConversation: true,
        })
      );
    });
  });

  describe('Data Transformation', () => {
    it('transforms conversation data correctly', async () => {
      const conversationWithMetadata = {
        ...mockConversations[0],
        systemPrompt: 'You are a helpful assistant',
        temperature: 0.7,
        maxTokens: 1000,
      };

      mockContext.db.conversation.findMany.mockResolvedValue([conversationWithMetadata]);
      (ExportService.exportToMarkdown as any).mockResolvedValue('');

      const caller = exportRouter.createCaller(mockContext);
      await caller.exportAll({
        format: 'markdown',
      });

      expect(ExportService.exportToMarkdown).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'conv-1',
            title: 'Test Conversation 1',
            model: 'gpt-3.5-turbo',
            messages: expect.arrayContaining([
              expect.objectContaining({
                id: 'msg-1',
                role: 'user',
                content: 'Hello',
                tokens: 10,
                cost: expect.closeTo(0.00002, 5),
                createdAt: expect.any(Date),
                parentId: null,
              }),
              expect.objectContaining({
                id: 'msg-2',
                role: 'assistant',
                content: 'Hi there!',
                tokens: 15,
                cost: expect.closeTo(0.00003, 5),
                createdAt: expect.any(Date),
                parentId: 'msg-1',
              }),
            ]),
            metadata: expect.objectContaining({
              totalMessages: 2,
              totalTokens: 25,
              totalCost: expect.closeTo(0.00005, 5),
              systemPrompt: 'You are a helpful assistant',
              temperature: 0.7,
              maxTokens: 1000,
            }),
          }),
        ]),
        expect.any(Object)
      );
    });

    it('handles conversations with null titles', async () => {
      const conversationWithNullTitle = {
        ...mockConversations[0],
        title: null,
      };

      mockContext.db.conversation.findMany.mockResolvedValue([conversationWithNullTitle]);
      (ExportService.exportToMarkdown as any).mockResolvedValue('');

      const caller = exportRouter.createCaller(mockContext);
      await caller.exportAll({
        format: 'markdown',
      });

      expect(ExportService.exportToMarkdown).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Untitled Conversation',
          }),
        ]),
        expect.any(Object)
      );
    });

    it('handles messages with null tokens', async () => {
      const conversationWithNullTokens = {
        ...mockConversations[0],
        messages: [
          {
            ...mockConversations[0].messages[0],
            tokens: null,
          },
        ],
      };

      mockContext.db.conversation.findMany.mockResolvedValue([conversationWithNullTokens]);
      (ExportService.exportToMarkdown as any).mockResolvedValue('');

      const caller = exportRouter.createCaller(mockContext);
      await caller.exportAll({
        format: 'markdown',
      });

      expect(ExportService.exportToMarkdown).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                tokens: null,
                cost: 0,
              }),
            ]),
          }),
        ]),
        expect.any(Object)
      );
    });
  });
});
