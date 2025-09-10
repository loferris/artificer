import { describe, it, expect } from 'vitest';

describe('Chat Hooks Index', () => {
  it('should export all chat hooks', async () => {
    const hooks = await import('../index');

    expect(hooks).toHaveProperty('useChatOperations');
    expect(hooks).toHaveProperty('useConversationManager');
    expect(hooks).toHaveProperty('useChatState');

    expect(typeof hooks.useChatOperations).toBe('function');
    expect(typeof hooks.useConversationManager).toBe('function');
    expect(typeof hooks.useChatState).toBe('function');
  });
});
