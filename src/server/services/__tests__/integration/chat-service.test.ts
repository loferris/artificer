import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

import { DatabaseChatService, DemoChatService } from '../../chat/ChatService';
import { DatabaseConversationService } from '../../conversation/ConversationService';
import { DatabaseMessageService } from '../../message/MessageService';
import { createServiceContainer } from '../../ServiceFactory';
import { MockAssistant } from '../../assistant/assistant';

// Mock Prisma client
const mockDb = {
  conversation: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  message: {
    create: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
} as unknown as PrismaClient;

// Use the actual MockAssistant since it's designed for testing
const mockAssistant = new MockAssistant();

describe('ChatService Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DatabaseChatService', () => {
    let chatService: DatabaseChatService;

    beforeEach(() => {
      const conversationService = new DatabaseConversationService(mockDb);
      const messageService = new DatabaseMessageService(mockDb);
      chatService = new DatabaseChatService(conversationService, messageService, mockAssistant);
    });

    describe('sendMessage', () => {
      const mockConversation = {
        id: 'conv-1',
        title: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
      };

      const mockUserMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Hello world',
        createdAt: new Date(),
      };

      const mockAssistantMessage = {
        id: 'msg-2',
        conversationId: 'conv-1',
        role: 'assistant',
        content: 'Response to: "Hello world"',
        createdAt: new Date(),
        model: 'mock-assistant',
        cost: 0.001,
        tokens: 5,
      };

      beforeEach(() => {
        vi.spyOn(mockAssistant, 'getResponse').mockResolvedValue({
          response: 'Response to: "Hello world"',
          model: 'mock-assistant',
          cost: 0.001,
          tokens: 5,
        });

        mockDb.conversation.findUnique.mockResolvedValue(mockConversation as any);
        mockDb.message.findMany.mockResolvedValue([]);
        mockDb.message.create
          .mockResolvedValueOnce(mockUserMessage as any)
          .mockResolvedValueOnce(mockAssistantMessage as any);
        mockDb.conversation.update.mockResolvedValue({ ...mockConversation } as any);
        mockDb.message.count.mockResolvedValue(0);
      });

      it('should successfully send message and create response', async () => {
        mockDb.message.count.mockResolvedValue(2);
        const result = await chatService.sendMessage({
          content: 'Hello world',
          conversationId: 'conv-1',
        });
        expect(result.userMessage.content).toBe('Hello world');
        expect(result.assistantMessage.content).toBe('Response to: "Hello world"');
      });

      it('should generate title for first message', async () => {
        mockDb.message.count.mockResolvedValue(2);
        await chatService.sendMessage({ content: 'Hello world', conversationId: 'conv-1' });
        expect(mockDb.conversation.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ title: 'Hello world' }) }),
        );
      });

      it('should handle subsequent messages without title generation', async () => {
        mockDb.message.count.mockResolvedValue(4);
        const result = await chatService.sendMessage({
          content: 'Another message',
          conversationId: 'conv-1',
        });
        expect(result.conversationTitle).toBeUndefined();
      });

      it('should handle AI service errors', async () => {
        vi.spyOn(mockAssistant, 'getResponse').mockRejectedValue(
          new Error('AI service unavailable'),
        );
        await expect(
          chatService.sendMessage({ content: 'Hello', conversationId: 'conv-1' }),
        ).rejects.toThrow('AI service unavailable');
      });
    });
  });
});
