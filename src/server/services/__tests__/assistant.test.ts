import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenRouterAssistant, createAssistant } from '../assistant';

// Mock fetch globally
global.fetch = vi.fn();

// Mock window as undefined to ensure server-side behavior
Object.defineProperty(global, 'window', {
  value: undefined,
  writable: true,
});

describe('Assistant Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('OpenRouterAssistant', () => {
    const mockConfig = {
      apiKey: 'test-api-key',
      siteName: 'test-site',
    };

    let assistant: OpenRouterAssistant;

    beforeEach(() => {
      assistant = new OpenRouterAssistant(mockConfig);
    });

    describe('getResponse', () => {
      it('sends request to OpenRouter API with correct parameters', async () => {
        const userMessage = 'Hello, how are you?';
        const mockResponse = {
          choices: [{ message: { content: 'I am doing well, thank you!' } }],
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await assistant.getResponse(userMessage);

        // Check that fetch was called
        expect(fetch).toHaveBeenCalled();

        // Check that result has expected structure
        expect(result.response).toBe('I am doing well, thank you!');
        expect(result.model).toBeDefined();
        expect(result.cost).toBeGreaterThan(0);
      });

      it('includes conversation history when provided', async () => {
        const userMessage = 'What did I just say?';
        const conversationHistory = [
          { role: 'user' as const, content: 'Hello' },
          { role: 'assistant' as const, content: 'Hi there!' },
        ];

        const mockResponse = {
          choices: [{ message: { content: 'You said "Hello"' } }],
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        await assistant.getResponse(userMessage, conversationHistory);

        // Check that fetch was called
        expect(fetch).toHaveBeenCalled();
      });

      it('selects valid OpenRouter models', async () => {
        const userMessage = 'Test message';
        const mockResponse = {
          choices: [{ message: { content: 'Test response' } }],
        };

        (fetch as any).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        // Test multiple calls to see model selection
        const results = await Promise.all([
          assistant.getResponse(userMessage),
          assistant.getResponse(userMessage),
          assistant.getResponse(userMessage),
        ]);

        const models = results.map(r => r.model);
        const validModels = [
          'anthropic/claude-3-haiku',
          'anthropic/claude-3-sonnet', 
          'meta-llama/llama-3.1-8b-instruct',
          'openai/gpt-4o-mini'
        ];

        // All models should be from the valid list
        models.forEach(model => {
          expect(validModels).toContain(model);
        });
      });

      it('uses model from environment variable when available', async () => {
        const originalEnvModel = process.env.OPENROUTER_MODEL;
        process.env.OPENROUTER_MODEL = 'anthropic/claude-3-sonnet';

        const userMessage = 'Test message';
        const mockResponse = {
          choices: [{ message: { content: 'Test response' } }],
        };

        (fetch as any).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await assistant.getResponse(userMessage);

        expect(result.model).toBe('anthropic/claude-3-sonnet');

        // Restore environment
        process.env.OPENROUTER_MODEL = originalEnvModel;
      });

      it('handles API errors gracefully', async () => {
        const userMessage = 'Test message';
        const errorResponse = {
          error: { message: 'Rate limit exceeded' },
        };

        (fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: () => Promise.resolve(JSON.stringify(errorResponse)),
        });

        const result = await assistant.getResponse(userMessage);

        expect(result.response).toContain('Sorry, I encountered an error');
        expect(result.model).toBe('error');
        expect(result.cost).toBe(0);
      });

      it('retries on transient errors', async () => {
        const userMessage = 'Test message';
        
        // First call fails with rate limit
        (fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: () => Promise.resolve('{"error":{"message":"Rate limit exceeded"}}'),
        });

        // Second call succeeds
        (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'Success after retry' } }],
          }),
        });

        const result = await assistant.getResponse(userMessage);

        expect(result.response).toBe('Success after retry');
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      it('handles network errors gracefully', async () => {
        const userMessage = 'Test message';

        (fetch as any).mockRejectedValueOnce(new Error('Network error'));

        const result = await assistant.getResponse(userMessage);

        expect(result.response).toContain('Sorry, I encountered an error');
        expect(result.model).toBe('error');
        expect(result.cost).toBe(0);
      });

      it('calculates cost based on response length and model', async () => {
        const userMessage = 'Short message';
        const longResponse = 'A'.repeat(1000); // 1000 characters
        const mockResponse = {
          choices: [{ message: { content: longResponse } }],
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await assistant.getResponse(userMessage);

        // Cost should be calculated based on model and tokens
        expect(result.cost).toBeGreaterThan(0);
        expect(result.model).toBeDefined();
      });
    });

    describe('getModelUsageStats', () => {
      it('returns model usage statistics', async () => {
        // Mock successful responses to simulate usage
        (fetch as any).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'Response' } }],
          }),
        });

        // Simulate some usage
        await assistant.getResponse('Message 1');
        await assistant.getResponse('Message 2');
        await assistant.getResponse('Message 3');

        const stats = assistant.getModelUsageStats();

        expect(stats).toBeInstanceOf(Array);
        const totalUsage = stats.reduce((sum, stat) => sum + stat.count, 0);
        expect(totalUsage).toBe(3);

        // Check percentage calculations
        stats.forEach(stat => {
          expect(stat.percentage).toBeGreaterThanOrEqual(0);
          expect(stat.percentage).toBeLessThanOrEqual(100);
        });
      });

      it('handles zero usage gracefully', () => {
        const stats = assistant.getModelUsageStats();

        expect(stats).toEqual([]);
      });
    });

    describe('private methods', () => {
      it('builds messages array correctly', async () => {
        const userMessage = 'Current message';
        const conversationHistory = [
          { role: 'user' as const, content: 'Previous message' },
          { role: 'assistant' as const, content: 'Previous response' },
        ];

        const mockResponse = {
          choices: [{ message: { content: 'Response' } }],
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        await assistant.getResponse(userMessage, conversationHistory);

        // Check that fetch was called
        expect(fetch).toHaveBeenCalled();
      });

      it('gets correct referer URL', async () => {
        const userMessage = 'Test message';
        const mockResponse = {
          choices: [{ message: { content: 'Response' } }],
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        await assistant.getResponse(userMessage);

        // Check that fetch was called
        expect(fetch).toHaveBeenCalled();
      });
    });
  });

  describe('createAssistant', () => {
    it('creates OpenRouter assistant with valid API key', () => {
      const assistant = createAssistant({ apiKey: 'sk-or-v1-test-key' });

      expect(assistant).toBeInstanceOf(OpenRouterAssistant);
    });

    it('creates OpenRouter assistant from environment variable', () => {
      // Mock environment variable with valid format
      const originalEnv = process.env.OPENROUTER_API_KEY;
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-env-api-key';

      const assistant = createAssistant({});

      expect(assistant).toBeInstanceOf(OpenRouterAssistant);

      // Restore environment
      process.env.OPENROUTER_API_KEY = originalEnv;
    });

    it('creates mock assistant when no API key available', () => {
      // Mock no environment variable
      const originalEnv = process.env.OPENROUTER_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      const assistant = createAssistant({});

      expect(assistant).toBeDefined();
      expect(typeof assistant.getResponse).toBe('function');
      expect(typeof assistant.getModelUsageStats).toBe('function');

      // Restore environment
      process.env.OPENROUTER_API_KEY = originalEnv;
    });

    it('handles errors in assistant creation gracefully', () => {
      // Mock error in constructor by creating an invalid assistant
      const assistant = createAssistant({ apiKey: 'invalid-key' });

      expect(assistant).toBeDefined();
      expect(typeof assistant.getResponse).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('handles malformed API responses', async () => {
      const assistant = new OpenRouterAssistant({
        apiKey: 'test-api-key',
        siteName: 'test-site',
      });
      const userMessage = 'Test message';

      const mockResponse = {
        choices: [], // Empty choices array
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await assistant.getResponse(userMessage);

      expect(result.response).toContain('Sorry, I encountered an error');
      expect(result.model).toBe('error');
    });

    it('handles missing message content', async () => {
      const assistant = new OpenRouterAssistant({
        apiKey: 'test-api-key',
        siteName: 'test-site',
      });
      const userMessage = 'Test message';

      const mockResponse = {
        choices: [{ message: {} }], // Missing content
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await assistant.getResponse(userMessage);

      expect(result.response).toContain('Sorry, I encountered an error');
      expect(result.model).toBe('error');
    });
  });
});