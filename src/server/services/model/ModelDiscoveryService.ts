/**
 * ModelDiscoveryService - Discovers available models from OpenRouter
 *
 * Features:
 * - Fetches latest models from OpenRouter API
 * - File-based caching with TTL
 * - Hardcoded fallback models for offline scenarios
 * - Automatic refresh on startup
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../utils/logger';
import {
  OpenRouterModel,
  ModelCache,
  ModelCacheMetadata,
  ModelDiscoveryConfig,
} from './types';

/**
 * Hardcoded fallback models (Option B: last resort)
 * These are stable, well-known models that are unlikely to be deprecated
 */
const FALLBACK_MODELS: OpenRouterModel[] = [
  {
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Claude 3.5 Sonnet',
    pricing: { prompt: 3, completion: 15 },
    context_length: 1000000,
    top_provider: { max_completion_tokens: 8192 },
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    name: 'Claude 4.5 Haiku',
    pricing: { prompt: 1, completion: 5 },
    context_length: 200000,
    top_provider: { max_completion_tokens: 4096 },
  },
  {
    id: 'deepseek/deepseek-chat-v3.1',
    name: 'DeepSeek Chat V3.1',
    pricing: { prompt: 0.20, completion: 0.80 },
    context_length: 164000,
    top_provider: { max_completion_tokens: 8192 },
  },
  {
    id: 'openai/text-embedding-3-small',
    name: 'OpenAI Text Embedding 3 Small',
    pricing: { prompt: 0.02, completion: 0 },
    context_length: 8191,
    architecture: { modality: 'text->embedding' },
  },
];

/**
 * Get default configuration (evaluated lazily to allow env vars to load)
 */
function getDefaultConfig(): Required<ModelDiscoveryConfig> {
  return {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    cacheFilePath: path.join(process.cwd(), 'data', 'model-cache.json'),
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    useFallback: true,
    apiBaseUrl: 'https://openrouter.ai/api/v1',
  };
}

export class ModelDiscoveryService {
  private config: Required<ModelDiscoveryConfig>;
  private cache: ModelCache | null = null;

  constructor(config?: ModelDiscoveryConfig) {
    this.config = { ...getDefaultConfig(), ...config };
  }

  /**
   * Get all available models (from cache, API, or fallback)
   */
  async getModels(): Promise<OpenRouterModel[]> {
    // Try cache first
    if (this.cache && this.isCacheValid(this.cache.metadata)) {
      logger.debug('[ModelDiscovery] Using in-memory cache');
      return this.cache.models;
    }

    // Try file cache
    const fileCache = await this.loadCacheFromFile();
    if (fileCache && this.isCacheValid(fileCache.metadata)) {
      logger.debug('[ModelDiscovery] Using file cache');
      this.cache = fileCache;
      return fileCache.models;
    }

    // Fetch from API
    try {
      const models = await this.fetchFromAPI();
      await this.saveToCache(models, 'api');
      return models;
    } catch (error) {
      logger.error('[ModelDiscovery] Failed to fetch from API', error);

      // Fallback to file cache (even if expired)
      if (fileCache) {
        logger.warn('[ModelDiscovery] Using expired file cache as fallback');
        this.cache = fileCache;
        return fileCache.models;
      }

      // Last resort: use hardcoded fallbacks
      if (this.config.useFallback) {
        logger.warn('[ModelDiscovery] Using hardcoded fallback models');
        await this.saveToCache(FALLBACK_MODELS, 'fallback');
        return FALLBACK_MODELS;
      }

      throw new Error('Failed to load models and no fallback available');
    }
  }

  /**
   * Force refresh models from API
   */
  async refresh(): Promise<OpenRouterModel[]> {
    logger.info('[ModelDiscovery] Force refreshing models from API');

    try {
      const models = await this.fetchFromAPI();
      await this.saveToCache(models, 'api');
      return models;
    } catch (error) {
      logger.error('[ModelDiscovery] Refresh failed', error);
      throw error;
    }
  }

