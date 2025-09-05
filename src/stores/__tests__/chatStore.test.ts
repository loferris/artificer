import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useChatStore } from '../chatStore';

describe('Chat Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useChatStore());
    act(() => {
      result.current.setInput('');
      result.current.clearError();
      result.current.resetRetry();
    });
  });

  describe('Initial State', () => {
    it('has correct initial values', () => {
      const { result } = renderHook(() => useChatStore());

      expect(result.current.input).toBe('');
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.lastFailedMessage).toBe('');
    });
  });

  describe('Input Management', () => {
    it('updates input correctly', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setInput('Hello, world!');
      });

      expect(result.current.input).toBe('Hello, world!');
    });
  });

  describe('Error Management', () => {
    it('sets and clears errors correctly', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setError('Test error message');
      });

      expect(result.current.error).toBe('Test error message');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Retry Logic', () => {
    it('manages retry count correctly', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setRetryCount(3);
      });

      expect(result.current.retryCount).toBe(3);

      act(() => {
        result.current.resetRetry();
      });

      expect(result.current.retryCount).toBe(0);
      expect(result.current.lastFailedMessage).toBe('');
    });
  });

  describe('Message Flow', () => {
    it('handles message send start correctly', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setInput('Hello, world!');
        result.current.startMessageSend('Hello, world!');
      });

      expect(result.current.input).toBe('');
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.lastFailedMessage).toBe('Hello, world!');
    });

    it('handles message send completion correctly', () => {
      const { result } = renderHook(() => useChatStore());

      // Start a message
      act(() => {
        result.current.startMessageSend('Test message');
        result.current.setRetryCount(2);
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.retryCount).toBe(2);

      // Finish the message
      act(() => {
        result.current.finishMessageSend();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.lastFailedMessage).toBe('');
      expect(result.current.error).toBeNull();
    });

    it('handles message errors correctly', () => {
      const { result } = renderHook(() => useChatStore());

      // Start message send
      act(() => {
        result.current.startMessageSend('Test message');
      });

      expect(result.current.isLoading).toBe(true);

      // Handle error
      act(() => {
        result.current.handleMessageError('Network error occurred');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network error occurred');
      expect(result.current.retryCount).toBe(1);
    });
  });

  describe('Complex Scenarios', () => {
    it('handles multiple retry attempts', () => {
      const { result } = renderHook(() => useChatStore());

      // First attempt
      act(() => {
        result.current.startMessageSend('Test message');
        result.current.handleMessageError('First error');
      });

      expect(result.current.retryCount).toBe(1);
      expect(result.current.error).toBe('First error');

      // Second attempt  
      act(() => {
        result.current.startMessageSend('Test message');
        result.current.handleMessageError('Second error');
      });

      expect(result.current.retryCount).toBe(2); // Incremented from previous error
      expect(result.current.error).toBe('Second error');
    });

    it('manages state transitions correctly', () => {
      const { result } = renderHook(() => useChatStore());

      // Start with input
      act(() => {
        result.current.setInput('Hello');
      });

      expect(result.current.input).toBe('Hello');

      // Start sending
      act(() => {
        result.current.startMessageSend('Hello');
      });

      expect(result.current.input).toBe('');
      expect(result.current.isLoading).toBe(true);

      // Complete successfully
      act(() => {
        result.current.finishMessageSend();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles error recovery flow', () => {
      const { result } = renderHook(() => useChatStore());

      // Send message and get error
      act(() => {
        result.current.startMessageSend('Test message');
        result.current.handleMessageError('Network timeout');
      });

      expect(result.current.lastFailedMessage).toBe('Test message');

      // Retry the message
      act(() => {
        result.current.startMessageSend(result.current.lastFailedMessage);
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();

      // Succeed on retry
      act(() => {
        result.current.finishMessageSend();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.lastFailedMessage).toBe('');
    });
  });
});
