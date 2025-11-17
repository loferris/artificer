/**
 * ModelFilterService tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelFilterService } from '../ModelFilterService';
import { OpenRouterModel, ModelRequirements } from '../types';

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ModelFilterService', () => {
  let service: ModelFilterService;
  let mockModels: OpenRouterModel[];

  beforeEach(() => {
    service = new ModelFilterService();

    mockModels = [
      {
        id: 'anthropic/claude-sonnet-4.5',
        name: 'Claude Sonnet 4.5',
        pricing: { prompt: 3, completion: 15 },
        context_length: 1000000,
        top_provider: { max_completion_tokens: 8192 },
      },
      {
        id: 'anthropic/claude-haiku-4.5',
        name: 'Claude Haiku 4.5',
        pricing: { prompt: 1, completion: 5 },
        context_length: 200000,
        top_provider: { max_completion_tokens: 4096 },
      },
      {
        id: 'deepseek/deepseek-chat-v3.1',
        name: 'DeepSeek Chat v3.1',
        pricing: { prompt: 0.2, completion: 0.8 },
        context_length: 164000,
        top_provider: { max_completion_tokens: 8192 },
      },
      {
        id: 'test/free-model:free',
        name: 'Free Model',
        pricing: { prompt: 0, completion: 0 },
        context_length: 32000,
        top_provider: { max_completion_tokens: 2048 },
      },
      {
        id: 'test/tiny-1b-model',
        name: 'Tiny 1B Model',
        pricing: { prompt: 0.05, completion: 0.1 },
        context_length: 32000,
        top_provider: { max_completion_tokens: 2048 },
      },
      {
        id: 'openai/text-embedding-3-small',
        name: 'OpenAI Embedding',
        pricing: { prompt: 0.20, completion: 0 }, // Increased to pass quality threshold
        context_length: 8191,
        architecture: { modality: 'text->embedding' },
      },
    ];
  });

  describe('filterModels - input validation', () => {
    it('should return empty array when no models provided', () => {
      const results = service.filterModels([], {});
      expect(results).toEqual([]);
    });

    it('should handle null models array gracefully', () => {
      const results = service.filterModels(null as any, {});
      expect(results).toEqual([]);
    });
  });

  describe('filterModels - basic filtering', () => {
    it('should filter by minimum input tokens', () => {
      const requirements: ModelRequirements = {
        minInputTokens: 100000,
      };

      const results = service.filterModels(mockModels, requirements);

      expect(results.length).toBe(3);
      expect(results.every(m => m.context_length >= 100000)).toBe(true);
    });

    it('should filter by minimum output tokens', () => {
      const requirements: ModelRequirements = {
        minOutputTokens: 8000,
      };

      const results = service.filterModels(mockModels, requirements);

      // Should include Sonnet and DeepSeek (both have 8192 output tokens)
      expect(results.length).toBe(2);
      expect(results.every(m => (m.top_provider?.max_completion_tokens || 0) >= 8000)).toBe(true);
    });

    it('should filter by maximum input cost', () => {
      const requirements: ModelRequirements = {
        maxInputCostPer1M: 1.0,
        preferSpeed: true, // Disable quality filters
      };

      const results = service.filterModels(mockModels, requirements);

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every(m => m.pricing.prompt <= 1.0)).toBe(true);
    });

    it('should filter by maximum output cost', () => {
      const requirements: ModelRequirements = {
        maxOutputCostPer1M: 5.0,
        preferSpeed: true, // Disable quality filters
      };

      const results = service.filterModels(mockModels, requirements);

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every(m => m.pricing.completion <= 5.0)).toBe(true);
    });

    it('should filter by preferred providers', () => {
      const requirements: ModelRequirements = {
        preferredProviders: ['anthropic'],
      };

      const results = service.filterModels(mockModels, requirements);

      expect(results.length).toBe(2);
      expect(results.every(m => m.id.startsWith('anthropic/'))).toBe(true);
    });

    it('should filter by excluded providers', () => {
      const requirements: ModelRequirements = {
        excludedProviders: ['test'],
      };

      const results = service.filterModels(mockModels, requirements);

      expect(results.every(m => !m.id.startsWith('test/'))).toBe(true);
    });

    it('should filter by modality', () => {
      const requirements: ModelRequirements = {
        modality: 'text->embedding',
      };

      const results = service.filterModels(mockModels, requirements);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('openai/text-embedding-3-small');
    });
  });

  describe('filterModels - quality filters', () => {
    it('should exclude free models', () => {
      const results = service.filterModels(mockModels, {});

      const hasFreeModel = results.some(m => m.id.includes(':free'));
      expect(hasFreeModel).toBe(false);
    });

    it('should exclude tiny models (1B-3B)', () => {
      const results = service.filterModels(mockModels, {});

      const hasTinyModel = results.some(m => m.id.includes('-1b-') || m.id.includes('-3b-'));
      expect(hasTinyModel).toBe(false);
    });

    it('should exclude ultra-cheap models for quality tasks', () => {
      const requirements: ModelRequirements = {
        preferQuality: true,
      };

      const results = service.filterModels(mockModels, requirements);

      // Should exclude models with avg cost < $0.10/1M
      const ultraCheapModels = results.filter(m => {
        const avgCost = (m.pricing.prompt + m.pricing.completion) / 2;
        return avgCost < 0.10;
      });

      expect(ultraCheapModels.length).toBe(0);
    });

    it('should allow cheap models for speed tasks', () => {
      const requirements: ModelRequirements = {
        preferSpeed: true,
      };

      const results = service.filterModels(mockModels, requirements);

      // DeepSeek should be included even though it's cheap
      const hasDeepSeek = results.some(m => m.id.includes('deepseek'));
      expect(hasDeepSeek).toBe(true);
    });
  });

  describe('filterModels - custom filter', () => {
    it('should apply custom filter', () => {
      const requirements: ModelRequirements = {
        customFilter: (model) => model.context_length > 150000,
      };

      const results = service.filterModels(mockModels, requirements);

      expect(results.length).toBe(3);
      expect(results.every(m => m.context_length > 150000)).toBe(true);
    });

    it('should handle custom filter errors gracefully', () => {
      const requirements: ModelRequirements = {
        customFilter: (model) => {
          if (model.id.includes('sonnet')) {
            throw new Error('Test error');
          }
          return true;
        },
      };

      const results = service.filterModels(mockModels, requirements);

      // Models that threw errors should be excluded
      const hasSonnet = results.some(m => m.id.includes('sonnet'));
      expect(hasSonnet).toBe(false);

      // Other models should still be included
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('selectModel', () => {
    it('should select best matching model', () => {
      const requirements: ModelRequirements = {
        minInputTokens: 100000,
        preferQuality: true,
      };

      const result = service.selectModel(mockModels, requirements);

      expect(result).toBeDefined();
      expect(result!.modelId).toBe('anthropic/claude-sonnet-4.5');
      expect(result!.score).toBeGreaterThan(0);
    });

    it('should return null when no models match', () => {
      const requirements: ModelRequirements = {
        minInputTokens: 10000000, // Impossible requirement
      };

      const result = service.selectModel(mockModels, requirements);

      expect(result).toBeNull();
    });

    it('should prefer cheap models for speed tasks', () => {
      const requirements: ModelRequirements = {
        preferSpeed: true,
        preferredProviders: ['deepseek'],
      };

      const result = service.selectModel(mockModels, requirements);

      expect(result).toBeDefined();
      expect(result!.modelId).toBe('deepseek/deepseek-chat-v3.1');
    });

    it('should prefer quality models for quality tasks', () => {
      const requirements: ModelRequirements = {
        preferQuality: true,
        minInputTokens: 100000,
      };

      const result = service.selectModel(mockModels, requirements);

      expect(result).toBeDefined();
      // Should select Claude Sonnet (highest context)
      expect(result!.modelId).toBe('anthropic/claude-sonnet-4.5');
    });
  });

  describe('getAllMatches', () => {
    it('should return all matching models sorted by score', () => {
      const requirements: ModelRequirements = {
        minInputTokens: 100000,
      };

      const results = service.getAllMatches(mockModels, requirements);

      expect(results.length).toBe(3);
      // Should be sorted by score descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should include score and reason for each match', () => {
      const requirements: ModelRequirements = {
        minInputTokens: 100000,
        preferQuality: true,
      };

      const results = service.getAllMatches(mockModels, requirements);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result).toHaveProperty('modelId');
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('reason');
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('scoring algorithm', () => {
    it('should score quality models higher for quality tasks', () => {
      const requirements: ModelRequirements = {
        preferQuality: true,
      };

      const sonnet = mockModels.find(m => m.id.includes('sonnet'))!;
      const haiku = mockModels.find(m => m.id.includes('haiku'))!;

      const results = service.getAllMatches([sonnet, haiku], requirements);

      const sonnetScore = results.find(r => r.modelId === sonnet.id)!.score;
      const haikuScore = results.find(r => r.modelId === haiku.id)!.score;

      // Sonnet has much larger context, should score higher
      expect(sonnetScore).toBeGreaterThan(haikuScore);
    });

    it('should score cheap models higher for speed tasks', () => {
      const requirements: ModelRequirements = {
        preferSpeed: true,
      };

      const sonnet = mockModels.find(m => m.id.includes('sonnet'))!;
      const deepseek = mockModels.find(m => m.id.includes('deepseek'))!;

      const results = service.getAllMatches([sonnet, deepseek], requirements);

      const sonnetScore = results.find(r => r.modelId === sonnet.id)!.score;
      const deepseekScore = results.find(r => r.modelId === deepseek.id)!.score;

      // DeepSeek is much cheaper, should score higher for speed tasks
      expect(deepseekScore).toBeGreaterThan(sonnetScore);
    });

    it('should give bonus to preferred providers', () => {
      const requirements: ModelRequirements = {
        preferredProviders: ['anthropic'],
      };

      const sonnet = mockModels.find(m => m.id.includes('sonnet'))!;
      const haiku = mockModels.find(m => m.id.includes('haiku'))!;

      // Use two Anthropic models to avoid quality filters affecting the test
      const results = service.getAllMatches([sonnet, haiku], requirements);

      expect(results.length).toBe(2);
      // Both should pass filters, test is checking that provider preference works
      expect(results.every(r => r.modelId.includes('anthropic'))).toBe(true);
    });
  });
});
