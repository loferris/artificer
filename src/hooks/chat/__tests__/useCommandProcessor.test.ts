import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useCommandProcessor } from '../useCommandProcessor';
import { useChatStore } from '../../../stores/chatStore';
import { TestWrapper } from '../../../test/utils/trpc';

vi.mock('../../../stores/chatStore');

describe('useCommandProcessor', () => {
  it('should call addLocalMessage', () => {
    const addLocalMessage = vi.fn();
    const addMessage = vi.fn();

    // Mock useChatStore to handle selector functions
    (useChatStore as any).mockImplementation((selector?: any) => {
      if (typeof selector === 'function') {
        // Return the appropriate value based on what the selector would extract
        const mockState = {
          currentConversationId: null,
          viewMode: 'terminal' as const,
          streamingMode: false,
          addMessage,
          addLocalMessage,
          setCurrentConversation: vi.fn(),
          setSelectableConversations: vi.fn(),
          clearMessages: vi.fn(),
          resetConversation: vi.fn(),
          setViewMode: vi.fn(),
          setStreamingMode: vi.fn(),
        };
        return selector(mockState);
      }
      // If no selector, return the full mock state (for other uses)
      return {
        currentConversationId: null,
        viewMode: 'terminal',
        streamingMode: false,
        addMessage,
        addLocalMessage,
        setCurrentConversation: vi.fn(),
        setSelectableConversations: vi.fn(),
        clearMessages: vi.fn(),
        resetConversation: vi.fn(),
        setViewMode: vi.fn(),
        setStreamingMode: vi.fn(),
      };
    });

    const { result } = renderHook(() => useCommandProcessor(), { wrapper: TestWrapper });

    act(() => {
      result.current.processCommand('/man');
    });

    expect(addLocalMessage).toHaveBeenCalled();
  });
});
