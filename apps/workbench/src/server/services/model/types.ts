/**
 * Model discovery and filtering types
 *
 * This provides an abstract layer for model selection that can be used
 * by consuming applications with their own requirements and thresholds.
 */

/**
 * OpenRouter model data structure
 * Based on https://openrouter.ai/docs#models
 */
export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: number;  // Cost per 1M tokens
    completion: number;  // Cost per 1M tokens
  };
  context_length: number;
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  per_request_limits?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

/**
 * Model requirements specification
 * Abstract interface that consuming apps can customize
 */
export interface ModelRequirements {
  /** Minimum input/prompt tokens supported */
  minInputTokens?: number;

  /** Minimum output/completion tokens supported */
  minOutputTokens?: number;

  /** Maximum cost per 1M input tokens */
  maxInputCostPer1M?: number;

  /** Maximum cost per 1M output tokens */
  maxOutputCostPer1M?: number;

  /** Preferred model providers (e.g., ['anthropic', 'openai']) */
  preferredProviders?: string[];

  /** Excluded model providers */
  excludedProviders?: string[];

  /** Require JSON/structured output capability */
  requiresJson?: boolean;

  /** Prefer quality over cost */
  preferQuality?: boolean;

  /** Prefer speed/latency over quality */
  preferSpeed?: boolean;

  /** Only select latest version from provider */
  preferLatest?: boolean;

  /** Specific modality required (e.g., 'text', 'multimodal') */
  modality?: string;

  /** Custom filter function for advanced requirements */
  customFilter?: (model: OpenRouterModel) => boolean;
}

/**
 * Model selection result
 */
export interface ModelSelectionResult {
  /** Selected model ID */
  modelId: string;

  /** Full model data */
  model: OpenRouterModel;

  /** Reason for selection */
  reason: string;

  /** Match score (0-1, higher is better) */
  score: number;
}

/**
 * Model cache metadata
 */
export interface ModelCacheMetadata {
  /** When the cache was last updated */
  lastUpdated: Date;

  /** Number of models in cache */
  modelCount: number;

  /** Source of the data ('api' or 'fallback') */
  source: 'api' | 'fallback' | 'file';

  /** Cache TTL in milliseconds */
  ttl: number;
}

/**
 * Model cache data structure
 */
export interface ModelCache {
  metadata: ModelCacheMetadata;
  models: OpenRouterModel[];
}

/**
 * Model discovery configuration
 */
export interface ModelDiscoveryConfig {
  /** OpenRouter API key */
  apiKey?: string;

  /** Cache file path */
  cacheFilePath?: string;

  /** Cache TTL in milliseconds (default: 24 hours) */
  cacheTTL?: number;

  /** Whether to use fallback models if API fails */
  useFallback?: boolean;

  /** Custom API base URL (for testing) */
  apiBaseUrl?: string;
}
