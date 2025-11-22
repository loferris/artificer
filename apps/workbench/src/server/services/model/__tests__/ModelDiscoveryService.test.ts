/**
 * ModelDiscoveryService tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModelDiscoveryService } from '../ModelDiscoveryService';
import { OpenRouterModel } from '../types';
import fs from 'fs/promises';
import path from 'path';

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fs
vi.mock('fs/promises');

describe('ModelDiscoveryService', () => {
  let service: ModelDiscoveryService;
  const mockModels: OpenRouterModel[] = [
    {
      id: 'anthropic/claude-sonnet-4.5',
      name: 'Claude Sonnet 4.5',
      pricing: { prompt: 3, completion: 15 },
      context_length: 1000000,
      top_provider: { max_completion_tokens: 8192 },
    },
    {
      id: 'deepseek/deepseek-chat-v3.1',
      name: 'DeepSeek Chat v3.1',
      pricing: { prompt: 0.2, completion: 0.8 },
      context_length: 164000,
      top_provider: { max_completion_tokens: 8192 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    // Use stubGlobal for proper fetch isolation
    vi.stubGlobal('fetch', vi.fn());
    process.env.OPENROUTER_API_KEY = 'test-key';
    service = new ModelDiscoveryService({
      apiKey: 'test-key',
      cacheFilePath: '/tmp/test-model-cache.json',
      cacheTTL: 24 * 60 * 60 * 1000,
      useFallback: true,
    });
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    vi.unstubAllGlobals();
  });

  describe('getFallbackModels', () => {
    it('should return hardcoded fallback models', () => {
      const fallbacks = ModelDiscoveryService.getFallbackModels();

      expect(fallbacks).toBeDefined();
      expect(fallbacks.length).toBeGreaterThan(0);
      expect(fallbacks[0]).toHaveProperty('id');
      expect(fallbacks[0]).toHaveProperty('pricing');
      expect(fallbacks[0]).toHaveProperty('context_length');
    });

    it('should include Claude Sonnet in fallbacks', () => {
      const fallbacks = ModelDiscoveryService.getFallbackModels();
      const hasSonnet = fallbacks.some(m => m.id.includes('sonnet'));

      expect(hasSonnet).toBe(true);
    });

    it('should include DeepSeek in fallbacks', () => {
      const fallbacks = ModelDiscoveryService.getFallbackModels();
      const hasDeepSeek = fallbacks.some(m => m.id.includes('deepseek'));

      expect(hasDeepSeek).toBe(true);
    });

    it('should include embedding model in fallbacks', () => {
      const fallbacks = ModelDiscoveryService.getFallbackModels();
      const hasEmbedding = fallbacks.some(m => m.id.includes('embedding'));

      expect(hasEmbedding).toBe(true);
    });
  });

  describe('getModels - fallback behavior', () => {
    it('should use hardcoded fallbacks when API fails and no file cache', async () => {
      // Mock API failure
      vi.mocked(fetch).mockRejectedValue(new Error('API Error'));

      // Mock no file cache
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      // Mock file write
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();

      const models = await service.getModels();

      expect(models).toBeDefined();
      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty('id');
    });

    it('should throw error when fallback is disabled and API fails', async () => {
      const noFallbackService = new ModelDiscoveryService({
        apiKey: 'test-key',
        useFallback: false,
      });

      // Mock API failure
      vi.mocked(fetch).mockRejectedValue(new Error('API Error'));

      // Mock no file cache
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      await expect(noFallbackService.getModels()).rejects.toThrow(
        'Failed to load models and no fallback available'
      );
    });
  });

  describe('getModels - file cache', () => {
    it('should use file cache when valid', async () => {
      const cacheData = {
        metadata: {
          lastUpdated: new Date().toISOString(),
          modelCount: mockModels.length,
          source: 'api' as const,
          ttl: 24 * 60 * 60 * 1000,
        },
        models: mockModels,
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(cacheData));

      const models = await service.getModels();

      expect(models).toEqual(mockModels);
      expect(fs.readFile).toHaveBeenCalled();
    });

    it('should reject cache with invalid date', async () => {
      const cacheData = {
        metadata: {
          lastUpdated: 'invalid-date',
          modelCount: mockModels.length,
          source: 'api' as const,
          ttl: 24 * 60 * 60 * 1000,
        },
        models: mockModels,
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(cacheData));

      // Mock API success for fallback
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockModels }),
      } as Response);

      // Mock file write
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();

      const models = await service.getModels();

      // Should fetch from API instead of using invalid cache
      expect(fetch).toHaveBeenCalled();
      expect(models).toEqual(mockModels);
    });

    it('should reject cache with missing models array', async () => {
      const cacheData = {
        metadata: {
          lastUpdated: new Date().toISOString(),
          modelCount: 0,
          source: 'api' as const,
          ttl: 24 * 60 * 60 * 1000,
        },
        models: null,
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(cacheData));

      // Mock API success
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockModels }),
      } as Response);

      // Mock file write
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();

      const models = await service.getModels();

      expect(fetch).toHaveBeenCalled();
      expect(models).toEqual(mockModels);
    });

    it('should reject cache with empty models array', async () => {
      const cacheData = {
        metadata: {
          lastUpdated: new Date().toISOString(),
          modelCount: 0,
          source: 'api' as const,
          ttl: 24 * 60 * 60 * 1000,
        },
        models: [],
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(cacheData));

      // Mock API success
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockModels }),
      } as Response);

      // Mock file write
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();

      const models = await service.getModels();

      expect(fetch).toHaveBeenCalled();
      expect(models).toEqual(mockModels);
    });

    it('should use expired cache when API fails', async () => {
      const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const cacheData = {
        metadata: {
          lastUpdated: yesterday.toISOString(),
          modelCount: mockModels.length,
          source: 'api' as const,
          ttl: 24 * 60 * 60 * 1000,
        },
        models: mockModels,
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(cacheData));

      // Mock API failure
      vi.mocked(fetch).mockRejectedValue(new Error('API Error'));

      const models = await service.getModels();

      // Should use expired cache as fallback
      expect(models).toEqual(mockModels);
    });
  });

  describe('getModels - API fetching', () => {
    it('should fetch from API and normalize pricing', async () => {
      const apiModels = [
        {
          id: 'test/model',
          name: 'Test Model',
          pricing: {
            prompt: '0.0000003', // String in $/token
            completion: '0.0000015',
          },
          context_length: 128000,
          top_provider: { max_completion_tokens: 4096 },
        },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ data: apiModels }),
      } as Response);

      // Mock no cache
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      // Mock file write
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();

      const models = await service.getModels();

      expect(models[0].pricing.prompt).toBe(0.3); // Should be converted to $/1M
      expect(models[0].pricing.completion).toBe(1.5);
    });

    it('should handle API error response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as Response);

      // Mock no cache
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      // Mock file write for fallback
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();

      const models = await service.getModels();

      // Should fall back to hardcoded models
      expect(models).toBeDefined();
      expect(models.length).toBeGreaterThan(0);
    });

    it('should throw error when no API key configured', async () => {
      const noKeyService = new ModelDiscoveryService({
        apiKey: '',
        useFallback: false,
      });

      // Mock no cache
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      // Error will be wrapped in "Failed to load models" when fallback is disabled
      await expect(noKeyService.getModels()).rejects.toThrow();
    });
  });

  describe('refresh', () => {
    it('should force refresh from API', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockModels }),
      } as Response);

      // Mock file write
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();

      const models = await service.refresh();

      expect(fetch).toHaveBeenCalled();
      expect(models).toEqual(mockModels);
    });

    it('should throw error when refresh fails', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      await expect(service.refresh()).rejects.toThrow('Network error');
    });
  });

  describe('getCacheMetadata', () => {
    it('should return null when no cache loaded', () => {
      const metadata = service.getCacheMetadata();
      expect(metadata).toBeNull();
    });

    it('should return metadata after loading cache', async () => {
      const cacheData = {
        metadata: {
          lastUpdated: new Date().toISOString(),
          modelCount: mockModels.length,
          source: 'api' as const,
          ttl: 24 * 60 * 60 * 1000,
        },
        models: mockModels,
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(cacheData));

      await service.getModels();
      const metadata = service.getCacheMetadata();

      expect(metadata).toBeDefined();
      expect(metadata?.modelCount).toBe(mockModels.length);
      expect(metadata?.source).toBe('api');
    });
  });
});
