import { describe, it, expect, afterAll } from 'vitest';
import {
  countMessageTokens,
  countConversationTokens,
  estimateMessageFit,
  calculateContextWindow,
  clearEncodingCache,
} from '../tokenCounter';

describe('tokenCounter', () => {
  afterAll(() => {
    // Clean up encoding cache after all tests
    clearEncodingCache();
  });

  describe('countMessageTokens', () => {
    it('should count tokens in a simple message', () => {
      const content = 'Hello, how are you today?';
      const count = countMessageTokens(content);
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(content.length); // Tokens should be fewer than characters
    });

    it('should handle empty strings', () => {
      const count = countMessageTokens('');
      expect(count).toBe(0);
    });

    it('should handle longer text', () => {
      const content = `
        This is a longer piece of text that contains multiple sentences.
        It should be tokenized properly by the tiktoken library.
        We expect this to have around 30-40 tokens.
      `;
      const count = countMessageTokens(content);
      expect(count).toBeGreaterThan(20);
      expect(count).toBeLessThan(60);
    });

    it('should handle code snippets', () => {
      const content = `
        function example() {
          const x = 10;
          return x * 2;
        }
      `;
      const count = countMessageTokens(content);
      expect(count).toBeGreaterThan(10);
    });
  });

  describe('countConversationTokens', () => {
    it('should count tokens in a conversation', () => {
      const messages = [
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi there! How can I help you?' },
        { role: 'user', content: 'What is the weather like?' },
      ];

      const count = countConversationTokens(messages);
      expect(count).toBeGreaterThan(0);
      // Should include message overhead (roughly 4 tokens per message + 3 for framing)
      expect(count).toBeGreaterThan(messages.length * 4);
    });

    it('should handle empty conversation', () => {
      const count = countConversationTokens([]);
      expect(count).toBe(3); // Just the framing overhead
    });

    it('should include overhead for message formatting', () => {
      const singleMessage = [{ role: 'user', content: 'test' }];
      const singleCount = countMessageTokens('test');
      const conversationCount = countConversationTokens(singleMessage);

      // Conversation count should be higher due to role tokens and overhead
      expect(conversationCount).toBeGreaterThan(singleCount);
    });
  });

  describe('estimateMessageFit', () => {
    it('should fit all messages when under budget', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' },
      ];

      const result = estimateMessageFit(messages, 1000);
      expect(result.count).toBe(2);
      expect(result.totalTokens).toBeLessThan(1000);
    });

    it('should limit messages when over budget', () => {
      const messages = [
        { role: 'user', content: 'First message with some content' },
        { role: 'assistant', content: 'Response to first message' },
        { role: 'user', content: 'Second message with more content' },
        { role: 'assistant', content: 'Response to second message' },
      ];

      // Very tight budget - should only fit the most recent messages
      const result = estimateMessageFit(messages, 30);
      expect(result.count).toBeLessThan(messages.length);
      expect(result.totalTokens).toBeLessThanOrEqual(30);
    });

    it('should prioritize recent messages', () => {
      const messages = [
        { role: 'user', content: 'Old message' },
        { role: 'assistant', content: 'Old response' },
        { role: 'user', content: 'Recent message' },
        { role: 'assistant', content: 'Recent response' },
      ];

      const result = estimateMessageFit(messages, 50);
      // Should include recent messages, possibly excluding old ones
      expect(result.count).toBeGreaterThan(0);
      expect(result.count).toBeLessThanOrEqual(4);
    });

    it('should return zero count for impossible budget', () => {
      const messages = [{ role: 'user', content: 'This is a long message that definitely exceeds budget' }];
      const result = estimateMessageFit(messages, 1); // Only 1 token budget
      expect(result.count).toBe(0);
      expect(result.totalTokens).toBeLessThanOrEqual(3); // Just framing
    });
  });

  describe('calculateContextWindow', () => {
    it('should calculate default context window', () => {
      const config = calculateContextWindow();
      expect(config.modelContextWindow).toBe(200000); // Claude default
      expect(config.reservedForOutput).toBe(4096);
      expect(config.reservedForSystem).toBe(2000);
      expect(config.availableForHistory).toBe(200000 - 4096 - 2000);
      expect(config.recentMessagesWindow).toBe(Math.floor((200000 - 4096 - 2000) * 0.25));
      expect(config.summaryWindow).toBeGreaterThan(0);
    });

    it('should calculate custom context window', () => {
      const config = calculateContextWindow(100000, 2048);
      expect(config.modelContextWindow).toBe(100000);
      expect(config.reservedForOutput).toBe(2048);
      expect(config.availableForHistory).toBe(100000 - 2048 - 2000);
    });

    it('should allocate 25% for recent messages', () => {
      const config = calculateContextWindow(100000);
      const expectedRecent = Math.floor((100000 - 4096 - 2000) * 0.25);
      expect(config.recentMessagesWindow).toBe(expectedRecent);
    });

    it('should allocate 75% for summaries', () => {
      const config = calculateContextWindow(100000);
      const available = 100000 - 4096 - 2000;
      const expectedSummary = available - Math.floor(available * 0.25);
      expect(config.summaryWindow).toBe(expectedSummary);
    });
  });

  describe('model-specific tokenization', () => {
    it('should handle Claude models', () => {
      const content = 'Test message';
      const count = countMessageTokens(content, 'anthropic/claude-3-sonnet');
      expect(count).toBeGreaterThan(0);
    });

    it('should handle DeepSeek models', () => {
      const content = 'Test message';
      const count = countMessageTokens(content, 'deepseek/deepseek-chat');
      expect(count).toBeGreaterThan(0);
    });

    it('should handle GPT models', () => {
      const content = 'Test message';
      const count = countMessageTokens(content, 'openai/gpt-4');
      expect(count).toBeGreaterThan(0);
    });

    it('should use fallback for unknown models', () => {
      const content = 'Test message';
      const count = countMessageTokens(content, 'unknown/model');
      expect(count).toBeGreaterThan(0);
    });
  });
});
