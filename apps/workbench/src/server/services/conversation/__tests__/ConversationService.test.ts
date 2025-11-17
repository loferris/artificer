import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import {
  DatabaseConversationService,
  DemoConversationService,
  type CreateConversationInput,
} from '../ConversationService';
import {
  setupDatabaseServiceMocks,
  resetDatabaseMocks,
  TestScenarios,
  DatabaseMocks,
  type MockPrismaClient,
} from '../../../../test/utils/mockDatabase';

describe('ConversationService', () => {
  let mockClient: MockPrismaClient;

  beforeEach(() => {
    mockClient = setupDatabaseServiceMocks();
  });

  afterEach(() => {
    resetDatabaseMocks(mockClient);
  });

  describe('DatabaseConversationService', () => {
    let service: DatabaseConversationService;

    beforeEach(() => {
      const { service: testService } = TestScenarios.serviceTest(
        DatabaseConversationService,
        mockClient,
      );
      service = testService;
    });

    describe('create', () => {
      it('should create conversation with default settings', async () => {
        const mockCreatedConversation = {
          id: 'conv-123',
          title: null,
          model: 'deepseek-chat',
          systemPrompt: 'You are a helpful AI assistant.',
          temperature: 0.7,
          maxTokens: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockConversationWithMessages = {
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

        mockClient.conversation.create = vi.fn().mockResolvedValue(mockCreatedConversation);
        mockClient.conversation.findUnique = vi
          .fn()
          .mockResolvedValue(mockConversationWithMessages);

        const result = await service.create();

        expect(mockClient.conversation.create).toHaveBeenCalledWith({
          data: {
            title: null,
            model: 'deepseek-chat',
            projectId: null,
            systemPrompt: 'You are a helpful AI assistant.',
            temperature: 0.7,
            maxTokens: 1000,
          },
        });

        expect(mockClient.conversation.findUnique).toHaveBeenCalledWith({
          where: { id: 'conv-123' },
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

        const mockCreatedConversation = {
          id: 'conv-456',
          title: 'Custom Chat',
          model: 'claude-3-haiku',
          systemPrompt: 'You are a creative assistant.',
          temperature: 0.9,
          maxTokens: 2000,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockConversationWithMessages = {
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

        mockClient.conversation.create = vi.fn().mockResolvedValue(mockCreatedConversation);
        mockClient.conversation.findUnique = vi
          .fn()
          .mockResolvedValue(mockConversationWithMessages);

        const result = await service.create(input);

        expect(mockClient.conversation.create).toHaveBeenCalledWith({
          data: {
            title: 'Custom Chat',
            model: 'claude-3-haiku',
            projectId: null,
            systemPrompt: 'You are a creative assistant.',
            temperature: 0.9,
            maxTokens: 2000,
          },
        });

        expect(mockClient.conversation.findUnique).toHaveBeenCalledWith({
          where: { id: 'conv-456' },
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
            messages: [{ content: 'Hello world' }],
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

        mockClient.conversation.findMany = vi.fn().mockResolvedValue(mockConversations);

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
        const longMessage =
          'This is a very long message that exceeds the fifty character limit and should be truncated';
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
        const mockCreatedConversation = {
          id: 'conv-123',
          title: null,
          model: 'deepseek-chat',
          systemPrompt: 'You are a helpful AI assistant.',
          temperature: 0.7,
          maxTokens: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockConversationWithMessages = {
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

        mockClient.conversation.create = vi.fn().mockResolvedValue(mockCreatedConversation);
        mockClient.conversation.findUnique = vi
          .fn()
          .mockResolvedValue(mockConversationWithMessages);

        const result = await service.createConversation();

        expect(mockClient.conversation.create).toHaveBeenCalled();
        expect(mockClient.conversation.findUnique).toHaveBeenCalledWith({
          where: { id: 'conv-123' },
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

      it('should call list through listConversations', async () => {
        mockClient.conversation.findMany = vi.fn().mockResolvedValue([]);

        const result = await service.listConversations();

        expect(result).toEqual([]);
        expect(mockClient.conversation.findMany).toHaveBeenCalled();
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

        expect(result).toHaveLength(3); // Three demo conversations from config
        expect(result.find(c => c.title?.includes('Welcome'))).toBeDefined();
      });

      it('should include created conversations in list', async () => {
        await service.create({ title: 'Test Chat' });

        const result = await service.list();

        expect(result).toHaveLength(4); // Three demo conversations + created
        expect(result.find((c) => c.title === 'Test Chat')).toBeDefined();
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
        await expect(service.updateTitle('nonexistent', 'title')).rejects.toThrow(TRPCError);
      });
    });

    describe('delete', () => {
      it('should delete demo conversation', async () => {
        const conversation = await service.create();

        await service.delete(conversation.id);

        // Should not be in list anymore
        const conversations = await service.list();
        expect(conversations.find((c) => c.id === conversation.id)).toBeUndefined();
      });

      it('should throw error for nonexistent conversation', async () => {
        await expect(service.delete('nonexistent')).rejects.toThrow(TRPCError);
      });
    });

    describe('wrapper methods', () => {
      it('should work through createConversation wrapper', async () => {
        const result = await service.createConversation();
        expect(result.id).toMatch(/^demo-\d+$/);
      });

      it('should work through listConversations wrapper', async () => {
        const result = await service.listConversations();
        expect(result).toHaveLength(3);
      });

      it('should work through deleteConversation wrapper', async () => {
        const conversation = await service.createConversation();
        const result = await service.deleteConversation(conversation.id);
        expect(result).toEqual({ success: true });
      });
    });
  });
});
