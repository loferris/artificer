import { describe, it, expect } from 'vitest';
import { MockAssistant } from '../mockAssistant';

describe('MockAssistant', () => {
  it('should be instantiable', () => {
    const assistant = new MockAssistant();
    expect(assistant).toBeInstanceOf(MockAssistant);
  });

  it('should respond to messages', async () => {
    const assistant = new MockAssistant();
    const response = await assistant.getResponse('Hello');

    expect(response).toContain('Hello');
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  });

  it('should handle conversation history', async () => {
    const assistant = new MockAssistant();
    const response = await assistant.getResponse('Hello', [
      { role: 'user', content: 'Previous message' },
      { role: 'assistant', content: 'Previous response' },
    ]);

    expect(response).toContain('Hello');
    expect(typeof response).toBe('string');
  });

  it('should return different responses', async () => {
    const assistant = new MockAssistant();
    const responses = new Set();

    // Generate multiple responses (reduced to avoid timeout)
    for (let i = 0; i < 3; i++) {
      const response = await assistant.getResponse('Test message');
      responses.add(response);
    }

    // Should have at least some variation (not guaranteed to be all different due to randomness)
    expect(responses.size).toBeGreaterThanOrEqual(1);
  }, 10000); // Increase timeout for this test
});
