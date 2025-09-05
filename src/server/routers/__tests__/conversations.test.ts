import { describe, it, expect, vi, beforeEach } from 'vitest';
import { conversationsRouter } from '../conversations';

describe('Conversations Router', () => {
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
        conversation: {
          findMany: vi.fn(),
          create: vi.fn(),
          findUnique: vi.fn(),
          delete: vi.fn(),
        },
        message: {
          deleteMany: vi.fn(),
        },
      },
    };
  });

  describe('list', () => {
    it('returns conversations ordered by updatedAt desc', async () => {
      const mockConversations = [
        { id: 'conv-1', title: 'Recent Chat', updatedAt: new Date('2024-01-02') },
        { id: 'conv-2', title: 'Older Chat', updatedAt: new Date('2024-01-01') },
      ];

      mockContext.db.conversation.findMany.mockResolvedValue(mockConversations);

      const caller = conversationsRouter.createCaller(mockContext);
      const result = await caller.list();

      expect(result).toEqual(mockConversations);
      expect(mockContext.db.conversation.findMany).toHaveBeenCalledWith({
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
    });

    it('handles database errors gracefully', async () => {
      mockContext.db.conversation.findMany.mockRejectedValue(new Error('Database connection failed'));

      const caller = conversationsRouter.createCaller(mockContext);
      
      await expect(caller.list()).rejects.toThrow('Failed to fetch conversations');
    });

    it('returns empty array when no conversations exist', async () => {
      mockContext.db.conversation.findMany.mockResolvedValue([]);

      const caller = conversationsRouter.createCaller(mockContext);
      const result = await caller.list();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates a new conversation with default values', async () => {
      const mockConversation = {
        id: 'conv-123',
        title: 'New Conversation',
        model: 'deepseek-chat',
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7,
        maxTokens: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContext.db.conversation.create.mockResolvedValue(mockConversation);

      const caller = conversationsRouter.createCaller(mockContext);
      const result = await caller.create();

      expect(result).toEqual(mockConversation);
      expect(mockContext.db.conversation.create).toHaveBeenCalledWith({
        data: {
          title: null,
          model: 'deepseek-chat',
          systemPrompt: 'You are a helpful AI assistant.',
          temperature: 0.7,
          maxTokens: 1000,
        },
      });
    });

    it('handles database errors gracefully', async () => {
      mockContext.db.conversation.create.mockRejectedValue(new Error('Database error'));

      const caller = conversationsRouter.createCaller(mockContext);
      
      await expect(caller.create()).rejects.toThrow('Failed to create conversation');
    });
  });

  describe('delete', () => {
    const conversationId = 'conv-123';

    it('deletes a conversation by ID', async () => {
      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: conversationId,
        title: 'Test Conversation',
      });

      // Mock message deletion
      mockContext.db.message.deleteMany.mockResolvedValue({ count: 2 });

      // Mock conversation deletion
      mockContext.db.conversation.delete.mockResolvedValue({ id: conversationId });

      const caller = conversationsRouter.createCaller(mockContext);
      const result = await caller.delete(conversationId);

      expect(result).toEqual({ success: true });
      expect(mockContext.db.message.deleteMany).toHaveBeenCalledWith({
        where: { conversationId },
      });
      expect(mockContext.db.conversation.delete).toHaveBeenCalledWith({
        where: { id: conversationId },
      });
    });

    it('throws error when conversation not found', async () => {
      mockContext.db.conversation.findUnique.mockResolvedValue(null);

      const caller = conversationsRouter.createCaller(mockContext);
      
      await expect(caller.delete(conversationId)).rejects.toThrow('Conversation not found');
    });

    it('handles deletion errors gracefully', async () => {
      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: conversationId,
        title: 'Test Conversation',
      });

      // Mock database error
      mockContext.db.message.deleteMany.mockRejectedValue(new Error('Database error'));

      const caller = conversationsRouter.createCaller(mockContext);
      
      await expect(caller.delete(conversationId)).rejects.toThrow('Failed to delete conversation');
    });

    it('handles invalid conversation ID', async () => {
      const caller = conversationsRouter.createCaller(mockContext);
      
      await expect(caller.delete('')).rejects.toThrow('Conversation ID is required');
    });

    it('deletes messages before deleting conversation', async () => {
      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: conversationId,
        title: 'Test Conversation',
      });

      // Mock message deletion
      mockContext.db.message.deleteMany.mockResolvedValue({ count: 3 });

      // Mock conversation deletion
      mockContext.db.conversation.delete.mockResolvedValue({ id: conversationId });

      const caller = conversationsRouter.createCaller(mockContext);
      await caller.delete(conversationId);

      // Verify both operations were called
      expect(mockContext.db.message.deleteMany).toHaveBeenCalled();
      expect(mockContext.db.conversation.delete).toHaveBeenCalled();
    });
  });
});
