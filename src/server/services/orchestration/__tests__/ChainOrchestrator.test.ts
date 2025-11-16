import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChainOrchestrator } from '../ChainOrchestrator';
import { ChainConfig } from '../types';
import { Assistant, AssistantResponse } from '../../assistant';

describe('ChainOrchestrator', () => {
  let mockAssistant: Assistant;
  let mockDb: any;
  let config: ChainConfig;

  beforeEach(() => {
    // Mock assistant
    mockAssistant = {
      getResponse: vi.fn(),
      createResponseStream: vi.fn(),
      getModelUsageStats: vi.fn(),
      getModelCapabilities: vi.fn(),
      getModelHealthStatus: vi.fn(),
      checkAllModelsHealth: vi.fn(),
    };

    // Mock database
    mockDb = {
      routingDecision: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    // Default config
    config = {
      analyzerModel: 'deepseek/deepseek-chat',
      routerModel: 'anthropic/claude-3-haiku',
      validatorModel: 'anthropic/claude-3-5-sonnet',
      availableModels: [
        'deepseek/deepseek-chat',
        'anthropic/claude-3-haiku',
        'anthropic/claude-3-5-sonnet',
        'openai/gpt-4o-mini',
      ],
      minComplexityForChain: 5,
      maxRetries: 2,
      validationEnabled: true,
      preferCheapModels: false,
    };
  });

  describe('Simple Query (Low Complexity)', () => {
    it('should use simple execution for low complexity queries', async () => {
      const orchestrator = new ChainOrchestrator(config, mockAssistant, mockDb);

      // Mock analyzer response - low complexity
      (mockAssistant.getResponse as any)
        .mockResolvedValueOnce({
          response: JSON.stringify({
            complexity: 3,
            category: 'chat',
            capabilities: ['speed'],
            estimatedTokens: 100,
            reasoning: 'Simple greeting',
          }),
        })
        .mockResolvedValueOnce({
          response: 'Hello! How can I help you?',
          model: 'deepseek/deepseek-chat',
          cost: 0.0001,
        });

      const result = await orchestrator.orchestrate({
        userMessage: 'Hello!',
        conversationHistory: [],
        sessionId: 'test-session',
        config,
      });

      expect(result.successful).toBe(true);
      expect(result.analysis.complexity).toBe(3);
      expect(result.retryCount).toBe(0);
      expect(mockDb.routingDecision.create).toHaveBeenCalled();
    });
  });

  describe('Complex Query (High Complexity)', () => {
    it('should use full chain for complex queries', async () => {
      const orchestrator = new ChainOrchestrator(config, mockAssistant, mockDb);

      // Mock analyzer response - high complexity
      (mockAssistant.getResponse as any)
        .mockResolvedValueOnce({
          response: JSON.stringify({
            complexity: 8,
            category: 'code',
            capabilities: ['reasoning', 'knowledge'],
            estimatedTokens: 2000,
            reasoning: 'Complex code generation task',
          }),
        })
        // Mock router response
        .mockResolvedValueOnce({
          response: JSON.stringify({
            primaryModel: 'anthropic/claude-3-5-sonnet',
            fallbackModels: ['openai/gpt-4o-mini'],
            strategy: 'single',
            estimatedCost: 0.006,
            reasoning: 'Complex task requires capable model',
            shouldValidate: true,
          }),
        })
        // Mock execution response
        .mockResolvedValueOnce({
          response: 'function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }',
          model: 'anthropic/claude-3-5-sonnet',
          cost: 0.005,
        })
        // Mock validator response
        .mockResolvedValueOnce({
          response: JSON.stringify({
            isValid: true,
            score: 9,
            accuracy: 9,
            completeness: 9,
            shouldRetry: false,
            reasoning: 'Code is correct and complete',
            issues: [],
          }),
        });

      const result = await orchestrator.orchestrate({
        userMessage: 'Write a fibonacci function in JavaScript',
        conversationHistory: [],
        sessionId: 'test-session',
        config,
      });

      expect(result.successful).toBe(true);
      expect(result.analysis.complexity).toBe(8);
      expect(result.analysis.category).toBe('code');
      expect(result.routingPlan.primaryModel).toBe('anthropic/claude-3-5-sonnet');
      expect(result.validation?.isValid).toBe(true);
      expect(result.retryCount).toBe(0);
    });
  });

  describe('Failed Validation with Retry', () => {
    it('should retry with different model if validation fails', async () => {
      const orchestrator = new ChainOrchestrator(config, mockAssistant, mockDb);

      // Mock analyzer response
      (mockAssistant.getResponse as any)
        .mockResolvedValueOnce({
          response: JSON.stringify({
            complexity: 7,
            category: 'analysis',
            capabilities: ['reasoning'],
            estimatedTokens: 1500,
            reasoning: 'Analysis task',
          }),
        })
        // Mock router response
        .mockResolvedValueOnce({
          response: JSON.stringify({
            primaryModel: 'anthropic/claude-3-haiku',
            fallbackModels: ['anthropic/claude-3-5-sonnet'],
            strategy: 'single',
            estimatedCost: 0.002,
            reasoning: 'Try cheaper model first',
            shouldValidate: true,
          }),
        })
        // Mock first execution (will fail validation)
        .mockResolvedValueOnce({
          response: 'Incomplete answer...',
          model: 'anthropic/claude-3-haiku',
          cost: 0.001,
        })
        // Mock validator response - FAIL
        .mockResolvedValueOnce({
          response: JSON.stringify({
            isValid: false,
            score: 4,
            accuracy: 5,
            completeness: 3,
            shouldRetry: true,
            suggestedModel: 'anthropic/claude-3-5-sonnet',
            reasoning: 'Response is incomplete',
            issues: ['Missing key details', 'Too brief'],
          }),
        })
        // Mock second execution (with better model)
        .mockResolvedValueOnce({
          response: 'Complete and detailed answer with all necessary information.',
          model: 'anthropic/claude-3-5-sonnet',
          cost: 0.003,
        })
        // Mock validator response - SUCCESS
        .mockResolvedValueOnce({
          response: JSON.stringify({
            isValid: true,
            score: 9,
            accuracy: 9,
            completeness: 9,
            shouldRetry: false,
            reasoning: 'Response is now complete and accurate',
            issues: [],
          }),
        });

      const result = await orchestrator.orchestrate({
        userMessage: 'Analyze the economic impact of AI',
        conversationHistory: [],
        sessionId: 'test-session',
        config,
      });

      expect(result.successful).toBe(true);
      expect(result.retryCount).toBe(1);
      expect(result.model).toBe('anthropic/claude-3-5-sonnet');
      expect(result.validation?.isValid).toBe(true);
    });
  });

  describe('Code Generation Task', () => {
    it('should route code tasks to code-optimized models', async () => {
      const orchestrator = new ChainOrchestrator(config, mockAssistant, mockDb);

      // Mock analyzer response - code task
      (mockAssistant.getResponse as any)
        .mockResolvedValueOnce({
          response: JSON.stringify({
            complexity: 6,
            category: 'code',
            capabilities: ['reasoning', 'knowledge'],
            estimatedTokens: 800,
            reasoning: 'Code generation task',
          }),
        })
        // Mock router response
        .mockResolvedValueOnce({
          response: JSON.stringify({
            primaryModel: 'deepseek/deepseek-chat',
            fallbackModels: ['anthropic/claude-3-5-sonnet'],
            strategy: 'single',
            estimatedCost: 0.0003,
            reasoning: 'DeepSeek is optimized for code',
            shouldValidate: true,
          }),
        })
        // Mock execution response
        .mockResolvedValueOnce({
          response: 'def factorial(n):\\n    return 1 if n <= 1 else n * factorial(n-1)',
          model: 'deepseek/deepseek-chat',
          cost: 0.0002,
        })
        // Mock validator response
        .mockResolvedValueOnce({
          response: JSON.stringify({
            isValid: true,
            score: 8,
            accuracy: 8,
            completeness: 8,
            shouldRetry: false,
            reasoning: 'Code is correct',
            issues: [],
          }),
        });

      const result = await orchestrator.orchestrate({
        userMessage: 'Write a factorial function in Python',
        conversationHistory: [],
        sessionId: 'test-session',
        config,
      });

      expect(result.successful).toBe(true);
      expect(result.analysis.category).toBe('code');
      expect(result.model).toBe('deepseek/deepseek-chat');
    });
  });

  describe('Database Integration', () => {
    it('should store routing decision in database', async () => {
      const orchestrator = new ChainOrchestrator(config, mockAssistant, mockDb);

      // Mock simple query
      (mockAssistant.getResponse as any)
        .mockResolvedValueOnce({
          response: JSON.stringify({
            complexity: 2,
            category: 'chat',
            capabilities: ['speed'],
            estimatedTokens: 50,
            reasoning: 'Simple query',
          }),
        })
        .mockResolvedValueOnce({
          response: 'Sure!',
          model: 'deepseek/deepseek-chat',
          cost: 0.00005,
        });

      const result = await orchestrator.orchestrate({
        userMessage: 'Thanks!',
        conversationHistory: [],
        conversationId: 'test-conv-123',
        sessionId: 'test-session',
        config,
      });

      expect(mockDb.routingDecision.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          executedModel: 'deepseek/deepseek-chat',
          successful: true,
          retryCount: 0,
          conversationId: 'test-conv-123',
        }),
      });
    });

    it('should work without database (demo mode)', async () => {
      const orchestrator = new ChainOrchestrator(config, mockAssistant, undefined);

      (mockAssistant.getResponse as any)
        .mockResolvedValueOnce({
          response: JSON.stringify({
            complexity: 3,
            category: 'chat',
            capabilities: ['speed'],
            estimatedTokens: 100,
            reasoning: 'Simple chat',
          }),
        })
        .mockResolvedValueOnce({
          response: 'Hi!',
          model: 'deepseek/deepseek-chat',
          cost: 0.0001,
        });

      const result = await orchestrator.orchestrate({
        userMessage: 'Hello',
        conversationHistory: [],
        sessionId: 'test-session',
        config,
      });

      expect(result.successful).toBe(true);
      // Should not throw error even without database
    });
  });

  describe('Configuration Options', () => {
    it('should respect PREFER_CHEAP_MODELS setting', async () => {
      const cheapConfig = { ...config, preferCheapModels: true };
      const orchestrator = new ChainOrchestrator(cheapConfig, mockAssistant, mockDb);

      // Mock analyzer - moderate complexity
      (mockAssistant.getResponse as any)
        .mockResolvedValueOnce({
          response: JSON.stringify({
            complexity: 6,
            category: 'chat',
            capabilities: ['speed'],
            estimatedTokens: 500,
            reasoning: 'Moderate task',
          }),
        })
        // Mock router response (should prefer cheap)
        .mockResolvedValueOnce({
          response: JSON.stringify({
            primaryModel: 'deepseek/deepseek-chat',
            fallbackModels: [],
            strategy: 'single',
            estimatedCost: 0.0001,
            reasoning: 'Preferring cheap model',
            shouldValidate: false,
          }),
        })
        // Mock execution
        .mockResolvedValueOnce({
          response: 'Response from cheap model',
          model: 'deepseek/deepseek-chat',
          cost: 0.0001,
        });

      const result = await orchestrator.orchestrate({
        userMessage: 'Explain something',
        conversationHistory: [],
        sessionId: 'test-session',
        config: cheapConfig,
      });

      expect(result.model).toBe('deepseek/deepseek-chat');
      expect(result.totalCost).toBeLessThan(0.001);
    });

    it('should skip validation when disabled', async () => {
      const noValidationConfig = { ...config, validationEnabled: false };
      const orchestrator = new ChainOrchestrator(noValidationConfig, mockAssistant, mockDb);

      // Mock analyzer
      (mockAssistant.getResponse as any)
        .mockResolvedValueOnce({
          response: JSON.stringify({
            complexity: 7,
            category: 'analysis',
            capabilities: ['reasoning'],
            estimatedTokens: 1000,
            reasoning: 'Complex analysis',
          }),
        })
        // Mock router
        .mockResolvedValueOnce({
          response: JSON.stringify({
            primaryModel: 'anthropic/claude-3-5-sonnet',
            fallbackModels: [],
            strategy: 'single',
            estimatedCost: 0.003,
            reasoning: 'Complex task',
            shouldValidate: true, // Router says validate, but config disables it
          }),
        })
        // Mock execution
        .mockResolvedValueOnce({
          response: 'Analysis result',
          model: 'anthropic/claude-3-5-sonnet',
          cost: 0.003,
        });
        // No validator mock needed - validation should be skipped

      const result = await orchestrator.orchestrate({
        userMessage: 'Analyze this',
        conversationHistory: [],
        sessionId: 'test-session',
        config: noValidationConfig,
      });

      expect(result.successful).toBe(true);
      expect(result.validation).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle analyzer failures gracefully', async () => {
      const orchestrator = new ChainOrchestrator(config, mockAssistant, mockDb);

      // Mock analyzer failure (invalid JSON)
      (mockAssistant.getResponse as any)
        .mockResolvedValueOnce({
          response: 'Invalid JSON response',
        });

      await expect(orchestrator.orchestrate({
        userMessage: 'Test',
        conversationHistory: [],
        sessionId: 'test-session',
        config,
      })).rejects.toThrow();
    });

    it('should handle execution failures with retries', async () => {
      const orchestrator = new ChainOrchestrator(config, mockAssistant, mockDb);

      // Mock analyzer
      (mockAssistant.getResponse as any)
        .mockResolvedValueOnce({
          response: JSON.stringify({
            complexity: 6,
            category: 'chat',
            capabilities: ['reasoning'],
            estimatedTokens: 500,
            reasoning: 'Moderate task',
          }),
        })
        // Mock router
        .mockResolvedValueOnce({
          response: JSON.stringify({
            primaryModel: 'anthropic/claude-3-haiku',
            fallbackModels: ['deepseek/deepseek-chat'],
            strategy: 'single',
            estimatedCost: 0.001,
            reasoning: 'Try haiku first',
            shouldValidate: false,
          }),
        })
        // First execution fails
        .mockRejectedValueOnce(new Error('Model unavailable'))
        // Second execution succeeds (fallback)
        .mockResolvedValueOnce({
          response: 'Response from fallback model',
          model: 'deepseek/deepseek-chat',
          cost: 0.0002,
        });

      const result = await orchestrator.orchestrate({
        userMessage: 'Test message',
        conversationHistory: [],
        sessionId: 'test-session',
        config,
      });

      expect(result.successful).toBe(true);
      expect(result.retryCount).toBe(1);
      expect(result.model).toBe('deepseek/deepseek-chat');
    });
  });
});
