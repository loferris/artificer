import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatRouter } from '../chat';
import { TRPCError } from '@trpc/server';
import { ServiceFactory } from '../../services/ServiceFactory';

// Mock the assistant service
vi.mock('../../services/assistant', () => ({
  createAssistant: vi.fn(),
}));

// Mock the ServiceFactory
vi.mock('../../services/ServiceFactory', () => ({
  createServicesFromContext: vi.fn(),
}));

describe('Chat Router', () => {
  let mockContext: any;
  let mockAssistant: any;
  let mockChatService: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockAssistant = {
      getResponse: vi.fn(),
    };

    mockChatService = {
      sendMessage: vi.fn(),
    };

    // Mock the createAssistant function
    const { createAssistant } = await import('../../services/assistant');
    (createAssistant as any).mockReturnValue(mockAssistant);

    // Mock the ServiceFactory
    const { createServicesFromContext } = await import('../../services/ServiceFactory');
    (createServicesFromContext as any).mockReturnValue({
      chatService: mockChatService,
      conversationService: {},
      messageService: {},
      assistant: mockAssistant,
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

  describe('sendMessage', () => {
    const validInput = {
      content: 'Hello, assistant!',
      conversationId: 'conv-123',
    };

    it('sends a message successfully', async () => {
      // Mock chat service response
      mockChatService.sendMessage.mockResolvedValue({
        userMessage: {
          id: 'msg-1',
          content: 'Hello, assistant!',
          role: 'user',
          createdAt: new Date(),
        },
        assistantMessage: {
          id: 'msg-2',
          content: 'Hello! How can I help you?',
          role: 'assistant',
          timestamp: new Date(),
          model: 'anthropic/claude-3-haiku',
          cost: 0.0001,
        },
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

      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        {
          content: validInput.content,
          conversationId: validInput.conversationId,
          signal: undefined,
        },
        'test-session',
      );
    });

    it('validates input requirements', async () => {
      const caller = chatRouter.createCaller(mockContext);

      // Test empty content
      await expect(
        caller.sendMessage({
          content: '',
          conversationId: 'conv-123',
        }),
      ).rejects.toThrow('Message content cannot be empty');

      // Test missing conversation ID
      await expect(
        caller.sendMessage({
          content: 'Hello',
          conversationId: '',
        }),
      ).rejects.toThrow('Conversation ID is required');
    });

    it('throws error when conversation not found', async () => {
      mockChatService.sendMessage.mockRejectedValue(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        }),
      );

      const caller = chatRouter.createCaller(mockContext);

      await expect(caller.sendMessage(validInput)).rejects.toThrow('Conversation not found');
    });

    it('throws error when assistant response is empty', async () => {
      mockChatService.sendMessage.mockRejectedValue(
        new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Assistant response is empty',
        }),
      );

      const caller = chatRouter.createCaller(mockContext);

      await expect(caller.sendMessage(validInput)).rejects.toThrow('Assistant response is empty');
    });

    it('handles assistant service errors gracefully', async () => {
      mockChatService.sendMessage.mockRejectedValue(new Error('Assistant service unavailable'));

      const caller = chatRouter.createCaller(mockContext);

      await expect(caller.sendMessage(validInput)).rejects.toThrow('Assistant service unavailable');
    });

    it('handles database errors gracefully', async () => {
      mockChatService.sendMessage.mockRejectedValue(new Error('Database error'));

      const caller = chatRouter.createCaller(mockContext);

      await expect(caller.sendMessage(validInput)).rejects.toThrow('Database error');
    });

    it('calculates token count correctly', async () => {
      mockChatService.sendMessage.mockResolvedValue({
        userMessage: {
          id: 'msg-1',
          content: 'Hello, assistant!',
          role: 'user',
          createdAt: new Date(),
          tokens: 5,
        },
        assistantMessage: {
          id: 'msg-2',
          content: 'Hello! How can I help you?',
          role: 'assistant',
          timestamp: new Date(),
          tokens: 8,
          model: 'deepseek-chat',
          cost: 0.0001,
        },
      });

      const caller = chatRouter.createCaller(mockContext);
      const result = await caller.sendMessage(validInput);

      expect(result).toEqual({
        id: 'msg-2',
        content: 'Hello! How can I help you?',
        role: 'assistant',
        timestamp: expect.any(Date),
        model: 'deepseek-chat',
        cost: 0.0001,
        tokens: 8,
        conversationTitle: undefined,
      });
    });

    it('updates conversation timestamp after message exchange', async () => {
      mockChatService.sendMessage.mockResolvedValue({
        userMessage: {
          id: 'msg-1',
          content: 'Hello, assistant!',
          role: 'user',
          createdAt: new Date(),
        },
        assistantMessage: {
          id: 'msg-2',
          content: 'Hello! How can I help you?',
          role: 'assistant',
          timestamp: new Date(),
          model: 'deepseek-chat',
          cost: 0.0001,
        },
      });

      const caller = chatRouter.createCaller(mockContext);
      await caller.sendMessage(validInput);

      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        {
          content: validInput.content,
          conversationId: validInput.conversationId,
          signal: undefined,
        },
        'test-session',
      );
    });

    it('handles string response from assistant service', async () => {
      mockChatService.sendMessage.mockResolvedValue({
        userMessage: {
          id: 'msg-1',
          content: 'Hello, assistant!',
          role: 'user',
          createdAt: new Date(),
        },
        assistantMessage: {
          id: 'msg-2',
          content: 'Hello! How can I help you?',
          role: 'assistant',
          timestamp: new Date(),
          model: undefined,
          cost: undefined,
        },
      });

      const caller = chatRouter.createCaller(mockContext);
      const result = await caller.sendMessage(validInput);

      expect(result).toEqual({
        id: 'msg-2',
        content: 'Hello! How can I help you?',
        role: 'assistant',
        timestamp: expect.any(Date),
        model: undefined,
        cost: undefined,
        tokens: undefined,
        conversationTitle: undefined,
      });
    });

    it('handles TRPC errors correctly', async () => {
      // Mock TRPC error from assistant service
      const trpcError = new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid API key',
      });
      mockChatService.sendMessage.mockRejectedValue(trpcError);

      const caller = chatRouter.createCaller(mockContext);

      // Should re-throw TRPC errors
      await expect(caller.sendMessage(validInput)).rejects.toThrow('Invalid API key');
    });
  });
});
