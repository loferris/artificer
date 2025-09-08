import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usageRouter } from '../usage';
import { ServiceFactory } from '../../services/ServiceFactory';

// Mock the ServiceFactory
vi.mock('../../services/ServiceFactory', () => ({
  createServicesFromContext: vi.fn(),
}));

describe('Usage Router', () => {
  let mockContext: any;
  let mockConversationService: any;
  let mockMessageService: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockConversationService = {
      listConversations: vi.fn(),
    };

    mockMessageService = {
      getMessagesByConversation: vi.fn(),
    };

    // Mock the ServiceFactory
    const { createServicesFromContext } = await import('../../services/ServiceFactory');
    (createServicesFromContext as any).mockReturnValue({
      conversationService: mockConversationService,
      messageService: mockMessageService,
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

  describe('getSessionStats', () => {
    const mockConversations = [
      { id: 'conv-1', title: 'Conversation 1', updatedAt: new Date() },
      { id: 'conv-2', title: 'Conversation 2', updatedAt: new Date() },
    ];

    const mockMessages = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        tokens: 10,
        cost: 0.00002,
        timestamp: new Date(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there!',
        tokens: 15,
        cost: 0.00003,
        timestamp: new Date(),
      },
      {
        id: 'msg-3',
        role: 'user',
        content: 'How are you?',
        tokens: 8,
        cost: 0.000016,
        timestamp: new Date(),
      },
    ];

    it('returns session statistics for today', async () => {
      // Mock conversations
      mockConversationService.listConversations.mockResolvedValue(mockConversations);

      // Mock messages for each conversation
      mockMessageService.getMessagesByConversation
        .mockResolvedValueOnce([mockMessages[0], mockMessages[1]])
        .mockResolvedValueOnce([mockMessages[2]]);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getSessionStats();

      expect(result.conversationCount).toBe(2);
      expect(result.messageCount).toBe(3);
      expect(result.totalTokens).toBe(33); // 10 + 15 + 8
      expect(result.totalCost).toBeCloseTo(0.000066, 6); // 0.00002 + 0.00003 + 0.000016

      expect(mockConversationService.listConversations).toHaveBeenCalled();
      expect(mockMessageService.getMessagesByConversation).toHaveBeenCalledTimes(2);
    });

    it('returns zero cost when no messages exist', async () => {
      // Mock empty conversations
      mockConversationService.listConversations.mockResolvedValue([]);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getSessionStats();

      expect(result).toEqual({
        conversationCount: 0,
        messageCount: 0,
        totalTokens: 0,
        totalCost: 0,
      });
    });

    it('handles messages without tokens gracefully', async () => {
      // Mock conversations
      mockConversationService.listConversations.mockResolvedValue(mockConversations);

      // Mock messages with some missing tokens
      const messagesWithNullTokens = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          tokens: 10,
          cost: 0.00002,
          timestamp: new Date(),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          tokens: null,
          cost: 0,
          timestamp: new Date(),
        },
        {
          id: 'msg-3',
          role: 'user',
          content: 'How are you?',
          tokens: 20,
          cost: 0.00004,
          timestamp: new Date(),
        },
      ];

      mockMessageService.getMessagesByConversation
        .mockResolvedValueOnce([messagesWithNullTokens[0], messagesWithNullTokens[1]])
        .mockResolvedValueOnce([messagesWithNullTokens[2]]);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getSessionStats();

      expect(result.conversationCount).toBe(2);
      expect(result.messageCount).toBe(3);
      expect(result.totalTokens).toBe(30); // 10 + 0 + 20
      expect(result.totalCost).toBeCloseTo(0.00006, 6); // 0.00002 + 0 + 0.00004
    });

    it('handles database errors gracefully', async () => {
      mockConversationService.listConversations.mockRejectedValue(
        new Error('this.db.conversation.findMany is not a function'),
      );

      const caller = usageRouter.createCaller(mockContext);

      await expect(caller.getSessionStats()).rejects.toThrow(
        'this.db.conversation.findMany is not a function',
      );
    });
  });

  describe('getModelUsage', () => {
    const mockConversations = [{ id: 'conv-1', title: 'Conversation 1', updatedAt: new Date() }];

    const mockMessages = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        tokens: 10,
        cost: 0.00002,
        timestamp: new Date(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there!',
        tokens: 15,
        cost: 0.00003,
        timestamp: new Date(),
      },
      {
        id: 'msg-3',
        role: 'user',
        content: 'How are you?',
        tokens: 8,
        cost: 0.000016,
        timestamp: new Date(),
      },
      {
        id: 'msg-4',
        role: 'system',
        content: 'System message',
        tokens: 5,
        cost: 0.00001,
        timestamp: new Date(),
      },
    ];

    it('returns model usage statistics', async () => {
      mockConversationService.listConversations.mockResolvedValue(mockConversations);
      mockMessageService.getMessagesByConversation.mockResolvedValue(mockMessages);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getModelUsage();

      expect(result).toEqual({
        totalMessages: 4,
        byRole: [
          { role: 'user', count: 2, percentage: 50 },
          { role: 'assistant', count: 1, percentage: 25 },
          { role: 'system', count: 1, percentage: 25 },
        ],
      });
    });

    it('returns empty array when no messages exist', async () => {
      mockConversationService.listConversations.mockResolvedValue([]);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getModelUsage();

      expect(result).toEqual({
        totalMessages: 0,
        byRole: [],
      });
    });

    it('handles database errors gracefully', async () => {
      mockConversationService.listConversations.mockRejectedValue(
        new Error('this.db.conversation.findMany is not a function'),
      );

      const caller = usageRouter.createCaller(mockContext);

      await expect(caller.getModelUsage()).rejects.toThrow(
        'this.db.conversation.findMany is not a function',
      );
    });

    it('calculates percentages correctly', async () => {
      const mockConversationsMultiple = [
        { id: 'conv-1', title: 'Conversation 1', updatedAt: new Date() },
        { id: 'conv-2', title: 'Conversation 2', updatedAt: new Date() },
      ];

      const mockMessagesMultiple = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          tokens: 10,
          cost: 0.00002,
          timestamp: new Date(),
        },
        {
          id: 'msg-2',
          role: 'user',
          content: 'Another message',
          tokens: 15,
          cost: 0.00003,
          timestamp: new Date(),
        },
        {
          id: 'msg-3',
          role: 'user',
          content: 'Third message',
          tokens: 8,
          cost: 0.000016,
          timestamp: new Date(),
        },
        {
          id: 'msg-4',
          role: 'assistant',
          content: 'Response 1',
          tokens: 12,
          cost: 0.000024,
          timestamp: new Date(),
        },
        {
          id: 'msg-5',
          role: 'assistant',
          content: 'Response 2',
          tokens: 20,
          cost: 0.00004,
          timestamp: new Date(),
        },
      ];

      mockConversationService.listConversations.mockResolvedValue(mockConversationsMultiple);
      mockMessageService.getMessagesByConversation
        .mockResolvedValueOnce([
          mockMessagesMultiple[0],
          mockMessagesMultiple[1],
          mockMessagesMultiple[2],
        ])
        .mockResolvedValueOnce([mockMessagesMultiple[3], mockMessagesMultiple[4]]);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getModelUsage();

      expect(result.totalMessages).toBe(5);
      expect(result.byRole).toEqual([
        { role: 'user', count: 3, percentage: 60 },
        { role: 'assistant', count: 2, percentage: 40 },
      ]);
    });
  });

  describe('Cost Calculation Accuracy', () => {
    const mockConversations = [{ id: 'conv-1', title: 'Conversation 1', updatedAt: new Date() }];

    it('calculates costs for all supported models correctly', async () => {
      // Mock conversations
      mockConversationService.listConversations.mockResolvedValue(mockConversations);

      // Mock messages with specific token counts
      const mockMessages = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          tokens: 1000,
          cost: 0.002,
          timestamp: new Date(),
        },
      ];
      mockMessageService.getMessagesByConversation.mockResolvedValue(mockMessages);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getSessionStats();

      // 1000 tokens * 0.000002 = 0.002
      expect(result.totalCost).toBe(0.002);
      expect(result.totalTokens).toBe(1000);
    });

    it('handles fractional token costs correctly', async () => {
      // Mock conversations
      mockConversationService.listConversations.mockResolvedValue(mockConversations);

      // Mock messages with odd token counts
      const mockMessages = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          tokens: 123,
          cost: 0.000246,
          timestamp: new Date(),
        },
      ];
      mockMessageService.getMessagesByConversation.mockResolvedValue(mockMessages);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getSessionStats();

      // 123 tokens * 0.000002 = 0.000246
      expect(result.totalCost).toBeCloseTo(0.000246, 6);
      expect(result.totalTokens).toBe(123);
    });

    it('handles very large token counts', async () => {
      // Mock conversations
      mockConversationService.listConversations.mockResolvedValue(mockConversations);

      // Mock messages with large token counts
      const mockMessages = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          tokens: 1000000,
          cost: 2.0,
          timestamp: new Date(),
        },
      ];
      mockMessageService.getMessagesByConversation.mockResolvedValue(mockMessages);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getSessionStats();

      // 1M tokens * 0.000002 = 2.0
      expect(result.totalCost).toBe(2.0);
      expect(result.totalTokens).toBe(1000000);
    });
  });
});