  /**
   * Get cache metadata
   */
  getCacheMetadata(): ModelCacheMetadata | null {
    return this.cache?.metadata || null;
  }

  /**
   * Fetch models from OpenRouter API
   */
  private async fetchFromAPI(): Promise<OpenRouterModel[]> {
    if (!this.config.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    logger.info('[ModelDiscovery] Fetching models from OpenRouter API');

    const response = await fetch(`${this.config.apiBaseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': process.env.SITE_NAME || 'AI Workflow Engine',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // OpenRouter returns { data: [...models] }
    const rawModels = data.data || [];

    // Normalize pricing format: API returns strings in $/token, we need numbers in $/1M tokens
    const models: OpenRouterModel[] = rawModels.map((model: any) => ({
      ...model,
      pricing: {
        prompt: typeof model.pricing?.prompt === 'string'
          ? parseFloat(model.pricing.prompt) * 1_000_000
          : (model.pricing?.prompt || 0),
        completion: typeof model.pricing?.completion === 'string'
          ? parseFloat(model.pricing.completion) * 1_000_000
          : (model.pricing?.completion || 0),
      },
    }));

    logger.info('[ModelDiscovery] Fetched models from API', {
      count: models.length,
    });

    return models;
  }

  /**
   * Load cache from file
   */
  private async loadCacheFromFile(): Promise<ModelCache | null> {
    try {
      const cacheData = await fs.readFile(this.config.cacheFilePath, 'utf-8');
      const cache = JSON.parse(cacheData) as ModelCache;

      // Validate and convert date
      const date = new Date(cache.metadata.lastUpdated);
      if (isNaN(date.getTime())) {
        logger.warn('[ModelDiscovery] Invalid cache date, ignoring file cache');
        return null;
      }
      cache.metadata.lastUpdated = date;

      // Validate structure
      if (!cache.models || !Array.isArray(cache.models)) {
        logger.warn('[ModelDiscovery] Invalid cache structure, missing models array');
        return null;
      }

      if (cache.models.length === 0) {
        logger.warn('[ModelDiscovery] Cache contains no models, ignoring');
        return null;
      }

      logger.debug('[ModelDiscovery] Loaded cache from file', {
        modelCount: cache.models.length,
        lastUpdated: cache.metadata.lastUpdated,
        source: cache.metadata.source,
      });

      return cache;
    } catch (error) {
      // File doesn't exist or is corrupted
      logger.debug('[ModelDiscovery] No valid file cache found', { error: error instanceof Error ? error.message : 'unknown' });
      return null;
    }
  }

  /**
   * Save models to cache (both in-memory and file)
   */
  private async saveToCache(
    models: OpenRouterModel[],
    source: 'api' | 'fallback' | 'file'
  ): Promise<void> {
    const metadata: ModelCacheMetadata = {
      lastUpdated: new Date(),
      modelCount: models.length,
      source,
      ttl: this.config.cacheTTL,
    };

    this.cache = { metadata, models };

    // Save to file
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.config.cacheFilePath), { recursive: true });

      await fs.writeFile(
        this.config.cacheFilePath,
        JSON.stringify(this.cache, null, 2),
        'utf-8'
      );

      logger.debug('[ModelDiscovery] Saved cache to file', {
        path: this.config.cacheFilePath,
        modelCount: models.length,
      });
    } catch (error) {
      logger.error('[ModelDiscovery] Failed to save cache to file', error);
      // Non-fatal, cache is still in memory
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(metadata: ModelCacheMetadata): boolean {
    const age = Date.now() - new Date(metadata.lastUpdated).getTime();
    return age < metadata.ttl;
  }

  /**
   * Get fallback models (for testing or manual access)
   */
  static getFallbackModels(): OpenRouterModel[] {
    return FALLBACK_MODELS;
  }
}
