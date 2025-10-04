import { describe, it, expect, vi, beforeEach } from 'vitest';
import { subscriptionsRouter } from '../subscriptions';
import { TRPCError } from '@trpc/server';
import type { ChatStreamChunk } from '../../services/chat/ChatService';

// Mock the ServiceFactory
vi.mock('../../services/ServiceFactory', () => ({
  createServicesFromContext: vi.fn(),
}));

import { createServicesFromContext } from '../../services/ServiceFactory';

describe('Subscriptions Router', () => {
  let mockContext: any;
  let mockChatService: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockChatService = {
      createMessageStream: vi.fn(),
    };

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
      signal: new AbortController().signal,
    };

    (createServicesFromContext as any).mockReturnValue({
      chatService: mockChatService,
    });
  });

  describe('chatStream subscription', () => {
    it('should start and stream chat messages successfully', async () => {
      // Mock streaming response
      const mockChunks: ChatStreamChunk[] = [
        { content: 'Hello', finished: false },
        { content: ' world', finished: false },
        { content: '!', finished: true, metadata: { messageId: 'msg-123' } },
      ];

      // Create async generator mock
      mockChatService.createMessageStream.mockImplementation(async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      });

      const input = {
        content: 'Test message',
        conversationId: 'conv-123',
      };

      // Get the subscription procedure
      const subscription = subscriptionsRouter.createCaller(mockContext).chatStream;

      // Create the observable
      const observable = await subscription(input);

      // Collect emitted values
      const emittedValues: ChatStreamChunk[] = [];
      let completed = false;
      let error: any = null;

      await new Promise<void>((resolve) => {
        const unsubscribe = observable.subscribe({
          next: (value) => {
            emittedValues.push(value);
          },
          complete: () => {
            completed = true;
            resolve();
          },
          error: (err) => {
            error = err;
            resolve();
          },
        });

        // Simulate some time passing
        setTimeout(() => {
          if (!completed && !error) {
            unsubscribe();
            resolve();
          }
        }, 100);
      });

      // Assertions
      expect(mockChatService.createMessageStream).toHaveBeenCalledWith(
        {
          content: input.content,
          conversationId: input.conversationId,
          signal: expect.any(AbortSignal),
        },
        mockContext.user.sessionId,
      );

      expect(emittedValues).toHaveLength(3);
      expect(emittedValues[0]).toEqual({ content: 'Hello', finished: false });
      expect(emittedValues[1]).toEqual({ content: ' world', finished: false });
      expect(emittedValues[2]).toEqual({
        content: '!',
        finished: true,
        metadata: { messageId: 'msg-123' },
      });
      expect(completed).toBe(true);
      expect(error).toBeNull();
    });

    it('should handle streaming errors properly', async () => {
      const streamError = new TRPCError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      });

      // Mock streaming error
      mockChatService.createMessageStream.mockImplementation(async function* () {
        yield { content: '', finished: true, error: 'Conversation not found' };
        throw streamError;
      });

      const input = {
        content: 'Test message',
        conversationId: 'invalid-conv',
      };

      const subscription = subscriptionsRouter.createCaller(mockContext).chatStream;
      const observable = await subscription(input);

      let emittedError: ChatStreamChunk | null = null;
      let completed = false;

      await new Promise<void>((resolve) => {
        observable.subscribe({
          next: (value) => {
            if (value.error) {
              emittedError = value;
            }
          },
          complete: () => {
            completed = true;
            resolve();
          },
          error: (err) => {
            // Error can also happen, which is fine
            resolve();
          },
        });

        // Safety timeout
        setTimeout(resolve, 200);
      });

      expect(emittedError).toEqual({
        content: '',
        finished: true,
        error: 'Conversation not found',
      });
    });

    it('should validate input parameters', async () => {
      const invalidInputs = [
        { content: '', conversationId: 'conv-123' }, // empty content
        { content: 'Test', conversationId: '' }, // empty conversationId
        { content: 'x'.repeat(10001), conversationId: 'conv-123' }, // content too long
      ];

      for (const invalidInput of invalidInputs) {
        await expect(async () => {
          const subscription = subscriptionsRouter.createCaller(mockContext).chatStream;
          await subscription(invalidInput as any);
        }).rejects.toThrow();
      }
    });

    it('should handle subscription cancellation', async () => {
      const mockChunks: ChatStreamChunk[] = [
        { content: 'Hello', finished: false },
        { content: ' world', finished: false },
        { content: '!', finished: true },
      ];

      let cancelled = false;
      mockChatService.createMessageStream.mockImplementation(async function* () {
        for (const chunk of mockChunks) {
          // Simulate checking for cancellation
          if (cancelled) {
            break;
          }
          yield chunk;
          // Add a small delay to allow cancellation to take effect
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      });

      const input = {
        content: 'Test message',
        conversationId: 'conv-123',
      };

      const subscription = subscriptionsRouter.createCaller(mockContext).chatStream;
      const observable = await subscription(input);

      const emittedValues: ChatStreamChunk[] = [];
      let unsubscribed = false;

      await new Promise<void>((resolve) => {
        const unsubscribe = observable.subscribe({
          next: (value) => {
            if (!unsubscribed) {
              emittedValues.push(value);
              // Cancel after first chunk
              if (emittedValues.length === 1) {
                cancelled = true;
                unsubscribed = true;
                unsubscribe();
                setTimeout(resolve, 20); // Give time for cleanup
              }
            }
          },
          complete: () => {
            resolve();
          },
          error: () => {
            resolve();
          },
        });
      });

      // Should have received only the first chunk before cancellation
      expect(emittedValues.length).toBeGreaterThanOrEqual(1);
      expect(emittedValues[0]).toEqual({ content: 'Hello', finished: false });
      // May have received second chunk due to timing, but should not receive all 3
      expect(emittedValues.length).toBeLessThan(3);
    });

    it('should work without user session', async () => {
      const contextWithoutUser = {
        req: {
          headers: {
            'user-agent': 'test-agent',
          },
        },
        res: {
          setHeader: vi.fn(),
        },
        user: null,
        signal: new AbortController().signal,
      };

      const mockChunks: ChatStreamChunk[] = [{ content: 'Response', finished: true }];

      mockChatService.createMessageStream.mockImplementation(async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      });

      const input = {
        content: 'Test message',
        conversationId: 'conv-123',
      };

      const subscription = subscriptionsRouter.createCaller(contextWithoutUser).chatStream;
      const observable = await subscription(input);

      const emittedValues: ChatStreamChunk[] = [];

      await new Promise<void>((resolve) => {
        observable.subscribe({
          next: (value) => {
            emittedValues.push(value);
          },
          complete: () => {
            resolve();
          },
          error: () => {
            resolve();
          },
        });
      });

      expect(mockChatService.createMessageStream).toHaveBeenCalledWith(
        expect.objectContaining({
          content: input.content,
          conversationId: input.conversationId,
        }),
        undefined, // no user session
      );
      expect(emittedValues).toHaveLength(1);
    });
  });

  describe('conversationUpdates subscription', () => {
    it('should emit conversation update events', async () => {
      const input = { conversationId: 'conv-123' };

      const subscription = subscriptionsRouter.createCaller(mockContext).conversationUpdates;
      const observable = await subscription(input);

      const emittedValues: any[] = [];
      let subscription_obj: any = null;

      await new Promise<void>((resolve) => {
        subscription_obj = observable.subscribe({
          next: (value) => {
            emittedValues.push(value);
            // Complete after receiving the test event
            if (emittedValues.length >= 1) {
              subscription_obj?.unsubscribe();
              resolve();
            }
          },
          complete: () => {
            resolve();
          },
          error: () => {
            resolve();
          },
        });

        // Give it time to emit the test event
        setTimeout(() => {
          if (emittedValues.length === 0) {
            subscription_obj?.unsubscribe();
            resolve();
          }
        }, 1500);
      });

      expect(emittedValues).toHaveLength(1);
      expect(emittedValues[0]).toEqual({
        type: 'update',
        conversationId: 'conv-123',
      });
    }, 10000); // Increase timeout
  });
});
