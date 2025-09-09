import { describe, it, expect } from 'vitest';
import * as hooks from '../hooks';

describe('TRPC Hooks', () => {
  it('should export useChat hook', () => {
    expect(hooks.useChat).toBeDefined();
    expect(typeof hooks.useChat).toBe('function');
  });

  // Note: Detailed testing of the hook's internal logic would require complex mocking
  // of the TRPC client and is better handled in component tests
});