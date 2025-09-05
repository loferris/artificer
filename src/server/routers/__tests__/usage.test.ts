import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usageRouter } from '../usage';

describe('Usage Router', () => {
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
          count: vi.fn(),
        },
        message: {
          count: vi.fn(),
          findMany: vi.fn(),
          groupBy: vi.fn(),
        },
      },
    };
  });

  describe('getSessionStats', () => {
    it('returns session statistics for today', async () => {
      // Mock counts
      mockContext.db.conversation.count.mockResolvedValue(5);
      mockContext.db.message.count.mockResolvedValue(25);

      // Mock messages with tokens
      const mockMessages = [
        { tokens: 10 },
        { tokens: 15 },
        { tokens: 20 },
        { tokens: 25 },
        { tokens: 30 },
      ];
      mockContext.db.message.findMany.mockResolvedValue(mockMessages);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getSessionStats();

      expect(result.conversationCount).toBe(5);
      expect(result.messageCount).toBe(25);
      expect(result.totalTokens).toBe(100);
      expect(result.totalCost).toBeCloseTo(0.0002, 6); // 100 * 0.000002

      expect(mockContext.db.conversation.count).toHaveBeenCalled();
      expect(mockContext.db.message.count).toHaveBeenCalled();
      expect(mockContext.db.message.findMany).toHaveBeenCalledWith({
        select: { tokens: true },
      });
    });

    it('returns zero cost when no messages exist', async () => {
      // Mock counts
      mockContext.db.conversation.count.mockResolvedValue(0);
      mockContext.db.message.count.mockResolvedValue(0);

      // Mock empty messages
      mockContext.db.message.findMany.mockResolvedValue([]);

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
      // Mock counts
      mockContext.db.conversation.count.mockResolvedValue(2);
      mockContext.db.message.count.mockResolvedValue(3);

      // Mock messages with some missing tokens
      const mockMessages = [
        { tokens: 10 },
        { tokens: null },
        { tokens: 20 },
      ];
      mockContext.db.message.findMany.mockResolvedValue(mockMessages);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getSessionStats();

      expect(result.conversationCount).toBe(2);
      expect(result.messageCount).toBe(3);
      expect(result.totalTokens).toBe(30);
      expect(result.totalCost).toBeCloseTo(0.00006, 6); // 30 * 0.000002
    });

    it('handles database errors gracefully', async () => {
      mockContext.db.conversation.count.mockRejectedValue(new Error('Database error'));

      const caller = usageRouter.createCaller(mockContext);
      
      await expect(caller.getSessionStats()).rejects.toThrow('Failed to fetch session statistics');
    });
  });

  describe('getModelUsage', () => {
    it('returns model usage statistics', async () => {
      const mockUsage = [
        { role: 'user', _count: { role: 15 } },
        { role: 'assistant', _count: { role: 10 } },
      ];

      mockContext.db.message.groupBy.mockResolvedValue(mockUsage);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getModelUsage();

      expect(result).toEqual({
        totalMessages: 25,
        byRole: [
          { role: 'user', count: 15, percentage: 60 },
          { role: 'assistant', count: 10, percentage: 40 },
        ],
      });

      expect(mockContext.db.message.groupBy).toHaveBeenCalledWith({
        by: ['role'],
        _count: { role: true },
      });
    });

    it('returns empty array when no messages exist', async () => {
      mockContext.db.message.groupBy.mockResolvedValue([]);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getModelUsage();

      expect(result).toEqual({
        totalMessages: 0,
        byRole: [],
      });
    });

    it('handles database errors gracefully', async () => {
      mockContext.db.message.groupBy.mockRejectedValue(new Error('Database error'));

      const caller = usageRouter.createCaller(mockContext);
      
      await expect(caller.getModelUsage()).rejects.toThrow('Failed to fetch model usage statistics');
    });

    it('calculates percentages correctly', async () => {
      const mockUsage = [
        { role: 'user', _count: { role: 3 } },
        { role: 'assistant', _count: { role: 1 } },
        { role: 'system', _count: { role: 1 } },
      ];

      mockContext.db.message.groupBy.mockResolvedValue(mockUsage);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getModelUsage();

      expect(result.totalMessages).toBe(5);
      expect(result.byRole).toEqual([
        { role: 'user', count: 3, percentage: 60 },
        { role: 'assistant', count: 1, percentage: 20 },
        { role: 'system', count: 1, percentage: 20 },
      ]);
    });
  });

  describe('Cost Calculation Accuracy', () => {
    it('calculates costs for all supported models correctly', async () => {
      // Mock counts
      mockContext.db.conversation.count.mockResolvedValue(1);
      mockContext.db.message.count.mockResolvedValue(1);

      // Mock messages with specific token counts
      const mockMessages = [
        { tokens: 1000 }, // 1000 tokens
      ];
      mockContext.db.message.findMany.mockResolvedValue(mockMessages);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getSessionStats();

      // 1000 tokens * 0.000002 = 0.002
      expect(result.totalCost).toBe(0.002);
      expect(result.totalTokens).toBe(1000);
    });

    it('handles fractional token costs correctly', async () => {
      // Mock counts
      mockContext.db.conversation.count.mockResolvedValue(1);
      mockContext.db.message.count.mockResolvedValue(1);

      // Mock messages with odd token counts
      const mockMessages = [
        { tokens: 123 }, // 123 tokens
      ];
      mockContext.db.message.findMany.mockResolvedValue(mockMessages);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getSessionStats();

      // 123 tokens * 0.000002 = 0.000246
      expect(result.totalCost).toBeCloseTo(0.000246, 6);
      expect(result.totalTokens).toBe(123);
    });

    it('handles very large token counts', async () => {
      // Mock counts
      mockContext.db.conversation.count.mockResolvedValue(1);
      mockContext.db.message.count.mockResolvedValue(1);

      // Mock messages with large token counts
      const mockMessages = [
        { tokens: 1000000 }, // 1M tokens
      ];
      mockContext.db.message.findMany.mockResolvedValue(mockMessages);

      const caller = usageRouter.createCaller(mockContext);
      const result = await caller.getSessionStats();

      // 1M tokens * 0.000002 = 2.0
      expect(result.totalCost).toBe(2.0);
      expect(result.totalTokens).toBe(1000000);
    });
  });
});
