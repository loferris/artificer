import { describe, it, expect } from 'vitest';
import { useChatState } from '../useChatState';

describe('useChatState', () => {
  it('exports the hook function', () => {
    expect(typeof useChatState).toBe('function');
  });

  // Note: Detailed testing of the hook's internal logic is covered by component tests
  // and store tests, as the hook is primarily a wrapper around the store.
});
