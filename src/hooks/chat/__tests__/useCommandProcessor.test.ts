import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useCommandProcessor } from '../useCommandProcessor';
import { useChatStore } from '../../../stores/chatStore';
import { TestWrapper } from '../../../test/utils/trpc';

vi.mock('../../../stores/chatStore');

describe('useCommandProcessor', () => {
  it('should call addLocalMessage', () => {
    const addLocalMessage = vi.fn();
    (useChatStore as any).mockReturnValue({ addLocalMessage });
    const { result } = renderHook(() => useCommandProcessor(), { wrapper: TestWrapper });

    act(() => {
      result.current.processCommand('/man');
    });

    expect(addLocalMessage).toHaveBeenCalled();
  });
});