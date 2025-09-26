import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import {
  DatabaseMessageService,
  DemoMessageService,
  type CreateMessageInput,
  type UpdateMessageInput,
} from '../MessageService';
import {
  setupDatabaseServiceMocks,
  resetDatabaseMocks,
  TestScenarios,
  DatabaseMocks,
  type MockPrismaClient,
} from '../../../../test/utils/mockDatabase';

describe('MessageService', () => {
  let mockClient: MockPrismaClient;

  beforeEach(() => {
    mockClient = setupDatabaseServiceMocks();
  });

  afterEach(() => {
    resetDatabaseMocks(mockClient);
  });

  describe('DatabaseMessageService', () => {
    let service: DatabaseMessageService;

    beforeEach(() => {
      const { service: testService } = TestScenarios.serviceTest(
        DatabaseMessageService,
        mockClient,
      );
      service = testService;
    });

    describe('create', () => {
      it('should create message with estimated tokens', async () => {
        const input: CreateMessageInput = {
          conversationId: 'conv-123',
          role: 'user',
          content: 'Hello world!',
        };

        const mockMessage = {
          id: 'msg-123',
          conversationId: 'conv-123',
          role: 'user',
          content: 'Hello world!',
          tokens: 3, // Math.ceil(12/4)
          createdAt: new Date(),
          parentId: null,
        };

        mockClient.message.create = vi.fn().mockResolvedValue(mockMessage);

        const result = await service.create(input);

        expect(mockClient.message.create).toHaveBeenCalledWith({
          data: {
            conversationId: 'conv-123',
            role: 'user',
            content: 'Hello world!',
            tokens: 3,
            parentId: null,
          },
        });

        expect(result).toMatchObject({
          id: 'msg-123',
          role: 'user',
          content: 'Hello world!',
          tokens: 3,
        });
      });

      it('should create message with parentId', async () => {
        const input: CreateMessageInput = {
          conversationId: 'conv-123',
          role: 'assistant',
          content: 'Hi there!',
          parentId: 'parent-msg-1',
        };

        const mockMessage = {
          id: 'msg-124',
          conversationId: 'conv-123',
          role: 'assistant',
          content: 'Hi there!',
          tokens: 2,
          createdAt: new Date(),
          parentId: 'parent-msg-1',
        };

        mockClient.message.create = vi.fn().mockResolvedValue(mockMessage);

        const result = await service.create(input);

        expect(result.parentId).toBe('parent-msg-1');
      });
    });

    describe('getByConversation', () => {
      it('should return messages with cost calculation', async () => {
        const mockMessages = [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Hello!',
            tokens: 2,
            createdAt: new Date('2023-01-01'),
            conversationId: 'conv-123',
            parentId: null,
          },
          {
            id: 'msg-2',
            role: 'assistant',
            content: 'Hi there!',
            tokens: 3,
            createdAt: new Date('2023-01-02'),
            conversationId: 'conv-123',
            parentId: null,
          },
        ];

        mockClient.message.findMany = vi.fn().mockResolvedValue(mockMessages);

        const result = await service.getByConversation('conv-123');

        expect(mockClient.message.findMany).toHaveBeenCalledWith({
          where: { conversationId: 'conv-123' },
          orderBy: { createdAt: 'asc' },
        });

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          id: 'msg-1',
          role: 'user',
          content: 'Hello!',
          tokens: 2,
          cost: expect.any(Number),
        });
        expect(result[0].cost).toBeGreaterThan(0);
      });

      it('should handle empty conversation', async () => {
        mockClient.message.findMany = vi.fn().mockResolvedValue([]);

        const result = await service.getByConversation('conv-empty');

        expect(result).toEqual([]);
      });
    });

    describe('getConversationHistory', () => {
      it('should return simplified message format for AI', async () => {
        const mockMessages = [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Hello AI',
            tokens: 2,
            createdAt: new Date(),
            conversationId: 'conv-123',
            parentId: null,
          },
          {
            id: 'msg-2',
            role: 'assistant',
            content: 'Hello human!',
            tokens: 3,
            createdAt: new Date(),
            conversationId: 'conv-123',
            parentId: null,
          },
        ];

        mockClient.message.findMany = vi.fn().mockResolvedValue(mockMessages);

        const result = await service.getConversationHistory('conv-123');

        expect(mockClient.message.findMany).toHaveBeenCalledWith({
          where: { conversationId: 'conv-123' },
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            content: true,
          },
        });

        expect(result).toEqual([
          { role: 'user', content: 'Hello AI' },
          { role: 'assistant', content: 'Hello human!' },
        ]);
      });
    });

    describe('utility methods', () => {
      it('should estimate tokens correctly', () => {
        expect(service.estimateTokens('Hello world!')).toBe(3); // 12 chars / 4 = 3
        expect(service.estimateTokens('A')).toBe(1); // 1 char / 4 = 0.25, ceil = 1
        expect(service.estimateTokens('This is a longer message')).toBe(6); // 24 chars / 4 = 6
      });

      it('should calculate cost based on model', () => {
        expect(service.calculateCost(1000, 'anthropic/claude-3-haiku')).toBeCloseTo(0.00025);
        expect(service.calculateCost(1000, 'deepseek-chat')).toBeCloseTo(0.0002);
        expect(service.calculateCost(1000, 'unknown-model')).toBeCloseTo(0.000001); // fallback rate
        expect(service.calculateCost(1000)).toBeCloseTo(0.000002); // default rate
      });
    });

    describe('wrapper methods', () => {
      it('should work through createMessage wrapper', async () => {
        const mockMessage = {
          id: 'msg-123',
          conversationId: 'conv-123',
          role: 'user',
          content: 'Test message',
          tokens: 3,
          createdAt: new Date(),
          parentId: null,
        };

        mockClient.message.create = vi.fn().mockResolvedValue(mockMessage);

        const result = await service.createMessage({
          conversationId: 'conv-123',
          role: 'user',
          content: 'Test message',
        });

        expect(result.content).toBe('Test message');
      });

      it('should work through getMessagesByConversation wrapper', async () => {
        mockClient.message.findMany = vi.fn().mockResolvedValue([]);

        const result = await service.getMessagesByConversation('conv-123');

        expect(result).toEqual([]);
        expect(mockClient.message.findMany).toHaveBeenCalledWith({
          where: { conversationId: 'conv-123' },
          orderBy: { createdAt: 'asc' },
        });
      });
    });
  });

  describe('DemoMessageService', () => {
    let service: DemoMessageService;

    beforeEach(() => {
      service = new DemoMessageService();
    });

    describe('create', () => {
      it('should create demo message with generated ID', async () => {
        const input: CreateMessageInput = {
          conversationId: 'demo-conv',
          role: 'user',
          content: 'Test message',
        };

        const result = await service.create(input);

        expect(result.id).toMatch(/^msg-\d+-[a-z0-9]+$/);
        expect(result.role).toBe('user');
        expect(result.content).toBe('Test message');
        expect(result.tokens).toBe(3); // Math.ceil(12/4)
      });

      it('should store messages by conversation', async () => {
        await service.create({
          conversationId: 'demo-conv',
          role: 'user',
          content: 'First message',
        });

        await service.create({
          conversationId: 'demo-conv',
          role: 'assistant',
          content: 'Second message',
        });

        const messages = await service.getByConversation('demo-conv');
        expect(messages).toHaveLength(2);
        expect(messages[0].content).toBe('First message');
        expect(messages[1].content).toBe('Second message');
      });
    });

    describe('getByConversation', () => {
      it('should return demo conversation default message', async () => {
        const messages = await service.getByConversation('demo-1');

        expect(messages).toHaveLength(1);
        expect(messages[0].content).toContain('Welcome to this AI chat application');
        expect(messages[0].cost).toBeGreaterThan(0);
        expect(messages[0].id).toBe('demo-msg-1');
      });

      it('should return empty array for unknown conversation', async () => {
        const messages = await service.getByConversation('unknown');
        expect(messages).toEqual([]);
      });
    });

    describe('update', () => {
      it('should update message content', async () => {
        const message = await service.create({
          conversationId: 'demo-conv',
          role: 'user',
          content: 'Original content',
        });

        const updated = await service.update(message.id, {
          content: 'Updated content',
        });

        expect(updated.content).toBe('Updated content');
        expect(updated.id).toBe(message.id);
        expect(updated.tokens).toBe(4); // Math.ceil(15/4)
      });

      it('should throw error for nonexistent message', async () => {
        await expect(service.update('nonexistent', { content: 'test' })).rejects.toThrow(TRPCError);
      });
    });

    describe('delete', () => {
      it('should delete message from conversation', async () => {
        const message = await service.create({
          conversationId: 'demo-conv',
          role: 'user',
          content: 'To be deleted',
        });

        await service.delete(message.id);

        // Should not be in conversation anymore
        const messages = await service.getByConversation('demo-conv');
        expect(messages.find((m) => m.id === message.id)).toBeUndefined();
      });

      it('should throw error for nonexistent message', async () => {
        await expect(service.delete('nonexistent')).rejects.toThrow(TRPCError);
      });
    });

    describe('utility methods', () => {
      it('should estimate tokens same as database service', () => {
        expect(service.estimateTokens('Hello world!')).toBe(3);
        expect(service.estimateTokens('A')).toBe(1);
      });

      it('should calculate simple demo cost', () => {
        expect(service.calculateCost(100)).toBeCloseTo(0.1); // 100 * 0.001
        expect(service.calculateCost(1000)).toBeCloseTo(1.0); // 1000 * 0.001
      });
    });

    describe('wrapper methods', () => {
      it('should work through all wrapper methods', async () => {
        // Test createMessage
        const message = await service.createMessage({
          conversationId: 'demo-conv',
          role: 'user',
          content: 'Wrapper test',
        });
        expect(message.content).toBe('Wrapper test');

        // Test getMessagesByConversation
        const messages = await service.getMessagesByConversation('demo-conv');
        expect(messages.find((m) => m.id === message.id)).toBeDefined();

        // Test updateMessage
        const updated = await service.updateMessage(message.id, {
          content: 'Updated via wrapper',
        });
        expect(updated.content).toBe('Updated via wrapper');

        // Test deleteMessage
        const result = await service.deleteMessage(message.id);
        expect(result).toEqual({ success: true });
      });
    });
  });
});
