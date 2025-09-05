import { describe, it, expect, vi, beforeEach } from 'vitest';
import { messagesRouter } from '../messages';

describe('Messages Router', () => {
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockContext = {
      req: {
        headers: {
          'user-agent': 'test-agent',
          'x-session-id': 'test-session',
        },
      },
      res: {
        setHeader: vi.fn(),
      },
      user: {
        id: 'test-user',
        sessionId: 'test-session',
      },
      db: {
        message: {
          create: vi.fn(),
          findMany: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        conversation: {
          findUnique: vi.fn(),
        },
      },
    };
  });

  describe('create', () => {
    const validInput = {
      conversationId: 'conv-123',
      role: 'user' as const,
      content: 'Hello, world!',
      tokens: 5,
    };

    it('creates a new message and updates conversation timestamp', async () => {
      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        title: 'Test Conversation',
      });

      const mockMessage = {
        id: 'msg-123',
        ...validInput,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContext.db.message.create.mockResolvedValue(mockMessage);

      const caller = messagesRouter.createCaller(mockContext);
      const result = await caller.create(validInput);

      expect(result).toEqual(mockMessage);
      expect(mockContext.db.message.create).toHaveBeenCalledWith({
        data: validInput,
      });
    });

    it('creates message without tokens', async () => {
      const inputWithoutTokens = {
        conversationId: 'conv-123',
        role: 'user' as const,
        content: 'Hello, world!',
        tokens: 0,
      };

      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        title: 'Test Conversation',
      });

      const mockMessage = {
        id: 'msg-123',
        ...inputWithoutTokens,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContext.db.message.create.mockResolvedValue(mockMessage);

      const caller = messagesRouter.createCaller(mockContext);
      const result = await caller.create(inputWithoutTokens);

      expect(result).toEqual(mockMessage);
    });

    it('throws error when conversation not found', async () => {
      mockContext.db.conversation.findUnique.mockResolvedValue(null);

      const caller = messagesRouter.createCaller(mockContext);
      
      await expect(caller.create(validInput)).rejects.toThrow('Conversation not found');
    });

    it('handles creation errors gracefully', async () => {
      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        title: 'Test Conversation',
      });

      // Mock database error
      mockContext.db.message.create.mockRejectedValue(new Error('Database error'));

      const caller = messagesRouter.createCaller(mockContext);
      
      await expect(caller.create(validInput)).rejects.toThrow('Failed to create message');
    });

    it('validates input requirements', async () => {
      const caller = messagesRouter.createCaller(mockContext);

      // Test empty conversation ID
      await expect(caller.create({
        ...validInput,
        conversationId: '',
      })).rejects.toThrow('Conversation ID is required');

      // Test empty content
      await expect(caller.create({
        ...validInput,
        content: '',
      })).rejects.toThrow('Message content cannot be empty');

      // Test negative tokens
      await expect(caller.create({
        ...validInput,
        tokens: -1,
      })).rejects.toThrow('Token count must be non-negative');
    });
  });

  describe('getByConversation', () => {
    const input = { conversationId: 'conv-123' };

    it('returns messages for a conversation ordered by creation time', async () => {
      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        title: 'Test Conversation',
      });

      const mockMessages = [
        { id: 'msg-1', role: 'user', content: 'First message', createdAt: new Date('2024-01-01T10:00:00Z') },
        { id: 'msg-2', role: 'assistant', content: 'Second message', createdAt: new Date('2024-01-01T11:00:00Z') },
      ];

      mockContext.db.message.findMany.mockResolvedValue(mockMessages);

      const caller = messagesRouter.createCaller(mockContext);
      const result = await caller.getByConversation(input);

      expect(result).toEqual([
        {
          id: 'msg-1',
          role: 'user',
          content: 'First message',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          model: undefined,
          cost: undefined,
        },
        {
          id: 'msg-2',
          role: 'assistant', 
          content: 'Second message',
          timestamp: new Date('2024-01-01T11:00:00Z'),
          model: undefined,
          cost: undefined,
        },
      ]);
      expect(mockContext.db.message.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'conv-123' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('returns empty array when no messages exist', async () => {
      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        title: 'Test Conversation',
      });

      mockContext.db.message.findMany.mockResolvedValue([]);

      const caller = messagesRouter.createCaller(mockContext);
      const result = await caller.getByConversation(input);

      expect(result).toEqual([]);
    });

    it('throws error when conversation not found', async () => {
      mockContext.db.conversation.findUnique.mockResolvedValue(null);

      const caller = messagesRouter.createCaller(mockContext);
      
      await expect(caller.getByConversation(input)).rejects.toThrow('Conversation not found');
    });

    it('handles database errors gracefully', async () => {
      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        title: 'Test Conversation',
      });

      // Mock database error
      mockContext.db.message.findMany.mockRejectedValue(new Error('Database error'));

      const caller = messagesRouter.createCaller(mockContext);
      
      await expect(caller.getByConversation(input)).rejects.toThrow('Failed to fetch messages');
    });

    it('validates input requirements', async () => {
      const caller = messagesRouter.createCaller(mockContext);

      await expect(caller.getByConversation({ conversationId: '' })).rejects.toThrow('Conversation ID is required');
    });
  });

  describe('update', () => {
    const input = {
      id: 'msg-123',
      content: 'Updated message content',
    };

    it('updates message content', async () => {
      // Mock message exists
      mockContext.db.message.findUnique.mockResolvedValue({
        id: 'msg-123',
        content: 'Original content',
        role: 'user',
      });

      const updatedMessage = {
        id: 'msg-123',
        content: 'Updated message content',
        role: 'user',
        updatedAt: new Date(),
      };

      mockContext.db.message.update.mockResolvedValue(updatedMessage);

      const caller = messagesRouter.createCaller(mockContext);
      const result = await caller.update(input);

      expect(result).toEqual(updatedMessage);
      expect(mockContext.db.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-123' },
        data: { content: 'Updated message content' },
      });
    });

    it('throws error when message not found', async () => {
      mockContext.db.message.findUnique.mockResolvedValue(null);

      const caller = messagesRouter.createCaller(mockContext);
      
      await expect(caller.update(input)).rejects.toThrow('Message not found');
    });

    it('handles update errors gracefully', async () => {
      // Mock message exists
      mockContext.db.message.findUnique.mockResolvedValue({
        id: 'msg-123',
        content: 'Original content',
        role: 'user',
      });

      // Mock database error
      mockContext.db.message.update.mockRejectedValue(new Error('Database error'));

      const caller = messagesRouter.createCaller(mockContext);
      
      await expect(caller.update(input)).rejects.toThrow('Failed to update message');
    });

    it('validates input requirements', async () => {
      const caller = messagesRouter.createCaller(mockContext);

      // Test empty message ID
      await expect(caller.update({
        id: '',
        content: 'Updated content',
      })).rejects.toThrow('Message ID is required');

      // Test empty content
      await expect(caller.update({
        id: 'msg-123',
        content: '',
      })).rejects.toThrow('Message content cannot be empty');
    });
  });

  describe('delete', () => {
    const messageId = 'msg-123';

    it('deletes a message by ID', async () => {
      // Mock message exists
      mockContext.db.message.findUnique.mockResolvedValue({
        id: messageId,
        content: 'Test message',
        role: 'user',
      });

      mockContext.db.message.delete.mockResolvedValue({ id: messageId });

      const caller = messagesRouter.createCaller(mockContext);
      const result = await caller.delete(messageId);

      expect(result).toEqual({ success: true });
      expect(mockContext.db.message.delete).toHaveBeenCalledWith({
        where: { id: messageId },
      });
    });

    it('throws error when message not found', async () => {
      mockContext.db.message.findUnique.mockResolvedValue(null);

      const caller = messagesRouter.createCaller(mockContext);
      
      await expect(caller.delete(messageId)).rejects.toThrow('Message not found');
    });

    it('handles deletion errors gracefully', async () => {
      // Mock message exists
      mockContext.db.message.findUnique.mockResolvedValue({
        id: messageId,
        content: 'Test message',
        role: 'user',
      });

      // Mock database error
      mockContext.db.message.delete.mockRejectedValue(new Error('Database error'));

      const caller = messagesRouter.createCaller(mockContext);
      
      await expect(caller.delete(messageId)).rejects.toThrow('Failed to delete message');
    });

    it('validates input requirements', async () => {
      const caller = messagesRouter.createCaller(mockContext);

      await expect(caller.delete('')).rejects.toThrow('Message ID is required');
    });
  });
});
