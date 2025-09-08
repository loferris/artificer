import { describe, it, expect, vi, beforeEach } from 'vitest';
import { conversationsRouter } from '../conversations';
import { ServiceFactory } from '../../services/ServiceFactory';

// Mock the ServiceFactory
vi.mock('../../services/ServiceFactory', () => ({
  createServicesFromContext: vi.fn(),
}));

describe('Conversations Router', () => {
  let mockContext: any;
  let mockConversationService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockConversationService = {
      listConversations: vi.fn(),
      createConversation: vi.fn(),
      deleteConversation: vi.fn(),
      updateConversationTitle: vi.fn(),
    };

    // Mock the ServiceFactory
    const { createServicesFromContext } = await import('../../services/ServiceFactory');
    (createServicesFromContext as any).mockReturnValue({
      conversationService: mockConversationService,
      messageService: {},
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

  describe('list', () => {
    it('returns conversations ordered by updatedAt desc', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Recent Chat',
          model: 'deepseek-chat',
          systemPrompt: 'You are a helpful AI assistant.',
          temperature: 0.7,
          maxTokens: 1000,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          messageCount: 5,
          lastMessagePreview: 'Hello there'
        },
        {
          id: 'conv-2',
          title: 'Older Chat',
          model: 'deepseek-chat',
          systemPrompt: 'You are a helpful AI assistant.',
          temperature: 0.7,
          maxTokens: 1000,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          messageCount: 3,
          lastMessagePreview: 'How are you?'
        },
      ];

      mockConversationService.listConversations.mockResolvedValue(mockConversations);

      const caller = conversationsRouter.createCaller(mockContext);
      const result = await caller.list();

      expect(result).toEqual(mockConversations);
      expect(mockConversationService.listConversations).toHaveBeenCalled();
    });

    it('handles database errors gracefully', async () => {
      mockConversationService.listConversations.mockRejectedValue(new Error('Database connection failed'));

      const caller = conversationsRouter.createCaller(mockContext);
      
      await expect(caller.list()).rejects.toThrow('Database connection failed');
    });

    it('returns empty array when no conversations exist', async () => {
      mockConversationService.listConversations.mockResolvedValue([]);

      const caller = conversationsRouter.createCaller(mockContext);
      const result = await caller.list();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates a new conversation with default values', async () => {
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

      mockConversationService.createConversation.mockResolvedValue(mockConversation);

      const caller = conversationsRouter.createCaller(mockContext);
      const result = await caller.create();

      expect(result).toEqual(mockConversation);
      expect(mockConversationService.createConversation).toHaveBeenCalledWith({
        title: null,
        model: 'deepseek-chat',
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7,
        maxTokens: 1000,
      });
    });

    it('handles database errors gracefully', async () => {
      mockConversationService.createConversation.mockRejectedValue(new Error('Database error'));

      const caller = conversationsRouter.createCaller(mockContext);
      
      await expect(caller.create()).rejects.toThrow('Database error');
    });
  });

  describe('delete', () => {
    const conversationId = 'conv-123';

    it('deletes a conversation by ID', async () => {
      mockConversationService.deleteConversation.mockResolvedValue({ success: true });

      const caller = conversationsRouter.createCaller(mockContext);
      const result = await caller.delete(conversationId);

      expect(result).toEqual({ success: true });
      expect(mockConversationService.deleteConversation).toHaveBeenCalledWith(conversationId);
    });

    it('handles deletion errors gracefully', async () => {
      mockConversationService.deleteConversation.mockRejectedValue(new Error('Database error'));

      const caller = conversationsRouter.createCaller(mockContext);
      
      await expect(caller.delete(conversationId)).rejects.toThrow('Database error');
    });

    it('handles invalid conversation ID', async () => {
      const caller = conversationsRouter.createCaller(mockContext);
      
      await expect(caller.delete('')).rejects.toThrow('Conversation ID is required');
    });
  });

  describe('updateTitle', () => {
    it('updates conversation title with first message', async () => {
      const input = {
        conversationId: 'conv-123',
        firstMessage: 'Hello, how are you?'
      };

      const mockConversation = {
        id: 'conv-123',
        title: 'Hello, how are you?',
        model: 'deepseek-chat',
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7,
        maxTokens: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
      };

      mockConversationService.updateConversationTitle.mockResolvedValue(mockConversation);

      const caller = conversationsRouter.createCaller(mockContext);
      const result = await caller.updateTitle(input);

      expect(result).toEqual(mockConversation);
      expect(mockConversationService.updateConversationTitle).toHaveBeenCalledWith(
        input.conversationId,
        input.firstMessage
      );
    });

    it('handles update errors gracefully', async () => {
      const input = {
        conversationId: 'conv-123',
        firstMessage: 'Hello, how are you?'
      };

      mockConversationService.updateConversationTitle.mockRejectedValue(new Error('Database error'));

      const caller = conversationsRouter.createCaller(mockContext);
      
      await expect(caller.updateTitle(input)).rejects.toThrow('Database error');
    });
  });
});
