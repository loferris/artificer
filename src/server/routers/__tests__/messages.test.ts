import { describe, it, expect, vi, beforeEach } from 'vitest';
import { messagesRouter } from '../messages';
import { ServiceFactory } from '../../services/ServiceFactory';

// Mock the ServiceFactory
vi.mock('../../services/ServiceFactory', () => ({
  createServicesFromContext: vi.fn(),
}));

describe('Messages Router', () => {
  let mockContext: any;
  let mockMessageService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockMessageService = {
      createMessage: vi.fn(),
      getMessagesByConversation: vi.fn(),
      updateMessage: vi.fn(),
      deleteMessage: vi.fn(),
    };

    // Mock the ServiceFactory
    const { createServicesFromContext } = await import('../../services/ServiceFactory');
    (createServicesFromContext as any).mockReturnValue({
      messageService: mockMessageService,
      conversationService: {},
      chatService: {},
      assistant: {},
    });

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
      db: null, // Not used directly anymore, services are injected
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
      const mockMessage = {
        id: 'msg-123',
        conversationId: 'conv-123',
        role: 'user',
        content: 'Hello, world!',
        tokens: 5,
        createdAt: new Date(),
        parentId: null,
      };

      mockMessageService.createMessage.mockResolvedValue(mockMessage);

      const caller = messagesRouter.createCaller(mockContext);
      const result = await caller.create(validInput);

      expect(result).toEqual(mockMessage);
      expect(mockMessageService.createMessage).toHaveBeenCalledWith({
        conversationId: 'conv-123',
        role: 'user',
        content: 'Hello, world!',
        tokens: 5,
      });
    });

    it('creates message with zero tokens', async () => {
      const inputWithZeroTokens = {
        conversationId: 'conv-123',
        role: 'user' as const,
        content: 'Hello, world!',
        tokens: 0,
      };

      const mockMessage = {
        id: 'msg-123',
        conversationId: 'conv-123',
        role: 'user',
        content: 'Hello, world!',
        tokens: 0,
        createdAt: new Date(),
        parentId: null,
      };

      mockMessageService.createMessage.mockResolvedValue(mockMessage);

      const caller = messagesRouter.createCaller(mockContext);
      const result = await caller.create(inputWithZeroTokens);

      expect(result).toEqual(mockMessage);
    });

    it('throws error when conversation not found', async () => {
      mockMessageService.createMessage.mockRejectedValue(new Error('Cannot read properties of undefined (reading \'id\')'));

      const caller = messagesRouter.createCaller(mockContext);
      
      await expect(caller.create(validInput)).rejects.toThrow('Cannot read properties of undefined (reading \'id\')');
    });

    it('handles creation errors gracefully', async () => {
      mockMessageService.createMessage.mockRejectedValue(new Error('Database error'));

      const caller = messagesRouter.createCaller(mockContext);
      
      await expect(caller.create(validInput)).rejects.toThrow('Database error');
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
      const mockMessages = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'First message',
          tokens: 3,
          cost: 0,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          conversationId: 'conv-123',
          parentId: null,
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'msg-2',
          role: 'assistant', 
          content: 'Second message',
          tokens: 4,
          cost: 0,
          createdAt: new Date('2024-01-01T11:00:00Z'),
          conversationId: 'conv-123',
          parentId: null,
          timestamp: new Date('2024-01-01T11:00:00Z'),
        },
      ];

      mockMessageService.getMessagesByConversation.mockResolvedValue(mockMessages);

      const caller = messagesRouter.createCaller(mockContext);
      const result = await caller.getByConversation(input);

      expect(result).toEqual(mockMessages);
      expect(mockMessageService.getMessagesByConversation).toHaveBeenCalledWith('conv-123');
    });

    it('returns empty array when no messages exist', async () => {
      mockMessageService.getMessagesByConversation.mockResolvedValue([]);

      const caller = messagesRouter.createCaller(mockContext);
      const result = await caller.getByConversation(input);

      expect(result).toEqual([]);
    });

    it('throws error when conversation not found', async () => {
      mockMessageService.getMessagesByConversation.mockRejectedValue(new Error('Cannot read properties of undefined (reading \'map\')'));

      const caller = messagesRouter.createCaller(mockContext);
      
      await expect(caller.getByConversation(input)).rejects.toThrow('Cannot read properties of undefined (reading \'map\')');
    });

    it('handles database errors gracefully', async () => {
      mockMessageService.getMessagesByConversation.mockRejectedValue(new Error('Database error'));

      const caller = messagesRouter.createCaller(mockContext);
      
      await expect(caller.getByConversation(input)).rejects.toThrow('Database error');
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
      const updatedMessage = {
        id: 'msg-123',
        role: 'user',
        content: 'Updated message content',
        tokens: 5,
        createdAt: new Date(),
        conversationId: 'conv-123',
        parentId: null,
      };

      mockMessageService.updateMessage.mockResolvedValue(updatedMessage);

      const caller = messagesRouter.createCaller(mockContext);
      const result = await caller.update(input);

      expect(result).toEqual(updatedMessage);
      expect(mockMessageService.updateMessage).toHaveBeenCalledWith('msg-123', { content: 'Updated message content' });
    });

    it('throws error when message not found', async () => {
      mockMessageService.updateMessage.mockRejectedValue(new Error('Message not found'));

      const caller = messagesRouter.createCaller(mockContext);
      
      await expect(caller.update(input)).rejects.toThrow('Message not found');
    });

    it('handles update errors gracefully', async () => {
      mockMessageService.updateMessage.mockRejectedValue(new Error('Database error'));

      const caller = messagesRouter.createCaller(mockContext);
      
      await expect(caller.update(input)).rejects.toThrow('Database error');
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
      mockMessageService.deleteMessage.mockResolvedValue({ success: true });

      const caller = messagesRouter.createCaller(mockContext);
      const result = await caller.delete(messageId);

      expect(result).toEqual({ success: true });
      expect(mockMessageService.deleteMessage).toHaveBeenCalledWith(messageId);
    });

    it('throws error when message not found', async () => {
      mockMessageService.deleteMessage.mockRejectedValue(new Error('Message not found'));

      const caller = messagesRouter.createCaller(mockContext);
      
      await expect(caller.delete(messageId)).rejects.toThrow('Message not found');
    });

    it('handles deletion errors gracefully', async () => {
      mockMessageService.deleteMessage.mockRejectedValue(new Error('Database error'));

      const caller = messagesRouter.createCaller(mockContext);
      
      await expect(caller.delete(messageId)).rejects.toThrow('Database error');
    });

    it('validates input requirements', async () => {
      const caller = messagesRouter.createCaller(mockContext);

      await expect(caller.delete('')).rejects.toThrow('Message ID is required');
    });
  });
});
