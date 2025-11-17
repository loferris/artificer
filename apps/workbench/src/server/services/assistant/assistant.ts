// src/server/services/assistant/assistant.ts
import { logger } from '../../utils/logger';

export interface AssistantOptions {
  signal?: AbortSignal;
  model?: string;
}

export interface AssistantResponse {
  response: string;
  model: string;
  cost: number;
  tokens?: number;
}

export interface AssistantStreamChunk {
  content: string;
  tokenCount?: number;
  cost?: number;
  model?: string;
  finished: boolean;
}

export interface ModelCapabilities {
  maxTokens: number;
  costPer1kTokens: number;
  supportsStreaming: boolean;
  contextWindow: number;
}

export interface ModelHealthCheck {
  model: string;
  isHealthy: boolean;
  responseTime: number;
  lastChecked: Date;
  error?: string;
}

export interface Assistant {
  /**
   * Get a complete response from the AI assistant
   */
  getResponse(
    userMessage: string,
    conversationHistory?: Array<{ role: string; content: string }>,
    options?: AssistantOptions,
  ): Promise<string | AssistantResponse>;

  /**
   * Optional: Stream response chunks as they arrive
   * Only implement this if the assistant supports streaming
   */
  createResponseStream?(
    userMessage: string,
    conversationHistory?: Array<{ role: string; content: string }>,
    options?: AssistantOptions,
  ): AsyncIterable<AssistantStreamChunk>;

  /**
   * Get model usage statistics
   */
  getModelUsageStats(): Array<{ model: string; count: number; percentage: number }>;

  /**
   * Get model capabilities (optional - enhanced assistants only)
   */
  getModelCapabilities?(modelId?: string): ModelCapabilities | Map<string, ModelCapabilities>;

  /**
   * Get model health status (optional - enhanced assistants only)
   */
  getModelHealthStatus?(modelId?: string): ModelHealthCheck | Map<string, ModelHealthCheck>;

  /**
   * Check health of all available models (optional - enhanced assistants only)
   */
  checkAllModelsHealth?(): Promise<ModelHealthCheck[]>;
}

// Mock Assistant (for testing) - supports both streaming and non-streaming
export class MockAssistant implements Assistant {
  async getResponse(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    options?: AssistantOptions,
  ): Promise<AssistantResponse> {
    // Check if cancelled before starting
    if (options?.signal?.aborted) {
      throw new Error('Request was cancelled');
    }

    // Simulate realistic response time with cancellation support
    await new Promise<void>((resolve, reject) => {
      const delay = 500 + Math.random() * 1000;
      const timeoutId = setTimeout(() => resolve(), delay);

      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error('Request was cancelled'));
        });
      }
    });

    const responses = [
      `Response to: "${userMessage}"`,
      "I see what you mean. Here's another perspective...",
      'Thanks for sharing. How does that make you feel?',
      'That sounds challenging. What would you like to do about it?',
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];

    return {
      response,
      model: 'mock-assistant',
      cost: 0.001,
      tokens: response.split(' ').length,
    };
  }

  // Mock streaming implementation
  async *createResponseStream(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    options?: AssistantOptions,
  ): AsyncIterable<AssistantStreamChunk> {
    // Check if cancelled before starting
    if (options?.signal?.aborted) {
      throw new Error('Request was cancelled');
    }

    const responses = [
      `Mock streaming response to: "${userMessage}"`,
      'I understand your question. Let me provide a detailed response that demonstrates streaming functionality.',
      'This is a simulated AI response that shows how content would arrive in chunks.',
      'Thanks for testing the streaming feature!',
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];
    const words = response.split(' ');

    for (let i = 0; i < words.length; i++) {
      // Check for cancellation during streaming
      if (options?.signal?.aborted) {
        throw new Error('Request was cancelled');
      }

      const word = words[i];
      const isLast = i === words.length - 1;

      yield {
        content: word + (isLast ? '' : ' '),
        tokenCount: 1,
        cost: 0.0001,
        model: 'mock-assistant',
        finished: false,
      };

      // Simulate realistic typing delay
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    // Final chunk to indicate completion
    yield {
      content: '',
      finished: true,
      model: 'mock-assistant',
      cost: 0.001,
      tokenCount: words.length,
    };
  }

  getModelUsageStats(): Array<{ model: string; count: number; percentage: number }> {
    return [{ model: 'mock-assistant', count: 100, percentage: 100 }];
  }
}

// OpenRouter Assistant with streaming support
export class OpenRouterAssistant implements Assistant {
  constructor(
    private apiKey: string,
    private model: string = 'anthropic/claude-3-sonnet',
  ) {}

  async getResponse(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    options?: AssistantOptions,
  ): Promise<AssistantResponse> {
    if (options?.signal?.aborted) {
      throw new Error('Request was cancelled');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
        'X-Title': 'AI Orchestration System',
      },
      body: JSON.stringify({
        model: options?.model || this.model,
        messages: this.buildMessages(userMessage, conversationHistory),
        stream: false,
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      throw this.handleApiError(response);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      response: content,
      model: options?.model || this.model,
      cost: data.usage?.total_tokens ? data.usage.total_tokens * 0.00001 : 0, // Rough estimate
      tokens: data.usage?.total_tokens || 0,
    };
  }

  // OpenRouter streaming implementation
  async *createResponseStream(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    options?: AssistantOptions,
  ): AsyncIterable<AssistantStreamChunk> {
    if (options?.signal?.aborted) {
      return;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
        'X-Title': 'AI Orchestration System',
      },
      body: JSON.stringify({
        model: options?.model || this.model,
        messages: this.buildMessages(userMessage, conversationHistory),
        stream: true, // Enable streaming
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      throw this.handleApiError(response);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let totalTokens = 0;
    let totalCost = 0;

    try {
      while (true) {
        // Check for cancellation
        if (options?.signal?.aborted) {
          reader.releaseLock();
          return;
        }

        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              // Final completion chunk
              yield {
                content: '',
                finished: true,
                model: options?.model || this.model,
                tokenCount: totalTokens,
                cost: totalCost,
              };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';

              if (content) {
                totalTokens += 1; // Rough approximation
                totalCost += 0.00001; // Rough cost estimate

                yield {
                  content,
                  finished: false,
                  tokenCount: 1,
                  cost: 0.00001,
                  model: options?.model || this.model,
                };
              }
            } catch (e) {
              // Skip malformed JSON
              logger.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private buildMessages(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
  ) {
    const messages = conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    messages.push({ role: 'user', content: userMessage });
    return messages;
  }

  private handleApiError(response: Response): Error {
    switch (response.status) {
      case 401:
        return new Error('Invalid OpenRouter API key');
      case 402:
        return new Error('Insufficient credits');
      case 429:
        return new Error('Rate limit exceeded');
      case 500:
        return new Error('OpenRouter server error');
      default:
        return new Error(`OpenRouter API error: ${response.status}`);
    }
  }

  getModelUsageStats(): Array<{ model: string; count: number; percentage: number }> {
    // In a real implementation, this would track actual usage
    return [{ model: this.model, count: 1, percentage: 100 }];
  }
}

// Factory function for easy assistant creation
export function createAssistant(config: {
  type: 'mock' | 'openrouter';
  apiKey?: string;
  model?: string;
}): Assistant {
  switch (config.type) {
    case 'mock':
      return new MockAssistant();
    case 'openrouter':
      if (!config.apiKey) {
        throw new Error('API key required for OpenRouter assistant');
      }
      return new OpenRouterAssistant(config.apiKey, config.model);
    default:
      throw new Error(`Unknown assistant type: ${config.type}`);
  }
}
