import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@prisma/client';
import { 
  DatabaseConversationService, 
  DemoConversationService,
  type CreateConversationInput
} from '../ConversationService';

// Mock Prisma Client
const mockPrismaClient = {
  conversation: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  message: {
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
} as unknown as PrismaClient;

describe('ConversationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockPrismaClient.$transaction as any).mockImplementation((callback: any) => callback(mockPrismaClient));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('DatabaseConversationService', () => {
    let service: DatabaseConversationService;

    beforeEach(() => {
      service = new DatabaseConversationService(mockPrismaClient);
    });

    describe('create', () => {
      it('should create conversation with default settings', async () => {
        const mockConversation = {
          id: 'conv-123',
          title: null,
          model: 'deepseek-chat',
          systemPrompt: 'You are a helpful AI assistant.',
          temperature: 0.7,
          maxTokens: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
        };

        mockPrismaClient.conversation.create = vi.fn().mockResolvedValue(mockConversation);

        const result = await service.create();

        expect(mockPrismaClient.conversation.create).toHaveBeenCalledWith({
          data: {
            title: null,
            model: 'deepseek-chat',
            systemPrompt: 'You are a helpful AI assistant.',
            temperature: 0.7,
            maxTokens: 1000,
          },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        });

        expect(result).toMatchObject({
          id: 'conv-123',
          model: 'deepseek-chat',
        });
      });

      it('should create conversation with custom settings', async () => {
        const input: CreateConversationInput = {
          title: 'Custom Chat',
          model: 'claude-3-haiku',
          systemPrompt: 'You are a creative assistant.',
          temperature: 0.9,
          maxTokens: 2000,
        };

        const mockConversation = {
          id: 'conv-456',
          title: 'Custom Chat',
          model: 'claude-3-haiku',
          systemPrompt: 'You are a creative assistant.',
          temperature: 0.9,
          maxTokens: 2000,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
        };

        mockPrismaClient.conversation.create = vi.fn().mockResolvedValue(mockConversation);

        const result = await service.create(input);

        expect(mockPrismaClient.conversation.create).toHaveBeenCalledWith({
          data: {
            title: 'Custom Chat',
            model: 'claude-3-haiku',
            systemPrompt: 'You are a creative assistant.',
            temperature: 0.9,
            maxTokens: 2000,
          },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        });

        expect(result).toMatchObject({
          id: 'conv-456',
          title: 'Custom Chat',
          model: 'claude-3-haiku',
        });
      });
    });

    describe('list', () => {
      it('should return formatted conversation list', async () => {
        const mockConversations = [
          {
            id: 'conv-1',
            title: 'Chat 1',
            model: 'deepseek-chat',
            systemPrompt: 'System prompt',
            temperature: 0.7,
            maxTokens: 1000,
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-02'),
            messages: [
              { content: 'Hello world' },
            ],
            _count: { messages: 2 },
          },
          {
            id: 'conv-2',
            title: null,
            model: 'claude-3-haiku',
            systemPrompt: null,
            temperature: 0.5,
            maxTokens: 500,
            createdAt: new Date('2023-01-03'),
            updatedAt: new Date('2023-01-04'),
            messages: [],
            _count: { messages: 0 },
          },
        ];

        mockPrismaClient.conversation.findMany = vi.fn().mockResolvedValue(mockConversations);

        const result = await service.list();

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          id: 'conv-1',
          title: 'Chat 1',
          model: 'deepseek-chat',
          messageCount: 2,
          lastMessagePreview: 'Hello world',
        });

        expect(result[1]).toMatchObject({
          id: 'conv-2',
          title: 'New Conversation',
          model: 'claude-3-haiku',
          messageCount: 0,
        });
      });
    });

    describe('generateTitle', () => {
      it('should return short messages as-is', () => {
        const result = service.generateTitle('Short message');
        expect(result).toBe('Short message');
      });

      it('should truncate long messages', () => {
        const longMessage = 'This is a very long message that exceeds the fifty character limit and should be truncated';
        const result = service.generateTitle(longMessage);
        expect(result).toBe('This is a very long message that exceeds the fi...');
        expect(result).toHaveLength(50);
      });

      it('should clean up newlines and extra spaces', () => {
        const messy = '  Multiple\n\nlines\twith   spaces  ';
        const result = service.generateTitle(messy);
        expect(result).toBe('Multiple lines with spaces');
      });
    });

    describe('wrapper methods', () => {
      it('should call create through createConversation', async () => {
        const mockConversation = {
          id: 'conv-123',
          title: null,
          model: 'deepseek-chat',
          systemPrompt: 'You are a helpful AI assistant.',
          temperature: 0.7,
          maxTokens: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
        };

        mockPrismaClient.conversation.create = vi.fn().mockResolvedValue(mockConversation);

        const result = await service.createConversation();

        expect(result).toMatchObject({
          id: 'conv-123',
          model: 'deepseek-chat',
        });
      });

      it('should call list through listConversations', async () => {
        mockPrismaClient.conversation.findMany = vi.fn().mockResolvedValue([]);

        const result = await service.listConversations();

        expect(result).toEqual([]);
        expect(mockPrismaClient.conversation.findMany).toHaveBeenCalled();
      });
    });
  });

  describe('DemoConversationService', () => {
    let service: DemoConversationService;

    beforeEach(() => {
      service = new DemoConversationService();
    });

    describe('create', () => {
      it('should create demo conversation with generated ID', async () => {
        const result = await service.create();

        expect(result.id).toMatch(/^demo-\d+$/);
        expect(result.model).toBe('demo-assistant-v1');
        expect(result.messages).toEqual([]);
      });

      it('should create conversation with custom settings', async () => {
        const input: CreateConversationInput = {
          title: 'Demo Chat',
          model: 'custom-model',
        };

        const result = await service.create(input);

        expect(result.title).toBe('Demo Chat');
        expect(result.model).toBe('custom-model');
      });
    });

    describe('list', () => {
      it('should return demo conversations including default one', async () => {
        const result = await service.list();

        expect(result).toHaveLength(1); // Default demo conversation
        expect(result[0].title).toBe('Welcome to the Chat App Demo!');
      });

      it('should include created conversations in list', async () => {
        await service.create({ title: 'Test Chat' });

        const result = await service.list();

        expect(result).toHaveLength(2); // Default + created
        expect(result.find(c => c.title === 'Test Chat')).toBeDefined();
      });
    });

    describe('updateTitle', () => {
      it('should update demo conversation title', async () => {
        const conversation = await service.create();
        
        const result = await service.updateTitle(conversation.id, 'New Title');

        expect(result.title).toBe('New Title');
        expect(result.id).toBe(conversation.id);
      });

      it('should throw error for nonexistent conversation', async () => {
        await expect(service.updateTitle('nonexistent', 'title'))
          .rejects.toThrow(TRPCError);
      });
    });

    describe('delete', () => {
      it('should delete demo conversation', async () => {
        const conversation = await service.create();
        
        await service.delete(conversation.id);

        // Should not be in list anymore  
        const conversations = await service.list();
        expect(conversations.find(c => c.id === conversation.id)).toBeUndefined();
      });

      it('should throw error for nonexistent conversation', async () => {
        await expect(service.delete('nonexistent'))
          .rejects.toThrow(TRPCError);
      });
    });

    describe('wrapper methods', () => {
      it('should work through createConversation wrapper', async () => {
        const result = await service.createConversation();
        expect(result.id).toMatch(/^demo-\d+$/);
      });

      it('should work through listConversations wrapper', async () => {
        const result = await service.listConversations();
        expect(result).toHaveLength(1);
      });

      it('should work through deleteConversation wrapper', async () => {
        const conversation = await service.createConversation();
        const result = await service.deleteConversation(conversation.id);
        expect(result).toEqual({ success: true });
      });
    });
  });
});