import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { PrismaClient } from '@prisma/client';

import { DatabaseChatService, DemoChatService } from '../../chat/ChatService';
import {
  DatabaseConversationService,
  DemoConversationService,
} from '../../conversation/ConversationService';
import { DatabaseMessageService, DemoMessageService } from '../../message/MessageService';
import { createServiceContainer } from '../../ServiceFactory';

// Mock Prisma client
const mockDb = {
  conversation: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  message: {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
} as unknown as PrismaClient;

// Mock Assistant
const mockAssistant = {
  getResponse: vi.fn(),
  getModelUsageStats: vi.fn(),
};

describe('ChatService Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe('DatabaseChatService', () => {
    let chatService: DatabaseChatService;
    let conversationService: DatabaseConversationService;
    let messageService: DatabaseMessageService;

    beforeEach(() => {
      conversationService = new DatabaseConversationService(mockDb);
      messageService = new DatabaseMessageService(mockDb);
      chatService = new DatabaseChatService(conversationService, messageService, mockAssistant);
    });

    describe('sendMessage', () => {
      const mockConversation = {
        id: 'conv-1',
        title: null,
        model: 'claude-3-haiku',
        systemPrompt: 'You are helpful',
        temperature: 0.7,
        maxTokens: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
      };

      const mockUserMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Hello world',
        tokens: 3,
        createdAt: new Date(),
        parentId: null,
      };

      const mockAssistantMessage = {
        id: 'msg-2',
        conversationId: 'conv-1',
        role: 'assistant',
        content: 'Hello! How can I help?',
        tokens: 6,
        createdAt: new Date(),
        parentId: null,
      };

      beforeEach(() => {
        // Setup common mocks
        mockDb.conversation.findUnique.mockResolvedValue(mockConversation as any);
        mockDb.message.findMany.mockResolvedValue([]);
        mockDb.message.create
          .mockResolvedValueOnce(mockUserMessage as any)
          .mockResolvedValueOnce(mockAssistantMessage as any);
        mockDb.message.count.mockResolvedValue(0);
        mockDb.conversation.update.mockResolvedValue({
          ...mockConversation,
          title: 'Hello world',
          updatedAt: new Date(),
        } as any);

        mockAssistant.getResponse.mockResolvedValue({
          response: 'Hello! How can I help?',
          model: 'claude-3-haiku',
          cost: 0.001,
        });
      });

      it('should successfully send message and create response', async () => {
        const result = await chatService.sendMessage({
          content: 'Hello world',
          conversationId: 'conv-1',
        });

        expect(result.userMessage).toMatchObject({
          id: 'msg-1',
          role: 'user',
          content: 'Hello world',
          tokens: 3,
        });

        expect(result.assistantMessage).toMatchObject({
          id: 'msg-2',
          role: 'assistant',
          content: 'Hello! How can I help?',
          model: 'claude-3-haiku',
          cost: 0.001,
        });

        expect(result.conversationTitle).toBe('Hello world');
      });

      it('should generate title for first message', async () => {
        await chatService.sendMessage({
          content: 'Hello world',
          conversationId: 'conv-1',
        });

        expect(mockDb.conversation.update).toHaveBeenCalledWith({
          where: { id: 'conv-1' },
          data: {
            title: 'Hello world',
            updatedAt: expect.any(Date),
          },
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
          },
        });
      });

      it('should handle subsequent messages without title generation', async () => {
        // Mock existing messages (not first message)
        mockDb.message.count.mockResolvedValue(1);
        mockDb.message.findMany.mockResolvedValue([mockUserMessage] as any);

        const result = await chatService.sendMessage({
          content: 'Another message',
          conversationId: 'conv-1',
        });

        expect(result.conversationTitle).toBeUndefined();
      });

      it('should validate message content', async () => {
        await expect(
          chatService.sendMessage({
            content: '',
            conversationId: 'conv-1',
          }),
        ).rejects.toThrow('Message content cannot be empty');

        await expect(
          chatService.sendMessage({
            content: 'x'.repeat(10001),
            conversationId: 'conv-1',
          }),
        ).rejects.toThrow('Message content too long');
      });

      it('should validate conversation access', async () => {
        mockDb.conversation.findUnique.mockResolvedValue(null);

        await expect(
          chatService.sendMessage({
            content: 'Hello',
            conversationId: 'nonexistent',
          }),
        ).rejects.toThrow('Conversation not found');
      });

      it('should handle AI service errors', async () => {
        mockAssistant.getResponse.mockRejectedValue(new Error('AI service unavailable'));

        await expect(
          chatService.sendMessage({
            content: 'Hello',
            conversationId: 'conv-1',
          }),
        ).rejects.toThrow('Something went wrong');
      });

      it('should handle empty AI response', async () => {
        mockAssistant.getResponse.mockResolvedValue({
          response: '',
          model: 'claude-3-haiku',
          cost: 0,
        });

        await expect(
          chatService.sendMessage({
            content: 'Hello',
            conversationId: 'conv-1',
          }),
        ).rejects.toThrow('Assistant response is empty');
      });

      it('should transform different error types appropriately', async () => {
        // Test timeout error
        mockAssistant.getResponse.mockRejectedValue(new Error('timeout'));
        await expect(
          chatService.sendMessage({ content: 'Hello', conversationId: 'conv-1' }),
        ).rejects.toMatchObject({
          code: 'GATEWAY_TIMEOUT',
          message: expect.stringContaining('taking too long'),
        });

        // Test rate limit error
        mockAssistant.getResponse.mockRejectedValue(new Error('rate limit'));
        await expect(
          chatService.sendMessage({ content: 'Hello', conversationId: 'conv-1' }),
        ).rejects.toMatchObject({
          code: 'TOO_MANY_REQUESTS',
        });

        // Test API key error
        mockAssistant.getResponse.mockRejectedValue(new Error('api key'));
        await expect(
          chatService.sendMessage({ content: 'Hello', conversationId: 'conv-1' }),
        ).rejects.toMatchObject({
          code: 'UNAUTHORIZED',
        });
      });
    });

    describe('getChatMessages', () => {
      it('should retrieve and format chat messages', async () => {
        const mockMessages = [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Hello',
            tokens: 1,
            createdAt: new Date('2023-01-01'),
            conversationId: 'conv-1',
            parentId: null,
            cost: 0.001,
          },
          {
            id: 'msg-2',
            role: 'assistant',
            content: 'Hi there!',
            tokens: 2,
            createdAt: new Date('2023-01-02'),
            conversationId: 'conv-1',
            parentId: null,
            cost: 0.002,
            model: 'claude-3-haiku',
          },
        ];

        mockDb.conversation.findUnique.mockResolvedValue({
          id: 'conv-1',
          title: 'Test',
          model: 'claude',
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
        } as any);

        mockDb.message.findMany.mockResolvedValue(mockMessages as any);

        const result = await chatService.getChatMessages('conv-1');

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date('2023-01-01'),
          tokens: 1,
        });
        expect(result[1]).toMatchObject({
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date('2023-01-02'),
          tokens: 2,
        });
      });

      it('should validate conversation access before retrieving messages', async () => {
        mockDb.conversation.findUnique.mockResolvedValue(null);

        await expect(chatService.getChatMessages('nonexistent')).rejects.toThrow(
          'Conversation not found',
        );
      });
    });
  });

  describe('DemoChatService', () => {
    let chatService: DemoChatService;
    let conversationService: DemoConversationService;
    let messageService: DemoMessageService;

    beforeEach(() => {
      conversationService = new DemoConversationService();
      messageService = new DemoMessageService();
      chatService = new DemoChatService(conversationService, messageService, mockAssistant);

      mockAssistant.getResponse.mockResolvedValue({
        response: 'Demo response',
        model: 'demo-assistant-v1',
        cost: 0.001,
      });
    });

    it('should work in demo mode without database', async () => {
      // Create a demo conversation first
      const conversation = await conversationService.create();

      const result = await chatService.sendMessage({
        content: 'Hello demo',
        conversationId: conversation.id,
      });

      expect(result.userMessage.content).toBe('Hello demo');
      expect(result.assistantMessage.content).toBe('Demo response');
      expect(result.assistantMessage.model).toBe('demo-assistant-v1');
      expect(result.conversationTitle).toBe('Hello demo');
    });

    it('should persist messages in memory', async () => {
      const conversation = await conversationService.create();

      await chatService.sendMessage({
        content: 'First message',
        conversationId: conversation.id,
      });

      const messages = await chatService.getChatMessages(conversation.id);
      expect(messages).toHaveLength(2); // User + Assistant
    });
  });

  describe('ServiceFactory Integration', () => {
    it('should create services with proper dependencies', () => {
      const services = createServiceContainer({ db: mockDb });

      expect(services.conversationService).toBeInstanceOf(DatabaseConversationService);
      expect(services.messageService).toBeInstanceOf(DatabaseMessageService);
      expect(services.chatService).toBeInstanceOf(DatabaseChatService);
    });

    it('should create demo services when database is unavailable', () => {
      const services = createServiceContainer({ db: null });

      expect(services.conversationService).toBeInstanceOf(DemoConversationService);
      expect(services.messageService).toBeInstanceOf(DemoMessageService);
      expect(services.chatService).toBeInstanceOf(DemoChatService);
    });

    it('should handle complete chat flow end-to-end', async () => {
      // Use demo services for this test
      const services = createServiceContainer({ db: null });

      // Mock assistant response
      vi.spyOn(services.assistant, 'getResponse').mockResolvedValue({
        response: 'Integration test response',
        model: 'test-model',
        cost: 0.005,
      });

      // Create conversation
      const conversation = await services.conversationService.create({
        title: 'Integration Test',
      });

      // Send message
      const result = await services.chatService.sendMessage({
        content: 'Integration test message',
        conversationId: conversation.id,
      });

      // Verify results
      expect(result.userMessage.content).toBe('Integration test message');
      expect(result.assistantMessage.content).toBe('Integration test response');

      // Verify conversation was updated
      const updatedConversation = await services.conversationService.getById(conversation.id);
      expect(updatedConversation?.title).toBe('Integration test message');

      // Verify messages exist
      const messages = await services.chatService.getChatMessages(conversation.id);
      expect(messages).toHaveLength(2);
    });
  });

  describe('Error Propagation', () => {
    it('should properly propagate service errors through chat service', async () => {
      const services = createServiceContainer({ db: mockDb });

      // Mock database error
      mockDb.conversation.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        services.chatService.sendMessage({
          content: 'Test message',
          conversationId: 'conv-1',
        }),
      ).rejects.toThrow('Database connection issue');
    });

    it('should handle service dependency failures gracefully', async () => {
      const conversationService = new DemoConversationService();
      const messageService = new DemoMessageService();

      // Mock message service failure
      vi.spyOn(messageService, 'create').mockRejectedValue(new Error('Message creation failed'));

      const chatService = new DemoChatService(conversationService, messageService, mockAssistant);

      await expect(
        chatService.sendMessage({
          content: 'Test',
          conversationId: 'demo-1',
        }),
      ).rejects.toThrow();
    });
  });
});
