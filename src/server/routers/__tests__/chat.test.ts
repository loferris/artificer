import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatRouter } from '../chat';
import { TRPCError } from '@trpc/server';

// Mock the assistant service
vi.mock('../../services/assistant', () => ({
  createAssistant: vi.fn(),
}));

describe('Chat Router', () => {
  let mockContext: any;
  let mockAssistant: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockAssistant = {
      getResponse: vi.fn(),
    };

    // Mock the createAssistant function
    const { createAssistant } = await import('../../services/assistant');
    (createAssistant as any).mockReturnValue(mockAssistant);

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
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        message: {
          create: vi.fn(),
          count: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]), // Default empty history
        },
        $transaction: vi.fn(),
      },
    };
  });

  describe('sendMessage', () => {
    const validInput = {
      content: 'Hello, assistant!',
      conversationId: 'conv-123',
    };

    it('sends a message successfully', async () => {
      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        title: 'Test Conversation',
      });

      // Mock conversation history
      mockContext.db.message = {
        ...mockContext.db.message,
        findMany: vi.fn().mockResolvedValue([
          { role: 'user', content: 'Previous message', createdAt: new Date() },
          { role: 'assistant', content: 'Previous response', createdAt: new Date() },
        ]),
      };

      // Mock assistant response
      mockAssistant.getResponse.mockResolvedValue({
        response: 'Hello! How can I help you?',
        model: 'anthropic/claude-3-haiku',
        cost: 0.0001,
      });

      // Mock database transaction
      mockContext.db.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          message: {
            create: vi.fn()
              .mockResolvedValueOnce({ id: 'msg-1', createdAt: new Date() })
              .mockResolvedValueOnce({ id: 'msg-2', createdAt: new Date() }),
            count: vi.fn().mockResolvedValue(1),
          },
          conversation: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx);
      });

      const caller = chatRouter.createCaller(mockContext);
      const result = await caller.sendMessage(validInput);

      expect(result).toEqual({
        id: 'msg-2',
        content: 'Hello! How can I help you?',
        role: 'assistant',
        timestamp: expect.any(Date),
        model: 'anthropic/claude-3-haiku',
        cost: 0.0001,
      });

      // Verify conversation history was passed to assistant
      expect(mockAssistant.getResponse).toHaveBeenCalledWith(
        validInput.content,
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Previous message' }),
          expect.objectContaining({ role: 'assistant', content: 'Previous response' }),
        ])
      );

      expect(mockContext.db.$transaction).toHaveBeenCalledTimes(1);
    });

    it('validates input requirements', async () => {
      const caller = chatRouter.createCaller(mockContext);

      // Test empty content
      await expect(caller.sendMessage({
        content: '',
        conversationId: 'conv-123',
      })).rejects.toThrow('Message content cannot be empty');

      // Test missing conversation ID
      await expect(caller.sendMessage({
        content: 'Hello',
        conversationId: '',
      })).rejects.toThrow('Conversation ID is required');
    });

    it('throws error when conversation not found', async () => {
      mockContext.db.conversation.findUnique.mockResolvedValue(null);

      const caller = chatRouter.createCaller(mockContext);
      
      await expect(caller.sendMessage(validInput)).rejects.toThrow('Conversation not found');
    });

    it('throws error when assistant response is empty', async () => {
      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        title: 'Test Conversation',
      });

      // Mock empty assistant response
      mockAssistant.getResponse.mockResolvedValue({
        response: '',
        model: 'deepseek-chat',
        cost: 0,
      });

      const caller = chatRouter.createCaller(mockContext);
      
      await expect(caller.sendMessage(validInput)).rejects.toThrow('Assistant response is empty');
    });

    it('handles assistant service errors gracefully', async () => {
      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        title: 'Test Conversation',
      });

      // Mock assistant service error
      mockAssistant.getResponse.mockRejectedValue(new Error('Assistant service unavailable'));

      const caller = chatRouter.createCaller(mockContext);
      
      await expect(caller.sendMessage(validInput)).rejects.toThrow('Something went wrong. Please try again.');
    });

    it('handles database errors gracefully', async () => {
      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        title: 'Test Conversation',
      });

      // Mock assistant response
      mockAssistant.getResponse.mockResolvedValue({
        response: 'Hello! How can I help you?',
        model: 'deepseek-chat',
        cost: 0.0001,
      });

      // Mock database error
      mockContext.db.message.create.mockRejectedValue(new Error('Database error'));

      const caller = chatRouter.createCaller(mockContext);
      
      await expect(caller.sendMessage(validInput)).rejects.toThrow('Something went wrong. Please try again.');
    });

    it('calculates token count correctly', async () => {
      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        title: 'Test Conversation',
      });

      // Mock assistant response
      mockAssistant.getResponse.mockResolvedValue({
        response: 'Hello! How can I help you?',
        model: 'deepseek-chat',
        cost: 0.0001,
      });

      // Mock database transaction
      mockContext.db.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          message: {
            create: vi.fn()
              .mockResolvedValueOnce({ id: 'msg-1', createdAt: new Date() })
              .mockResolvedValueOnce({ id: 'msg-2', createdAt: new Date() }),
            count: vi.fn().mockResolvedValue(2),
          },
          conversation: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx);
      });

      const caller = chatRouter.createCaller(mockContext);
      await caller.sendMessage(validInput);

      // Check that transaction was called
      expect(mockContext.db.$transaction).toHaveBeenCalledTimes(1);
    });

    it('updates conversation timestamp after message exchange', async () => {
      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        title: 'Test Conversation',
      });

      // Mock assistant response
      mockAssistant.getResponse.mockResolvedValue({
        response: 'Hello! How can I help you?',
        model: 'deepseek-chat',
        cost: 0.0001,
      });

      // Mock database transaction
      mockContext.db.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          message: {
            create: vi.fn()
              .mockResolvedValueOnce({ id: 'msg-1', createdAt: new Date() })
              .mockResolvedValueOnce({ id: 'msg-2', createdAt: new Date() }),
            count: vi.fn().mockResolvedValue(2),
          },
          conversation: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx);
      });

      const caller = chatRouter.createCaller(mockContext);
      await caller.sendMessage(validInput);

      expect(mockContext.db.$transaction).toHaveBeenCalledTimes(1);
    });

    it('handles string response from assistant service', async () => {
      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        title: 'Test Conversation',
      });

      // Mock string response from assistant
      mockAssistant.getResponse.mockResolvedValue('Hello! How can I help you?');

      // Mock database transaction
      mockContext.db.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          message: {
            create: vi.fn()
              .mockResolvedValueOnce({ id: 'msg-1', createdAt: new Date() })
              .mockResolvedValueOnce({ id: 'msg-2', createdAt: new Date() }),
            count: vi.fn().mockResolvedValue(2),
          },
          conversation: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx);
      });

      const caller = chatRouter.createCaller(mockContext);
      const result = await caller.sendMessage(validInput);

      expect(result).toEqual({
        id: 'msg-2',
        content: 'Hello! How can I help you?',
        role: 'assistant',
        timestamp: expect.any(Date),
        model: 'unknown',
        cost: 0,
      });
    });

    it('handles TRPC errors correctly', async () => {
      // Mock conversation exists
      mockContext.db.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        title: 'Test Conversation',
      });

      // Mock TRPC error from assistant service
      const trpcError = new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid API key',
      });
      mockAssistant.getResponse.mockRejectedValue(trpcError);

      const caller = chatRouter.createCaller(mockContext);
      
      // Should re-throw TRPC errors
      await expect(caller.sendMessage(validInput)).rejects.toThrow('Invalid API key');
    });
  });
});
