import { logger } from '../utils/logger';
import { DEMO_CONFIG } from '../config/demo';
import {
  type Assistant,
  type AssistantResponse,
  type AssistantOptions,
  type ModelCapabilities,
  type ModelHealthCheck,
} from './assistant/assistant';

// Re-export types for consistency
export type { Assistant, AssistantResponse, AssistantOptions, ModelCapabilities, ModelHealthCheck };

export interface AssistantConfig {
  apiKey?: string;
  siteName?: string;
}

export class OpenRouterAssistant implements Assistant {
  private apiKey: string;
  private siteName: string;
  private modelUsage: Map<string, number> = new Map();
  private modelCapabilities: Map<string, ModelCapabilities> = new Map();
  private modelHealthStatus: Map<string, ModelHealthCheck> = new Map();
  private fallbackModels: string[] = [
    'deepseek-chat',
    'anthropic/claude-3-haiku',
    'openai/gpt-4o-mini',
  ];

  constructor(config: { apiKey: string; siteName: string }) {
    this.apiKey = config.apiKey;
    this.siteName = config.siteName;
    this.initializeModelCapabilities();
  }

  async getResponse(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    options?: AssistantOptions,
  ): Promise<string | AssistantResponse> {
    try {
      if (!userMessage || userMessage.trim() === '') {
        throw new Error('User message cannot be empty');
      }

      const messages = this.buildMessagesArray(userMessage, conversationHistory);
      const model = await this.selectModel();

      const response = await this.fetchResponseWithFallback(messages, model, options?.signal);

      if (!response || response.trim() === '') {
        throw new Error('Assistant response is empty');
      }

      const cost = this.estimateCost(response, model);
      this.recordModelUsage(model);

      return {
        response,
        model,
        cost,
      };
    } catch (error) {
      logger.error('Error in OpenRouterAssistant.getResponse:', error);

      // Provide more specific error messages based on error type
      let errorMessage = 'Sorry, I encountered an error. Please try again.';

      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();

        if (errorMsg.includes('timeout') || errorMsg.includes('abort')) {
          errorMessage =
            'The AI service is taking too long to respond. Please try again in a moment.';
        } else if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
          errorMessage = 'Too many requests. Please wait a moment before trying again.';
        } else if (errorMsg.includes('unauthorized') || errorMsg.includes('api key')) {
          errorMessage = 'AI service configuration issue. Please check your API settings.';
        } else if (errorMsg.includes('quota') || errorMsg.includes('billing')) {
          errorMessage = 'AI service quota exceeded. Please check your account or try again later.';
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          errorMessage =
            'Network connection issue. Please check your internet connection and try again.';
        }
      }

      // For demo mode, provide a more helpful message
      if (DEMO_CONFIG.FORCE_MOCK_ASSISTANT || DEMO_CONFIG.IS_DEMO) {
        errorMessage =
          'Demo mode error. This is a showcase - in production, this would connect to real AI models.';
      }

      // Return a fallback response instead of throwing
      return {
        response: errorMessage,
        model: 'error',
        cost: 0,
      };
    }
  }

  getModelUsageStats(): Array<{ model: string; count: number; percentage: number }> {
    try {
      const totalUsage = Array.from(this.modelUsage.values()).reduce(
        (sum, count) => sum + count,
        0,
      );

      if (totalUsage === 0) {
        return [];
      }

      return Array.from(this.modelUsage.entries()).map(([model, count]) => ({
        model,
        count,
        percentage: (count / totalUsage) * 100,
      }));
    } catch (error) {
      logger.error('Error getting model usage stats:', error);
      return [];
    }
  }

  getModelCapabilities(modelId?: string): ModelCapabilities | Map<string, ModelCapabilities> {
    if (modelId) {
      return (
        this.modelCapabilities.get(modelId) || {
          maxTokens: 4096,
          costPer1kTokens: 0.001,
          supportsStreaming: false,
          contextWindow: 4096,
        }
      );
    }
    return this.modelCapabilities;
  }

  getModelHealthStatus(modelId?: string): ModelHealthCheck | Map<string, ModelHealthCheck> {
    if (modelId) {
      return (
        this.modelHealthStatus.get(modelId) || {
          model: modelId,
          isHealthy: false,
          responseTime: 0,
          lastChecked: new Date(0),
          error: 'No health check performed',
        }
      );
    }
    return this.modelHealthStatus;
  }

  async checkAllModelsHealth(): Promise<ModelHealthCheck[]> {
    const models = [
      process.env.OPENROUTER_MODEL,
      process.env.OPENROUTER_DEFAULT_MODEL,
      ...this.fallbackModels,
    ].filter((model): model is string => Boolean(model && model.trim() !== ''));

    const uniqueModels = [...new Set(models)];
    const healthChecks = await Promise.allSettled(
      uniqueModels.map(async (model) => {
        await this.validateModel(model);
        return this.modelHealthStatus.get(model)!;
      }),
    );

    return healthChecks
      .filter(
        (result): result is PromiseFulfilledResult<ModelHealthCheck> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value);
  }

  private buildMessagesArray(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    try {
      return [
        ...conversationHistory.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user' as const, content: userMessage },
      ];
    } catch (error) {
      logger.error('Error building messages array:', error);
      return [{ role: 'user' as const, content: userMessage }];
    }
  }

  private initializeModelCapabilities(): void {
    const capabilities: Record<string, ModelCapabilities> = {
      'deepseek-chat': {
        maxTokens: 4096,
        costPer1kTokens: 0.0002,
        supportsStreaming: true,
        contextWindow: 4096,
      },
      'anthropic/claude-3-haiku': {
        maxTokens: 4096,
        costPer1kTokens: 0.00025,
        supportsStreaming: true,
        contextWindow: 200000,
      },
      'anthropic/claude-3-sonnet': {
        maxTokens: 4096,
        costPer1kTokens: 0.003,
        supportsStreaming: true,
        contextWindow: 200000,
      },
      'openai/gpt-4o-mini': {
        maxTokens: 16384,
        costPer1kTokens: 0.00015,
        supportsStreaming: true,
        contextWindow: 128000,
      },
    };

    for (const [model, caps] of Object.entries(capabilities)) {
      this.modelCapabilities.set(model, caps);
    }
  }

  private async validateModel(modelId: string): Promise<boolean> {
    try {
      // Skip validation in test environment
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
        return true;
      }

      // Skip validation if fetch is not available (test/server environment)
      if (typeof fetch === 'undefined') {
        return true;
      }

      const healthCheck = this.modelHealthStatus.get(modelId);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Use cached health check if recent and healthy
      if (healthCheck && healthCheck.lastChecked > fiveMinutesAgo && healthCheck.isHealthy) {
        return true;
      }

      const startTime = Date.now();

      // Quick health check with minimal request
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok;

      const healthCheckResult: ModelHealthCheck = {
        model: modelId,
        isHealthy,
        responseTime,
        lastChecked: new Date(),
        error: isHealthy ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      };

      this.modelHealthStatus.set(modelId, healthCheckResult);

      if (isHealthy) {
        // Verify the specific model exists in the response
        const data = await response.json();
        const modelExists = data.data?.some((model: any) => model.id === modelId);
        return modelExists;
      }

      return false;
    } catch (error) {
      // In test environment, don't log validation errors
      if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
        const healthCheckResult: ModelHealthCheck = {
          model: modelId,
          isHealthy: false,
          responseTime: 0,
          lastChecked: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        };

        this.modelHealthStatus.set(modelId, healthCheckResult);
        logger.error(`Model validation failed for ${modelId}:`, error);
      }
      return false;
    }
  }

  private async selectModel(): Promise<string> {
    try {
      // Build candidate list with priority order
      const candidates = [
        process.env.OPENROUTER_MODEL,
        process.env.OPENROUTER_DEFAULT_MODEL,
        ...this.fallbackModels,
      ].filter((model): model is string => Boolean(model && model.trim() !== ''));

      // Try each candidate with validation
      for (const candidate of candidates) {
        const isValid = await this.validateModel(candidate);
        if (isValid) {
          logger.info(`Selected validated model: ${candidate}`);
          return candidate;
        } else {
          logger.warn(`Model ${candidate} failed validation, trying next fallback`);
        }
      }

      // If all validations fail, return the primary env model or first fallback
      const fallbackModel = process.env.OPENROUTER_MODEL || this.fallbackModels[0];
      logger.warn(`All model validations failed, using fallback: ${fallbackModel}`);
      return fallbackModel;
    } catch (error) {
      logger.error('Error in model selection:', error);
      return this.fallbackModels[0]; // Safe fallback
    }
  }

  private async fetchResponseWithFallback(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    primaryModel: string,
    signal?: AbortSignal,
  ): Promise<string> {
    try {
      return await this.fetchResponse(messages, primaryModel, signal);
    } catch (error) {
      logger.warn(`Primary model ${primaryModel} failed, trying fallbacks:`, error);

      // Try fallback models if primary fails
      for (const fallbackModel of this.fallbackModels) {
        if (fallbackModel === primaryModel) continue; // Skip if same as primary

        try {
          logger.info(`Attempting fallback model: ${fallbackModel}`);
          return await this.fetchResponse(messages, fallbackModel, signal);
        } catch (fallbackError) {
          logger.warn(`Fallback model ${fallbackModel} also failed:`, fallbackError);
          continue;
        }
      }

      // If all models fail, throw the original error
      throw error;
    }
  }

  private async fetchResponse(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    model: string,
    signal?: AbortSignal,
    retryCount = 0,
  ): Promise<string> {
    const startTime = Date.now();

    try {
      if (typeof window !== 'undefined') {
        // Client-side fallback
        return 'This is a client-side fallback response. Please use the server-side API.';
      }

      // Create combined abort controller for timeout and external cancellation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for real AI

      // If external signal is provided, also listen for it
      if (signal) {
        signal.addEventListener('abort', () => {
          controller.abort();
        });

        // Check if already aborted
        if (signal.aborted) {
          clearTimeout(timeoutId);
          throw new Error('Request was cancelled');
        }
      }

      try {
        const requestBody = {
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        };

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': this.getDefaultSiteName(),
            'X-Title': this.siteName,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          logger.error('OpenRouter API error:', undefined, {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          });

          // Provide specific error messages based on status
          if (response.status === 401) {
            throw new Error('Invalid API key. Please check your OpenRouter API key configuration.');
          } else if (response.status === 402) {
            throw new Error('Insufficient credits. Please check your OpenRouter account balance.');
          } else if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
          } else if (response.status >= 500) {
            throw new Error(
              'OpenRouter service is temporarily unavailable. Please try again in a moment.',
            );
          } else {
            throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
          }
        }

        const data = await response.json();

        if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
          logger.error('Invalid OpenRouter response format:', undefined, { data });
          throw new Error('Invalid response format from OpenRouter API');
        }

        const content = data.choices[0].message.content;

        // Final check for abortion before returning
        if (signal?.aborted) {
          throw new Error('Request was cancelled');
        }

        return content;
      } catch (error) {
        clearTimeout(timeoutId);

        if (
          error instanceof Error &&
          (error.name === 'AbortError' || error.message.includes('cancelled'))
        ) {
          throw new Error('Request was cancelled');
        }

        throw error;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.assistantRequest(
        model,
        0,
        0,
        duration,
        error instanceof Error ? error : new Error(String(error)),
      );

      // Retry logic for transient errors
      const maxRetries = 2;
      if (retryCount < maxRetries && error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        const isRetryable =
          errorMsg.includes('rate limit') ||
          errorMsg.includes('timeout') ||
          errorMsg.includes('network') ||
          errorMsg.includes('500') ||
          errorMsg.includes('502') ||
          errorMsg.includes('503');

        if (isRetryable) {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
          logger.info(
            `Retrying OpenRouter request in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.fetchResponse(messages, model, signal, retryCount + 1);
        }
      }

      throw error;
    }
  }

  private estimateCost(response: string, model: string): number {
    try {
      const tokens = Math.ceil(response.length / 4); // Rough token estimation
      const capabilities = this.modelCapabilities.get(model);

      if (capabilities) {
        // Use capabilities-based pricing (per 1k tokens, convert to per token)
        return tokens * (capabilities.costPer1kTokens / 1000);
      }

      // Fallback to legacy pricing if no capabilities found
      const fallbackCostPerToken: Record<string, number> = {
        'anthropic/claude-3-haiku': 0.00000025,
        'anthropic/claude-3-sonnet': 0.000003,
        'anthropic/claude-3-opus': 0.000015,
        'meta-llama/llama-3.1-8b-instruct': 0.0000002,
        'openai/gpt-4o-mini': 0.00000015,
        'deepseek-chat': 0.0000002,
      };

      return tokens * (fallbackCostPerToken[model] || 0.000001);
    } catch (error) {
      logger.error('Error estimating cost:', error);
      return 0;
    }
  }

  private recordModelUsage(model: string): void {
    try {
      const currentCount = this.modelUsage.get(model) || 0;
      this.modelUsage.set(model, currentCount + 1);
    } catch (error) {
      logger.error('Error recording model usage:', error);
    }
  }

  private getDefaultSiteName(): string {
    try {
      if (typeof window !== 'undefined' && window.location.hostname) {
        return window.location.hostname;
      }
      return 'localhost';
    } catch (error) {
      logger.error('Error getting default site name:', error);
      return 'localhost';
    }
  }
}

export function createAssistant(config: AssistantConfig): Assistant {
  try {
    // Force mock assistant in demo mode
    if (DEMO_CONFIG.FORCE_MOCK_ASSISTANT || DEMO_CONFIG.IS_DEMO) {
      logger.info('Using mock assistant for demo mode');
      return new MockAssistant();
    }

    if (config.apiKey) {
      // Validate API key format (basic check)
      if (!config.apiKey.startsWith('sk-or-v1-')) {
        logger.error('Invalid API key format provided');
        return new MockAssistant();
      }
      return new OpenRouterAssistant({
        apiKey: config.apiKey,
        siteName: config.siteName || 'chat-app',
      });
    }

    // Try to get from environment
    const envKey = process.env.OPENROUTER_API_KEY;

    if (!envKey) {
      // Only log in development to avoid production log spam
      if (process.env.NODE_ENV === 'development') {
        logger.warn('No OpenRouter API key provided, using mock assistant');
      }
      return new MockAssistant();
    }

    // Validate environment API key format
    if (!envKey.startsWith('sk-or-v1-')) {
      logger.error('Invalid API key format in environment variable');
      return new MockAssistant();
    }

    return new OpenRouterAssistant({
      apiKey: envKey,
      siteName: config.siteName || 'chat-app',
    });
  } catch (error) {
    // Don't log the full error object which might contain sensitive data
    logger.error('Error creating assistant service');
    return new MockAssistant();
  }
}

// Mock assistant for testing and fallback
class MockAssistant implements Assistant {
  private getSmartMockResponse(userMessage: string): string {
    const message = userMessage.toLowerCase();

    // Demo-specific responses
    if (message.includes('demo') || message.includes('showcase')) {
      return `🎉 Welcome to the chat app demo! This is a fully functional chat interface with mock AI responses.

Key features you can try:
• Send messages and get intelligent responses
• Create and manage multiple conversations
• Export your chats to Markdown or JSON
• Experience the beautiful, responsive UI

This demo uses a smart mock assistant that provides contextual responses. In the full version, you'd connect your OpenRouter API key to chat with real AI models like Claude, GPT-4, and more!`;
    }

    if (message.includes('export') || message.includes('download')) {
      return `📄 The export feature lets you download your conversations in multiple formats:

• **Markdown**: Perfect for documentation or sharing
• **JSON**: Great for data analysis or backup
• **Obsidian**: Compatible with Obsidian note-taking

Try clicking the export button to see it in action! Your conversations will be formatted beautifully with timestamps, metadata, and proper structure.`;
    }

    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      return `👋 Hello! I'm the demo assistant for this chat application. I can help you explore the features and capabilities of this platform.

Feel free to ask me about the app's functionality, technical details, or just have a casual conversation! What would you like to know? 😊`;
    }

    // Default intelligent response
    const responses = [
      `That's an interesting question! 🤔 In a real deployment, this would be answered by advanced AI models like Claude or GPT-4. This demo shows how seamlessly the chat interface works with any AI backend.`,

      `Great point! 💡 This mock assistant demonstrates the responsive chat interface. With a real API key, you'd get sophisticated AI responses from models like Anthropic's Claude, OpenAI's GPT-4, or other providers through OpenRouter.`,

      `I appreciate your message! 😊 This demo showcases the chat app's clean interface and smooth user experience. The real version connects to powerful AI models for genuinely helpful conversations.`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  async getResponse(
    userMessage: string,
    conversationHistory?: Array<{ role: string; content: string }>,
    options?: AssistantOptions,
  ): Promise<string | AssistantResponse> {
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

        if (options.signal.aborted) {
          clearTimeout(timeoutId);
          reject(new Error('Request was cancelled'));
          return;
        }
      }
    });

    // Create a response that clearly references the current message
    const responses = [
      `I understand you're asking about "${userMessage}". This is a demo response - in production, I'd provide a helpful answer!`,
      `Thanks for your message: "${userMessage}". This mock assistant shows the chat interface working properly.`,
      `You wrote: "${userMessage}" - I'm responding to show the chat flow is working correctly in demo mode.`,
      `Got it! You said "${userMessage}". This is a placeholder response from the demo assistant.`,
      `I see your message: "${userMessage}". The real version would connect to AI models for actual help!`,
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];

    return {
      response,
      model: 'demo-assistant-v1',
      cost: 0.001,
    };
  }

  getModelUsageStats(): Array<{ model: string; count: number; percentage: number }> {
    return [{ model: 'mock', count: 1, percentage: 100 }];
  }
}
